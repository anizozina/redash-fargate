#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Constants } from '../lib/constant';
import { RedashEcsStack } from '../lib/redash-ecs-stack';
import { prepareParameter } from './part/ssm';

const app = new cdk.App();

// Client ID/Secretは手動で転記する
await prepareParameter(Constants.googleClientIdPath);
await prepareParameter(Constants.googleClientSecretPath);

const env = app.node.tryGetContext('env');
const param = app.node.tryGetContext(env);

const acmArn = param?.['acm_arn'];
const customDomain = param?.['custom_domain'];
const rootDomain = param?.['root_domain'];

new RedashEcsStack(app, 'RedashEcsStack', {
  certificateArn: acmArn,
  customDomain,
  rootDomain,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'ap-northeast-1',
  },
});
