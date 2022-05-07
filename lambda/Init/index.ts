const AWS = require('aws-sdk');
const stepfunctions = new AWS.StepFunctions();

const STATE_MACHINE = process.env.STATE_MACHINE || '';

export const handler = async (event: any = {}): Promise<any> => {
  for (let record of event.Records) {
    let data = {
      pk: record.dynamodb.NewImage.pk.S,
      fromEmail: record.dynamodb.NewImage.from.S,
      toEmail: record.dynamodb.NewImage.to.S,
      leaveDateFrom: record.dynamodb.NewImage.leaveDateFrom.S,
      leaveDateTo: record.dynamodb.NewImage.leaveDateTo.S,
      reason: record.dynamodb.NewImage.reason.S,
    }

    let params = {
      stateMachineArn: STATE_MACHINE,
      input: JSON.stringify(data)
    };

    await stepfunctions.startExecution(params).promise();
  }
};
