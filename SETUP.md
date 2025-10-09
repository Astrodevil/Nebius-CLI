# Nebius CLI: Comprehensive Setup and Deployment Guide

This guide provides in-depth information about the GitHub workflows, deployment process, and repository management for the Nebius CLI project. It's designed to help both new contributors and maintainers understand the development and release processes.

This guide provides comprehensive information about the GitHub workflows, deployment process, and repository management for the Nebius CLI project.

## GitHub Workflows: Deep Dive

### Workflow Architecture
All workflows are defined in `.github/workflows/` and follow a modular design:
- **Event-Driven Execution**: Triggered by GitHub events (push, pull_request, schedule, workflow_dispatch)
- **Reusable Components**: Shared actions and composite actions in `.github/actions/`
- **Matrix Strategies**: Parallel testing across multiple environments
- **Dependency Caching**: Optimized build times using GitHub's cache action

### Workflow Concurrency Control
Workflows use concurrency groups to prevent multiple runs for the same branch/PR:
```yaml
concurrency:
  group: '${{ github.workflow }}-${{ github.head_ref || github.ref }}'
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}
```

### 1. CI Workflow (`.github/workflows/ci.yml`)
- **Trigger Conditions**:
  - Push to `main` or `release/*` branches
  - Any pull request targeting these branches
  - merge_group events for batch processing

- **Key Jobs**:
  1. **Linting**
     - ESLint for TypeScript/JavaScript
     - ShellCheck for shell scripts
     - YAML linting for configuration files
     - Markdown link checking
  
  2. **Testing Matrix**
     - Multiple Node.js versions (as defined in `matrix.node-version`)
     - Different operating systems (Ubuntu, macOS, Windows)
     - Coverage reporting with `c8`
     - Integration tests with various sandbox modes
  
  3. **Build Verification**
     - Full production build
     - Type checking with `tsc`
     - Bundle size analysis
     - Dependency vulnerability scanning
- **Purpose**: Runs on every push and pull request to main and release branches
- **Key Features**:
  - Lints code using ESLint, ShellCheck, and YAML Lint
  - Runs unit and integration tests
  - Builds the project to verify the build process
  - Type checks the codebase
  - Ensures code quality and consistency

### 2. Release Workflow (`.github/workflows/release.yml`)
- **Trigger Modes**:
  - Scheduled (nightly builds)
  - Manual dispatch with version input
  - Tag push (v*)

- **Release Process**:
  1. **Version Management**
     - Auto-increments patch version by default
     - Supports semantic versioning (major.minor.patch)
     - Handles pre-release versions (alpha, beta, rc)
  
  2. **Build Artifacts**
     - Creates platform-specific builds (Linux, macOS, Windows)
     - Generates checksums for verification
     - Builds and pushes Docker images
  
  3. **Publishing**
     - Publishes to npm registry
     - Creates GitHub release with changelog
     - Updates documentation
     - Sends release notifications

- **Environment Protection**:
  - Requires `NPM_TOKEN` secret
  - Protected branches
  - Required status checks
  - Manual approval for production releases
- **Purpose**: Manages the release process for the Nebius CLI
- **Key Features**:
  - Can be triggered manually or scheduled (nightly releases)
  - Creates version tags and GitHub releases
  - Publishes packages to npm
  - Handles both production and pre-release versions
  - Includes dry-run capabilities for testing

### 3. Community Report (`.github/workflows/community-report.yml`)
- **Purpose**: Generates community engagement reports
- **Key Features**:
  - Tracks issues and pull requests
  - Monitors community contributions
  - Generates periodic reports on project health

### 4. E2E Testing (`.github/workflows/e2e.yml`)
- **Purpose**: Runs end-to-end tests
- **Key Features**:
  - Tests the complete workflow of the CLI
  - Verifies integration between components
  - Ensures critical paths work as expected

### 5. Issue and PR Automation (`.github/workflows/gemini-*.yml`)
- **Purpose**: Automates issue and pull request management
- **Key Features**:
  - `nebius-automated-issue-triage.yml`: Automatically labels and triages new issues
  - `nebius-scheduled-issue-triage.yml`: Periodically checks and updates issue status
  - `nebius-scheduled-pr-triage.yml`: Manages pull request reviews and status
  - `nebius-code-pr-review.yml`: Automated code review for pull requests

### 6. Maintenance Workflows
- **no-response.yml**: Closes stale issues with no response
- **stale.yml**: Marks and closes stale issues and pull requests

