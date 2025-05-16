import { validateSecret } from '../src/validateSecrets';

describe('ValidateSecrets Edge Cases', () => {
  // Store original console.log
  const originalConsoleLog = console.log;
  
  beforeEach(() => {
    // Mock console.log to prevent it from cluttering test output
    console.log = jest.fn();
  });
  
  afterEach(() => {
    // Restore original console.log
    console.log = originalConsoleLog;
  });
  
  test('should handle very large secret values', () => {
    // Create a very large string (100KB)
    const largeValue = 'A'.repeat(100 * 1024);
    const result = validateSecret('LARGE_SECRET', largeValue, '^A+$');
    
    expect(result).toBe(true);
  });
  
  test('should handle Unicode characters in secrets', () => {
    // Test with emoji and international characters
    const unicodeValue = '🔑パスワードβ';
    const unicodeResult = validateSecret(
      'UNICODE_SECRET', 
      unicodeValue,
      '^.*$'  // Match any character sequence
    );
    
    expect(unicodeResult).toBe(true);
    
    // Test with specific Unicode pattern
    const emojiPattern = '^🔑.*$';
    const validEmojiResult = validateSecret('EMOJI', '🔑test', emojiPattern);
    const invalidEmojiResult = validateSecret('EMOJI', 'test', emojiPattern);
    
    expect(validEmojiResult).toBe(true);
    expect(invalidEmojiResult).toBe(false);
  });
  
  test('should handle special regex characters in secrets', () => {
    // Test with string containing regex special characters
    const specialCharsValue = 'special(chars)*[$^.+]';
    
    // Escape the characters for literal matching
    const literalPattern = '^special\\(chars\\)\\*\\[\\$\\^\\.\\+\\]$';
    const result = validateSecret('SPECIAL_CHARS', specialCharsValue, literalPattern);
    
    expect(result).toBe(true);
  });
  
  test('should handle newlines in secrets', () => {
    // Test multiline secret (like an SSH key)
    const multilineValue = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj
MzEfYyjiWA4R4/M2bS1GB4t7NXp98C3SC6dVMvDuictGeurT8jNbvJZHtCSuYEvu
-----END PRIVATE KEY-----`;
    
    // Pattern to match key format
    const keyPattern = '^-----BEGIN PRIVATE KEY-----[\\s\\S]*-----END PRIVATE KEY-----$';
    const result = validateSecret('SSH_KEY', multilineValue, keyPattern);
    
    expect(result).toBe(true);
  });
  
  test('should handle whitespace in secrets', () => {
    // Test with whitespace
    const whitespaceValue = '  Has Leading and Trailing Whitespace  ';
    
    // Test exact match with whitespace
    const exactPattern = '^  Has Leading and Trailing Whitespace  $';
    const exactResult = validateSecret('WHITESPACE', whitespaceValue, exactPattern);
    expect(exactResult).toBe(true);
    
    // Test pattern ignoring whitespace
    const trimmedPattern = '^\\s*Has Leading and Trailing Whitespace\\s*$';
    const trimmedResult = validateSecret('WHITESPACE', whitespaceValue, trimmedPattern);
    expect(trimmedResult).toBe(true);
  });
  
  test('should handle complex patterns like API keys', () => {
    // AWS-style access key
    const awsAccessKey = 'AKIA1234567890ABCDEF';
    
    // Pattern for AWS access key ID (starts with AKIA and followed by 16 characters)
    const awsPattern = '^AKIA[A-Z0-9]{16}$';
    
    const validResult = validateSecret('AWS_ACCESS_KEY', awsAccessKey, awsPattern);
    expect(validResult).toBe(true);
    
    // Test invalid key (wrong prefix)
    const invalidAccessKey = 'AKIB1234567890ABCDEF';
    const invalidResult = validateSecret('AWS_ACCESS_KEY', invalidAccessKey, awsPattern);
    expect(invalidResult).toBe(false);
  });
  
  test('should handle lookahead/lookbehind in patterns', () => {
    // Password with requirements: 
    // - at least 8 characters
    // - at least one uppercase letter
    // - at least one lowercase letter
    // - at least one digit
    const complexPattern = '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$';
    
    // Valid password
    const validPassword = 'Password123';
    const validResult = validateSecret('COMPLEX_PASSWORD', validPassword, complexPattern);
    expect(validResult).toBe(true);
    
    // Invalid password (no uppercase)
    const noUppercase = 'password123';
    const noUpperResult = validateSecret('COMPLEX_PASSWORD', noUppercase, complexPattern);
    expect(noUpperResult).toBe(false);
    
    // Invalid password (no digit)
    const noDigit = 'PasswordABC';
    const noDigitResult = validateSecret('COMPLEX_PASSWORD', noDigit, complexPattern);
    expect(noDigitResult).toBe(false);
    
    // Invalid password (too short)
    const tooShort = 'Pass1';
    const tooShortResult = validateSecret('COMPLEX_PASSWORD', tooShort, complexPattern);
    expect(tooShortResult).toBe(false);
  });
});
