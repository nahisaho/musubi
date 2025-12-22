/**
 * Project Validator Tests
 *
 * Tests for project.yml validation and migration
 */

const { ProjectValidator, DEFAULT_PROJECT_CONFIG } = require('../src/validators/project-validator');
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

describe('ProjectValidator', () => {
  const testDir = '/tmp/test-project-validator';
  let validator;

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, 'steering'));
    validator = new ProjectValidator(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('loadConfig', () => {
    it('should load project.yml', async () => {
      const config = {
        schema_version: '2.0',
        project_name: 'test-project',
        version: '1.0.0',
      };
      await fs.writeFile(
        path.join(testDir, 'steering/project.yml'),
        yaml.dump(config)
      );

      const loaded = await validator.loadConfig();
      expect(loaded.project_name).toBe('test-project');
    });

    it('should throw if project.yml not found', async () => {
      await expect(validator.loadConfig()).rejects.toThrow('not found');
    });
  });

  describe('validateConfig', () => {
    it('should validate v2.0 config', async () => {
      const config = {
        schema_version: '2.0',
        project_name: 'test-project',
        version: '1.0.0',
        package_type: 'application',
      };
      await fs.writeFile(
        path.join(testDir, 'steering/project.yml'),
        yaml.dump(config)
      );

      const result = await validator.validateConfig();
      expect(result.valid).toBe(true);
      expect(result.needsMigration).toBe(false);
    });

    it('should detect v1.0 config needing migration', async () => {
      const config = {
        project_name: 'test-project',
        version: '1.0.0',
      };
      await fs.writeFile(
        path.join(testDir, 'steering/project.yml'),
        yaml.dump(config)
      );

      const result = await validator.validateConfig();
      expect(result.needsMigration).toBe(true);
    });

    it('should report errors for invalid config', async () => {
      const config = {
        schema_version: '2.0',
        project_name: 'test-project',
        version: 'invalid-version', // Not semver
        package_type: 'invalid-type', // Not in enum
      };
      await fs.writeFile(
        path.join(testDir, 'steering/project.yml'),
        yaml.dump(config)
      );

      const result = await validator.validateConfig();
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about missing recommended fields', async () => {
      const config = {
        schema_version: '2.0',
        project_name: 'test-project',
      };
      await fs.writeFile(
        path.join(testDir, 'steering/project.yml'),
        yaml.dump(config)
      );

      const result = await validator.validateConfig();
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.path.includes('package_type'))).toBe(true);
    });
  });

  describe('getEffectiveConfig', () => {
    it('should merge with defaults', async () => {
      const config = {
        schema_version: '2.0',
        project_name: 'test-project',
      };
      await fs.writeFile(
        path.join(testDir, 'steering/project.yml'),
        yaml.dump(config)
      );

      const effective = await validator.getEffectiveConfig();
      expect(effective.package_type).toBe('application');
      expect(effective.workflow.mode).toBe('medium');
      expect(effective.agents.default_language).toBe('en');
    });

    it('should preserve user overrides', async () => {
      const config = {
        schema_version: '2.0',
        project_name: 'test-project',
        package_type: 'library',
        workflow: {
          mode: 'large',
        },
      };
      await fs.writeFile(
        path.join(testDir, 'steering/project.yml'),
        yaml.dump(config)
      );

      const effective = await validator.getEffectiveConfig();
      expect(effective.package_type).toBe('library');
      expect(effective.workflow.mode).toBe('large');
    });
  });

  describe('migrateToV2', () => {
    it('should migrate v1.0 to v2.0', async () => {
      const config = {
        project_name: 'old-project',
        version: '1.0.0',
        workflow: {
          testing: {
            coverage_threshold: 90,
          },
        },
      };
      await fs.writeFile(
        path.join(testDir, 'steering/project.yml'),
        yaml.dump(config)
      );

      const result = await validator.migrateToV2();
      expect(result.migrated).toBe(true);
      expect(result.config.schema_version).toBe('2.0');
      expect(result.config.workflow.mode).toBe('medium');
      expect(result.config.constitution).toBeDefined();
    });

    it('should not migrate if already v2.0', async () => {
      const config = {
        schema_version: '2.0',
        project_name: 'new-project',
      };
      await fs.writeFile(
        path.join(testDir, 'steering/project.yml'),
        yaml.dump(config)
      );

      const result = await validator.migrateToV2();
      expect(result.migrated).toBe(false);
    });
  });

  describe('saveConfig', () => {
    it('should save config and create backup', async () => {
      const originalConfig = {
        project_name: 'original',
      };
      await fs.writeFile(
        path.join(testDir, 'steering/project.yml'),
        yaml.dump(originalConfig)
      );

      const newConfig = {
        schema_version: '2.0',
        project_name: 'updated',
      };
      await validator.saveConfig(newConfig);

      // Check new config
      const saved = yaml.load(
        await fs.readFile(path.join(testDir, 'steering/project.yml'), 'utf8')
      );
      expect(saved.project_name).toBe('updated');

      // Check backup
      const backup = yaml.load(
        await fs.readFile(path.join(testDir, 'steering/project.yml.backup'), 'utf8')
      );
      expect(backup.project_name).toBe('original');
    });
  });

  describe('getWorkflowMode', () => {
    it('should return configured mode', async () => {
      const config = {
        schema_version: '2.0',
        project_name: 'test',
        workflow: { mode: 'large' },
      };
      await fs.writeFile(
        path.join(testDir, 'steering/project.yml'),
        yaml.dump(config)
      );

      const mode = await validator.getWorkflowMode();
      expect(mode).toBe('large');
    });

    it('should return default mode', async () => {
      const config = {
        schema_version: '2.0',
        project_name: 'test',
      };
      await fs.writeFile(
        path.join(testDir, 'steering/project.yml'),
        yaml.dump(config)
      );

      const mode = await validator.getWorkflowMode();
      expect(mode).toBe('medium');
    });
  });

  describe('getPackageType', () => {
    it('should return configured type', async () => {
      const config = {
        schema_version: '2.0',
        project_name: 'test',
        package_type: 'cli',
      };
      await fs.writeFile(
        path.join(testDir, 'steering/project.yml'),
        yaml.dump(config)
      );

      const type = await validator.getPackageType();
      expect(type).toBe('cli');
    });
  });

  describe('getConstitutionOverrides', () => {
    it('should return constitution overrides', async () => {
      const config = {
        schema_version: '2.0',
        project_name: 'test',
        constitution: {
          overrides: {
            coverage_threshold: 95,
            mock_allowed: ['openai'],
          },
        },
      };
      await fs.writeFile(
        path.join(testDir, 'steering/project.yml'),
        yaml.dump(config)
      );

      const overrides = await validator.getConstitutionOverrides();
      expect(overrides.coverage_threshold).toBe(95);
      expect(overrides.mock_allowed).toContain('openai');
    });
  });
});

describe('DEFAULT_PROJECT_CONFIG', () => {
  it('should have required defaults', () => {
    expect(DEFAULT_PROJECT_CONFIG.schema_version).toBe('2.0');
    expect(DEFAULT_PROJECT_CONFIG.package_type).toBe('application');
    expect(DEFAULT_PROJECT_CONFIG.workflow.mode).toBe('medium');
    expect(DEFAULT_PROJECT_CONFIG.agents.default_language).toBe('en');
  });
});
