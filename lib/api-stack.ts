import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { EnvironmentConfig } from "./config";
import { NetworkStack } from "./network-stack";

export interface ApiStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  networkStack: NetworkStack;
}

export class ApiStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { config, networkStack } = props;

    // CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, "ApiLogGroup", {
      logGroupName: `/multi-env-pipeline/${config.env}/api`,
      retention:
        config.env === "prod"
          ? logs.RetentionDays.THREE_MONTHS
          : logs.RetentionDays.ONE_WEEK,
      removalPolicy:
        config.env === "prod"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    });

    // Lambda function
    const orderHandler = new lambda.Function(this, "OrderHandler", {
      functionName: `order-handler-${config.env}`,
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: "orders.handler",
      code: lambda.Code.fromAsset("src/handlers"),
      memorySize: config.lambdaMemoryMB,
      timeout: cdk.Duration.seconds(config.lambdaTimeoutSeconds),
      vpc: networkStack.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [networkStack.lambdaSecurityGroup],
      logGroup,
      environment: {
        ENV: config.env,
        LOG_LEVEL: config.logLevel,
      },
    });

    // API Gateway
    const api = new apigateway.RestApi(this, "Api", {
      restApiName: `multi-env-api-${config.env}`,
      description: `Orders API for ${config.env}`,
      deployOptions: {
        stageName: config.env,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: config.env !== "prod",
        metricsEnabled: config.enableDetailedMonitoring,
      },
    });

    // Routes
    const orders = api.root.addResource("orders");
    orders.addMethod("POST", new apigateway.LambdaIntegration(orderHandler));
    orders.addMethod("GET", new apigateway.LambdaIntegration(orderHandler));

    // Store API URL in Parameter Store
    new ssm.StringParameter(this, "ApiUrlParameter", {
      parameterName: `/multi-env-pipeline/${config.env}/api-url`,
      stringValue: api.url,
      description: `API URL for ${config.env}`,
    });

    // Outputs
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: `API URL for ${config.env}`,
      exportName: `ApiUrl-${config.env}`,
    });

    this.apiUrl = api.url;
  }
}
