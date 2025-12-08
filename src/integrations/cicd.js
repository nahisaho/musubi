/**
 * MUSUBI SDD - CI/CD Integration
 * Sprint 6.2: GitHub Actions, GitLab CI, Pre-commit Hooks
 */

const { EventEmitter } = require('events');

// ============================================================================
// CI/CD Providers
// ============================================================================

const CIProvider = {
  GITHUB_ACTIONS: 'github-actions',
  GITLAB_CI: 'gitlab-ci',
  AZURE_PIPELINES: 'azure-pipelines',
  JENKINS: 'jenkins',
  CIRCLE_CI: 'circle-ci',
  TRAVIS_CI: 'travis-ci',
  BITBUCKET_PIPELINES: 'bitbucket-pipelines'
};

const ProviderConfig = {
  [CIProvider.GITHUB_ACTIONS]: {
    name: 'GitHub Actions',
    configFile: '.github/workflows/musubi.yml',
    format: 'yaml',
    supportsMatrix: true,
    supportsCache: true,
    supportsArtifacts: true
  },
  [CIProvider.GITLAB_CI]: {
    name: 'GitLab CI',
    configFile: '.gitlab-ci.yml',
    format: 'yaml',
    supportsMatrix: true,
    supportsCache: true,
    supportsArtifacts: true
  },
  [CIProvider.AZURE_PIPELINES]: {
    name: 'Azure Pipelines',
    configFile: 'azure-pipelines.yml',
    format: 'yaml',
    supportsMatrix: true,
    supportsCache: true,
    supportsArtifacts: true
  },
  [CIProvider.JENKINS]: {
    name: 'Jenkins',
    configFile: 'Jenkinsfile',
    format: 'groovy',
    supportsMatrix: true,
    supportsCache: false,
    supportsArtifacts: true
  },
  [CIProvider.CIRCLE_CI]: {
    name: 'CircleCI',
    configFile: '.circleci/config.yml',
    format: 'yaml',
    supportsMatrix: true,
    supportsCache: true,
    supportsArtifacts: true
  },
  [CIProvider.TRAVIS_CI]: {
    name: 'Travis CI',
    configFile: '.travis.yml',
    format: 'yaml',
    supportsMatrix: true,
    supportsCache: true,
    supportsArtifacts: false
  },
  [CIProvider.BITBUCKET_PIPELINES]: {
    name: 'Bitbucket Pipelines',
    configFile: 'bitbucket-pipelines.yml',
    format: 'yaml',
    supportsMatrix: false,
    supportsCache: true,
    supportsArtifacts: true
  }
};

// ============================================================================
// Job Types
// ============================================================================

const JobType = {
  VALIDATE: 'validate',
  ANALYZE: 'analyze',
  SYNC: 'sync',
  TEST: 'test',
  REPORT: 'report',
  DEPLOY: 'deploy'
};

const JobConfig = {
  [JobType.VALIDATE]: {
    name: 'Validate Steering',
    description: 'Validate steering files and constitution compliance',
    command: 'npx musubi validate',
    required: true
  },
  [JobType.ANALYZE]: {
    name: 'Analyze Codebase',
    description: 'Analyze codebase structure and patterns',
    command: 'npx musubi analyze',
    required: false
  },
  [JobType.SYNC]: {
    name: 'Sync Steering',
    description: 'Synchronize steering files across platforms',
    command: 'npx musubi sync',
    required: false
  },
  [JobType.TEST]: {
    name: 'Run Tests',
    description: 'Execute test suite with validation',
    command: 'npm test',
    required: true
  },
  [JobType.REPORT]: {
    name: 'Generate Report',
    description: 'Generate quality metrics report',
    command: 'npx musubi gaps --format json',
    required: false
  },
  [JobType.DEPLOY]: {
    name: 'Deploy Documentation',
    description: 'Deploy generated documentation',
    command: 'npx musubi share --deploy',
    required: false
  }
};

// ============================================================================
// Workflow Generator
// ============================================================================

class WorkflowGenerator {
  constructor(provider, options = {}) {
    this.provider = provider;
    this.config = ProviderConfig[provider];
    this.options = {
      nodeVersion: options.nodeVersion || '20',
      branch: options.branch || 'main',
      jobs: options.jobs || [JobType.VALIDATE, JobType.TEST],
      cacheEnabled: options.cacheEnabled !== false,
      ...options
    };
  }

