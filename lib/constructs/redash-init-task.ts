import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as logs from 'aws-cdk-lib/aws-logs';

import { Construct } from 'constructs';
import { Constants } from '../constant';

type Props = {
  redisUrl: string;
  dbUrl: string;
  redashSecretKey: string;
  redashCookieSecret: string;
};
export class RedashInitTask extends Construct {
  taskDefinition: ecs.FargateTaskDefinition;
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    this.taskDefinition = this.#createTaskDefinition({ id, ...props });
  }
  #createTaskDefinition(
    props: { id: string } & Props
  ): ecs.FargateTaskDefinition {
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      `${props.id}TaskDefinition`,
      {
        family: props.id,
        cpu: 256,
        memoryLimitMiB: 512,
      }
    );
    const logGroup = logs.LogGroup.fromLogGroupName(
      this,
      `${props.id}LogGroup`,
      'redash'
    );
    taskDefinition.addContainer(`${props.id}Container`, {
      image: ecs.ContainerImage.fromRegistry(Constants.redashImage),
      logging: new ecs.AwsLogDriver({
        logGroup: logGroup,
        streamPrefix: 'redash-db-task',
      }),
      environment: {
        PYTHONUNBUFFERED: '0',
        REDASH_LOG_LEVEL: 'DEBUG',
        REDASH_REDIS_URL: props.redisUrl,
        REDASH_DATABASE_URL: props.dbUrl,
        REDASH_SECRET_KEY: props.redashSecretKey,
        REDASH_COOKIE_SECRET: props.redashCookieSecret,
        REDASH_PASSWORD_LOGIN_ENABLED: 'false',
        REDASH_ALLOW_SCRIPTS_IN_USER_INPUT: 'true',
        REDASH_DATE_FORMAT: 'YY/MM/DD',
      },
      command: ['create_db'],
    });
    return taskDefinition;
  }
}
