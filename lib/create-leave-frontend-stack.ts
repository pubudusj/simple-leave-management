import {
  Stack,
  StackProps,
  aws_s3_assets as s3_assets,
  CfnOutput,
} from 'aws-cdk-lib';
import * as amplify from '@aws-cdk/aws-amplify-alpha';
import { Construct } from 'constructs';

export class CreateLeaveFrontendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const s3Assets = new s3_assets.Asset(this, 'S3Assets', {
      path: 'frontend/dist/',
    });

    const webHosting = new amplify.App(this, 'AmplifyHosting', {
      appName: 'SimpleLeaveHosting',
    });

    const branch = 'dev';
    webHosting.addBranch(branch, { asset: s3Assets });

    new CfnOutput(this, 'HostingUrl', {value: 'https://' + branch + '.' + webHosting.defaultDomain});
  }
}
