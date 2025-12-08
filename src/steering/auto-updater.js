/**
 * Steering Auto-Update Module
 * 
 * Automatically updates steering files based on agent work:
 * - Detects project changes
 * - Updates structure.md, tech.md, product.md
 * - Maintains project.yml consistency
 * - Supports domain-specific custom rules
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

/**
 * Steering File Types
 */
const SteeringFileType = {
  STRUCTURE: 'structure',
  TECH: 'tech',
  PRODUCT: 'product',
  PROJECT: 'project',
  RULES: 'rules',
  CUSTOM: 'custom'
};

/**
 * Update Trigger Types
 */
const UpdateTrigger = {
  FILE_ADDED: 'file-added',
  FILE_MODIFIED: 'file-modified',
  FILE_DELETED: 'file-deleted',
  DEPENDENCY_ADDED: 'dependency-added',
  DEPENDENCY_REMOVED: 'dependency-removed',
  CONFIG_CHANGED: 'config-changed',
  MANUAL: 'manual'
};

/**
 * Change detection for steering updates
 */
class ChangeDetector {
  constructor(options = {}) {
    this.patterns = options.patterns || {
      structure: [
        /^src\//,
        /^lib\//,
        /^packages\//,
        /^components\//
      ],
      tech: [
        /package\.json$/,
        /requirements\.txt$/,
        /Gemfile$/,
        /go\.mod$/,
        /Cargo\.toml$/,
        /\.config\.(js|ts|json)$/
      ],
      product: [
        /README\.md$/,
        /docs\//,
        /\.env\.example$/
      ]
    };
  }

  /**
   * Detect which steering files need updates based on changed files
   */
  detectAffectedSteering(changedFiles) {
    const affected = new Set();

    for (const file of changedFiles) {
      for (const [steeringType, patterns] of Object.entries(this.patterns)) {
        for (const pattern of patterns) {
          if (pattern.test(file)) {
            affected.add(steeringType);
            break;
          }
        }
      }
    }

    return [...affected];
  }

  /**
   * Analyze file changes
   */
  analyzeChanges(changes) {
    const analysis = {
      addedFiles: [],
      modifiedFiles: [],
      deletedFiles: [],
      addedDependencies: [],
      removedDependencies: [],
      affectedSteering: []
    };

    for (const change of changes) {
      if (change.type === 'add') {
        analysis.addedFiles.push(change.path);
      } else if (change.type === 'modify') {
        analysis.modifiedFiles.push(change.path);
      } else if (change.type === 'delete') {
        analysis.deletedFiles.push(change.path);
      }
    }

    const allFiles = [
      ...analysis.addedFiles,
      ...analysis.modifiedFiles,
      ...analysis.deletedFiles
    ];

    analysis.affectedSteering = this.detectAffectedSteering(allFiles);

    return analysis;
  }
}

/**
 * Steering file updater
 */
class SteeringUpdater {
  constructor(options = {}) {
    this.steeringDir = options.steeringDir || 'steering';
    this.dryRun = options.dryRun || false;
    this.backupEnabled = options.backup !== false;
  }

  /**
   * Update structure.md based on project analysis
   */
  generateStructureUpdate(analysis) {
    const updates = [];

    // Detect new directories
    const newDirs = new Set();
    for (const file of analysis.addedFiles) {
      const dir = path.dirname(file);
      if (dir !== '.') {
        newDirs.add(dir.split('/')[0]);
      }
    }

    if (newDirs.size > 0) {
      updates.push({
        section: 'directories',
        action: 'add',
        content: [...newDirs].map(d => `- \`${d}/\` - [TODO: Add description]`)
      });
    }

    // Detect removed directories
    const removedDirs = new Set();
    for (const file of analysis.deletedFiles) {
      const dir = path.dirname(file);
      if (dir !== '.') {
        removedDirs.add(dir.split('/')[0]);
      }
    }

    if (removedDirs.size > 0) {
      updates.push({
        section: 'directories',
        action: 'review',
        content: [...removedDirs].map(d => `- \`${d}/\` may need removal or update`)
      });
    }

    return updates;
  }

  /**
   * Update tech.md based on dependency changes
   */
  generateTechUpdate(analysis, packageJson = null) {
    const updates = [];

    if (packageJson) {
      const deps = packageJson.dependencies || {};
      const devDeps = packageJson.devDependencies || {};

      updates.push({
        section: 'dependencies',
        action: 'sync',
        content: {
          runtime: Object.keys(deps),
          development: Object.keys(devDeps)
        }
      });

      // Detect framework
      const frameworks = [];
      if (deps.react || deps['react-dom']) frameworks.push('React');
      if (deps.vue) frameworks.push('Vue.js');
      if (deps.next) frameworks.push('Next.js');
      if (deps.express) frameworks.push('Express');
      if (deps.fastify) frameworks.push('Fastify');
      if (deps.jest || devDeps.jest) frameworks.push('Jest');
      if (deps.typescript || devDeps.typescript) frameworks.push('TypeScript');

      if (frameworks.length > 0) {
        updates.push({
          section: 'frameworks',
          action: 'update',
          content: frameworks
        });
      }
    }

    return updates;
  }

