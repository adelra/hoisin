import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const mockCore = {
  getInput: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  setFailed: jest.fn()
};

// Mock the validateSecret function
const mockValidateSecret = jest.fn();

// Setup mocks
jest.mock('@actions/core', () => mockCore);
jest.mock('../src/validateSecrets', () => ({
  validateSecret: mockValidateSecret
}));

// Import the function to test after mocking dependencies
import { run } from '../src/index';

describe('Secret Validator Tests', () => {
  let tmpDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Create a temporary directory for tests
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-validator-tests-'));
    
    // Save original environment
    originalEnv = { ...process.env };
    
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
  });

  test('should validate valid secrets successfully', async () => {
    // Create test config file
    const configContent = `
[secrets]
TEST_API_KEY = "^[A-Za-z0-9]{16}$"
TEST_PASSWORD = "^[A-Za-z0-9!@#$%^&*]{8,}$"
`;
    fs.writeFileSync(path.join(tmpDir, 'config.toml'), configContent);
    
    // Set up environment variables with valid secrets
    process.env.TEST_API_KEY = 'ABCD1234EFGH5678';
    process.env.TEST_PASSWORD = 'Password123!';
    
    // Mock successful validation
    mockValidateSecret.mockImplementation(() => true);
    
    await run();
    
    // Check core function calls
    expect(mockCore.setFailed).not.toHaveBeenCalled();
    expect(mockCore.info).toHaveBeenCalledWith('All secrets validated successfully');
  });

  test('should fail when secrets do not match patterns', async () => {
    // Create test config file
    const configContent = `
[secrets]
TEST_API_KEY = "^[A-Za-z0-9]{16}$"
`;
    fs.writeFileSync(path.join(tmpDir, 'config.toml'), configContent);
    
    // Set up environment variables with invalid secret
    process.env.TEST_API_KEY = 'short';
    
    // Mock failed validation
    mockValidateSecret.mockImplementation(() => false);
    
    await run();
    
    // Check core function calls
    expect(mockCore.setFailed).toHaveBeenCalledWith('One or more secrets failed validation');
  });

  test('should handle missing secrets', async () => {
    // Create test config file
    const configContent = `
[secrets]
MISSING_SECRET = "^[A-Za-z0-9]{16}$"
`;
    fs.writeFileSync(path.join(tmpDir, 'config.toml'), configContent);
    
    // Intentionally don't set the environment variable
    
    await run();
    
    // Check warning was triggered for missing secret
    expect(mockCore.warning).toHaveBeenCalledWith('Secret "MISSING_SECRET" not found in environment.');
    expect(mockCore.setFailed).toHaveBeenCalledWith('One or more secrets failed validation');
  });

  test('should handle missing config file', async () => {
    // Don't create the config file
    
    await run();
    
    // Check failure was triggered for missing file
    expect(mockCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('TOML file not found at path'));
  });

  test('should handle invalid config file format', async () => {
    // Create invalid test config file (missing secrets section)
    const configContent = `
[wrong-section]
TEST_API_KEY = "^[A-Za-z0-9]{16}$"
`;
    fs.writeFileSync(path.join(tmpDir, 'config.toml'), configContent);
    
    await run();
    
    // Check failure was triggered for invalid format
    expect(mockCore.setFailed).toHaveBeenCalledWith('Invalid configuration file format. Missing "secrets" section.');
  });
});