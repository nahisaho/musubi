/**
 * Constitution Level Manager
 *
 * Manages Constitutional Article enforcement levels.
 * Supports critical/advisory/flexible levels with project-specific overrides.
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Enforcement levels
 */
const EnforcementLevel = {
  BLOCK: 'block',     // Violations block progress
  WARN: 'warn',       // Violations show warnings
  CONFIGURE: 'configurable', // Can be overridden per project
};

/**
 * Article IDs
 */
const ArticleId = {
  LIBRARY_FIRST: 'CONST-001',
  CLI_INTERFACE: 'CONST-002',
  TEST_FIRST: 'CONST-003',
  EARS_FORMAT: 'CONST-004',
  TRACEABILITY: 'CONST-005',
  CONSTITUTION_ENFORCEMENT: 'CONST-006',
  DOCUMENTATION: 'CONST-007',
  CODE_QUALITY: 'CONST-008',
  REAL_SERVICE_TESTING: 'CONST-009',
};

/**
 * Default article levels
 */
const DEFAULT_ARTICLE_LEVELS = {
  [ArticleId.LIBRARY_FIRST]: 'critical',
  [ArticleId.CLI_INTERFACE]: 'advisory',
  [ArticleId.TEST_FIRST]: 'critical',
  [ArticleId.EARS_FORMAT]: 'advisory',
  [ArticleId.TRACEABILITY]: 'critical',
  [ArticleId.CONSTITUTION_ENFORCEMENT]: 'advisory',
  [ArticleId.DOCUMENTATION]: 'flexible',
  [ArticleId.CODE_QUALITY]: 'flexible',
  [ArticleId.REAL_SERVICE_TESTING]: 'advisory',
};

