import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { Constants } from './constant';
import { EcsConstruct } from './constructs/ecs';
import { RdsConstruct } from './constructs/rds';
import { RedashInitTask } from './constructs/redash-init-task';
import { RedashServerConstruct } from './constructs/redash-server';
import { RedashWorkerConstruct } from './constructs/redash-worker';
import { RedisConstruct } from './constructs/redis';
import { VpcConstruct } from './constructs/vpc';

type Props = cdk.StackProps & {
  certificateArn: string | null;
  customDomain: string | null;
  rootDomain: string | null;
};

export class RedashEcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    // VPCの作成
    const { vpc } = new VpcConstruct(this, 'Vpc');
    // RDSの作成
    const { dbInstance, securityGroup: rdsSecurityGroup } = new RdsConstruct(
      this,
      'RDS',
      {
        vpc,
        dbUserName: 'redash',
        dbPassword: 'redashPassword',
      }
    );

    // Redisの作成
    const { redisInstance, securityGroup: redisSecurityGroup } =
      new RedisConstruct(this, 'Redis', {
        vpc,
      });
    // ECSの作成
    const { cluster } = new EcsConstruct(this, 'Ecs', {
      vpc,
    });

    const redisUrl = `redis://${redisInstance.attrRedisEndpointAddress}:${redisInstance.attrRedisEndpointPort}/0`;
    const dbUrl = `postgresql://redash:redashPassword@${dbInstance.dbInstanceEndpointAddress}:${dbInstance.dbInstanceEndpointPort}/redash`;
    const redashSecretKey =
      '448103d7d3e2447674381a58c23a69d25ed8d97fca55f0f45a010b3c2b0bea3e';
    const redashCookieSecret =
      'a4bc9ffcd07b501322590456a3eaeea11463d9519e363438e5376684b70ea839';
    const defaultTaskParams = {
      cluster,
      redisUrl,
      dbUrl,
      redashCookieSecret,
      redashSecretKey,
    };

    const { service, securityGroup } = new RedashServerConstruct(
      this,
      'RedashServer',
      {
        vpc,
        ...defaultTaskParams,
        ssmClientIdPath: Constants.googleClientIdPath,
        ssmClientSecretPath: Constants.googleClientSecretPath,
        certificateArn: props.certificateArn,
        customDomain: props.customDomain,
        rootDomain: props.rootDomain,
      }
    );
    rdsSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(securityGroup.securityGroupId),
      ec2.Port.tcp(5432),
      'Allow inbound traffic from ECS Tasks'
    );

    redisSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(securityGroup.securityGroupId),
      ec2.Port.tcp(6379),
      'Allow inbound traffic from ECS Tasks'
    );

    new cdk.CfnOutput(this, `RedashServerUrl`, {
      value: service.loadBalancer.loadBalancerDnsName,
    });

    const initDbTask = new RedashInitTask(
      this,
      'RedashInitTask',
      defaultTaskParams
    );
    // データベースの初期化に必要
    this.outputTriggerInitDbTaskScript(cluster, initDbTask, vpc, securityGroup);
    // 必要があれば、コンテナにアタッチして直接さがす
    this.outputAttachContainerScript(cluster, service);

    this.outputGoogleCallbackUrl(service);

    this.createWorkerTask(
      'RedashScheduler',
      {
        ...defaultTaskParams,
        serviceName: 'scheduler',
        queues: 'celery',
        workersCount: '1',
        command: 'scheduler',
      },
      securityGroup
    );
    this.createWorkerTask(
      'RedashScheduledWorker',
      {
        ...defaultTaskParams,
        serviceName: 'scheduled-worker',
        queues: 'scheduled_queries,schemas',
        workersCount: '1',
        command: 'worker',
      },
      securityGroup
    );
    this.createWorkerTask(
      'RedashAdhocWorker',
      {
        ...defaultTaskParams,
        serviceName: 'adhoc_worker',
        queues: 'queries',
        workersCount: '2',
        command: 'worker',
      },
      securityGroup
    );
  }

  private createWorkerTask(
    id: string,
    taskParams: {
      cluster: cdk.aws_ecs.Cluster;
      redisUrl: string;
      dbUrl: string;
      redashCookieSecret: string;
      redashSecretKey: string;
      serviceName: string;
      queues: string;
      workersCount: string;
      command: string;
    },
    securityGroup: cdk.aws_ec2.SecurityGroup
  ) {
    const { serviceName, queues, workersCount, command, ...params } =
      taskParams;
    new RedashWorkerConstruct(this, id, {
      ...params,
      securityGroup,
      params: { serviceName, queues, workersCount, command },
    });
  }

  private outputGoogleCallbackUrl(
    service: cdk.aws_ecs_patterns.ApplicationLoadBalancedFargateService
  ) {
    new cdk.CfnOutput(this, 'GoogleLoginCallbackURL', {
      value: `https://${service.loadBalancer.loadBalancerDnsName}/oauth/google_callback`,
    });
  }

  private outputAttachContainerScript(
    cluster: cdk.aws_ecs.Cluster,
    service: cdk.aws_ecs_patterns.ApplicationLoadBalancedFargateService
  ) {
    new cdk.CfnOutput(this, 'run-to-attach-to-container', {
      value: `aws ecs execute-command --cluster ${cluster.clusterName} \
--task $(aws ecs list-tasks --cluster ${cluster.clusterArn} --family ${
        service.taskDefinition.family
      } --desired-status RUNNING --output text --query 'tasks[0]') \
--container ${
        service.taskDefinition.defaultContainer?.containerName || 'Container'
      } \
--interactive \
--command "/bin/bash"`,
    });
  }

  private outputTriggerInitDbTaskScript(
    cluster: cdk.aws_ecs.Cluster,
    initDbTask: RedashInitTask,
    vpc: cdk.aws_ec2.Vpc,
    securityGroup: cdk.aws_ec2.SecurityGroup
  ) {
    new cdk.CfnOutput(this, 'run-db-initialize-command', {
      value: `aws ecs run-task --cluster ${cluster.clusterName} \
--task-definition ${initDbTask.taskDefinition.taskDefinitionArn} \
--launch-type FARGATE \
--network-configuration 'awsvpcConfiguration={subnets=[${vpc.publicSubnets[0].subnetId}], securityGroups=[${securityGroup.securityGroupId}], assignPublicIp=ENABLED}'`,
      description:
        'Run this command to create the Redash Table after the RDS instance is created',
    });
  }
}
