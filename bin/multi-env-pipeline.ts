#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { NetworkStack } from "../lib/network-stack";
import { ApiStack } from "../lib/api-stack";
import { configs, Environment } from "../lib/config";

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || "us-east-2";

const environments: Environment[] = ["dev", "staging", "prod"];

environments.forEach((envName) => {
  const config = configs[envName];

  const networkStack = new NetworkStack(app, `NetworkStack-${envName}`, {
    config,
    env: { account, region },
    tags: {
      Environment: envName,
      Project: "multi-env-pipeline",
    },
  });

  const apiStack = new ApiStack(app, `ApiStack-${envName}`, {
    config,
    networkStack,
    env: { account, region },
    tags: {
      Environment: envName,
      Project: "multi-env-pipeline",
    },
  });

  apiStack.addDependency(networkStack);
});

// Pipeline trigger - v1.0
