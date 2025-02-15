import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { Constants } from '../constant';

export class GoogleCredentialConstruct extends Construct {
  
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new ssm.StringParameter(this, 'Google Client ID', {
      parameterName: Constants.googleClientIdPath,
      // 払い出したあとに手動でコンソールを更新する
      stringValue: 'dummy'
    });
    new ssm.StringParameter(this, 'Google Client Secret', {
      parameterName: Constants.googleClientSecretPath,
      // 払い出したあとに手動でコンソールを更新する
      stringValue: 'dummy'
    });
  }
}
