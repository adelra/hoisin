import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import TOML from 'toml';
import { validateSecret } from '../src/validateSecrets';

describe('End-to-End Workflow Tests', () => {
  let tmpDir: string;
  let originalConsoleLog: typeof console.log;
  let consoleOutput: string[] = [];
  
  beforeEach(() => {
    // Create a temporary directory for tests
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-tests-'));
    
    // Mock console.log
    originalConsoleLog = console.log;
    consoleOutput = [];
    console.log = jest.fn((message: string) => {
      consoleOutput.push(message);
    });
  });
  
  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tmpDir, { recursive: true, force: true });
    
    // Restore original console.log
    console.log = originalConsoleLog;
  });
  
  test('should validate secrets from a TOML file', () => {
    // Create a TOML config file
    const configContent = `
[secrets]
API_KEY = "^[A-Za-z0-9]{16}$"
PASSWORD = "^[A-Za-z0-9!@#$%^&*]{8,}$"
`;
    const configPath = path.join(tmpDir, 'config.toml');
    fs.writeFileSync(configPath, configContent);
    
    // Parse the TOML file
    const tomlContent = fs.readFileSync(configPath, 'utf-8');
    const secretsConfig = TOML.parse(tomlContent);
    
    // Define secrets to validate
    const secrets = {
      API_KEY: 'ABCD1234EFGH5678',
      PASSWORD: 'Password123!',
    };
    
    // Validate each secret
    const results: Record<string, boolean> = {};
    
    for (const [name, pattern] of Object.entries(secretsConfig.secrets)) {
      const value = secrets[name as keyof typeof secrets];
      if (value) {
        results[name] = validateSecret(name, value, pattern as string);
      } else {
        results[name] = false;
      }
    }
    
    // Check results
    expect(results.API_KEY).toBe(true);
    expect(results.PASSWORD).toBe(true);
    
    // Check console output
    expect(consoleOutput.length).toBe(2);
    expect(consoleOutput.some(msg => msg.includes('✅ Secret \'API_KEY\' is valid'))).toBe(true);
    expect(consoleOutput.some(msg => msg.includes('✅ Secret \'PASSWORD\' is valid'))).toBe(true);
  });
  
  test('should handle mixed valid and invalid secrets', () => {
    // Create a TOML config file
    const configContent = `
[secrets]
API_KEY = "^[A-Za-z0-9]{16}$"
PASSWORD = "^[A-Za-z0-9!@#$%^&*]{8,}$"
EMAIL = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
`;
    const configPath = path.join(tmpDir, 'config.toml');
    fs.writeFileSync(configPath, configContent);
    
    // Parse the TOML file
    const tomlContent = fs.readFileSync(configPath, 'utf-8');
    const secretsConfig = TOML.parse(tomlContent);
    
    // Define secrets to validate (one invalid)
    const secrets = {
      API_KEY: 'ABCD1234EFGH5678', // valid
      PASSWORD: 'short',           // invalid (too short)
      EMAIL: 'test@example.com',   // valid
    };
    
    // Validate each secret
    const results: Record<string, boolean> = {};
    
    for (const [name, pattern] of Object.entries(secretsConfig.secrets)) {
      const value = secrets[name as keyof typeof secrets];
      if (value) {
        results[name] = validateSecret(name, value, pattern as string);
      } else {
        results[name] = false;
      }
    }
    
    // Check results
    expect(results.API_KEY).toBe(true);
    expect(results.PASSWORD).toBe(false);
    expect(results.EMAIL).toBe(true);
    
    // Check console output
    expect(consoleOutput.length).toBe(3);
    expect(consoleOutput.some(msg => msg.includes('✅ Secret \'API_KEY\' is valid'))).toBe(true);
    expect(consoleOutput.some(msg => msg.includes('❌ Secret \'PASSWORD\' does not match'))).toBe(true);
    expect(consoleOutput.some(msg => msg.includes('✅ Secret \'EMAIL\' is valid'))).toBe(true);
  });
  
  test('should handle missing secrets', () => {
    // Create a TOML config file
    const configContent = `
[secrets]
API_KEY = "^[A-Za-z0-9]{16}$"
PASSWORD = "^[A-Za-z0-9!@#$%^&*]{8,}$"
MISSING_SECRET = "^.+$"
`;
    const configPath = path.join(tmpDir, 'config.toml');
    fs.writeFileSync(configPath, configContent);
    
    // Parse the TOML file
    const tomlContent = fs.readFileSync(configPath, 'utf-8');
    const secretsConfig = TOML.parse(tomlContent);
    
    // Define secrets to validate (one missing)
    const secrets = {
      API_KEY: 'ABCD1234EFGH5678',
      PASSWORD: 'Password123!',
      // MISSING_SECRET is intentionally not defined
    };
    
    // Validate each secret
    const results: Record<string, boolean> = {};
    let allValid = true;
    
    for (const [name, pattern] of Object.entries(secretsConfig.secrets)) {
      const value = secrets[name as keyof typeof secrets];
      if (value) {
        results[name] = validateSecret(name, value, pattern as string);
      } else {
        console.log(`❌ Secret '${name}' is missing.`);
        results[name] = false;
      }
      
      if (!results[name]) {
        allValid = false;
      }
    }
    
    // Check overall result
    expect(allValid).toBe(false);
    
    // Check individual results
    expect(results.API_KEY).toBe(true);
    expect(results.PASSWORD).toBe(true);
    expect(results.MISSING_SECRET).toBe(false);
    
    // Check console output
    expect(consoleOutput.some(msg => msg.includes('✅ Secret \'API_KEY\' is valid'))).toBe(true);
    expect(consoleOutput.some(msg => msg.includes('✅ Secret \'PASSWORD\' is valid'))).toBe(true);
    expect(consoleOutput.some(msg => msg.includes('❌ Secret \'MISSING_SECRET\' is missing'))).toBe(true);
  });
});
