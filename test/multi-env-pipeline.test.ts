import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { NetworkStack } from '../lib/network-stack';
import { ApiStack } from '../lib/api-stack';
import { configs } from '../lib/config';

describe('NetworkStack', () => {
  test('dev stack creates VPC with correct configuration', () => {
    const app = new cdk.App();
    const stack = new NetworkStack(app, 'TestNetworkStack', {
      config: configs.dev,
    });
    const template = Template.fromStack(stack);

    // VPC exists
    template.resourceCountIs('AWS::EC2::VPC', 1);

    // Public and private subnets across 2 AZs = 4 subnets total
    template.resourceCountIs('AWS::EC2::Subnet', 4);

    // Dev gets 1 NAT Gateway
    template.resourceCountIs('AWS::EC2::NatGateway', 1);

    // Security group exists
    template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
  });

  test('prod stack creates VPC with 2 NAT Gateways for redundancy', () => {
    const app = new cdk.App();
    const stack = new NetworkStack(app, 'TestNetworkStackProd', {
      config: configs.prod,
    });
    const template = Template.fromStack(stack);

    // Prod gets 2 NAT Gateways
    template.resourceCountIs('AWS::EC2::NatGateway', 2);
  });

  test('stack outputs VPC ID and security group ID', () => {
    const app = new cdk.App();
    const stack = new NetworkStack(app, 'TestNetworkStackOutputs', {
      config: configs.dev,
    });
    const template = Template.fromStack(stack);

    const outputs = template.findOutputs('*');
    expect(Object.keys(outputs)).toContain('VpcId');
    expect(Object.keys(outputs)).toContain('LambdaSecurityGroupId');
  });
});

describe('ApiStack', () => {
  const createStacks = (env: 'dev' | 'staging' | 'prod') => {
    const app = new cdk.App();
    const networkStack = new NetworkStack(app, `NetworkStack-${env}`, {
      config: configs[env],
    });
    const apiStack = new ApiStack(app, `ApiStack-${env}`, {
      config: configs[env],
      networkStack,
    });
    return Template.fromStack(apiStack);
  };

  test('dev stack creates Lambda with correct memory', () => {
    const template = createStacks('dev');
    template.hasResourceProperties('AWS::Lambda::Function', {
      MemorySize: 512,
    });
  });

  test('staging stack creates Lambda with correct memory', () => {
    const template = createStacks('staging');
    template.hasResourceProperties('AWS::Lambda::Function', {
      MemorySize: 1024,
    });
  });

  test('prod stack creates Lambda with correct memory', () => {
    const template = createStacks('prod');
    template.hasResourceProperties('AWS::Lambda::Function', {
      MemorySize: 3008,
    });
  });

  test('Lambda has correct environment variables', () => {
    const template = createStacks('dev');
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          ENV: 'dev',
          LOG_LEVEL: 'DEBUG',
        },
      },
    });
  });

  test('API Gateway is created', () => {
    const template = createStacks('dev');
    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
  });

  test('API URL is stored in Parameter Store', () => {
    const template = createStacks('dev');
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/multi-env-pipeline/dev/api-url',
      Type: 'String',
    });
  });

  test('prod log group retains logs on stack deletion', () => {
    const template = createStacks('prod');
    template.hasResource('AWS::Logs::LogGroup', {
      DeletionPolicy: 'Retain',
    });
  });

  test('dev log group is destroyed with stack', () => {
    const template = createStacks('dev');
    template.hasResource('AWS::Logs::LogGroup', {
      DeletionPolicy: 'Delete',
    });
  });
});