## Advanced Package Deployment

### Prerequisites
1. **Development Environment**
   - Node.js 20+ (LTS recommended)
   - npm 9+ or pnpm 8+
   - Git 2.30+
   - Docker (for containerized builds)

2. **Authentication**
   - GitHub Personal Access Token with `repo` and `workflow` scopes
   - npm authentication token with publish permissions
   - Docker Hub or GitHub Container Registry credentials

3. **Repository Setup**
   - Fork the repository (for contributors)
   - Set up upstream remote
   - Configure Git signing
   - Install development dependencies (`npm ci`)

### Deployment Strategies

#### 1. Local Development Build
```bash
# Install dependencies
npm ci

# Build the project
npm run build

# Run tests
npm test

# Install dependencies and link
npm install .
npm link

# Start development server (local dev only)
npm start
```

#### 2. Production Release
```bash
# Update version (interactive)
npm version [major|minor|patch|premajor|preminor|prepatch|prerelease]

# Build production artifacts
npm run build:production

# Verify the build
npm run test

# Publish to npm
npm publish --access public --tag latest

# Push tags
git push --follow-tags
```

#### 3. Containerized Deployment
```bash
# Build Docker image
docker build -t nebius-cli:latest .

# Run container
docker run -it --rm nebius-cli:latest

# Push to registry
docker tag nebius-cli:latest ghcr.io/your-org/nebius-cli:latest
docker push ghcr.io/your-org/nebius-cli:latest

### Prerequisites
- Node.js 20 or later
- npm 9 or later
- GitHub access with write permissions
- npm publish access to the `@nebius-code` scope

### Deployment Steps

1. **Version Bumping**
   ```bash
   # Update version in package.json and create a version commit
   npm run release:version
   ```

2. **Build the Package**
   ```bash
   # Run the build process
   npm run build:all
   ```

3. **Test the Build**
   ```bash
   # Run all tests
   npm test
   
   # Run end-to-end tests
   npm run test:e2e
   ```

4. **Publish to npm**
   ```bash
   # Login to npm (if not already logged in)
   npm login --scope=@nebius-code
   
   # Publish the package
   npm publish --access public
   ```

5. **Create a GitHub Release**
   - Push the version commit and tag
   - Create a new release on GitHub with release notes
   - The release will trigger the release workflow

## Advanced PR Review and Quality Gates

### 1. Automated Quality Gates
- **Code Style**
  - Prettier formatting
  - ESLint rules enforcement
  - Import order validation
  - File naming conventions

- **Testing Requirements**
  - Minimum test coverage thresholds
  - E2E test suite
  - Performance benchmarks
  - Security scanning

- **Documentation**
  - JSDoc coverage
  - README updates
  - Type definitions
  - Changelog entries

### 2. Review Process
1. **Initial Triage**
   - Automated labeling based on changes
   - Required checks verification
   - Dependency updates detection

2. **Code Review**
   - Architecture review
   - Performance implications
   - Security considerations
   - Backward compatibility

3. **Approval Workflow**
   - Minimum number of approvals (typically 1-2)
   - No outstanding change requests
   - All discussions resolved
   - Passing CI/CD pipeline

### 3. Merge Strategy
- **Feature Branches**: Squash and merge
- **Hotfixes**: Rebase and merge
- **Release Branches**: Merge commit
- **Dependencies**: Automated PRs with `dependabot`

1. **Automated Checks**
   - All pull requests automatically run:
     - Linting
     - Unit and integration tests
     - Type checking
     - Build verification

2. **Code Review**
   - The `qwen-code-pr-review.yml` workflow provides automated code review feedback
   - At least one maintainer must approve the PR before merging
   - All CI checks must pass before merging

3. **Merge Strategy**
   - Use squash and merge for feature branches
   - Use rebase and merge for dependency updates and small fixes
   - Delete source branches after merge

## GitHub Actions: Advanced Configuration

### 1. Self-Hosted Runners
For improved performance and security, you can set up self-hosted runners:

```yaml
jobs:
  build:
    runs-on: [self-hosted, linux, x64]
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
```

### 2. Matrix Builds
Run tests across multiple configurations:

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node-version: [18.x, 20.x, 21.x]
    include:
      - os: ubuntu-latest
        container: node:20-slim
```

### 3. Caching Dependencies
Optimize build times with dependency caching:

