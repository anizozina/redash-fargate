import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as redis from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';

type Props = {
  vpc: ec2.Vpc;
};

export class RedisConstruct extends Construct {
  redisInstance: redis.CfnCacheCluster;
  securityGroup: ec2.SecurityGroup;
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    this.redisInstance = this.#createRedis(props);
  }

  #createRedis(props: Props): redis.CfnCacheCluster {
    const securityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc: props.vpc,
      securityGroupName: 'redash-redis-sg',
      allowAllOutbound: true,
      description: 'Security group for Redash Redis',
    });

    for (const subnet of props.vpc.publicSubnets) {
      securityGroup.addIngressRule(
        ec2.Peer.ipv4(subnet.ipv4CidrBlock),
        ec2.Port.tcp(6379),
        'Allow inbound traffic from public subnets'
      );
    }
    this.securityGroup = securityGroup;
    const redisSubnetGroup = new redis.CfnSubnetGroup(
      this,
      'RedashRedisClusterPrivateSubnetGroup',
      {
        description: `Redash Redis Cluster Private Subnet Group`,
        cacheSubnetGroupName: 'redash-subnet',
        subnetIds: props.vpc.privateSubnets.map((s) => s.subnetId),
      }
    );
    const redisInstance = new redis.CfnCacheCluster(this, `RedisCluster`, {
      engine: 'redis',
      port: 6379,
      cacheNodeType: `cache.t4g.micro`,
      numCacheNodes: 1,
      clusterName: 'redash',
      vpcSecurityGroupIds: [securityGroup.securityGroupId],
      cacheSubnetGroupName: redisSubnetGroup.cacheSubnetGroupName,
    });
    // const redisInstance = new redis.CfnServerlessCache(this, 'Redis', {
    //   engine: 'redis',
    //   serverlessCacheName: 'redash-redis',
    //   majorEngineVersion: '7',
    //   securityGroupIds: [securityGroup.securityGroupId],
    //   subnetIds: props.vpc.publicSubnets.map((subnet) => subnet.subnetId),
    // });

    return redisInstance;
  }
}
