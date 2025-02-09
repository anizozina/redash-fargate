#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { RedashEcsStack } from '../lib/redash-ecs-stack';

const app = new cdk.App();
new RedashEcsStack(app, 'RedashEcsStack', {
  env: {
    region: 'ap-northeast-1',
  },
});
