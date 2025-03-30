import * as fs from 'fs';
import * as path from 'path';

interface EnvCheck {
  [key: string]: string;
}

export function loadEnvChecks(filePath: string): EnvCheck {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const envChecks: EnvCheck = {};
  fileContent.split('\n').forEach(line => {
    const [key, type] = line.split(':').map(item => item.trim());
    if (key && type) {
      envChecks[key] = type;
    }
  });
  return envChecks;
}

export function validateEnv(env: { [key: string]: string }, envChecks: EnvCheck): void {
  for (const key in envChecks) {
    const value = env[key];
    const expectedType = envChecks[key];
    if (!value) {
      throw new Error(`Environment variable ${key} is missing.`);
    }
    if (expectedType === 'sha' && !/^[0-9a-fA-F]{40}$/.test(value)) {
      throw new Error(`Environment variable ${key} is not a valid SHA.`);
    }
    // Add more type checks as needed
  }
}

// Filter out undefined values from process.env
const filteredEnv = Object.keys(process.env).reduce((acc, key) => {
  if (process.env[key] !== undefined) {
    acc[key] = process.env[key]!;
  }
  return acc;
}, {} as { [key: string]: string });

// Call validateEnv with the filtered environment variables
validateEnv(filteredEnv, loadEnvChecks(path.resolve(__dirname, '../env_checks.toml')));