  /**
   * Update product.md based on README changes
   */
  generateProductUpdate(analysis, readme = null) {
    const updates = [];

    if (readme) {
      // Extract title
      const titleMatch = readme.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        updates.push({
          section: 'name',
          action: 'sync',
          content: titleMatch[1]
        });
      }

      // Extract description
      const descMatch = readme.match(/^#\s+.+\n\n(.+?)(?:\n\n|$)/s);
      if (descMatch) {
        updates.push({
          section: 'description',
          action: 'sync',
          content: descMatch[1].trim()
        });
      }
    }

    return updates;
  }

  /**
   * Apply updates to a steering file
   */
  applyUpdates(filePath, updates) {
    const results = [];

    for (const update of updates) {
      results.push({
        file: filePath,
        section: update.section,
        action: update.action,
        applied: !this.dryRun,
        content: update.content
      });
    }

    return results;
  }
}

/**
 * Project.yml synchronizer
 */
class ProjectYmlSync {
  constructor(options = {}) {
    this.projectYmlPath = options.path || 'steering/project.yml';
  }

  /**
   * Parse project.yml content
   */
  parse(content) {
    const data = {
      name: '',
      version: '',
      description: '',
      tech_stack: [],
      features: [],
      agents: []
    };

    // Simple YAML-like parsing
    const lines = content.split('\n');
    let currentKey = null;
    let inList = false;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('#') || trimmed === '') continue;

      const keyMatch = line.match(/^(\w+):\s*(.*)$/);
      if (keyMatch) {
        currentKey = keyMatch[1];
        const value = keyMatch[2].trim();
        
        if (value && !value.startsWith('-')) {
          data[currentKey] = value;
          inList = false;
        } else {
          inList = true;
          if (!Array.isArray(data[currentKey])) {
            data[currentKey] = [];
          }
        }
      } else if (trimmed.startsWith('-') && currentKey) {
        const item = trimmed.slice(1).trim();
        if (!Array.isArray(data[currentKey])) {
          data[currentKey] = [];
        }
        data[currentKey].push(item);
      }
    }

    return data;
  }

  /**
   * Generate project.yml content
   */
  generate(data) {
    let content = '';

    content += `# Project Configuration\n`;
    content += `# Auto-generated by MUSUBI Steering Auto-Update\n\n`;

    if (data.name) content += `name: ${data.name}\n`;
    if (data.version) content += `version: ${data.version}\n`;
    if (data.description) content += `description: ${data.description}\n`;

    if (data.tech_stack && data.tech_stack.length > 0) {
      content += `\ntech_stack:\n`;
      for (const tech of data.tech_stack) {
        content += `  - ${tech}\n`;
      }
    }

    if (data.features && data.features.length > 0) {
      content += `\nfeatures:\n`;
      for (const feature of data.features) {
        content += `  - ${feature}\n`;
      }
    }

    if (data.agents && data.agents.length > 0) {
      content += `\nagents:\n`;
      for (const agent of data.agents) {
        content += `  - ${agent}\n`;
      }
    }

    return content;
  }

  /**
   * Sync project.yml with package.json
   */
  syncWithPackageJson(projectData, packageJson) {
    const updated = { ...projectData };

    if (packageJson.name) updated.name = packageJson.name;
    if (packageJson.version) updated.version = packageJson.version;
    if (packageJson.description) updated.description = packageJson.description;

    // Sync tech stack from dependencies
    const techStack = new Set(updated.tech_stack || []);
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const techMapping = {
      'react': 'React',
      'vue': 'Vue.js',
      'angular': 'Angular',
      'next': 'Next.js',
      'express': 'Express',
      'fastify': 'Fastify',
      'typescript': 'TypeScript',
      'jest': 'Jest',
      'mocha': 'Mocha',
      'webpack': 'Webpack',
      'vite': 'Vite',
      'tailwindcss': 'Tailwind CSS',
      'prisma': 'Prisma',
      'mongoose': 'Mongoose'
    };

    for (const [dep, tech] of Object.entries(techMapping)) {
      if (deps[dep]) {
        techStack.add(tech);
      }
    }

    updated.tech_stack = [...techStack];

    return updated;
  }
}

/**
 * Custom steering rules
 */
class CustomSteeringRules {
  constructor(options = {}) {
    this.rulesDir = options.rulesDir || 'steering/custom';
    this.rules = new Map();
  }

