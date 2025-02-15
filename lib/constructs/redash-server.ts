import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import {
  ApplicationLoadBalancer,
  Protocol,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { Constants } from '../constant';
type Props = {
  vpc: ec2.Vpc;
  cluster: ecs.Cluster;
  redisUrl: string;
  dbUrl: string;
  redashSecretKey: string;
  redashCookieSecret: string;
  ssmClientIdPath: string;
  ssmClientSecretPath: string;
};
/**
 * Create ELB and Fargate Service for Redash Server
 */
export class RedashServerConstruct extends Construct {
  service: ecs_patterns.ApplicationLoadBalancedFargateService;
  securityGroup: ec2.SecurityGroup;
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);
    this.securityGroup = new ec2.SecurityGroup(
      this,
      'RedashServerSecurityGroup',
      {
        securityGroupName: 'redash-ecs-sg',
        vpc: props.vpc,
      }
    );
    this.securityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.allTcp(),
      'ECS Service Internet Access'
    );

    const albSecurityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc,
      allowAllOutbound: true,
    });
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Web Port'
    );
    this.securityGroup.addIngressRule(
      ec2.Peer.securityGroupId(albSecurityGroup.securityGroupId),
      ec2.Port.tcp(5000),
      'Redash Server Port'
    );

    const alb = new ApplicationLoadBalancer(this, 'redash-alb', {
      internetFacing: true, //インターネットからのアクセスを許可するかどうか指定
      loadBalancerName: 'redash-alb',
      securityGroup: albSecurityGroup,
      vpc: props.vpc,
    });

    const taskDefinition = this.#createTaskDefinition(props);

    this.service = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      'ElbService',
      {
        loadBalancer: alb,
        cluster: props.cluster,
        serviceName: 'redash-server',
        taskDefinition,
        taskSubnets: {
          subnetType: ec2.SubnetType.PUBLIC,
        },
        assignPublicIp: true,
        desiredCount: 1,
        securityGroups: [this.securityGroup],
        // コンテナのコマンドを実行できるようにする
        enableExecuteCommand: true,
      }
    );
    this.service.targetGroup.configureHealthCheck({
      healthyHttpCodes: '200-399',
      path: '/ping',
      port: '5000',
      protocol: Protocol.HTTP,
      timeout: cdk.Duration.seconds(30),
      interval: cdk.Duration.seconds(60),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 5,
    });
  }

  #createTaskDefinition(props: Props): ecs.FargateTaskDefinition {
    const environmentVariables = (() => {
      const params = {
        PYTHONUNBUFFERED: '0',
        REDASH_LOG_LEVEL: 'DEBUG',
        REDASH_REDIS_URL: props.redisUrl,
        REDASH_DATABASE_URL: props.dbUrl,
        REDASH_SECRET_KEY: props.redashSecretKey,
        REDASH_COOKIE_SECRET: props.redashCookieSecret,
        REDASH_PASSWORD_LOGIN_ENABLED: 'false',
        REDASH_ALLOW_SCRIPTS_IN_USER_INPUT: 'true',
        REDASH_DATE_FORMAT: 'YY/MM/DD',
      };
      const clientSecret = ssm.StringParameter.valueForStringParameter(
        this,
        props.ssmClientSecretPath
      );
      const clientId = ssm.StringParameter.valueForStringParameter(
        this,
        props.ssmClientIdPath
      );
      if (clientSecret && clientId) {
        return {
          ...params,
          REDASH_GOOGLE_CLIENT_ID: clientId,
          REDASH_GOOGLE_CLIENT_SECRET: clientSecret,
        };
      }
      return params;
    })();
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      'TaskDefinition',
      {
        family: 'redash-server',
        cpu: 512,
        memoryLimitMiB: 1024,
      }
    );
    taskDefinition
      .addContainer('Container', {
        image: ecs.ContainerImage.fromRegistry(Constants.redashImage),
        logging: new ecs.AwsLogDriver({
          logGroup: new logs.LogGroup(this, 'RedashServerLogGroup', {
            logGroupName: 'redash',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            retention: logs.RetentionDays.ONE_WEEK,
          }),
          streamPrefix: 'redash-server',
        }),
        environment: environmentVariables,
        command: ['server'],
      })
      .addPortMappings({
        containerPort: 5000,
        hostPort: 5000,
      });
    return taskDefinition;
  }
}
