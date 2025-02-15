import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { GoogleCredentialConstruct } from './constructs/google-credential';
export class GoogleCredentialStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    new GoogleCredentialConstruct(this, 'GoogleCredential');
  }
}
