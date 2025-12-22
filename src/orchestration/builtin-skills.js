/**
 * Built-in Skills for Phase 1-4 Features
 *
 * Provides programmatic access to:
 * - Release management (musubi-release)
 * - Configuration management (musubi-config)
 * - Workflow mode management
 * - Package management
 * - Constitution level management
 */

const { ChangelogGenerator } = require('../generators/changelog-generator');
const { WorkflowModeManager } = require('../managers/workflow-mode-manager');
const { PackageManager } = require('../managers/package-manager');
const { ConstitutionLevelManager } = require('../validators/constitution-level-manager');
const { ProjectValidator } = require('../validators/project-validator');
const { SkillCategory } = require('./skill-registry');

/**
 * Release Skill - Generate changelog and manage releases
 */
const releaseSkill = {
  id: 'release-manager',
  name: 'Release Manager',
  description: 'Generate CHANGELOG, bump versions, and manage releases',
  version: '1.0.0',
  category: SkillCategory.RELEASE,
  tags: ['release', 'changelog', 'version', 'npm', 'publish'],
  inputs: [
    { name: 'versionType', type: 'string', description: 'patch|minor|major', required: false },
    { name: 'projectPath', type: 'string', description: 'Project root path', required: false },
  ],
  outputs: [
    { name: 'changelog', type: 'string', description: 'Generated changelog content' },
    { name: 'version', type: 'string', description: 'New version number' },
  ],
  timeout: 60000,
  priority: 'P1',

  async execute(input = {}) {
    const projectPath = input.projectPath || process.cwd();
    const generator = new ChangelogGenerator(projectPath);

    const changes = await generator.collectChanges();
    const changelog = generator.generateChangelog(changes);

    return {
      success: true,
      changelog,
      changes,
      projectPath,
    };
  },
};

/**
 * Workflow Mode Skill - Manage workflow modes
 */
const workflowModeSkill = {
  id: 'workflow-mode-manager',
  name: 'Workflow Mode Manager',
  description: 'Manage small/medium/large workflow modes and auto-detection',
  version: '1.0.0',
  category: SkillCategory.WORKFLOW,
  tags: ['workflow', 'mode', 'small', 'medium', 'large', 'stages'],
  inputs: [
    { name: 'action', type: 'string', description: 'get|detect|compare', required: true },
    { name: 'mode', type: 'string', description: 'small|medium|large', required: false },
    {
      name: 'featureName',
      type: 'string',
      description: 'Feature name for auto-detection',
      required: false,
    },
    { name: 'projectPath', type: 'string', description: 'Project root path', required: false },
  ],
  outputs: [
    { name: 'mode', type: 'object', description: 'Mode configuration' },
    { name: 'stages', type: 'array', description: 'Stage list for mode' },
  ],
  timeout: 10000,
  priority: 'P2',

  async execute(input = {}) {
    const projectPath = input.projectPath || process.cwd();
    const manager = new WorkflowModeManager(projectPath);

    switch (input.action) {
      case 'get': {
        const mode = await manager.getMode(input.mode || 'medium');
        const stages = await manager.getStages(input.mode || 'medium');
        return { success: true, mode, stages };
      }
      case 'detect': {
        const detectedMode = await manager.detectMode(input.featureName || '');
        const mode = await manager.getMode(detectedMode);
        return { success: true, detectedMode, mode };
      }
      case 'compare': {
        const comparison = await manager.compareModes();
        return { success: true, comparison };
      }
      default:
        return { success: false, error: 'Invalid action. Use: get, detect, compare' };
    }
  },
};

/**
 * Package Manager Skill - Manage monorepo packages
 */
const packageManagerSkill = {
  id: 'package-manager',
  name: 'Package Manager',
  description: 'Manage monorepo packages, dependency graphs, and coverage targets',
  version: '1.0.0',
  category: SkillCategory.CONFIGURATION,
  tags: ['package', 'monorepo', 'dependency', 'coverage', 'graph'],
  inputs: [
    { name: 'action', type: 'string', description: 'list|graph|validate|coverage', required: true },
    {
      name: 'packageName',
      type: 'string',
      description: 'Package name for coverage lookup',
      required: false,
    },
    { name: 'projectPath', type: 'string', description: 'Project root path', required: false },
  ],
  outputs: [
    { name: 'packages', type: 'array', description: 'Package list' },
    { name: 'graph', type: 'object', description: 'Dependency graph' },
  ],
  timeout: 30000,
  priority: 'P2',

  async execute(input = {}) {
    const projectPath = input.projectPath || process.cwd();
    const manager = new PackageManager(projectPath);

    switch (input.action) {
      case 'list': {
        const packages = await manager.getPackages();
        return { success: true, packages };
      }
      case 'graph': {
        const graph = await manager.buildDependencyGraph();
        const mermaid = await manager.generateMermaidGraph();
        return { success: true, graph, mermaid };
      }
      case 'validate': {
        const validation = await manager.validate();
        return { success: true, validation };
      }
      case 'coverage': {
        const coverage = await manager.getCoverageTarget(input.packageName);
        return { success: true, packageName: input.packageName, coverage };
      }
      default:
        return { success: false, error: 'Invalid action. Use: list, graph, validate, coverage' };
    }
  },
};

