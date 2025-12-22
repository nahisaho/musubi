/**
 * Skill Registry - Centralized skill registration and discovery
 * Sprint 3.1: Skill System Architecture
 *
 * Inspired by OpenAI Agents SDK skill management patterns
 */

const EventEmitter = require('events');

/**
 * Skill metadata schema
 */
class SkillMetadata {
  constructor(options = {}) {
    this.id = options.id || '';
    this.name = options.name || '';
    this.description = options.description || '';
    this.version = options.version || '1.0.0';
    this.category = options.category || 'general';
    this.tags = options.tags || [];
    this.author = options.author || '';
    this.inputs = options.inputs || [];
    this.outputs = options.outputs || [];
    this.dependencies = options.dependencies || [];
    this.timeout = options.timeout || 30000;
    this.retryPolicy = options.retryPolicy || { maxRetries: 3, backoffMs: 1000 };
    this.priority = options.priority || 'P2';
    this.permissions = options.permissions || [];
    this.createdAt = options.createdAt || new Date().toISOString();
    this.updatedAt = options.updatedAt || new Date().toISOString();
  }

  validate() {
    const errors = [];

    if (!this.id) {
      errors.push('Skill ID is required');
    }

    if (!this.name) {
      errors.push('Skill name is required');
    }

    if (!/^[a-z0-9-]+$/.test(this.id)) {
      errors.push('Skill ID must be lowercase alphanumeric with hyphens');
    }

    if (!['P0', 'P1', 'P2', 'P3'].includes(this.priority)) {
      errors.push('Priority must be P0, P1, P2, or P3');
    }

    // Validate inputs
    for (const input of this.inputs) {
      if (!input.name) {
        errors.push('Input name is required');
      }
      if (!input.type) {
        errors.push(`Input ${input.name || 'unknown'} must have a type`);
      }
    }

    // Validate outputs
    for (const output of this.outputs) {
      if (!output.name) {
        errors.push('Output name is required');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
      category: this.category,
      tags: this.tags,
      author: this.author,
      inputs: this.inputs,
      outputs: this.outputs,
      dependencies: this.dependencies,
      timeout: this.timeout,
      retryPolicy: this.retryPolicy,
      priority: this.priority,
      permissions: this.permissions,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

/**
 * Skill categories
 */
const SkillCategory = {
  ANALYSIS: 'analysis',
  DESIGN: 'design',
  IMPLEMENTATION: 'implementation',
  TESTING: 'testing',
  DOCUMENTATION: 'documentation',
  ORCHESTRATION: 'orchestration',
  VALIDATION: 'validation',
  INTEGRATION: 'integration',
  MONITORING: 'monitoring',
  RELEASE: 'release',           // Added for release management
  CONFIGURATION: 'configuration', // Added for project configuration
  WORKFLOW: 'workflow',         // Added for workflow management
  GENERAL: 'general',
};

/**
 * Priority levels for skill execution
 */
const SkillPriority = {
  P0: 'P0', // Critical - blocks all other work
  P1: 'P1', // High - should run soon
  P2: 'P2', // Medium - normal priority
  P3: 'P3', // Low - background/optional
};

/**
 * Skill health status
 */
const SkillHealth = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  UNKNOWN: 'unknown',
};

/**
 * Main Skill Registry class
 */
class SkillRegistry extends EventEmitter {
  constructor(options = {}) {
    super();
    this.skills = new Map();
    this.categoryIndex = new Map();
    this.tagIndex = new Map();
    this.healthStatus = new Map();
    this.executionStats = new Map();
    this.validators = [];
    this.hooks = {
      beforeRegister: [],
      afterRegister: [],
      beforeUnregister: [],
      afterUnregister: [],
    };

    // Options
    this.options = {
      enableHealthMonitoring: options.enableHealthMonitoring !== false,
      healthCheckInterval: options.healthCheckInterval || 60000,
      maxSkills: options.maxSkills || 1000,
      enableStats: options.enableStats !== false,
    };

    // Start health monitoring if enabled
    if (this.options.enableHealthMonitoring) {
      this._startHealthMonitoring();
    }
  }

  /**
   * Register a new skill
   */
  registerSkill(skillDef, handler = null) {
    const metadata = skillDef instanceof SkillMetadata ? skillDef : new SkillMetadata(skillDef);

    // Validate metadata
    const validation = metadata.validate();
    if (!validation.valid) {
      throw new Error(`Invalid skill metadata: ${validation.errors.join(', ')}`);
    }

    // Check max skills limit
    if (this.skills.size >= this.options.maxSkills) {
      throw new Error(`Maximum skill limit (${this.options.maxSkills}) reached`);
    }

    // Run custom validators
    for (const validator of this.validators) {
      const result = validator(metadata);
      if (!result.valid) {
        throw new Error(`Skill validation failed: ${result.error}`);
      }
    }

    // Run beforeRegister hooks
    for (const hook of this.hooks.beforeRegister) {
      hook(metadata);
    }

    // Check for duplicate
    if (this.skills.has(metadata.id)) {
      throw new Error(`Skill with ID '${metadata.id}' already exists`);
    }

    // Validate dependencies exist
    for (const dep of metadata.dependencies) {
      if (!this.skills.has(dep)) {
        throw new Error(`Dependency '${dep}' not found for skill '${metadata.id}'`);
      }
    }

    // Store skill
    const skillEntry = {
      metadata,
      handler,
      registeredAt: new Date().toISOString(),
    };
    this.skills.set(metadata.id, skillEntry);

    // Update indexes
    this._addToIndex(this.categoryIndex, metadata.category, metadata.id);
    for (const tag of metadata.tags) {
      this._addToIndex(this.tagIndex, tag, metadata.id);
    }

    // Initialize health and stats
    this.healthStatus.set(metadata.id, SkillHealth.HEALTHY);
    if (this.options.enableStats) {
      this.executionStats.set(metadata.id, {
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        averageExecutionTime: 0,
        lastExecutedAt: null,
      });
    }

    // Run afterRegister hooks
    for (const hook of this.hooks.afterRegister) {
      hook(metadata);
    }

    this.emit('skill-registered', { skillId: metadata.id, metadata });

    return metadata;
  }

  /**
   * Unregister a skill
   */
  unregisterSkill(skillId) {
    const skillEntry = this.skills.get(skillId);
    if (!skillEntry) {
      return false;
    }

    // Check if other skills depend on this one
    const dependents = this._findDependents(skillId);
    if (dependents.length > 0) {
      throw new Error(`Cannot unregister skill '${skillId}': required by ${dependents.join(', ')}`);
    }

    // Run beforeUnregister hooks
    for (const hook of this.hooks.beforeUnregister) {
      hook(skillEntry.metadata);
    }

    // Remove from indexes
    const metadata = skillEntry.metadata;
    this._removeFromIndex(this.categoryIndex, metadata.category, skillId);
    for (const tag of metadata.tags) {
      this._removeFromIndex(this.tagIndex, tag, skillId);
    }

    // Remove skill
    this.skills.delete(skillId);
    this.healthStatus.delete(skillId);
    this.executionStats.delete(skillId);

    // Run afterUnregister hooks
    for (const hook of this.hooks.afterUnregister) {
      hook(metadata);
    }

    this.emit('skill-unregistered', { skillId, metadata });

    return true;
  }

  /**
   * Get a skill by ID
   */
  getSkill(skillId) {
    const entry = this.skills.get(skillId);
    return entry ? entry.metadata : null;
  }

  /**
   * Get skill with handler
   */
  getSkillEntry(skillId) {
    return this.skills.get(skillId) || null;
  }

  /**
   * Check if skill exists
   */
  hasSkill(skillId) {
    return this.skills.has(skillId);
  }

  /**
   * Get all skills
   */
  getAllSkills() {
    return Array.from(this.skills.values()).map(entry => entry.metadata);
  }

  /**
   * Find skills by category
   */
  findByCategory(category) {
    const skillIds = this.categoryIndex.get(category) || new Set();
    return Array.from(skillIds)
      .map(id => this.getSkill(id))
      .filter(Boolean);
  }

  /**
   * Find skills by tags (OR matching)
   */
  findByTags(tags, matchAll = false) {
    if (matchAll) {
      // AND matching - skill must have all tags
      return this.getAllSkills().filter(skill => tags.every(tag => skill.tags.includes(tag)));
    } else {
      // OR matching - skill must have at least one tag
      const matchedIds = new Set();
      for (const tag of tags) {
        const skillIds = this.tagIndex.get(tag) || new Set();
        for (const id of skillIds) {
          matchedIds.add(id);
        }
      }
      return Array.from(matchedIds)
        .map(id => this.getSkill(id))
        .filter(Boolean);
    }
  }

  /**
   * Search skills by query
   */
  search(query) {
    const lowerQuery = query.toLowerCase();
    return this.getAllSkills().filter(
      skill =>
        skill.id.toLowerCase().includes(lowerQuery) ||
        skill.name.toLowerCase().includes(lowerQuery) ||
        skill.description.toLowerCase().includes(lowerQuery) ||
        skill.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get skills by priority
   */
  findByPriority(priority) {
    return this.getAllSkills().filter(skill => skill.priority === priority);
  }

  /**
   * Get skill dependencies (resolved order)
   */
  resolveDependencies(skillId, visited = new Set()) {
    const skill = this.getSkill(skillId);
    if (!skill) {
      throw new Error(`Skill '${skillId}' not found`);
    }

    // Circular dependency check
    if (visited.has(skillId)) {
      throw new Error(`Circular dependency detected: ${skillId}`);
    }
    visited.add(skillId);

    const resolved = [];
    for (const depId of skill.dependencies) {
      const depResolved = this.resolveDependencies(depId, new Set(visited));
      for (const r of depResolved) {
        if (!resolved.includes(r)) {
          resolved.push(r);
        }
      }
    }
    resolved.push(skillId);

    return resolved;
  }

  /**
   * Update skill health status
   */
  updateHealth(skillId, status, reason = null) {
    if (!this.skills.has(skillId)) {
      return false;
    }

    const previousStatus = this.healthStatus.get(skillId);
    this.healthStatus.set(skillId, status);

    if (previousStatus !== status) {
      this.emit('health-changed', {
        skillId,
        previousStatus,
        newStatus: status,
        reason,
      });
    }

    return true;
  }

  /**
   * Get skill health
   */
  getHealth(skillId) {
    return this.healthStatus.get(skillId) || SkillHealth.UNKNOWN;
  }

  /**
   * Get all healthy skills
   */
  getHealthySkills() {
    return this.getAllSkills().filter(skill => this.getHealth(skill.id) === SkillHealth.HEALTHY);
  }

  /**
   * Record execution stats
   */
  recordExecution(skillId, success, executionTime) {
    if (!this.options.enableStats) return;

    const stats = this.executionStats.get(skillId);
    if (!stats) return;

    stats.totalExecutions++;
    if (success) {
      stats.successCount++;
    } else {
      stats.failureCount++;
    }

    // Update average execution time
    stats.averageExecutionTime =
      (stats.averageExecutionTime * (stats.totalExecutions - 1) + executionTime) /
      stats.totalExecutions;

    stats.lastExecutedAt = new Date().toISOString();

    this.emit('execution-recorded', { skillId, success, executionTime, stats });
  }

  /**
   * Get execution stats
   */
  getStats(skillId) {
    return this.executionStats.get(skillId) || null;
  }

  /**
   * Get all stats
   */
  getAllStats() {
    return Object.fromEntries(this.executionStats);
  }

  /**
   * Add custom validator
   */
  addValidator(validator) {
    this.validators.push(validator);
  }

  /**
   * Add hook
   */
  addHook(event, handler) {
    if (this.hooks[event]) {
      this.hooks[event].push(handler);
    }
  }

  /**
   * Get registry summary
   */
  getSummary() {
    const categories = {};
    for (const [category, ids] of this.categoryIndex) {
      categories[category] = ids.size;
    }

    const healthCounts = {
      [SkillHealth.HEALTHY]: 0,
      [SkillHealth.DEGRADED]: 0,
      [SkillHealth.UNHEALTHY]: 0,
      [SkillHealth.UNKNOWN]: 0,
    };
    for (const status of this.healthStatus.values()) {
      healthCounts[status]++;
    }

    return {
      totalSkills: this.skills.size,
      categories,
      healthStatus: healthCounts,
      tags: Array.from(this.tagIndex.keys()),
    };
  }

  /**
   * Export registry to JSON
   */
  exportToJSON() {
    const skills = this.getAllSkills().map(skill => skill.toJSON());
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      skills,
      summary: this.getSummary(),
    };
  }

  /**
   * Import skills from JSON
   */
  importFromJSON(data) {
    if (!data.skills || !Array.isArray(data.skills)) {
      throw new Error('Invalid import data: skills array required');
    }

    const imported = [];
    const errors = [];

    for (const skillDef of data.skills) {
      try {
        const metadata = this.registerSkill(skillDef);
        imported.push(metadata.id);
      } catch (error) {
        errors.push({ skillId: skillDef.id, error: error.message });
      }
    }

    return { imported, errors };
  }

  /**
   * Clear all skills
   */
  clear() {
    this.skills.clear();
    this.categoryIndex.clear();
    this.tagIndex.clear();
    this.healthStatus.clear();
    this.executionStats.clear();
    this.emit('registry-cleared');
  }

  // Private methods

  _addToIndex(index, key, value) {
    if (!index.has(key)) {
      index.set(key, new Set());
    }
    index.get(key).add(value);
  }

  _removeFromIndex(index, key, value) {
    const set = index.get(key);
    if (set) {
      set.delete(value);
      if (set.size === 0) {
        index.delete(key);
      }
    }
  }

  _findDependents(skillId) {
    const dependents = [];
    for (const [id, entry] of this.skills) {
      if (entry.metadata.dependencies.includes(skillId)) {
        dependents.push(id);
      }
    }
    return dependents;
  }

  _startHealthMonitoring() {
    this._healthCheckInterval = setInterval(() => {
      this._performHealthCheck();
    }, this.options.healthCheckInterval);
  }

  _performHealthCheck() {
    for (const [skillId, _entry] of this.skills) {
      const stats = this.executionStats.get(skillId);
      if (!stats || stats.totalExecutions === 0) {
        continue;
      }

      const failureRate = stats.failureCount / stats.totalExecutions;

      let newStatus = SkillHealth.HEALTHY;
      if (failureRate > 0.5) {
        newStatus = SkillHealth.UNHEALTHY;
      } else if (failureRate > 0.2) {
        newStatus = SkillHealth.DEGRADED;
      }

      this.updateHealth(skillId, newStatus, `Failure rate: ${(failureRate * 100).toFixed(1)}%`);
    }
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
      this._healthCheckInterval = null;
    }
  }

  /**
   * Destroy registry
   */
  destroy() {
    this.stopHealthMonitoring();
    this.clear();
    this.removeAllListeners();
  }
}

module.exports = {
  SkillRegistry,
  SkillMetadata,
  SkillCategory,
  SkillPriority,
  SkillHealth,
};
