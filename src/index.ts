import * as core from '@actions/core';
import { loadEnvChecks, validateEnv } from './validateEnv';

try {
  const envFile = core.getInput('env-file');
  const envChecks = loadEnvChecks(envFile);

  const filteredEnv = Object.keys(process.env).reduce((acc, key) => {
    if (process.env[key] !== undefined) {
      acc[key] = process.env[key]!;
    }
    return acc;
  }, {} as { [key: string]: string });

  validateEnv(filteredEnv, envChecks);
  core.setOutput('validation-passed', true);
} catch (error) {
  core.setFailed((error as Error).message);
}

