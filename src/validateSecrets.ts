/**
 * Validates a secret value against a regex pattern
 * @param name The name of the secret
 * @param value The value of the secret
 * @param pattern The regex pattern to match against
 * @returns true if the secret is valid, false otherwise
 */
export function validateSecret(name: string, value: string, pattern: string): boolean {
  try {
    const regex = new RegExp(pattern);
    if (!regex.test(value)) {
      console.log(`❌ Secret '${name}' does not match the required pattern: ${pattern}`);
      return false;
    } else {
      console.log(`✅ Secret '${name}' is valid.`);
      return true;
    }
  } catch (e) {
    console.log(`⚠️ Error validating secret '${name}': ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

// If this file is run directly (for CLI usage)
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    let name = '';
    let value = '';
    let regex = '';
    
    // Basic argument parsing
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--name' && i + 1 < args.length) {
        name = args[i + 1];
        i++;
      } else if (args[i] === '--value' && i + 1 < args.length) {
        value = args[i + 1];
        i++;
      } else if (args[i] === '--regex' && i + 1 < args.length) {
        regex = args[i + 1];
        i++;
      }
    }
    
    if (!name || !value || !regex) {
      console.error('Missing required arguments. Usage: node validateSecrets.js --name NAME --value VALUE --regex PATTERN');
      process.exit(1);
    }
    
    const result = validateSecret(name, value, regex);
    process.exit(result ? 0 : 1);
  } catch (error) {
    // Catch any unexpected errors that might occur during CLI execution
    console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
