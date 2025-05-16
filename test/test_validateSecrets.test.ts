import { validateSecret } from '../src/validateSecrets';

describe('ValidateSecrets Module Tests', () => {
  // Store original console.log
  const originalConsoleLog = console.log;
  let consoleOutput: string[] = [];
  
  // Setup mock for console.log
  beforeEach(() => {
    consoleOutput = [];
    console.log = jest.fn((message: string) => {
      consoleOutput.push(message);
    });
  });
  
  // Restore original console.log
  afterEach(() => {
    console.log = originalConsoleLog;
  });
  
  test('should validate secret that matches regex pattern', () => {
    // Test with API key pattern
    const result = validateSecret('TEST_API_KEY', 'ABCD1234EFGH5678', '^[A-Za-z0-9]{16}$');
    
    // Assert result is true
    expect(result).toBe(true);
    
    // Check console output
    expect(consoleOutput).toHaveLength(1);
    expect(consoleOutput[0]).toContain('✅ Secret \'TEST_API_KEY\' is valid');
  });
  
  test('should invalidate secret that does not match regex pattern', () => {
    // Test with too short API key
    const result = validateSecret('TEST_API_KEY', 'SHORT', '^[A-Za-z0-9]{16}$');
    
    // Assert result is false
    expect(result).toBe(false);
    
    // Check console output
    expect(consoleOutput).toHaveLength(1);
    expect(consoleOutput[0]).toContain('❌ Secret \'TEST_API_KEY\' does not match the required pattern');
  });
  
  test('should handle invalid regex pattern gracefully', () => {
    // Test with invalid regex
    const result = validateSecret('TEST_SECRET', 'value', '(unclosed[parenthesis');
    
    // Assert result is false
    expect(result).toBe(false);
    
    // Check console output
    expect(consoleOutput).toHaveLength(1);
    expect(consoleOutput[0]).toContain('⚠️ Error validating secret');
  });
  
  test('should validate password with special characters', () => {
    // Test password with special characters
    const result = validateSecret(
      'TEST_PASSWORD', 
      'Password123!@#',
      '^[A-Za-z0-9!@#$%^&*]{8,}$'
    );
    
    // Assert result is true
    expect(result).toBe(true);
    
    // Check console output
    expect(consoleOutput).toHaveLength(1);
    expect(consoleOutput[0]).toContain('✅ Secret \'TEST_PASSWORD\' is valid');
  });
  
  test('should handle empty values correctly', () => {
    // Test with empty value
    const result = validateSecret('EMPTY_SECRET', '', '^.+$');
    
    // Assert result is false (empty doesn't match regex requiring at least one char)
    expect(result).toBe(false);
    
    // Check console output
    expect(consoleOutput).toHaveLength(1);
    expect(consoleOutput[0]).toContain('❌ Secret \'EMPTY_SECRET\' does not match the required pattern');
  });
  
  test('should handle complex regex patterns', () => {
    // Test UUID format regex
    const uuidRegex = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const invalidUuid = '123e4567-e89b-12d3-a456-42661417400';  // Missing last digit
    
    // Test valid UUID
    expect(validateSecret('UUID', validUuid, uuidRegex)).toBe(true);
    
    // Reset console output
    consoleOutput = [];
    
    // Test invalid UUID 
    expect(validateSecret('UUID', invalidUuid, uuidRegex)).toBe(false);
  });
});
