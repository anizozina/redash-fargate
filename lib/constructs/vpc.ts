import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class VpcConstruct extends Construct {
  vpc: ec2.Vpc;
  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.vpc = this.#createVpc();
  }

  #createVpc(): ec2.Vpc {
    const vpc = new ec2.Vpc(this, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'ingress',
          subnetType: ec2.SubnetType.PUBLIC,
          mapPublicIpOnLaunch: true,
        },
        {
          cidrMask: 28,
          name: 'database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
      natGateways: 1,
    });
    interfaceEndpoints.forEach((endpoint) => {
      vpc.addInterfaceEndpoint(endpoint.name, {
        service: endpoint.service,
        subnets: { subnets: vpc.isolatedSubnets },
      });
    });
    return vpc;
  }
}

const interfaceEndpoints = [
  {
    name: 'ecr',
    service: ec2.InterfaceVpcEndpointAwsService.ECR,
  },
  {
    name: 'ecr-docker',
    service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
  },
];
