import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock only @actions/core for testing, but use real validateSecrets
const mockCore = {
  getInput: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  setFailed: jest.fn()
};

// Setup mock for @actions/core
jest.mock('@actions/core', () => mockCore);

// Import the function to test
import { run } from '../src/index';

describe('Integration Tests (No Mocked ValidateSecrets)', () => {
  let tmpDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalConsoleLog: typeof console.log;
  
  beforeEach(() => {
    // Create a temporary directory for tests
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-validator-tests-'));
    
    // Save original environment
    originalEnv = { ...process.env };
    
    // Save original console.log
    originalConsoleLog = console.log;
    
    // Mock console.log to prevent it from cluttering test output
    console.log = jest.fn();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup core.getInput mock
    mockCore.getInput.mockImplementation((name: string) => {
      if (name === 'config-file') {
        return path.join(tmpDir, 'config.toml');
      }
      return '';
    });
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tmpDir, { recursive: true, force: true });
    
    // Restore original environment
    process.env = originalEnv;
    
    // Restore original console.log
    console.log = originalConsoleLog;
  });

  test('should validate secrets with real validation function', async () => {
    // Create test config file
    const configContent = `
[secrets]
INTEGRATION_API_KEY = "^[A-Za-z0-9]{16}$"
INTEGRATION_PASSWORD = "^[A-Za-z0-9!@#$%^&*]{8,}$"
`;
    fs.writeFileSync(path.join(tmpDir, 'config.toml'), configContent);
    
    // Set up environment variables with valid secrets
    process.env.INTEGRATION_API_KEY = 'ABCD1234EFGH5678';
    process.env.INTEGRATION_PASSWORD = 'Password123!';
    
    await run();
    
    // Check core function calls
    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(mockCore.info).toHaveBeenCalledWith('All secrets validated successfully');
  });

  test('should fail with real validation when secret is invalid', async () => {
    // Create test config file
    const configContent = `
[secrets]
INTEGRATION_API_KEY = "^[A-Za-z0-9]{16}$"
`;
    fs.writeFileSync(path.join(tmpDir, 'config.toml'), configContent);
    
    // Set up environment variables with invalid secret (too short)
    process.env.INTEGRATION_API_KEY = 'SHORT';
    
    await run();
    
    // Check core function calls
    expect(mockCore.error).toHaveBeenCalledWith(expect.stringContaining('Validation failed for secret: INTEGRATION_API_KEY'));
    expect(mockCore.setFailed).toHaveBeenCalledWith('One or more secrets failed validation');
  });

  test('should validate complex pattern with real validation', async () => {
    // Create test config file with email pattern
    const configContent = `
[secrets]
EMAIL_SECRET = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
`;
    fs.writeFileSync(path.join(tmpDir, 'config.toml'), configContent);
    
    // Set up environment variables with valid email
    process.env.EMAIL_SECRET = 'test.user@example.com';
    
    await run();
    
    // Check core function calls
    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(mockCore.info).toHaveBeenCalledWith('All secrets validated successfully');
  });

  test('should handle invalid regex pattern gracefully', async () => {
    // Create test config file with invalid regex
    const configContent = `
[secrets]
BAD_PATTERN = "(unclosed[parenthesis"
`;
    fs.writeFileSync(path.join(tmpDir, 'config.toml'), configContent);
    
    // Set up any value since the regex itself is invalid
    process.env.BAD_PATTERN = 'any-value';
    
    await run();
    
    // Check core function calls - Should fail validation
    expect(mockCore.error).toHaveBeenCalledWith(expect.stringContaining('Validation failed for secret'));
    expect(mockCore.setFailed).toHaveBeenCalledWith('One or more secrets failed validation');
  });

  test('should validate multiple secrets with different patterns', async () => {
    // Create test config file with multiple patterns
    const configContent = `
[secrets]
API_KEY = "^[A-Za-z0-9]{16}$"
PASSWORD = "^[A-Za-z0-9!@#$%^&*]{8,}$"
UUID = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
`;
    fs.writeFileSync(path.join(tmpDir, 'config.toml'), configContent);
    
    // Set up environment variables with valid secrets
    process.env.API_KEY = 'ABCD1234EFGH5678';
    process.env.PASSWORD = 'Password123!';
    process.env.UUID = '123e4567-e89b-12d3-a456-426614174000';
    
    await run();
    
    // Check core function calls
    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(mockCore.info).toHaveBeenCalledWith('All secrets validated successfully');
  });
});
