const AWS = require('aws-sdk');
var docClient = new AWS.DynamoDB.DocumentClient();
const emailValidator = require('email-validator');
const { v4: uuidv4 } = require('uuid');

const DB_TABLE = process.env.DB_TABLE || '';

export const handler = async (event: any = {}): Promise<any> => {
  let Body = JSON.parse(event.body);
  console.log(Body);

  let validationErrors = validateInput(Body);

  if (validationErrors !== null) {
    return validationErrors;
  }

  let pk = uuidv4();

  var params = {
    Item: {
      pk: pk,
      type: "leaveRequest",
      from: Body.applicantEmail,
      to: Body.approverEmail,
      reason: Body.reason,
      leaveDateFrom: Body.leaveStartDate,
      leaveDateTo: Body.leaveEndDate,
      status: 'pending',
    },
    ReturnConsumedCapacity: "TOTAL",
    TableName: process.env.DB_TABLE,
  };

  console.log(params);

  try {
    await docClient.put(params).promise();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Candidate created",
        data: {
          id: pk,
        },
      }),
    };
  } catch (error: any) {
    console.error("Error", error.stack);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Candidate creation failed",
        error: error.stack,
      }),
    };
  }
};

function validateInput(body: any) {
  let errors = [];

  if (!emailValidator.validate(body.applicantEmail)) {
    errors.push("Required field applicantEmail not found or invalid");
  }

  if (!emailValidator.validate(body.approverEmail)) {
    errors.push("Required field approverEmail not found or invalid");
  }

  if (!body.leaveStartDate) {
    errors.push("Required field leaveStartDate not found or invalid");
  }

  if (!body.leaveEndDate) {
    errors.push("Required field leaveEndDate not found or invalid");
  }

  if (!body.reason) {
    errors.push("Required field reason not found or invalid");
  }

  if (errors.length > 0) {
    return {
      statusCode: 422,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Validation errors",
        errors: errors,
      }),
    };
  }

  return null;
}