/**
 * Tests for CI/CD Integration
 */

const {
  CIProvider,
  ProviderConfig,
  JobType,
  JobConfig,
  WorkflowGenerator,
  PreCommitGenerator,
  PipelineValidator,
  CICDManager,
  createCICDManager
} = require('../../src/integrations/cicd');

describe('CI/CD Integration', () => {
  describe('CIProvider Constants', () => {
    it('should have 7 providers defined', () => {
      expect(Object.keys(CIProvider).length).toBe(7);
    });

    it('should have config for each provider', () => {
      for (const providerId of Object.values(CIProvider)) {
        expect(ProviderConfig[providerId]).toBeDefined();
        expect(ProviderConfig[providerId].name).toBeDefined();
        expect(ProviderConfig[providerId].configFile).toBeDefined();
      }
    });
  });

  describe('JobType Constants', () => {
    it('should have 6 job types', () => {
      expect(Object.keys(JobType).length).toBe(6);
    });

    it('should have config for each job type', () => {
      for (const jobType of Object.values(JobType)) {
        expect(JobConfig[jobType]).toBeDefined();
        expect(JobConfig[jobType].command).toBeDefined();
      }
    });

    it('should have required flag for validate and test', () => {
      expect(JobConfig[JobType.VALIDATE].required).toBe(true);
      expect(JobConfig[JobType.TEST].required).toBe(true);
    });
  });

  describe('WorkflowGenerator', () => {
    describe('GitHub Actions', () => {
      let generator;

      beforeEach(() => {
        generator = new WorkflowGenerator(CIProvider.GITHUB_ACTIONS, {
          nodeVersion: '20',
          branch: 'main',
          jobs: [JobType.VALIDATE, JobType.TEST]
        });
      });

      it('should generate valid YAML', () => {
        const yaml = generator.generate();
        expect(yaml).toContain('name: MUSUBI SDD Validation');
        expect(yaml).toContain('jobs:');
      });

      it('should include push and pull_request triggers', () => {
        const yaml = generator.generate();
        expect(yaml).toContain('push:');
        expect(yaml).toContain('pull_request:');
      });

      it('should include checkout step', () => {
        const yaml = generator.generate();
        expect(yaml).toContain('actions/checkout@v4');
      });

      it('should include node setup', () => {
        const yaml = generator.generate();
        expect(yaml).toContain('actions/setup-node@v4');
        expect(yaml).toContain('node-version: 20');
      });

      it('should include cache step when enabled', () => {
        const yaml = generator.generate();
        expect(yaml).toContain('actions/cache@v4');
        expect(yaml).toContain('node_modules');
      });

      it('should include validate job', () => {
        const yaml = generator.generate();
        expect(yaml).toContain('npx musubi validate');
      });

      it('should include test job', () => {
        const yaml = generator.generate();
        expect(yaml).toContain('npm test');
      });
    });

    describe('GitLab CI', () => {
      let generator;

      beforeEach(() => {
        generator = new WorkflowGenerator(CIProvider.GITLAB_CI, {
          jobs: [JobType.VALIDATE, JobType.ANALYZE]
        });
      });

      it('should specify node image', () => {
        const yaml = generator.generate();
        expect(yaml).toContain('image: node:20');
      });

      it('should define stages', () => {
        const yaml = generator.generate();
        expect(yaml).toContain('stages:');
        expect(yaml).toContain('- validate');
        expect(yaml).toContain('- analyze');
      });

      it('should include cache configuration', () => {
        const yaml = generator.generate();
        expect(yaml).toContain('cache:');
        expect(yaml).toContain('node_modules/');
      });

      it('should include before_script', () => {
        const yaml = generator.generate();
        expect(yaml).toContain('before_script:');
        expect(yaml).toContain('npm ci');
      });
    });

    describe('Azure Pipelines', () => {
      it('should generate valid structure', () => {
        const generator = new WorkflowGenerator(CIProvider.AZURE_PIPELINES, {
          jobs: [JobType.VALIDATE]
        });
        const yaml = generator.generate();
        expect(yaml).toContain('trigger:');
        expect(yaml).toContain('stages:');
      });
    });

    describe('Jenkinsfile', () => {
      it('should generate Groovy pipeline', () => {
        const generator = new WorkflowGenerator(CIProvider.JENKINS, {
          jobs: [JobType.VALIDATE, JobType.TEST]
        });
        const groovy = generator.generate();
        expect(groovy).toContain('pipeline {');
        expect(groovy).toContain('agent any');
        expect(groovy).toContain("stage('Validate Steering')");
        expect(groovy).toContain("stage('Run Tests')");
      });
    });

    describe('CircleCI', () => {
      it('should include version', () => {
        const generator = new WorkflowGenerator(CIProvider.CIRCLE_CI, {
          jobs: [JobType.VALIDATE]
        });
        const yaml = generator.generate();
        expect(yaml).toContain('version: 2.1');
      });

      it('should define workflows', () => {
        const generator = new WorkflowGenerator(CIProvider.CIRCLE_CI, {
          jobs: [JobType.VALIDATE]
        });
        const yaml = generator.generate();
        expect(yaml).toContain('workflows:');
        expect(yaml).toContain('musubi:');
      });
    });

    describe('Travis CI', () => {
      it('should specify language and node version', () => {
        const generator = new WorkflowGenerator(CIProvider.TRAVIS_CI, {
          jobs: [JobType.TEST]
        });
        const yaml = generator.generate();
        expect(yaml).toContain('language: node_js');
        expect(yaml).toContain('"20"');
      });
    });

    describe('Bitbucket Pipelines', () => {
      it('should generate valid structure', () => {
        const generator = new WorkflowGenerator(CIProvider.BITBUCKET_PIPELINES, {
          jobs: [JobType.VALIDATE]
        });
        const yaml = generator.generate();
        expect(yaml).toContain('image: node:20');
        expect(yaml).toContain('pipelines:');
      });
    });

    it('should throw for unsupported provider', () => {
      const generator = new WorkflowGenerator('unknown');
      expect(() => generator.generate()).toThrow('Unsupported CI provider');
    });
  });

  describe('PreCommitGenerator', () => {
    let generator;

    beforeEach(() => {
      generator = new PreCommitGenerator({
        hooks: ['validate', 'lint', 'test']
      });
    });

    it('should generate pre-commit hook script', () => {
      const result = generator.generate();
      const preCommit = result['pre-commit'];
      
      expect(preCommit).toContain('#!/bin/sh');
      expect(preCommit).toContain('musubi validate');
    });

    it('should include lint command', () => {
      const result = generator.generate();
      expect(result['pre-commit']).toContain('npm run lint');
    });

    it('should include test command', () => {
      const result = generator.generate();
      expect(result['pre-commit']).toContain('npm test');
    });

    it('should generate husky config', () => {
      const result = generator.generate();
      expect(result['husky-config'].hooks['pre-commit']).toBeDefined();
    });

    it('should generate lint-staged config', () => {
      const result = generator.generate();
      expect(result['lint-staged']['*.{js,ts}']).toBeDefined();
    });

    it('should generate package.json scripts', () => {
      const scripts = generator.generatePackageJsonScripts();
      expect(scripts.prepare).toBe('husky install');
      expect(scripts.validate).toContain('musubi validate');
    });

    it('should include sync hook when specified', () => {
      const syncGenerator = new PreCommitGenerator({
        hooks: ['sync']
      });
      const result = syncGenerator.generate();
      expect(result['pre-commit']).toContain('musubi sync');
    });
  });

  describe('PipelineValidator', () => {
    let validator;

    beforeEach(() => {
      validator = new PipelineValidator();
    });

    it('should validate correct GitHub Actions config', () => {
      const content = `
name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx musubi validate
`;
      const result = validator.validate(content, CIProvider.GITHUB_ACTIONS);
      expect(result.valid).toBe(true);
    });

    it('should detect missing jobs section', () => {
      const content = 'name: CI\non: push\n';
      const result = validator.validate(content, CIProvider.GITHUB_ACTIONS);
      expect(result.errors).toContain('GitHub Actions: missing "jobs" section');
    });

    it('should warn about missing runs-on', () => {
      const content = 'jobs:\n  test:\n    steps: []';
      const result = validator.validate(content, CIProvider.GITHUB_ACTIONS);
      expect(result.warnings.some(w => w.includes('runs-on'))).toBe(true);
    });

    it('should warn about old Node.js version', () => {
      const content = 'node-version: 16\njobs:\n  test:\n    runs-on: ubuntu';
      const result = validator.validate(content, CIProvider.GITHUB_ACTIONS);
      expect(result.warnings.some(w => w.includes('Node.js version 16'))).toBe(true);
    });

    it('should warn about missing MUSUBI commands', () => {
      const content = 'jobs:\n  test:\n    runs-on: ubuntu\n    steps:\n      - npm test';
      const result = validator.validate(content, CIProvider.GITHUB_ACTIONS);
      expect(result.warnings.some(w => w.includes('MUSUBI commands'))).toBe(true);
    });

    it('should warn about missing caching', () => {
      const content = 'jobs:\n  test:\n    runs-on: ubuntu\n    steps:\n      - npm ci\n      - npx musubi validate';
      const result = validator.validate(content, CIProvider.GITHUB_ACTIONS);
      expect(result.warnings.some(w => w.includes('caching'))).toBe(true);
    });

    it('should validate GitLab CI', () => {
      const content = `
image: node:20
stages:
  - test
test:
  script:
    - npm ci
    - npx musubi validate
`;
      const result = validator.validate(content, CIProvider.GITLAB_CI);
      expect(result.valid).toBe(true);
    });

    it('should detect invalid YAML structure', () => {
      const content = 'just plain text without any colons';
      const result = validator.validate(content, CIProvider.GITHUB_ACTIONS);
      expect(result.errors.some(e => e.includes('Invalid YAML'))).toBe(true);
    });

    it('should skip YAML validation for Jenkinsfile', () => {
      const content = 'pipeline { agent any }';
      const result = validator.validate(content, CIProvider.JENKINS);
      expect(result.errors.filter(e => e.includes('YAML')).length).toBe(0);
    });

    it('should handle unknown provider', () => {
      const result = validator.validate('', 'unknown-provider');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown provider: unknown-provider');
    });
  });

  describe('CICDManager', () => {
    let manager;

    beforeEach(() => {
      manager = new CICDManager({ projectRoot: '/test/project' });
    });

    it('should detect GitHub Actions', () => {
      const files = ['.github/workflows/musubi.yml', 'package.json'];
      const detected = manager.detect(files);
      expect(detected).toContain(CIProvider.GITHUB_ACTIONS);
    });

    it('should detect GitLab CI', () => {
      const files = ['.gitlab-ci.yml', 'src/index.js'];
      const detected = manager.detect(files);
      expect(detected).toContain(CIProvider.GITLAB_CI);
    });

    it('should detect multiple providers', () => {
      const files = ['.github/workflows/musubi.yml', '.gitlab-ci.yml'];
      const detected = manager.detect(files);
      expect(detected.length).toBe(2);
    });

    it('should emit detected event', (done) => {
      manager.on('detected', (data) => {
        expect(data.providers).toBeDefined();
        done();
      });
      manager.detect(['.github/workflows/musubi.yml']);
    });

    it('should generate workflow for provider', () => {
      const result = manager.generate(CIProvider.GITHUB_ACTIONS, {
        jobs: [JobType.VALIDATE]
      });
      
      expect(result.file).toBe('.github/workflows/musubi.yml');
      expect(result.content).toContain('MUSUBI');
    });

    it('should emit generated event', (done) => {
      manager.on('generated', (data) => {
        expect(data.provider).toBe(CIProvider.GITHUB_ACTIONS);
        done();
      });
      manager.generate(CIProvider.GITHUB_ACTIONS);
    });

    it('should generate all providers', () => {
      const results = manager.generateAll();
      expect(results.size).toBe(7);
      expect(results.get(CIProvider.GITHUB_ACTIONS).content).toBeDefined();
    });

    it('should generate pre-commit hooks', () => {
      const result = manager.generatePreCommit({ hooks: ['validate'] });
      expect(result['pre-commit']).toContain('musubi validate');
    });

    it('should validate pipeline', () => {
      const content = 'jobs:\n  test:\n    runs-on: ubuntu\n    steps:\n      - npm ci\n      - npx musubi validate';
      const result = manager.validate(content, CIProvider.GITHUB_ACTIONS);
      expect(result).toBeDefined();
    });

    it('should emit validated event', (done) => {
      manager.on('validated', (data) => {
        expect(data.result).toBeDefined();
        done();
      });
      manager.validate('jobs: {}', CIProvider.GITHUB_ACTIONS);
    });

    it('should get provider info', () => {
      const info = manager.getProviderInfo(CIProvider.GITHUB_ACTIONS);
      expect(info.name).toBe('GitHub Actions');
      expect(info.supportsMatrix).toBe(true);
    });

    it('should return null for unknown provider', () => {
      expect(manager.getProviderInfo('unknown')).toBeNull();
    });

    it('should list all providers', () => {
      const providers = manager.listProviders();
      expect(providers.length).toBe(7);
      expect(providers[0].id).toBeDefined();
      expect(providers[0].name).toBeDefined();
    });

    it('should get recommended config', () => {
      const config = manager.getRecommendedConfig(CIProvider.GITHUB_ACTIONS, {
        hasDocumentation: true,
        multiPlatform: true
      });
      
      expect(config.jobs).toContain(JobType.VALIDATE);
      expect(config.jobs).toContain(JobType.REPORT);
      expect(config.jobs).toContain(JobType.SYNC);
    });

    it('should convert to JSON', () => {
      manager.detect(['.github/workflows/musubi.yml']);
      const json = manager.toJSON();
      
      expect(json.projectRoot).toBe('/test/project');
      expect(json.detectedProvider).toBe(CIProvider.GITHUB_ACTIONS);
    });
  });

  describe('createCICDManager', () => {
    it('should create manager with defaults', () => {
      const manager = createCICDManager();
      expect(manager).toBeInstanceOf(CICDManager);
    });

    it('should accept options', () => {
      const manager = createCICDManager({ projectRoot: '/custom' });
      expect(manager.projectRoot).toBe('/custom');
    });
  });
});
