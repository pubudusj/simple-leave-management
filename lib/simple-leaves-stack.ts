import {
  Stack,
  StackProps,
  RemovalPolicy,
  Duration,
  aws_dynamodb as ddb,
  aws_lambda as lambda,
  aws_lambda_nodejs as nodejs_lambda,
  aws_stepfunctions as sfn,
  aws_stepfunctions_tasks as tasks,
  aws_lambda_event_sources as eventsources,
  aws_sqs as sqs,
  aws_iam as iam,
} from 'aws-cdk-lib';
import { HttpMethod } from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';
import * as path from 'path';

export class SimpleLeavesStack extends Stack {
  public readonly table: ddb.Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.table = new ddb.Table(this, 'SimpleLeavesTable', {
      partitionKey: { name: 'pk', type: ddb.AttributeType.STRING },
      billingMode: ddb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
      stream: ddb.StreamViewType.NEW_IMAGE,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Lambada - approve/reject leave
    const leaveApproveOrRejectLambda = new nodejs_lambda.NodejsFunction(this, "LeaveApproveOrRejectLambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: path.join(__dirname, `/../lambda/LeaveApproveOrReject/index.ts`),
      handler: "handler",
      retryAttempts: 0,
      timeout: Duration.seconds(30),
    });

    // Set permission for approve/reject lambda function
    leaveApproveOrRejectLambda.role?.attachInlinePolicy(
      new iam.Policy(this, 'StateTaskUpdatePermission', {
        statements: [
          new iam.PolicyStatement({
            actions: ['states:SendTaskSuccess', 'states:SendTaskFailure'],
            resources: ['*'],
          }),
        ],
      }),
    );

    const leaveApproveOrRejectLambdaUrl = leaveApproveOrRejectLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        'allowedOrigins': ['*'],
        'allowedHeaders': ['Content-Type'],
        'allowedMethods': [HttpMethod.GET],
      },
    });

    // ------ State machine ------
    const sendEmailToApplicant = new tasks.CallAwsService(this, 'SendEmailToApplicant', {
      service: 'sesv2',
      action: 'sendEmail',
      parameters: {
        "Destination": {
          "ToAddresses.$": "States.Array($.fromEmail)"
        },
        "FromEmailAddress": process.env['SES_IDENTITY'],
        "Content": {
          "Simple": {
            "Body": {
              "Html": {
                "Charset": "UTF-8",
                "Data": "<h2>Your Leave Request Received</h2><p>Your leave request submitted successfully and will let you know once it is approved/rejected.</p>",
              },
            },
            "Subject": {
              "Charset": "UTF-8",
              "Data": "Leave request confirmation - Simple Leaves System"
            }
          }
        }
      },
      iamResources: ['arn:aws:ses:' + Stack.of(this).region + ':' + Stack.of(this).account + ':identity/' + process.env['SES_IDENTITY']],
      resultPath: '$.result',
    });

    const leaveRequestDetailsHtml = '<li>Request From: {}</li><li>Leave from: {}</li><li>Leave to: {}</li><li>Reason: {}</li>';
    const sendEmailToManagerBody = '<h2>Leave requested</h2><p>There is a leave requested with details below: </p>' + leaveRequestDetailsHtml + '<p>You may approve/reject it here.</p><p><a style="color: green" href="' + leaveApproveOrRejectLambdaUrl.url + '?token={}&approve=true">Accept</a> | <a style="color: red" href="' + leaveApproveOrRejectLambdaUrl.url + '?token={}&approve=false">Reject</a></p>';
    const sendEmailToManager = new tasks.CallAwsService(this, 'SendEmailToManager', {
      service: 'sesv2',
      action: 'sendEmail',
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      parameters: {
        "Destination": {
          "ToAddresses.$": "States.Array($.toEmail)"
        },
        "FromEmailAddress": process.env['SES_IDENTITY'],
        "Content": {
          "Simple": {
            "Body": {
              "Html": {
                "Charset": "UTF-8",
                "Data": sfn.JsonPath.format(sendEmailToManagerBody, sfn.JsonPath.stringAt('$.fromEmail'), sfn.JsonPath.stringAt('$.leaveDateFrom'), sfn.JsonPath.stringAt('$.leaveDateTo'), sfn.JsonPath.stringAt('$.reason'), sfn.JsonPath.taskToken, sfn.JsonPath.taskToken),
              },
            },
            "Subject": {
              "Charset": "UTF-8",
              "Data": "Leave request submitted - Simple Leaves System"
            }
          }
        }
      },
      iamResources: ['arn:aws:ses:' + Stack.of(this).region + ':' + Stack.of(this).account + ':identity/' + process.env['SES_IDENTITY']],
      resultPath: '$.result',
    });

    const errorTransform = new sfn.Pass(this, 'ErrorTransform', {
      resultPath: '$.result',
      parameters: {
        "status": sfn.JsonPath.stringAt('$.result.Error'),
      }
    });

    sendEmailToManager.addCatch(errorTransform, {
      resultPath: '$.result'
    });

    const saveLeaveStatus = new tasks.DynamoUpdateItem(this, 'UpdateLeaveStatus', {
      key: { pk: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.pk')) },
      table: this.table,
      expressionAttributeValues: {
        ':status': tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.result.status')),
      },
      updateExpression: 'SET #status = :status',
      expressionAttributeNames: {
        '#status': 'status'
      },
      conditionExpression: 'attribute_exists(pk)',
      resultPath: '$.result.leaveUpdateStatus',
    });

    sendEmailToManager.next(saveLeaveStatus);
    errorTransform.next(saveLeaveStatus);

    const sendResultEmailToApplicantBody = '<h2>Your leave request is processed.</h2><p>The leave request you submitted is {}.</p>';
    const sendResultEmailToApplicant = new tasks.CallAwsService(this, 'SendResultEmailToApplicant', {
      service: 'sesv2',
      action: 'sendEmail',
      parameters: {
        "Destination": {
          "ToAddresses.$": "States.Array($.toEmail)"
        },
        "FromEmailAddress": process.env['SES_IDENTITY'],
        "Content": {
          "Simple": {
            "Body": {
              "Html": {
                "Charset": "UTF-8",
                "Data": sfn.JsonPath.format(sendResultEmailToApplicantBody, sfn.JsonPath.stringAt('$.result.status')),
              }
            },
            "Subject": {
              "Charset": "UTF-8",
              "Data": "Your leave request processed - Simple Leaves System"
            }
          }
        }
      },
      iamResources: ['arn:aws:ses:' + Stack.of(this).region + ':' + Stack.of(this).account + ':identity/' + process.env['SES_IDENTITY']],
      resultPath: '$.result',
    });

    saveLeaveStatus.next(sendResultEmailToApplicant);

    const sendReminderToManagerBody = '<h2>Reminder: Leave request waiting for your review.</h2><p>There is a leave request waiting for your review. Below are the details.</p>' + leaveRequestDetailsHtml;
    const sendReminderToManager = new tasks.CallAwsService(this, 'SendReminderToManager', {
      service: 'sesv2',
      action: 'sendEmail',
      parameters: {
        "Destination": {
          "ToAddresses.$": "States.Array($.toEmail)"
        },
        "FromEmailAddress": process.env['SES_IDENTITY'],
        "Content": {
          "Simple": {
            "Body": {
              "Html": {
                "Charset": "UTF-8",
                "Data": sfn.JsonPath.format(sendReminderToManagerBody, sfn.JsonPath.stringAt('$.fromEmail'), sfn.JsonPath.stringAt('$.leaveDateFrom'), sfn.JsonPath.stringAt('$.leaveDateTo'), sfn.JsonPath.stringAt('$.reason')),
              },
            },
            "Subject": {
              "Charset": "UTF-8",
              "Data": "Reminder: Review leave request - Simple Leaves System"
            }
          }
        }
      },
      iamResources: ['arn:aws:ses:' + Stack.of(this).region + ':' + Stack.of(this).account + ':identity/' + process.env['SES_IDENTITY']],
      resultPath: '$.result',
    });


    const waitingForRetry = new sfn.Wait(this, 'Wait', {
      time: sfn.WaitTime.duration(Duration.seconds(30)),
    });

    sendReminderToManager.next(waitingForRetry);

    const checkLeaveStatus = new tasks.DynamoGetItem(this, 'GetLeaveData', {
      key: { pk: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.pk')) },
      table: this.table,
      resultPath: '$.result',
    });

    const passToEnd = new sfn.Pass(this, 'Pass');
    passToEnd.endStates;

    const checkIfLeaveIsProcessed = new sfn.Choice(this, 'CheckIfLeaveIsProcessed')
      .when(sfn.Condition.stringEquals('$.result.Item.status.S', 'pending'), sendReminderToManager)
      .otherwise(passToEnd);

    const ParallelBranchReminderFlow = waitingForRetry.next(checkLeaveStatus).next(checkIfLeaveIsProcessed);
    const ParallelBranchApprovalFlow = sendEmailToManager;

    const parallel = new sfn.Parallel(this, 'ParalellProcessing', {}).branch(ParallelBranchReminderFlow).branch(ParallelBranchApprovalFlow);

    const stateMachineDefinition = sendEmailToApplicant.next(parallel);

    const stateMachine = new sfn.StateMachine(this, 'SimpleLeaveManagement', {
      definition: stateMachineDefinition,
    });

    // Setting permissions for state machine
    stateMachine.role?.attachInlinePolicy(
      new iam.Policy(this, 'additionalPermissions', {
        statements: [
          new iam.PolicyStatement({
            actions: ['ses:SendEmail'],
            resources: ['arn:aws:ses:' + Stack.of(this).region + ':' + Stack.of(this).account + ':identity/' + process.env['SES_IDENTITY']],
          }),
        ],
      }),
    )

    // Create lambda function to initialize step function
    const initStepFunctionLambda = new nodejs_lambda.NodejsFunction(this, "InitStepFunction", {
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: path.join(__dirname, `/../lambda/Init/index.ts`),
      handler: "handler",
      retryAttempts: 0,
      timeout: Duration.seconds(15),
      environment: {
        STATE_MACHINE: stateMachine.stateMachineArn,
      },
    });
    stateMachine.grantStartExecution(initStepFunctionLambda);

    const sqsDlq = new sqs.Queue(this, 'DeadLetterQueue');

    // Dynamodb stream trigger settings for initStepFunctionLambda lambda function
    const dynamoEventsourceMapping = new lambda.EventSourceMapping(this, 'dynamoEventsourceMapping', {
      target: initStepFunctionLambda,
      eventSourceArn: this.table.tableStreamArn,
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      batchSize: 5,
      retryAttempts: 2,
      onFailure: new eventsources.SqsDlq(sqsDlq),
    });

    // Enable filtering for the event source mapping
    const cfnDynamoEventSourceMapping = dynamoEventsourceMapping.node.defaultChild as lambda.CfnEventSourceMapping;
    cfnDynamoEventSourceMapping.addPropertyOverride("FilterCriteria", {
      "Filters": [
        {
          "Pattern": JSON.stringify({
            "eventName": ["INSERT"],
            "dynamodb": {
              "NewImage": {
                "type": {
                  "S": ["leaveRequest"]
                },
                "status": {
                  "S": ["pending"]
                }
              }
            }
          })
        }
      ]
    });

    this.table.grantStreamRead(initStepFunctionLambda);
  }
}
