import { SecretValue } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';
type Props = {
  vpc: ec2.Vpc;
  dbUserName: string;
  dbPassword: string;
};

export class RdsConstruct extends Construct {
  dbInstance: rds.DatabaseInstance;
  securityGroup: ec2.SecurityGroup;
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    this.dbInstance = this.#createRds(props);
  }

  #createRds(props: Props): rds.DatabaseInstance {
    const parameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_6,
      }),
      parameters: {
        max_connections: '100',
      },
    });
    this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      securityGroupName: 'redash-db-sg',
      allowAllOutbound: true,
      description: 'Security group for Redash DB',
      vpc: props.vpc,
    });

    const dbInstance = new rds.DatabaseInstance(this, 'RDS', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_6,
      }),
      vpc: props.vpc,
      vpcSubnets: {
        subnets: props.vpc.isolatedSubnets,
      },
      databaseName: 'redash',
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      publiclyAccessible: true,
      deletionProtection: false,
      parameterGroup,
      securityGroups: [this.securityGroup],
      credentials: {
        username: props.dbUserName,
        password: SecretValue.unsafePlainText(props.dbPassword),
      },
    });
    return dbInstance;
  }
}
