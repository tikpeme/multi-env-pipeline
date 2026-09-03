export type Environment = 'dev' | 'staging' | 'prod';

export interface EnvironmentConfig {
  env: Environment;
  logLevel: 'DEBUG' | 'INFO' | 'ERROR';
  lambdaMemoryMB: number;
  lambdaTimeoutSeconds: number;
  enableDetailedMonitoring: boolean;
}

export const configs: Record<Environment, EnvironmentConfig> = {
  dev: {
    env: 'dev',
    logLevel: 'DEBUG',
    lambdaMemoryMB: 512,
    lambdaTimeoutSeconds: 30,
    enableDetailedMonitoring: false,
  },
  staging: {
    env: 'staging',
    logLevel: 'INFO',
    lambdaMemoryMB: 1024,
    lambdaTimeoutSeconds: 30,
    enableDetailedMonitoring: false,
  },
  prod: {
    env: 'prod',
    logLevel: 'ERROR',
    lambdaMemoryMB: 3008,
    lambdaTimeoutSeconds: 30,
    enableDetailedMonitoring: true,
  },
};
