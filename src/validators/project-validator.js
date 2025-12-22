/**
 * Project Validator
 *
 * Validates steering/project.yml against the project schema.
 * Supports schema migration from v1.0 to v2.0.
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const projectSchema = require('../schemas/project-schema.json');

/**
 * Default project configuration values
 */
const DEFAULT_PROJECT_CONFIG = {
  schema_version: '2.0',
  package_type: 'application',
  workflow: {
    mode: 'medium',
    auto_detect_mode: true,
  },
  constitution: {
    level_config: 'steering/rules/constitution-levels.yml',
  },
  agents: {
    default_language: 'en',
    bilingual_output: { enabled: false, languages: ['en'] },
    output: {
      gradual_generation: true,
      progress_indicators: true,
      large_file_splitting: false,
      split_threshold_lines: 300,
    },
  },
};

class ProjectValidator {
  /**
   * Create a new ProjectValidator
   * @param {string} projectRoot - Project root directory
   */
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.projectConfigPath = path.join(projectRoot, 'steering/project.yml');
    this._config = null;

    // Initialize Ajv
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
    this.validate = this.ajv.compile(projectSchema);
  }

  /**
   * Load project configuration
   * @returns {Promise<object>} Configuration object
   */
  async loadConfig() {
    if (this._config) return this._config;

    if (await fs.pathExists(this.projectConfigPath)) {
      const content = await fs.readFile(this.projectConfigPath, 'utf8');
      this._config = yaml.load(content);
      return this._config;
    }

    throw new Error(`Project configuration not found: ${this.projectConfigPath}`);
  }

  /**
   * Validate project configuration
   * @returns {Promise<object>} Validation result
   */
  async validateConfig() {
    const config = await this.loadConfig();
    const isValid = this.validate(config);

    const result = {
      valid: isValid,
      errors: [],
      warnings: [],
      schemaVersion: config.schema_version || '1.0',
      needsMigration: !config.schema_version || config.schema_version === '1.0',
    };

    if (!isValid) {
      result.errors = this.validate.errors.map(err => ({
        path: err.instancePath || 'root',
        message: err.message,
        keyword: err.keyword,
        params: err.params,
      }));
    }

    // Check for recommended fields
    if (!config.package_type) {
      result.warnings.push({
        path: '/package_type',
        message: 'package_type is recommended for better Constitution enforcement',
      });
    }

    if (!config.workflow?.mode) {
      result.warnings.push({
        path: '/workflow/mode',
        message: 'workflow.mode is recommended for workflow flexibility',
      });
    }

    if (!config.constitution) {
      result.warnings.push({
        path: '/constitution',
        message: 'constitution section recommended for governance configuration',
      });
    }

    return result;
  }

  /**
   * Get effective configuration (with defaults applied)
   * @returns {Promise<object>} Effective configuration
   */
  async getEffectiveConfig() {
    const config = await this.loadConfig();
    return this._mergeWithDefaults(config);
  }

  /**
   * Merge configuration with defaults
   * @private
   */
  _mergeWithDefaults(config) {
    return {
      ...DEFAULT_PROJECT_CONFIG,
      ...config,
      workflow: {
        ...DEFAULT_PROJECT_CONFIG.workflow,
        ...config.workflow,
      },
      constitution: {
        ...DEFAULT_PROJECT_CONFIG.constitution,
        ...config.constitution,
      },
      agents: {
        ...DEFAULT_PROJECT_CONFIG.agents,
        ...config.agents,
        bilingual_output: {
          ...DEFAULT_PROJECT_CONFIG.agents.bilingual_output,
          ...config.agents?.bilingual_output,
        },
        output: {
          ...DEFAULT_PROJECT_CONFIG.agents.output,
          ...config.agents?.output,
        },
      },
    };
  }

  /**
   * Migrate v1.0 config to v2.0
   * @returns {Promise<object>} Migrated configuration
   */
  async migrateToV2() {
    const config = await this.loadConfig();

    if (config.schema_version === '2.0') {
      return { migrated: false, config, message: 'Already at v2.0' };
    }

    const migratedConfig = {
      schema_version: '2.0',
      ...config,
    };

    // Add package_type if missing
    if (!migratedConfig.package_type) {
      migratedConfig.package_type = this._detectPackageType();
    }

    // Add workflow mode if missing
    if (!migratedConfig.workflow) {
      migratedConfig.workflow = {};
    }
    if (!migratedConfig.workflow.mode) {
      migratedConfig.workflow.mode = 'medium';
      migratedConfig.workflow.auto_detect_mode = true;
    }

    // Add constitution section if missing
    if (!migratedConfig.constitution) {
      migratedConfig.constitution = {
        level_config: 'steering/rules/constitution-levels.yml',
        overrides: {
          coverage_threshold: migratedConfig.workflow?.testing?.coverage_threshold || 80,
        },
      };
    }

    // Add metadata
    migratedConfig.metadata = {
      ...migratedConfig.metadata,
      updated_at: new Date().toISOString(),
      musubi_version: require('../../package.json').version,
    };

    return { migrated: true, config: migratedConfig, message: 'Migrated from v1.0 to v2.0' };
  }

  /**
   * Detect package type from project structure
   * @private
   */
  _detectPackageType() {
    const hasPackages = fs.existsSync(path.join(this.projectRoot, 'packages'));
    const hasBin = fs.existsSync(path.join(this.projectRoot, 'bin'));
    const hasLib = fs.existsSync(path.join(this.projectRoot, 'lib'));
    const hasExtensionManifest = fs.existsSync(
      path.join(this.projectRoot, 'packages/vscode-extension')
    );

    if (hasPackages && hasExtensionManifest) {
      return 'monorepo';
    }
    if (hasExtensionManifest) {
      return 'extension';
    }
    if (hasBin && !hasLib) {
      return 'cli';
    }
    if (hasLib && !hasBin) {
      return 'library';
    }

    return 'application';
  }

  /**
   * Save migrated configuration
   * @param {object} config - Configuration to save
   * @returns {Promise<void>}
   */
  async saveConfig(config) {
    const yamlContent = yaml.dump(config, {
      indent: 2,
      lineWidth: 120,
      sortKeys: false,
    });

    // Create backup
    if (await fs.pathExists(this.projectConfigPath)) {
      const backupPath = this.projectConfigPath + '.backup';
      await fs.copy(this.projectConfigPath, backupPath);
    }

    await fs.writeFile(this.projectConfigPath, yamlContent, 'utf8');
  }

  /**
   * Get workflow mode from config
   * @returns {Promise<string>} Workflow mode
   */
  async getWorkflowMode() {
    const config = await this.getEffectiveConfig();
    return config.workflow?.mode || 'medium';
  }

  /**
   * Get package type from config
   * @returns {Promise<string>} Package type
   */
  async getPackageType() {
    const config = await this.getEffectiveConfig();
    return config.package_type || 'application';
  }

  /**
   * Get constitution overrides
   * @returns {Promise<object>} Constitution overrides
   */
  async getConstitutionOverrides() {
    const config = await this.getEffectiveConfig();
    return config.constitution?.overrides || {};
  }

  /**
   * Get agent configuration
   * @returns {Promise<object>} Agent config
   */
  async getAgentConfig() {
    const config = await this.getEffectiveConfig();
    return config.agents || {};
  }

  /**
   * Generate validation report
   * @returns {Promise<object>} Validation report
   */
  async generateReport() {
    const validation = await this.validateConfig();
    const effective = await this.getEffectiveConfig();

    return {
      timestamp: new Date().toISOString(),
      projectRoot: this.projectRoot,
      configPath: this.projectConfigPath,
      validation,
      effective: {
        schema_version: effective.schema_version,
        package_type: effective.package_type,
        workflow_mode: effective.workflow?.mode,
        coverage_threshold: effective.workflow?.testing?.coverage_threshold,
        constitution_overrides: effective.constitution?.overrides,
      },
    };
  }
}

module.exports = { ProjectValidator, DEFAULT_PROJECT_CONFIG };