```yaml
- name: Cache node modules
  uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

1. **Manual Deployment**
   - Navigate to Actions > Release > Run workflow
   - Select the branch (default: main)
   - Set `dry_run` to `false` for actual deployment
   - Click "Run workflow"

2. **Scheduled Nightly Releases**
   - Runs automatically at midnight UTC
   - Creates pre-release versions with `-nightly` suffix
   - Can be triggered manually with `create_nightly_release: true`

3. **Versioned Releases**
   - Trigger the release workflow manually
   - Specify the version (e.g., v1.2.3)
   - The workflow will handle version bumping and tagging

## Development Best Practices

### 1. Branch Management
- **Main Branches**
  - `main`: Production-ready code
  - `develop`: Integration branch
  - `release/*`: Release preparation branches
  - `feature/*`: New features
  - `fix/*`: Bug fixes
  - `docs/*`: Documentation updates
  - `chore/*`: Maintenance tasks

### 2. Commit Message Guidelines
```
<type>(<scope>): <subject>
<BLANK LINE>
[optional body]
<BLANK LINE>
[optional footer(s)]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding tests
- `chore`: Maintenance tasks

### 3. Versioning Strategy
- Follows [Semantic Versioning 2.0.0](https://semver.org/)
- Pre-release versions use `-alpha.N`, `-beta.N`, `-rc.N` suffixes
- Use `npm version` to manage versions
- Document breaking changes in `CHANGELOG.md`

1. **Branch Naming**
   - `main`: Production-ready code
   - `release/*`: Release candidate branches
   - `feature/*`: New features
   - `fix/*`: Bug fixes
   - `chore/*`: Maintenance tasks

2. **Commit Messages**
   - Follow Conventional Commits specification
   - Use meaningful, descriptive messages
   - Reference issues when applicable

3. **Versioning**
   - Follow Semantic Versioning (SemVer)
   - Use `npm version` to manage versions
   - Document breaking changes in release notes

## Advanced Troubleshooting Guide

### Common Issues and Solutions

#### 1. Build Failures
**Symptoms**:
- `npm install` or `npm run build` fails
- TypeScript compilation errors
- Missing dependencies

**Troubleshooting Steps**:
1. Clean the project:
   ```bash
   rm -rf node_modules package-lock.json
   npm cache clean --force
   npm install
   ```

2. Check Node.js version:
   ```bash
   node -v
   # Should match .nvmrc or package.json engines.node
   ```

3. Verify TypeScript:
   ```bash
   npx tsc --noEmit
   ```

#### 2. Publishing Issues
**Symptoms**:
- `npm publish` fails with authentication errors
- Version conflicts
- Missing files in published package

**Troubleshooting**:
1. Verify npm authentication:
   ```bash
   npm whoami
   npm token list
   ```

2. Check package.json:
   ```json
   {
     "name": "@nebius-code/nebius-code",
     "version": "1.2.3",
     "files": ["dist/**/*"],
     "publishConfig": {
       "access": "public"
     }
   }
   ```

#### 3. Workflow Failures
**Common Errors**:
- Permission denied
- Timeouts
- Resource constraints

**Debugging**:
1. Check workflow logs in GitHub Actions
2. Enable step debugging:
   ```yaml
   env:
     ACTIONS_STEP_DEBUG: true
     ACTIONS_RUNNER_DEBUG: true
   ```

3. Reproduce locally:
   ```bash
   # Install act for local workflow testing
   brew install act
   
   # Run workflow locally
   act -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-latest
   ```

### Performance Optimization
1. **Build Caching**:
   ```yaml
   - name: Cache build
     uses: actions/cache@v4
     with:
       path: |
         node_modules
         .next/cache
       key: ${{ runner.os }}-build-${{ hashFiles('package-lock.json') }}
   ```

2. **Test Parallelization**:
   ```yaml
   jobs:
     test:
       strategy:
         matrix:
           test-file: [test1, test2, test3]
       steps:
         - run: npm test ${{ matrix.test-file }}
   ```

3. **Resource Management**:
   ```yaml
   jobs:
     build:
       runs-on: ubuntu-latest
       container:
         image: node:20-slim
         options: --cpus 2 --memory 4g
   ```
1. **Build Failures**
   - Ensure all dependencies are installed
   - Check Node.js version compatibility
   - Run `npm ci` for a clean install

2. **Publishing Issues**
   - Verify npm authentication
   - Check package name and version
   - Ensure you have publish permissions

3. **Workflow Failures**
   - Check workflow logs for specific errors
   - Verify secrets and environment variables
   - Ensure GitHub Actions permissions are properly set

