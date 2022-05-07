const AWS = require('aws-sdk');
const stepfunctions = new AWS.StepFunctions();

export const handler = async (event: any = {}): Promise<any> => {
  const eventData = event['queryStringParameters'];

  if (eventData['token'] == undefined || eventData['approve'] == undefined) {
    console.log('Query parameters token, approve required.');
    return;
  }

  const token = eventData['token'].split(' ').join('+');
  const approval = eventData['approve'] == 'true' ? true : false;

  if (approval) {
    let params = {
      taskToken: token,
      output: JSON.stringify({
        status: "approved",
        output: {},
      }),
    };
    await stepfunctions.sendTaskSuccess(params).promise();

    return {
      statusCode: 200,
      body: '<p>Leave approved successfully.</p>',
      headers: {
        'Content-Type': 'text/html',
      }
    };
  } else {
    let params = {
      taskToken: token,
      cause: "Leave not approved",
      error: 'rejected',
    };
    await stepfunctions.sendTaskFailure(params).promise();

    return {
      statusCode: 200,
      body: '<p>Leave rejected.</p>',
      headers: {
        'Content-Type': 'text/html',
      }
    };
  }
};
