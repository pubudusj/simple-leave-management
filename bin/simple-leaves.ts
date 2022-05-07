#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SimpleLeavesStack } from '../lib/simple-leaves-stack';
import { CreateLeaveApiStack } from '../lib/create-leave-api-stack';
import { CreateLeaveFrontendStack } from '../lib/create-leave-frontend-stack';

const app = new cdk.App();

const leavesStack = new SimpleLeavesStack(app, 'SimpleLeavesStack');

new CreateLeaveApiStack(app, 'CreateLeaveApiStack', {
  table: leavesStack.table,
});

new CreateLeaveFrontendStack(app, 'CreateLeaveFrontendStack');