  generate() {
    switch (this.provider) {
      case CIProvider.GITHUB_ACTIONS:
        return this.generateGitHubActions();
      case CIProvider.GITLAB_CI:
        return this.generateGitLabCI();
      case CIProvider.AZURE_PIPELINES:
        return this.generateAzurePipelines();
      case CIProvider.JENKINS:
        return this.generateJenkinsfile();
      case CIProvider.CIRCLE_CI:
        return this.generateCircleCI();
      case CIProvider.TRAVIS_CI:
        return this.generateTravisCI();
      case CIProvider.BITBUCKET_PIPELINES:
        return this.generateBitbucketPipelines();
      default:
        throw new Error(`Unsupported CI provider: ${this.provider}`);
    }
  }

  generateGitHubActions() {
    const jobs = {};
    
    for (const jobType of this.options.jobs) {
      const jobConfig = JobConfig[jobType];
      jobs[jobType] = this.createGitHubJob(jobType, jobConfig);
    }

    const workflow = {
      name: 'MUSUBI SDD Validation',
      on: {
        push: { branches: [this.options.branch] },
        pull_request: { branches: [this.options.branch] }
      },
      jobs
    };

    return this.toYaml(workflow);
  }

  createGitHubJob(jobType, jobConfig) {
    const steps = [
      { uses: 'actions/checkout@v4' },
      {
        name: 'Setup Node.js',
        uses: 'actions/setup-node@v4',
        with: { 'node-version': this.options.nodeVersion }
      }
    ];

    if (this.options.cacheEnabled) {
      steps.push({
        name: 'Cache node_modules',
        uses: 'actions/cache@v4',
        with: {
          path: 'node_modules',
          key: "${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}"
        }
      });
    }

    steps.push(
      { name: 'Install dependencies', run: 'npm ci' },
      { name: jobConfig.name, run: jobConfig.command }
    );

    if (jobType === JobType.REPORT) {
      steps.push({
        name: 'Upload Report',
        uses: 'actions/upload-artifact@v4',
        with: {
          name: 'musubi-report',
          path: 'musubi-report.json'
        }
      });
    }

    return {
      'runs-on': 'ubuntu-latest',
      steps
    };
  }

  generateGitLabCI() {
    const lines = [
      'image: node:' + this.options.nodeVersion,
      '',
      'stages:'
    ];

    for (const jobType of this.options.jobs) {
      lines.push(`  - ${jobType}`);
    }

    if (this.options.cacheEnabled) {
      lines.push(
        '',
        'cache:',
        '  paths:',
        '    - node_modules/'
      );
    }

    lines.push(
      '',
      'before_script:',
      '  - npm ci',
      ''
    );

    for (const jobType of this.options.jobs) {
      const jobConfig = JobConfig[jobType];
      lines.push(
        `${jobType}:`,
        `  stage: ${jobType}`,
        '  script:',
        `    - ${jobConfig.command}`
      );

      if (jobType === JobType.REPORT) {
        lines.push(
          '  artifacts:',
          '    paths:',
          '      - musubi-report.json'
        );
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  generateAzurePipelines() {
    const stages = this.options.jobs.map(jobType => {
      const jobConfig = JobConfig[jobType];
      return {
        stage: jobType.charAt(0).toUpperCase() + jobType.slice(1),
        jobs: [{
          job: jobType,
          pool: { vmImage: 'ubuntu-latest' },
          steps: [
            { task: 'NodeTool@0', inputs: { versionSpec: this.options.nodeVersion } },
            { script: 'npm ci', displayName: 'Install dependencies' },
            { script: jobConfig.command, displayName: jobConfig.name }
          ]
        }]
      };
    });

    const pipeline = {
      trigger: [this.options.branch],
      stages
    };

    return this.toYaml(pipeline);
  }

  generateJenkinsfile() {
    const stages = this.options.jobs.map(jobType => {
      const jobConfig = JobConfig[jobType];
      return `
        stage('${jobConfig.name}') {
            steps {
                sh '${jobConfig.command}'
            }
        }`;
    }).join('\n');

    return `pipeline {
    agent any
    
    tools {
        nodejs 'node-${this.options.nodeVersion}'
    }
    
    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }
${stages}
    }
    
    post {
        always {
            cleanWs()
        }
    }
}`;
  }

  generateCircleCI() {
    const jobs = {};
    
    for (const jobType of this.options.jobs) {
      const jobConfig = JobConfig[jobType];
      jobs[jobType] = {
        docker: [{ image: `cimg/node:${this.options.nodeVersion}` }],
        steps: [
          'checkout',
          { restore_cache: { keys: ['v1-deps-{{ checksum "package-lock.json" }}'] } },
          { run: 'npm ci' },
          { save_cache: { paths: ['node_modules'], key: 'v1-deps-{{ checksum "package-lock.json" }}' } },
          { run: { name: jobConfig.name, command: jobConfig.command } }
        ]
      };
    }

    const config = {
      version: 2.1,
      jobs,
      workflows: {
        musubi: {
          jobs: this.options.jobs.map(j => ({ [j]: {} }))
        }
      }
    };

    return this.toYaml(config);
  }

  generateTravisCI() {
    const lines = [
      'language: node_js',
      'node_js:',
      `  - "${this.options.nodeVersion}"`,
      '',
      'cache:',
      '  npm: true',
      '',
      'script:'
    ];

    for (const jobType of this.options.jobs) {
      const jobConfig = JobConfig[jobType];
      lines.push(`  - ${jobConfig.command}`);
    }

    return lines.join('\n');
  }

  generateBitbucketPipelines() {
    const steps = this.options.jobs.map(jobType => {
      const jobConfig = JobConfig[jobType];
      return {
        step: {
          name: jobConfig.name,
          caches: ['node'],
          script: ['npm ci', jobConfig.command]
        }
      };
    });

    const pipelines = {
      image: `node:${this.options.nodeVersion}`,
      pipelines: {
        default: steps,
        branches: {
          [this.options.branch]: steps
        }
      }
    };

    return this.toYaml(pipelines);
  }

  toYaml(obj, indent = 0) {
    const spaces = '  '.repeat(indent);
    let result = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;

      if (Array.isArray(value)) {
        result += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object') {
            const itemYaml = this.toYaml(item, indent + 2);
            result += `${spaces}  - ${itemYaml.trim().replace(/\n/g, `\n${spaces}    `)}\n`;
          } else {
            result += `${spaces}  - ${item}\n`;
          }
        }
      } else if (typeof value === 'object') {
        result += `${spaces}${key}:\n`;
        result += this.toYaml(value, indent + 1);
      } else {
        result += `${spaces}${key}: ${value}\n`;
      }
    }

    return result;
  }
}

