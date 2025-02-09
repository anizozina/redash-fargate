import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { Constants } from '../constant';

type Props = {
  redisUrl: string;
  dbUrl: string;
  cluster: ecs.Cluster;
  redashCookieSecret: string;
  redashSecretKey: string;
  securityGroup: ec2.SecurityGroup;
  params: {
    serviceName: string;
    queues: string;
    workersCount: string;
    command: string;
  };
};

export class RedashWorkerConstruct extends Construct {
  service: ecs.FargateService;
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);
    const taskDefinition = this.#createTaskDefinition({ id, ...props });

    this.service = new ecs.FargateService(this, id, {
      cluster: props.cluster,
      serviceName: props.params.serviceName,
      taskDefinition,
      desiredCount: 1,
      securityGroups: [props.securityGroup],
    });
  }
  #createTaskDefinition(
    props: { id: string } & Props
  ): ecs.FargateTaskDefinition {
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      'TaskDefinition',
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
    taskDefinition
      .addContainer(`${props.id}-Container`, {
        image: ecs.ContainerImage.fromRegistry(Constants.redashImage),
        logging: new ecs.AwsLogDriver({
          logGroup: logGroup,
          streamPrefix: props.id,
        }),
        command: [props.params.command],
        environment: {
          PYTHONUNBUFFERED: '0',
          REDASH_LOG_LEVEL: 'DEBUG',
          QUEUES: props.params.queues,
          WORKERS_COUNT: props.params.workersCount,
          REDASH_REDIS_URL: props.redisUrl,
          REDASH_DATABASE_URL: props.dbUrl,
          REDASH_SECRET_KEY: props.redashSecretKey,
          REDASH_COOKIE_SECRET: props.redashCookieSecret,
        },
      })
      .addPortMappings({
        containerPort: 5000,
      });
    return taskDefinition;
  }
}