class ConstitutionLevelManager {
  /**
   * Create a new ConstitutionLevelManager
   * @param {string} projectRoot - Project root directory
   */
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.configPath = path.join(projectRoot, 'steering/rules/constitution-levels.yml');
    this.projectConfigPath = path.join(projectRoot, 'steering/project.yml');
    this._config = null;
    this._projectConfig = null;
  }

  /**
   * Load constitution levels configuration
   * @returns {Promise<object>} Configuration object
   */
  async loadConfig() {
    if (this._config) return this._config;

    try {
      if (await fs.pathExists(this.configPath)) {
        const content = await fs.readFile(this.configPath, 'utf8');
        this._config = yaml.load(content);
        return this._config;
      }
    } catch (error) {
      console.warn(`Warning: Could not load constitution levels config: ${error.message}`);
    }

    // Return default configuration
    return this._getDefaultConfig();
  }

  /**
   * Load project-specific overrides
   * @returns {Promise<object|null>} Project overrides or null
   */
  async loadProjectOverrides() {
    if (this._projectConfig !== null) return this._projectConfig;

    try {
      if (await fs.pathExists(this.projectConfigPath)) {
        const content = await fs.readFile(this.projectConfigPath, 'utf8');
        const config = yaml.load(content);
        this._projectConfig = config.constitution || null;
        return this._projectConfig;
      }
    } catch {
      // Project config is optional
    }

    this._projectConfig = null;
    return null;
  }

  /**
   * Get default configuration
   * @private
   */
  _getDefaultConfig() {
    return {
      schema_version: '1.0',
      levels: {
        critical: {
          enforcement: EnforcementLevel.BLOCK,
          articles: [
            { id: ArticleId.LIBRARY_FIRST, name: 'Article I - Library-First Principle' },
            { id: ArticleId.TEST_FIRST, name: 'Article III - Test-First Imperative' },
            { id: ArticleId.TRACEABILITY, name: 'Article V - Traceability Mandate' },
          ],
        },
        advisory: {
          enforcement: EnforcementLevel.WARN,
          articles: [
            { id: ArticleId.CLI_INTERFACE, name: 'Article II - CLI Interface Mandate' },
            { id: ArticleId.EARS_FORMAT, name: 'Article IV - EARS Requirements Format' },
            { id: ArticleId.REAL_SERVICE_TESTING, name: 'Article IX - Real Service Testing' },
          ],
        },
        flexible: {
          enforcement: EnforcementLevel.CONFIGURE,
          articles: [
            { id: ArticleId.DOCUMENTATION, name: 'Article VII - Documentation Requirements' },
            { id: ArticleId.CODE_QUALITY, name: 'Article VIII - Code Quality Standards' },
          ],
        },
      },
      configurable: {
        coverage_threshold: { default: 80, min: 50, max: 100 },
        mock_allowed: { default: false },
        ears_required: { default: true },
        adr_required: { default: false },
      },
    };
  }

  /**
   * Get article level
   * @param {string} articleId - Article ID (e.g., 'CONST-001')
   * @returns {Promise<string>} Level ('critical', 'advisory', or 'flexible')
   */
  async getArticleLevel(articleId) {
    const config = await this.loadConfig();

    for (const [level, levelConfig] of Object.entries(config.levels || {})) {
      const articles = levelConfig.articles || [];
      if (articles.some(a => a.id === articleId)) {
        return level;
      }
    }

    return DEFAULT_ARTICLE_LEVELS[articleId] || 'advisory';
  }

  /**
   * Get enforcement type for an article
   * @param {string} articleId - Article ID
   * @returns {Promise<string>} Enforcement type ('block', 'warn', or 'configurable')
   */
  async getEnforcementType(articleId) {
    const level = await this.getArticleLevel(articleId);
    const config = await this.loadConfig();

    const levelConfig = config.levels?.[level];
    return levelConfig?.enforcement || EnforcementLevel.WARN;
  }

  /**
   * Check if an article is blocking (critical)
   * @param {string} articleId - Article ID
   * @returns {Promise<boolean>} True if blocking
   */
  async isBlocking(articleId) {
    const enforcement = await this.getEnforcementType(articleId);
    return enforcement === EnforcementLevel.BLOCK;
  }

  /**
   * Get all critical articles
   * @returns {Promise<object[]>} Critical articles
   */
  async getCriticalArticles() {
    const config = await this.loadConfig();
    return config.levels?.critical?.articles || [];
  }

  /**
   * Get all advisory articles
   * @returns {Promise<object[]>} Advisory articles
   */
  async getAdvisoryArticles() {
    const config = await this.loadConfig();
    return config.levels?.advisory?.articles || [];
  }

  /**
   * Get all flexible articles
   * @returns {Promise<object[]>} Flexible articles
   */
  async getFlexibleArticles() {
    const config = await this.loadConfig();
    return config.levels?.flexible?.articles || [];
  }

  /**
   * Get configurable setting value
   * @param {string} setting - Setting name (e.g., 'coverage_threshold')
   * @param {object} context - Context for resolution (e.g., { packageType: 'cli' })
   * @returns {Promise<*>} Setting value
   */
  async getConfigValue(setting, context = {}) {
    const config = await this.loadConfig();
    const overrides = await this.loadProjectOverrides();

    // Check project overrides first
    if (overrides?.overrides?.[setting] !== undefined) {
      return overrides.overrides[setting];
    }

    const settingConfig = config.configurable?.[setting];
    if (!settingConfig) {
      return null;
    }

    // Check package-specific rules
    if (context.packageType && config.validation?.package_rules?.[context.packageType]) {
      const packageRule = config.validation.package_rules[context.packageType];
      if (packageRule[setting] !== undefined) {
        return packageRule[setting];
      }
    }

    // Check mode-specific defaults
    if (context.mode && settingConfig.per_mode && settingConfig.mode_defaults) {
      if (settingConfig.mode_defaults[context.mode] !== undefined) {
        return settingConfig.mode_defaults[context.mode];
      }
    }

    return settingConfig.default;
  }

  /**
   * Get coverage threshold
   * @param {object} context - Context (packageType, mode)
   * @returns {Promise<number>} Coverage threshold
   */
  async getCoverageThreshold(context = {}) {
    return (await this.getConfigValue('coverage_threshold', context)) || 80;
  }

  /**
   * Check if mocking is allowed
   * @param {string} dependency - Dependency to mock (optional)
   * @param {object} context - Context
   * @returns {Promise<boolean>} True if allowed
   */
  async isMockAllowed(dependency = null, context = {}) {
    const config = await this.loadConfig();
    const overrides = await this.loadProjectOverrides();

    // Check if dependency is in allowed list
    if (dependency) {
      const allowedMocks = [
        ...(config.configurable?.mock_allowed?.exceptions || []),
        ...(overrides?.overrides?.mock_allowed || []),
      ];

      for (const pattern of allowedMocks) {
        if (dependency.includes(pattern) || pattern === dependency) {
          return true;
        }
      }
    }

    return await this.getConfigValue('mock_allowed', context);
  }

  /**
   * Check if EARS format is required
   * @param {object} context - Context (mode, packageType)
   * @returns {Promise<boolean>} True if required
   */
  async isEarsRequired(context = {}) {
    return await this.getConfigValue('ears_required', context);
  }

  /**
   * Check if ADR is required
   * @param {object} context - Context (mode, packageType)
   * @returns {Promise<boolean>} True if required
   */
  async isAdrRequired(context = {}) {
    return await this.getConfigValue('adr_required', context);
  }

  /**
   * Validate against constitution
   * @param {object} validation - Validation data
   * @returns {Promise<object>} Validation result
   */
  async validate(validation) {
    const results = {
      passed: true,
      critical: [],
      advisory: [],
      flexible: [],
    };

    // Check critical articles
    const criticalArticles = await this.getCriticalArticles();
    for (const article of criticalArticles) {
      const check = validation[article.id];
      if (check === false) {
        results.passed = false;
        results.critical.push({
          article,
          status: 'failed',
          blocking: true,
        });
      } else if (check === true) {
        results.critical.push({
          article,
          status: 'passed',
          blocking: false,
        });
      }
    }

    // Check advisory articles
    const advisoryArticles = await this.getAdvisoryArticles();
    for (const article of advisoryArticles) {
      const check = validation[article.id];
      if (check === false) {
        results.advisory.push({
          article,
          status: 'warning',
          blocking: false,
        });
      } else if (check === true) {
        results.advisory.push({
          article,
          status: 'passed',
          blocking: false,
        });
      }
    }

    return results;
  }

  /**
   * Get summary of all levels
   * @returns {Promise<object>} Level summary
   */
  async getSummary() {
    return {
      critical: await this.getCriticalArticles(),
      advisory: await this.getAdvisoryArticles(),
      flexible: await this.getFlexibleArticles(),
      configurable: {
        coverage_threshold: await this.getCoverageThreshold(),
        mock_allowed: await this.isMockAllowed(),
        ears_required: await this.isEarsRequired(),
        adr_required: await this.isAdrRequired(),
      },
    };
  }
}

module.exports = {
  ConstitutionLevelManager,
  EnforcementLevel,
  ArticleId,
  DEFAULT_ARTICLE_LEVELS,
};
