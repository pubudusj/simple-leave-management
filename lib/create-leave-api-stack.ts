import {
  Stack,
  StackProps,
  Duration,
  aws_dynamodb as ddb,
  aws_lambda as lambda,
  aws_lambda_nodejs as nodejs_lambda,
  CfnOutput,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';
import { HttpMethod } from 'aws-cdk-lib/aws-events';

export interface SimpleLeaveStackProps extends StackProps {
  table: ddb.Table;
}

export class CreateLeaveApiStack extends Stack {
  private table: ddb.Table;

  constructor(scope: Construct, id: string, props: SimpleLeaveStackProps) {
    super(scope, id, props);

    const table = props.table;

    // Lambada - create a leave
    const createLeaveLambda = new nodejs_lambda.NodejsFunction(this, "CreateLeaveLambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: path.join(__dirname, `/../lambda/CreateLeave/index.ts`),
      handler: "handler",
      retryAttempts: 0,
      timeout: Duration.seconds(15),
      environment: {
        DB_TABLE: table.tableName
      }
    });
    table.grant(createLeaveLambda, 'dynamodb:PutItem');

    // Create function url for create leave lambda function
    const createLeaveLambdaUrl = createLeaveLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        'allowedOrigins': ['*'],
        'allowedHeaders': ['Content-Type'],
        'allowedMethods': [HttpMethod.POST],
      },
    });

    new CfnOutput(this, 'CreateLeaveLambdaApiUrl', {value: createLeaveLambdaUrl.url});
  }
}