  /**
   * Load custom rules from directory
   */
  loadRules(content) {
    // Parse custom rules from markdown format
    const rules = [];
    const rulePattern = /## Rule: (.+)\n([\s\S]*?)(?=## Rule:|$)/g;
    
    let match;
    while ((match = rulePattern.exec(content)) !== null) {
      const name = match[1].trim();
      const body = match[2].trim();
      
      const rule = {
        name,
        pattern: null,
        action: 'warn',
        message: ''
      };

      // Parse pattern
      const patternMatch = body.match(/Pattern:\s*`([^`]+)`/);
      if (patternMatch) {
        rule.pattern = patternMatch[1];
      }

      // Parse action
      const actionMatch = body.match(/Action:\s*(warn|error|update)/);
      if (actionMatch) {
        rule.action = actionMatch[1];
      }

      // Parse message
      const messageMatch = body.match(/Message:\s*(.+)/);
      if (messageMatch) {
        rule.message = messageMatch[1];
      }

      rules.push(rule);
    }

    return rules;
  }

  /**
   * Register a custom rule
   */
  registerRule(rule) {
    this.rules.set(rule.name, rule);
    return this;
  }

  /**
   * Apply custom rules to changes
   */
  applyRules(changes) {
    const results = [];

    for (const [name, rule] of this.rules) {
      for (const change of changes) {
        if (rule.pattern && new RegExp(rule.pattern).test(change.path)) {
          results.push({
            rule: name,
            file: change.path,
            action: rule.action,
            message: rule.message
          });
        }
      }
    }

    return results;
  }
}

/**
 * Steering Auto-Updater
 */
class SteeringAutoUpdater extends EventEmitter {
  constructor(options = {}) {
    super();
    this.projectRoot = options.projectRoot || process.cwd();
    this.steeringDir = options.steeringDir || 'steering';
    this.dryRun = options.dryRun || false;
    
    this.detector = new ChangeDetector(options.detectorOptions);
    this.updater = new SteeringUpdater({
      steeringDir: this.steeringDir,
      dryRun: this.dryRun,
      backup: options.backup
    });
    this.projectSync = new ProjectYmlSync({
      path: path.join(this.steeringDir, 'project.yml')
    });
    this.customRules = new CustomSteeringRules({
      rulesDir: path.join(this.steeringDir, 'custom')
    });

    this.updateHistory = [];
  }

  /**
   * Analyze project and generate update suggestions
   */
  analyze(changes, context = {}) {
    const analysis = this.detector.analyzeChanges(changes);
    
    const suggestions = {
      structure: [],
      tech: [],
      product: [],
      project: [],
      custom: []
    };

    // Generate structure updates
    if (analysis.affectedSteering.includes('structure')) {
      suggestions.structure = this.updater.generateStructureUpdate(analysis);
    }

    // Generate tech updates
    if (analysis.affectedSteering.includes('tech') || context.packageJson) {
      suggestions.tech = this.updater.generateTechUpdate(analysis, context.packageJson);
    }

    // Generate product updates
    if (analysis.affectedSteering.includes('product') || context.readme) {
      suggestions.product = this.updater.generateProductUpdate(analysis, context.readme);
    }

    // Apply custom rules
    suggestions.custom = this.customRules.applyRules(changes);

    return {
      analysis,
      suggestions,
      affectedFiles: analysis.affectedSteering.map(type => 
        path.join(this.steeringDir, `${type}.md`)
      )
    };
  }

  /**
   * Apply updates based on suggestions
   */
  applyUpdates(suggestions) {
    const results = {
      applied: [],
      skipped: [],
      errors: []
    };

    for (const [type, updates] of Object.entries(suggestions)) {
      if (updates.length === 0) continue;

      try {
        const filePath = path.join(this.steeringDir, `${type}.md`);
        const applied = this.updater.applyUpdates(filePath, updates);
        results.applied.push(...applied);

        this.emit('updated', { type, updates: applied });
      } catch (error) {
        results.errors.push({
          type,
          error: error.message
        });
      }
    }

    // Record in history
    this.updateHistory.push({
      timestamp: new Date(),
      results
    });

    return results;
  }

  /**
   * Sync project.yml with package.json
   */
  syncProjectYml(projectData, packageJson) {
    const updated = this.projectSync.syncWithPackageJson(projectData, packageJson);
    
    this.emit('projectSynced', {
      before: projectData,
      after: updated
    });

    return updated;
  }

  /**
   * Register a custom rule
   */
  registerCustomRule(rule) {
    this.customRules.registerRule(rule);
    return this;
  }

  /**
   * Get update history
   */
  getHistory() {
    return [...this.updateHistory];
  }

  /**
   * Validate steering consistency
   */
  validateConsistency(steeringFiles) {
    const issues = [];

    // Check for missing files
    const requiredFiles = ['structure.md', 'tech.md', 'product.md'];
    for (const file of requiredFiles) {
      if (!steeringFiles.includes(file)) {
        issues.push({
          type: 'missing',
          file,
          severity: 'error',
          message: `Required steering file ${file} is missing`
        });
      }
    }

    // Check for empty sections (would require file content)
    
    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues
    };
  }
}

/**
 * Create steering auto-updater
 */
function createSteeringAutoUpdater(options = {}) {
  return new SteeringAutoUpdater(options);
}

module.exports = {
  // Classes
  ChangeDetector,
  SteeringUpdater,
  ProjectYmlSync,
  CustomSteeringRules,
  SteeringAutoUpdater,
  
  // Constants
  SteeringFileType,
  UpdateTrigger,
  
  // Factory
  createSteeringAutoUpdater
};
