#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Constants } from '../lib/constant';
import { RedashEcsStack } from '../lib/redash-ecs-stack';
import { prepareParameter } from './part/ssm';

const app = new cdk.App();

// Client ID/Secretは手動で転記する
await prepareParameter(Constants.googleClientIdPath);
await prepareParameter(Constants.googleClientSecretPath);


new RedashEcsStack(app, 'RedashEcsStack', {
  env: {
    region: 'ap-northeast-1',
  },
});