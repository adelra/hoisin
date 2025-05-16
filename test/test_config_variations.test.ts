import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import TOML from 'toml';
import { validateSecret } from '../src/validateSecrets';

describe('Configuration File Variations Tests', () => {
  let tmpDir: string;
  let originalConsoleLog: typeof console.log;
  
  beforeEach(() => {
    // Create a temporary directory for tests
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-var-tests-'));
    
    // Mock console.log
    originalConsoleLog = console.log;
    console.log = jest.fn();
  });
  
  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tmpDir, { recursive: true, force: true });
    
    // Restore original console.log
    console.log = originalConsoleLog;
  });
  
  test('should handle empty config file', () => {
    // Create empty TOML file
    const configPath = path.join(tmpDir, 'empty.toml');
    fs.writeFileSync(configPath, '');
    
    // Parse the TOML file
    const tomlContent = fs.readFileSync(configPath, 'utf-8');
    
    // This should parse to an empty object
    const config = TOML.parse(tomlContent);
    
    expect(config).toEqual({});
    expect(config.secrets).toBeUndefined();
  });
  
  test('should handle config with empty secrets section', () => {
    // Create TOML with empty secrets section
    const configContent = `[secrets]
# No secrets defined here
`;
    const configPath = path.join(tmpDir, 'empty-section.toml');
    fs.writeFileSync(configPath, configContent);
    
    // Parse the TOML file
    const tomlContent = fs.readFileSync(configPath, 'utf-8');
    const config = TOML.parse(tomlContent);
    
    expect(config).toEqual({ secrets: {} });
    expect(Object.keys(config.secrets)).toHaveLength(0);
  });
  
  test('should handle config with comments and whitespace', () => {
    // Create TOML with comments and extra whitespace
    const configContent = `
# This is a configuration file
# It contains secret validation patterns

[secrets]
# API key pattern
TEST_API_KEY = "^[A-Za-z0-9]{16}$"  # Must be exactly 16 alphanumeric chars

# Password pattern
  TEST_PASSWORD = "^[A-Za-z0-9!@#$%^&*]{8,}$"  # At least 8 chars

`;
    const configPath = path.join(tmpDir, 'commented.toml');
    fs.writeFileSync(configPath, configContent);
    
    // Parse the TOML file
    const tomlContent = fs.readFileSync(configPath, 'utf-8');
    const config = TOML.parse(tomlContent);
    
    expect(config.secrets).toBeDefined();
    expect(Object.keys(config.secrets)).toHaveLength(2);
    expect(config.secrets.TEST_API_KEY).toBe('^[A-Za-z0-9]{16}$');
    expect(config.secrets.TEST_PASSWORD).toBe('^[A-Za-z0-9!@#$%^&*]{8,}$');
    
    // Validate with the patterns from config
    const validKey = validateSecret('TEST_API_KEY', 'ABCD1234EFGH5678', config.secrets.TEST_API_KEY);
    const validPassword = validateSecret('TEST_PASSWORD', 'Password123!', config.secrets.TEST_PASSWORD);
    
    expect(validKey).toBe(true);
    expect(validPassword).toBe(true);
  });
  
  test('should handle config with multiple sections', () => {
    // Create TOML with multiple sections
    const configContent = `
[metadata]
version = "1.0.0"
description = "Secret validation patterns"

[secrets]
API_KEY = "^[A-Za-z0-9]{16}$"
PASSWORD = "^[A-Za-z0-9!@#$%^&*]{8,}$"

[other_section]
some_value = "This is not a secret pattern"
`;
    const configPath = path.join(tmpDir, 'multi-section.toml');
    fs.writeFileSync(configPath, configContent);
    
    // Parse the TOML file
    const tomlContent = fs.readFileSync(configPath, 'utf-8');
    const config = TOML.parse(tomlContent);
    
    expect(config.metadata).toBeDefined();
    expect(config.secrets).toBeDefined();
    expect(config.other_section).toBeDefined();
    
    expect(config.metadata.version).toBe("1.0.0");
    expect(config.secrets.API_KEY).toBe('^[A-Za-z0-9]{16}$');
    expect(config.other_section.some_value).toBe('This is not a secret pattern');
  });
  
  test('should handle config with nested keys', () => {
    // Create TOML with nested keys (though our app doesn't use them)
    const configContent = `
[secrets]
API_KEY = "^[A-Za-z0-9]{16}$"

[secrets.database]
username = "^[a-zA-Z0-9_]{3,16}$"
password = "^[A-Za-z0-9!@#$%^&*]{8,}$"
`;
    const configPath = path.join(tmpDir, 'nested.toml');
    fs.writeFileSync(configPath, configContent);
    
    // Parse the TOML file
    const tomlContent = fs.readFileSync(configPath, 'utf-8');
    const config = TOML.parse(tomlContent);
    
    expect(config.secrets).toBeDefined();
    expect(config.secrets.API_KEY).toBe('^[A-Za-z0-9]{16}$');
    expect(config.secrets.database).toBeDefined();
    expect(config.secrets.database.username).toBe('^[a-zA-Z0-9_]{3,16}$');
    expect(config.secrets.database.password).toBe('^[A-Za-z0-9!@#$%^&*]{8,}$');
  });
  
  test('should handle unusual or special characters in keys', () => {
    // Create TOML with special characters in keys
    const configContent = `
[secrets]
"API.KEY" = "^[A-Za-z0-9]{16}$"
"DATABASE_USER@HOST" = "^[a-zA-Z0-9_]{3,16}$"
"SPECIAL-CHARS_KEY!" = "^[a-zA-Z0-9]{8,}$"
`;
    const configPath = path.join(tmpDir, 'special-keys.toml');
    fs.writeFileSync(configPath, configContent);
    
    // Parse the TOML file
    const tomlContent = fs.readFileSync(configPath, 'utf-8');
    const config = TOML.parse(tomlContent);
    
    expect(config.secrets).toBeDefined();
    expect(config.secrets["API.KEY"]).toBe('^[A-Za-z0-9]{16}$');
    expect(config.secrets["DATABASE_USER@HOST"]).toBe('^[a-zA-Z0-9_]{3,16}$');
    expect(config.secrets["SPECIAL-CHARS_KEY!"]).toBe('^[a-zA-Z0-9]{8,}$');
    
    // Test validation with these unusual keys
    const validKey = validateSecret('API.KEY', 'ABCD1234EFGH5678', config.secrets["API.KEY"]);
    expect(validKey).toBe(true);
  });
  
  test('should handle multiline strings in TOML', () => {
    // Create TOML with multiline strings
    const configContent = `
[secrets]
API_KEY = "^[A-Za-z0-9]{16}$"
MULTILINE_PATTERN = """
^-----BEGIN CERTIFICATE-----
[A-Za-z0-9+/=\\s]+
-----END CERTIFICATE-----$
"""
`;
    const configPath = path.join(tmpDir, 'multiline.toml');
    fs.writeFileSync(configPath, configContent);
    
    // Parse the TOML file
    const tomlContent = fs.readFileSync(configPath, 'utf-8');
    const config = TOML.parse(tomlContent);
    
    expect(config.secrets).toBeDefined();
    expect(config.secrets.API_KEY).toBe('^[A-Za-z0-9]{16}$');
    
    // The multiline pattern should be one string with newlines
    const pattern = config.secrets.MULTILINE_PATTERN.trim();
    expect(pattern).toContain('BEGIN CERTIFICATE');
    expect(pattern).toContain('END CERTIFICATE');
    
    // Create a test certificate
    const testCert = `-----BEGIN CERTIFICATE-----
MIIDpTCCAo2gAwIBAgIUJ1aGQn1gPZZQPa3C0JQE+UFvFMAwDQYJKoZIhvcNAQEL
BQAwYjELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAkNBMRYwFAYDVQQHDA1TYW4gRnJh
bmNpc2NvMRAwDgYDVQQKDAdDb21wYW55MQswCQYDVQQLDAJJVDEPMA0GA1UEAwwG
-----END CERTIFICATE-----`;
    
    // Test validation with this pattern
    const validCert = validateSecret('MULTILINE_PATTERN', testCert, pattern);
    expect(validCert).toBe(true);
  });
});