// ============================================================================
// Pre-commit Hook Generator
// ============================================================================

class PreCommitGenerator {
  constructor(options = {}) {
    this.options = {
      hooks: options.hooks || ['validate', 'lint'],
      packageManager: options.packageManager || 'npm',
      ...options
    };
  }

  generate() {
    return {
      'pre-commit': this.generatePreCommit(),
      'husky-config': this.generateHuskyConfig(),
      'lint-staged': this.generateLintStaged()
    };
  }

  generatePreCommit() {
    const commands = [];

    if (this.options.hooks.includes('validate')) {
      commands.push('npx musubi validate');
    }

    if (this.options.hooks.includes('lint')) {
      commands.push(`${this.options.packageManager} run lint`);
    }

    if (this.options.hooks.includes('test')) {
      commands.push(`${this.options.packageManager} test`);
    }

    if (this.options.hooks.includes('sync')) {
      commands.push('npx musubi sync');
    }

    return `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# MUSUBI SDD Pre-commit Hook
echo "🔍 Running MUSUBI validation..."

${commands.map(cmd => `${cmd} || exit 1`).join('\n')}

echo "✅ Pre-commit checks passed!"
`;
  }

  generateHuskyConfig() {
    return {
      hooks: {
        'pre-commit': 'npx lint-staged && npx musubi validate'
      }
    };
  }

  generateLintStaged() {
    const config = {};

    if (this.options.hooks.includes('lint')) {
      config['*.{js,ts}'] = ['eslint --fix', 'prettier --write'];
    }

    if (this.options.hooks.includes('validate')) {
      config['steering/**/*.md'] = ['npx musubi validate'];
    }

    return config;
  }

  generatePackageJsonScripts() {
    return {
      'prepare': 'husky install',
      'lint': 'eslint src tests',
      'lint:fix': 'eslint src tests --fix',
      'validate': 'npx musubi validate',
      'validate:all': 'npx musubi validate --all'
    };
  }
}

// ============================================================================
// CI Pipeline Validator
// ============================================================================

class PipelineValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  validate(content, provider) {
    this.errors = [];
    this.warnings = [];

    const config = ProviderConfig[provider];
    if (!config) {
      this.errors.push(`Unknown provider: ${provider}`);
      return this.getResult();
    }

    // Common validations
    this.validateYamlStructure(content, provider);
    this.validateNodeVersion(content);
    this.validateMusubiCommands(content);
    this.validateCaching(content, provider);

