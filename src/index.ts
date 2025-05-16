import * as core from '@actions/core';
import path from 'path';
import { existsSync, promises as fsPromises } from 'fs';
import TOML from 'toml';
import { validateSecret } from './validateSecrets';

interface SecretsConfig {
  secrets: Record<string, string>;
}

export async function run(): Promise<void> {
  try {
    // Get config file path from input parameter
    const configFilePath = core.getInput('config-file', { required: true });
    const tomlFilePath: string = path.resolve(process.cwd(), configFilePath);
    
    core.debug(`Looking for TOML configuration at: ${tomlFilePath}`);

    if (!existsSync(tomlFilePath)) {
      core.setFailed(`TOML file not found at path: ${tomlFilePath}`);
      return;
    }

    const tomlContent: string = await fsPromises.readFile(tomlFilePath, 'utf-8');
    const secretsConfig: SecretsConfig = TOML.parse(tomlContent);

    if (!secretsConfig || !secretsConfig.secrets) {
      core.setFailed('Invalid configuration file format. Missing "secrets" section.');
      return;
    }
    
    core.info(`Found ${Object.keys(secretsConfig.secrets).length} secrets to validate`);
    let hasFailures = false;

    for (const [name, regex] of Object.entries(secretsConfig.secrets)) {
      const secretValue: string | undefined = process.env[name];
      if (!secretValue) {
        core.warning(`Secret "${name}" not found in environment.`);
        hasFailures = true;
        continue;
      }

      try {
        // Directly use TypeScript validation function
        core.debug(`Validating secret: ${name} with pattern: ${regex}`);
        
        // Capture console output for info/error logging
        const originalConsoleLog = console.log;
        let validationOutput = '';
        
        console.log = (message) => {
          validationOutput += message + '\n';
        };
        
        const isValid = validateSecret(name, secretValue, regex);
        
        // Restore console.log
        console.log = originalConsoleLog;
        
        if (validationOutput) {
          core.info(validationOutput.trim());
        }
        
        if (!isValid) {
          core.error(`Validation failed for secret: ${name}`);
          hasFailures = true;
        }
      } catch (error) {
        // Process exit code will be non-zero if validation failed
        core.error(`Validation failed for secret: ${name}`);
        hasFailures = true;
      }
    }
    
    if (hasFailures) {
      core.setFailed('One or more secrets failed validation');
    } else {
      core.info('All secrets validated successfully');
    }
  } catch (error) {
    core.setFailed(`Secret validation failed: ${(error as Error).message}`);
  }
}

// Only run the function if this is the main module
if (require.main === module) {
  run();
}