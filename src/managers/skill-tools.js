/**
 * @fileoverview Skill Tools Manager
 * @description Manage allowed-tools configuration for MUSUBI skills
 * @version 3.11.0
 * 
 * Features:
 * - Load skill tool configurations from YAML
 * - Validate tool availability
 * - Generate optimized tool sets per skill
 * - Tool dependency resolution
 * - Skill-aware tool filtering
 */

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { EventEmitter } = require('events');

/**
 * Default tool sets for common skill categories
 */
const DEFAULT_TOOL_SETS = {
  requirements: [
    'file_read',
    'file_write',
    'search_files',
    'read_resource'
  ],
  design: [
    'file_read',
    'file_write',
    'search_files',
    'create_directory',
    'read_resource'
  ],
  implementation: [
    'file_read',
    'file_write',
    'search_files',
    'create_directory',
    'run_command',
    'read_resource',
    'code_analysis'
  ],
  testing: [
    'file_read',
    'file_write',
    'search_files',
    'run_command',
    'test_runner'
  ],
  validation: [
    'file_read',
    'search_files',
    'read_resource',
    'validate'
  ],
  documentation: [
    'file_read',
    'file_write',
    'search_files',
    'read_resource'
  ],
  analysis: [
    'file_read',
    'search_files',
    'code_analysis',
    'read_resource'
  ],
  deployment: [
    'file_read',
    'run_command',
    'deploy'
  ]
};

/**
 * Tool restriction levels
 */
const RestrictionLevel = {
  NONE: 'none',           // No restrictions
  STANDARD: 'standard',   // Default restrictions
  STRICT: 'strict',       // Minimal tools only
  CUSTOM: 'custom'        // Custom configuration
};

/**
 * Skill Tool Configuration
 */
class SkillToolConfig {
  constructor(skillName, config = {}) {
    this.skillName = skillName;
    this.allowedTools = config.allowedTools || [];
    this.deniedTools = config.deniedTools || [];
    this.restrictionLevel = config.restrictionLevel || RestrictionLevel.STANDARD;
    this.toolOverrides = config.toolOverrides || {};
    this.inheritFrom = config.inheritFrom || null;
    this.toolDependencies = config.toolDependencies || {};
  }

  /**
   * Check if a tool is allowed
   * @param {string} toolName - Tool name
   * @returns {boolean} Whether tool is allowed
   */
  isToolAllowed(toolName) {
    // Explicitly denied
    if (this.deniedTools.includes(toolName)) {
      return false;
    }

    // No restrictions
    if (this.restrictionLevel === RestrictionLevel.NONE) {
      return true;
    }

    // Explicitly allowed
    if (this.allowedTools.includes(toolName)) {
      return true;
    }

    // If allowed list is specified, deny everything else
    if (this.allowedTools.length > 0) {
      return false;
    }

    // Standard mode allows common tools
    return this.restrictionLevel === RestrictionLevel.STANDARD;
  }

  /**
   * Get effective tool list with dependencies resolved
   * @param {Map<string, Array<string>>} dependencyMap - Tool dependencies
   * @returns {Array<string>} Resolved tool list
   */
  getEffectiveTools(dependencyMap = new Map()) {
    const tools = new Set(this.allowedTools);

    // Add dependencies
    for (const tool of this.allowedTools) {
      const deps = this.toolDependencies[tool] || dependencyMap.get(tool) || [];
      for (const dep of deps) {
        tools.add(dep);
      }
    }

    // Remove denied
    for (const denied of this.deniedTools) {
      tools.delete(denied);
    }

    return Array.from(tools);
  }

  toJSON() {
    return {
      skillName: this.skillName,
      allowedTools: this.allowedTools,
      deniedTools: this.deniedTools,
      restrictionLevel: this.restrictionLevel,
      toolOverrides: this.toolOverrides,
      inheritFrom: this.inheritFrom
    };
  }
}

/**
 * Skill Tools Manager
 */
class SkillToolsManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      configDir: options.configDir || '.musubi/tools',
      defaultToolSet: options.defaultToolSet || 'standard',
      enableInheritance: options.enableInheritance !== false,
      ...options
    };

    this.skillConfigs = new Map();
    this.toolDependencies = new Map();
    this.availableTools = new Set();
  }

  /**
   * Load tool configuration from file
   * @param {string} configPath - Path to config file
   * @returns {Promise<Object>} Loaded configuration
   */
  async loadConfig(configPath) {
    try {
      const content = await fs.promises.readFile(configPath, 'utf-8');
      const ext = path.extname(configPath).toLowerCase();

      let config;
      if (ext === '.yaml' || ext === '.yml') {
        config = yaml.load(content);
      } else if (ext === '.json') {
        config = JSON.parse(content);
      } else {
        throw new Error(`Unsupported config format: ${ext}`);
      }

      await this._processConfig(config);
      this.emit('configLoaded', configPath);
      return config;

    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Load tool configuration from string
   * @param {string} content - YAML or JSON content
   * @param {string} format - 'yaml' or 'json'
   * @returns {Object} Loaded configuration
   */
  loadConfigFromString(content, format = 'yaml') {
    let config;
    if (format === 'yaml') {
      config = yaml.load(content);
    } else {
      config = JSON.parse(content);
    }

    this._processConfig(config);
    return config;
  }

  /**
   * Process loaded configuration
   * @private
   */
  _processConfig(config) {
    // Load tool dependencies
    if (config.toolDependencies) {
      for (const [tool, deps] of Object.entries(config.toolDependencies)) {
        this.toolDependencies.set(tool, deps);
      }
    }

    // Load skill configurations
    if (config.skills) {
      for (const [skillName, skillConfig] of Object.entries(config.skills)) {
        this.setSkillConfig(skillName, skillConfig);
      }
    }

    // Load global defaults
    if (config.defaults) {
      this.options.defaultToolSet = config.defaults.toolSet || this.options.defaultToolSet;
    }
  }

  /**
   * Set configuration for a skill
   * @param {string} skillName - Skill name
   * @param {Object} config - Tool configuration
   * @returns {SkillToolConfig} Created configuration
   */
  setSkillConfig(skillName, config) {
    const skillConfig = new SkillToolConfig(skillName, config);
    
    // Handle inheritance
    if (this.options.enableInheritance && skillConfig.inheritFrom) {
      const parentConfig = this.skillConfigs.get(skillConfig.inheritFrom);
      if (parentConfig) {
        // Merge parent allowed tools
        const parentTools = new Set(parentConfig.allowedTools);
        for (const tool of skillConfig.allowedTools) {
          parentTools.add(tool);
        }
        skillConfig.allowedTools = Array.from(parentTools);
      }
    }

    this.skillConfigs.set(skillName, skillConfig);
    this.emit('skillConfigSet', skillName, skillConfig);
    return skillConfig;
  }

  /**
   * Get configuration for a skill
   * @param {string} skillName - Skill name
   * @returns {SkillToolConfig|null} Skill configuration
   */
  getSkillConfig(skillName) {
    return this.skillConfigs.get(skillName) || null;
  }

  /**
   * Get allowed tools for a skill
   * @param {string} skillName - Skill name
   * @param {Object} options - Options
   * @returns {Array<string>} Allowed tools
   */
  getAllowedTools(skillName, options = {}) {
    const config = this.skillConfigs.get(skillName);
    
    if (!config) {
      // Return default tools based on skill category
      return this._getDefaultToolsForSkill(skillName);
    }

    let tools = config.getEffectiveTools(this.toolDependencies);

    // Filter by available tools if specified
    if (options.filterByAvailable && this.availableTools.size > 0) {
      tools = tools.filter(t => this.availableTools.has(t));
    }

    return tools;
  }

  /**
   * Get default tools for a skill based on naming convention
   * @private
   */
  _getDefaultToolsForSkill(skillName) {
    const lowerName = skillName.toLowerCase();
    
    for (const [category, tools] of Object.entries(DEFAULT_TOOL_SETS)) {
      if (lowerName.includes(category)) {
        return [...tools];
      }
    }

    // Return minimal set
    return ['file_read', 'search_files'];
  }

  /**
   * Set available tools from MCP discovery
   * @param {Array<string>} tools - Available tool names
   */
  setAvailableTools(tools) {
    this.availableTools = new Set(tools);
    this.emit('availableToolsUpdated', tools);
  }

  /**
   * Validate tool availability for a skill
   * @param {string} skillName - Skill name
   * @returns {Object} Validation result
   */
  validateToolAvailability(skillName) {
    const allowedTools = this.getAllowedTools(skillName);
    const available = [];
    const missing = [];

    for (const tool of allowedTools) {
      if (this.availableTools.size === 0 || this.availableTools.has(tool)) {
        available.push(tool);
      } else {
        missing.push(tool);
      }
    }

    return {
      valid: missing.length === 0,
      available,
      missing,
      coverage: available.length / allowedTools.length
    };
  }

  /**
   * Generate optimized tool configuration for a skill
   * @param {string} skillName - Skill name
   * @param {Object} context - Execution context
   * @returns {Object} Optimized tool config
   */
  generateOptimizedConfig(skillName, context = {}) {
    const config = this.getSkillConfig(skillName);
    const allowedTools = this.getAllowedTools(skillName, { filterByAvailable: true });

    // Apply context-based optimization
    let optimizedTools = [...allowedTools];

    if (context.readOnly) {
      // Remove write operations
      optimizedTools = optimizedTools.filter(t => 
        !t.includes('write') && !t.includes('create') && !t.includes('delete')
      );
    }

    if (context.noNetwork) {
      // Remove network operations
      optimizedTools = optimizedTools.filter(t => 
        !t.includes('http') && !t.includes('api') && !t.includes('fetch')
      );
    }

    if (context.minimalPermissions) {
      // Keep only essential tools
      optimizedTools = optimizedTools.filter(t => 
        t.includes('read') || t.includes('search') || t.includes('list')
      );
    }

    return {
      skillName,
      allowedTools: optimizedTools,
      restrictionLevel: config?.restrictionLevel || RestrictionLevel.STANDARD,
      context
    };
  }

  /**
   * Auto-configure skills based on skill definitions
   * @param {Array<Object>} skills - Skill definitions
   * @returns {Map<string, SkillToolConfig>} Generated configurations
   */
  autoConfigureSkills(skills) {
    const configs = new Map();

    for (const skill of skills) {
      const skillName = skill.name || skill.id;
      
      // Determine category from skill metadata
      const category = this._detectSkillCategory(skill);
      const defaultTools = DEFAULT_TOOL_SETS[category] || DEFAULT_TOOL_SETS.validation;

      // Merge with explicitly defined tools
      const allowedTools = skill.allowedTools 
        ? [...new Set([...defaultTools, ...skill.allowedTools])]
        : defaultTools;

      const config = this.setSkillConfig(skillName, {
        allowedTools,
        restrictionLevel: skill.restrictionLevel || RestrictionLevel.STANDARD
      });

      configs.set(skillName, config);
    }

    return configs;
  }

  /**
   * Detect skill category from definition
   * @private
   */
  _detectSkillCategory(skill) {
    const text = `${skill.name || ''} ${skill.description || ''} ${skill.purpose || ''}`.toLowerCase();

    const categoryKeywords = {
      requirements: ['requirement', 'ears', 'spec', 'feature'],
      design: ['design', 'architecture', 'c4', 'adr'],
      implementation: ['implement', 'code', 'develop', 'build'],
      testing: ['test', 'spec', 'coverage', 'assertion'],
      validation: ['validate', 'check', 'verify', 'lint'],
      documentation: ['document', 'readme', 'guide', 'doc'],
      analysis: ['analyze', 'audit', 'review', 'inspect'],
      deployment: ['deploy', 'release', 'publish', 'ci']
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return category;
        }
      }
    }

    return 'validation'; // Default category
  }

  /**
   * Export all configurations
   * @returns {Object} Configuration export
   */
  exportConfig() {
    const skills = {};
    for (const [name, config] of this.skillConfigs) {
      skills[name] = config.toJSON();
    }

    const toolDependencies = {};
    for (const [tool, deps] of this.toolDependencies) {
      toolDependencies[tool] = deps;
    }

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      defaults: {
        toolSet: this.options.defaultToolSet
      },
      toolDependencies,
      skills
    };
  }

  /**
   * Save configuration to file
   * @param {string} filePath - Output file path
   * @returns {Promise<void>}
   */
  async saveConfig(filePath) {
    const config = this.exportConfig();
    const ext = path.extname(filePath).toLowerCase();

    let content;
    if (ext === '.yaml' || ext === '.yml') {
      content = yaml.dump(config, { indent: 2 });
    } else {
      content = JSON.stringify(config, null, 2);
    }

    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, content, 'utf-8');

    this.emit('configSaved', filePath);
  }

  /**
   * Clear all configurations
   */
  clear() {
    this.skillConfigs.clear();
    this.toolDependencies.clear();
    this.availableTools.clear();
  }

  /**
   * Get summary statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const skills = Array.from(this.skillConfigs.values());
    
    const byRestriction = {};
    for (const level of Object.values(RestrictionLevel)) {
      byRestriction[level] = skills.filter(s => s.restrictionLevel === level).length;
    }

    const allTools = new Set();
    for (const config of skills) {
      for (const tool of config.allowedTools) {
        allTools.add(tool);
      }
    }

    return {
      totalSkills: this.skillConfigs.size,
      totalUniqueTools: allTools.size,
      availableTools: this.availableTools.size,
      byRestrictionLevel: byRestriction
    };
  }
}

module.exports = {
  SkillToolsManager,
  SkillToolConfig,
  RestrictionLevel,
  DEFAULT_TOOL_SETS
};
