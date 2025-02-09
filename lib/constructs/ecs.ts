import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';
type Props = { vpc: ec2.Vpc };

export class EcsConstruct extends Construct {
  cluster: ecs.Cluster;
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);
    this.cluster = this.#createEcsCluster(props);
  }

  #createEcsCluster(props: Props): ecs.Cluster {
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      clusterName: 'redash-cluster',
    });

    return cluster;
  }
}