/**
 * Constitution Level Skill - Manage constitution enforcement levels
 */
const constitutionLevelSkill = {
  id: 'constitution-level-manager',
  name: 'Constitution Level Manager',
  description: 'Manage critical/advisory/flexible constitution enforcement levels',
  version: '1.0.0',
  category: SkillCategory.VALIDATION,
  tags: ['constitution', 'governance', 'critical', 'advisory', 'flexible', 'articles'],
  inputs: [
    { name: 'action', type: 'string', description: 'summary|level|validate', required: true },
    {
      name: 'articleId',
      type: 'string',
      description: 'Article ID (e.g., CONST-001)',
      required: false,
    },
    {
      name: 'validation',
      type: 'object',
      description: 'Validation results object',
      required: false,
    },
    { name: 'projectPath', type: 'string', description: 'Project root path', required: false },
  ],
  outputs: [
    { name: 'summary', type: 'object', description: 'Level summary' },
    { name: 'level', type: 'string', description: 'Article level' },
  ],
  timeout: 10000,
  priority: 'P1',

  async execute(input = {}) {
    const projectPath = input.projectPath || process.cwd();
    const manager = new ConstitutionLevelManager(projectPath);

    switch (input.action) {
      case 'summary': {
        const summary = await manager.getSummary();
        return { success: true, summary };
      }
      case 'level': {
        if (!input.articleId) {
          return { success: false, error: 'articleId required for level action' };
        }
        const level = await manager.getArticleLevel(input.articleId);
        const isBlocking = await manager.isBlocking(input.articleId);
        return { success: true, articleId: input.articleId, level, isBlocking };
      }
      case 'validate': {
        if (!input.validation) {
          return { success: false, error: 'validation object required' };
        }
        const result = await manager.validate(input.validation);
        return { success: true, result };
      }
      default:
        return { success: false, error: 'Invalid action. Use: summary, level, validate' };
    }
  },
};

/**
 * Project Config Skill - Manage project.yml configuration
 */
const projectConfigSkill = {
  id: 'project-config-manager',
  name: 'Project Config Manager',
  description: 'Validate, migrate, and manage project.yml configuration',
  version: '1.0.0',
  category: SkillCategory.CONFIGURATION,
  tags: ['config', 'project', 'migration', 'schema', 'validation'],
  inputs: [
    { name: 'action', type: 'string', description: 'validate|migrate|show', required: true },
    { name: 'dryRun', type: 'boolean', description: 'Dry run for migration', required: false },
    { name: 'projectPath', type: 'string', description: 'Project root path', required: false },
  ],
  outputs: [
    { name: 'config', type: 'object', description: 'Configuration object' },
    { name: 'validation', type: 'object', description: 'Validation result' },
  ],
  timeout: 30000,
  priority: 'P2',

  async execute(input = {}) {
    const projectPath = input.projectPath || process.cwd();
    const validator = new ProjectValidator(projectPath);

    switch (input.action) {
      case 'validate': {
        const validation = await validator.validateConfig();
        return { success: true, validation };
      }
      case 'migrate': {
        const result = await validator.migrateToV2();
        if (!input.dryRun && result.migrated) {
          await validator.saveConfig(result.config);
        }
        return {
          success: true,
          migrated: result.migrated,
          config: result.config,
          dryRun: input.dryRun,
        };
      }
      case 'show': {
        const report = await validator.generateReport();
        return { success: true, report };
      }
      default:
        return { success: false, error: 'Invalid action. Use: validate, migrate, show' };
    }
  },
};

/**
 * Register all built-in skills to a registry
 * @param {SkillRegistry} registry - The skill registry
 */
function registerBuiltInSkills(registry) {
  const skills = [
    releaseSkill,
    workflowModeSkill,
    packageManagerSkill,
    constitutionLevelSkill,
    projectConfigSkill,
  ];

  for (const skill of skills) {
    try {
      registry.registerSkill(skill, skill.execute);
    } catch (error) {
      console.warn(`Warning: Could not register skill ${skill.id}: ${error.message}`);
    }
  }

  return skills.length;
}

/**
 * Get all built-in skill definitions
 */
function getBuiltInSkills() {
  return [
    releaseSkill,
    workflowModeSkill,
    packageManagerSkill,
    constitutionLevelSkill,
    projectConfigSkill,
  ];
}

module.exports = {
  // Individual skills
  releaseSkill,
  workflowModeSkill,
  packageManagerSkill,
  constitutionLevelSkill,
  projectConfigSkill,

  // Utility functions
  registerBuiltInSkills,
  getBuiltInSkills,
};
