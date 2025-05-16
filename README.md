# Hoisin: Secret Validator GitHub Action

![GitHub Actions](https://img.shields.io/badge/github%20actions-%232671E5.svg?style=for-the-badge&logo=githubactions&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![TOML](https://img.shields.io/badge/TOML-9C4121?style=for-the-badge&logo=toml&logoColor=white)

A GitHub Action that validates your repository secrets against regex patterns before running your workflows. Ensure your secrets meet the expected format and prevent workflow failures due to invalid credentials.

## Overview

Secret Validator helps you enforce proper formatting and structure for your repository secrets by:

- Validating secrets against customizable regex patterns
- Running early in your workflow to fail fast when secrets are invalid
- Supporting various secret formats including API keys, tokens, and credentials 
- Working with all types of GitHub secrets (repository, environment, organization)

## Why Use Secret Validator?

- **Save resources**: Catch invalid secrets before running expensive workflows
- **Increase security**: Ensure credentials follow required patterns
- **Improve reliability**: Avoid runtime failures due to malformed secrets
- **Simplify troubleshooting**: Get clear error messages about which secrets are invalid

## Setup

### 1. Create a configuration file

Create a TOML file with your validation rules. By default, the action looks for `.github/secret-validation.toml`:

```toml
[secrets]
# GitHub Personal Access Token (classic)
GITHUB_PAT = "^ghp_[a-zA-Z0-9]{36}$"

# AWS Access Key ID
AWS_ACCESS_KEY_ID = "^AKIA[A-Z0-9]{16}$"

# Complex password requirements
DATABASE_PASSWORD = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$"

# API Key with specific format
API_KEY = "^[A-Za-z0-9]{32}$"
```

Each entry in the `[secrets]` section consists of:
- Secret name (must match the name in GitHub Secrets)
- Regex pattern the secret value should match

### 2. Add the action to your workflow

```yaml
name: Validate Secrets

on:
  workflow_dispatch:
  pull_request:
  push:
    branches: [ main ]

jobs:
  validate-secrets:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      
      - name: Validate Repository Secrets
        uses: adelra/hoisin@v1
        with:
          config-file: '.github/secret-validation.toml'  # Optional: defaults to this path
        env:
          # List all secrets that should be validated
          GITHUB_PAT: ${{ secrets.GITHUB_PAT }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          DATABASE_PASSWORD: ${{ secrets.DATABASE_PASSWORD }}
          API_KEY: ${{ secrets.API_KEY }}
```

## Action Parameters

| Parameter | Description | Required | Default |
|-----------|-------------|----------|---------|
| `config-file` | Path to the TOML configuration file | No | `.github/secret-validation.toml` |

## Regex Pattern Examples

Here are some useful regex patterns for validating common secret formats:

### GitHub Tokens

```toml
[secrets]
# GitHub Personal Access Token (classic)
GITHUB_PAT_CLASSIC = "^ghp_[a-zA-Z0-9]{36}$"

# GitHub Fine-grained Personal Access Token 
GITHUB_PAT_FINE_GRAINED = "^github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}$"

# GitHub Actions Token
GITHUB_ACTION_TOKEN = "^ghs_[a-zA-Z0-9_]{36,251}$"

# Any GitHub Token (combined pattern)
GITHUB_TOKEN = "^(gh[ps]_[a-zA-Z0-9_]{36,251}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59})$"
```

### AWS Keys

```toml
[secrets]
# AWS Access Key ID
AWS_ACCESS_KEY_ID = "^AKIA[A-Z0-9]{16}$"

# AWS Secret Access Key (basic check for length and allowed characters)
AWS_SECRET_ACCESS_KEY = "^[A-Za-z0-9/+=]{40}$"
```

### API Keys and Passwords

```toml
[secrets]
# Strong password requirements
PASSWORD = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{12,}$"

# Generic API key (alphanumeric)
API_KEY = "^[A-Za-z0-9]{32,64}$"
```

> **❗ Important Security Note:**  
> Avoid creating overly specific regex patterns that might inadvertently expose the format of your secrets or, worse, parts of the actual secret values. Use broader patterns that check for general characteristics (length, character types) rather than exact formats that could aid in reconstructing the secret.

## Use Cases

### Pre-validate Secrets Before Long-Running Workflows

```yaml
name: Build and Deploy

on:
  push:
    branches: [ main ]

jobs:
  validate-secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate Secrets
        uses: your-org/secret-validator@v1
        with:
          config-file: '.github/secret-validation.toml'
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          DEPLOYMENT_TOKEN: ${{ secrets.DEPLOYMENT_TOKEN }}

  build-and-deploy:
    needs: validate-secrets
    runs-on: ubuntu-latest
    steps:
      # Your build and deploy steps here
      # These will only run if secret validation passes
```

### Different Rules for Different Environments

```yaml
name: Multi-Environment Deployment

on:
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        description: 'Environment to deploy to'
        required: true
        options:
          - development
          - staging
          - production

jobs:
  validate-secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate Environment Secrets
        uses: your-org/secret-validator@v1
        with:
          config-file: '.github/secrets-${{ github.event.inputs.environment }}.toml'
        env:
          DATABASE_URL: ${{ secrets[format('DATABASE_URL_{0}', github.event.inputs.environment)] }}
          API_KEY: ${{ secrets[format('API_KEY_{0}', github.event.inputs.environment)] }}
```


## Development

### Prerequisites
- Node.js (v16+)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the action
npm run build
```

### Project Structure

- `src/index.ts`: Main action code that processes the TOML configuration and validates secrets
- `src/validateSecrets.ts`: Core validation logic using regular expressions
- `test/`: Test suite with edge cases and examples

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgements

- Regex patterns for GitHub tokens adapted from [magnetikonline/GitHub token validation regular expressions](https://gist.github.com/magnetikonline/073afe7909ffdd6f10ef06a00bc3bc88)