    return this.getResult();
  }

  validateYamlStructure(content, provider) {
    if (provider === CIProvider.JENKINS) return; // Jenkinsfile is Groovy

    // Check for basic YAML structure
    if (!content.includes(':')) {
      this.errors.push('Invalid YAML structure: missing key-value pairs');
    }

    // Provider-specific structure
    switch (provider) {
      case CIProvider.GITHUB_ACTIONS:
        if (!content.includes('jobs:')) {
          this.errors.push('GitHub Actions: missing "jobs" section');
        }
        if (!content.includes('runs-on:')) {
          this.warnings.push('GitHub Actions: consider specifying "runs-on"');
        }
        break;

      case CIProvider.GITLAB_CI:
        if (!content.includes('stages:')) {
          this.warnings.push('GitLab CI: consider defining stages');
        }
        break;

      case CIProvider.CIRCLE_CI:
        if (!content.includes('version:')) {
          this.errors.push('CircleCI: missing version specification');
        }
        break;
    }
  }

  validateNodeVersion(content) {
    const versionMatch = content.match(/node[:\-_]?(?:version)?[:\s]*['"]?(\d+)/i);
    if (versionMatch) {
      const version = parseInt(versionMatch[1]);
      if (version < 18) {
        this.warnings.push(`Node.js version ${version} may not support all MUSUBI features`);
      }
    }
  }

  validateMusubiCommands(content) {
    const hasMusubiCommand = content.includes('musubi');
    if (!hasMusubiCommand) {
      this.warnings.push('Pipeline does not include any MUSUBI commands');
    }

    if (!content.includes('npm ci') && !content.includes('npm install')) {
      this.warnings.push('Pipeline may be missing dependency installation');
    }
  }

  validateCaching(content, provider) {
    const config = ProviderConfig[provider];
    if (!config.supportsCache) return;

    const hasCaching = content.includes('cache') || content.includes('Cache');
    if (!hasCaching) {
      this.warnings.push('Consider enabling caching for faster builds');
    }
  }

  getResult() {
    return {
      valid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings]
    };
  }
}

// ============================================================================
// CI/CD Manager
// ============================================================================

class CICDManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.projectRoot = options.projectRoot || process.cwd();
    this.detectedProvider = null;
    this.generators = new Map();
    this.validator = new PipelineValidator();
  }

  detect(files) {
    const detected = [];

    for (const [provider, config] of Object.entries(ProviderConfig)) {
      const hasConfig = files.some(f => 
        f.includes(config.configFile) || f.endsWith(config.configFile.split('/').pop())
      );
      if (hasConfig) {
        detected.push(provider);
      }
    }

    if (detected.length > 0) {
      this.detectedProvider = detected[0];
    }

    this.emit('detected', { providers: detected });
    return detected;
  }

  getGenerator(provider, options = {}) {
    const key = `${provider}-${JSON.stringify(options)}`;
    
    if (!this.generators.has(key)) {
      this.generators.set(key, new WorkflowGenerator(provider, options));
    }

    return this.generators.get(key);
  }

  generate(provider, options = {}) {
    const generator = this.getGenerator(provider, options);
    const content = generator.generate();
    
    this.emit('generated', { provider, content });
    return {
      file: ProviderConfig[provider].configFile,
      content
    };
  }

  generateAll(options = {}) {
    const results = new Map();
    
    for (const provider of Object.values(CIProvider)) {
      try {
        const result = this.generate(provider, options);
        results.set(provider, result);
      } catch (error) {
        results.set(provider, { error: error.message });
      }
    }

    return results;
  }

  generatePreCommit(options = {}) {
    const generator = new PreCommitGenerator(options);
    return generator.generate();
  }

  validate(content, provider) {
    const result = this.validator.validate(content, provider);
    this.emit('validated', { provider, result });
    return result;
  }

  getProviderInfo(provider) {
    return ProviderConfig[provider] || null;
  }

  listProviders() {
    return Object.entries(ProviderConfig).map(([id, config]) => ({
      id,
      ...config
    }));
  }

  getRecommendedConfig(provider, projectInfo = {}) {
    const jobs = [JobType.VALIDATE, JobType.TEST];

    if (projectInfo.hasDocumentation) {
      jobs.push(JobType.REPORT);
    }

    if (projectInfo.multiPlatform) {
      jobs.push(JobType.SYNC);
    }

    return {
      provider,
      jobs,
      nodeVersion: projectInfo.nodeVersion || '20',
      branch: projectInfo.defaultBranch || 'main',
      cacheEnabled: true
    };
  }

  toJSON() {
    return {
      projectRoot: this.projectRoot,
      detectedProvider: this.detectedProvider,
      availableProviders: Object.keys(CIProvider)
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

function createCICDManager(options = {}) {
  return new CICDManager(options);
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  // Constants
  CIProvider,
  ProviderConfig,
  JobType,
  JobConfig,
  
  // Classes
  WorkflowGenerator,
  PreCommitGenerator,
  PipelineValidator,
  CICDManager,
  
  // Factory
  createCICDManager
};
