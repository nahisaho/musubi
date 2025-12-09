/**
 * @fileoverview Tool Discovery Service
 * @description Dynamic MCP tool detection and management
 * @version 3.11.0
 * 
 * Features:
 * - Automatic tool discovery from MCP servers
 * - Tool categorization and tagging
 * - Skill-to-tool mapping
 * - Tool capability matching
 * - Tool usage analytics
 */

'use strict';

const { EventEmitter } = require('events');

/**
 * Tool Categories
 */
const ToolCategory = {
  FILE_SYSTEM: 'file-system',
  CODE_ANALYSIS: 'code-analysis',
  SEARCH: 'search',
  DOCUMENTATION: 'documentation',
  TESTING: 'testing',
  BUILD: 'build',
  DEPLOYMENT: 'deployment',
  MONITORING: 'monitoring',
  DATABASE: 'database',
  API: 'api',
  AI: 'ai',
  UTILITY: 'utility',
  UNKNOWN: 'unknown'
};

/**
 * Tool capability scores
 */
const CapabilityScore = {
  EXACT_MATCH: 1.0,
  HIGH_MATCH: 0.8,
  MEDIUM_MATCH: 0.6,
  LOW_MATCH: 0.4,
  NO_MATCH: 0.0
};

/**
 * Category keywords for auto-detection
 */
const CATEGORY_KEYWORDS = {
  [ToolCategory.FILE_SYSTEM]: ['file', 'read', 'write', 'directory', 'path', 'fs', 'folder'],
  [ToolCategory.CODE_ANALYSIS]: ['code', 'analyze', 'parse', 'ast', 'syntax', 'lint', 'semantic'],
  [ToolCategory.SEARCH]: ['search', 'find', 'grep', 'query', 'lookup', 'index'],
  [ToolCategory.DOCUMENTATION]: ['doc', 'document', 'readme', 'markdown', 'comment', 'jsdoc'],
  [ToolCategory.TESTING]: ['test', 'spec', 'assert', 'mock', 'coverage', 'jest', 'mocha'],
  [ToolCategory.BUILD]: ['build', 'compile', 'bundle', 'webpack', 'transpile', 'package'],
  [ToolCategory.DEPLOYMENT]: ['deploy', 'release', 'publish', 'ci', 'cd', 'docker', 'kubernetes'],
  [ToolCategory.MONITORING]: ['monitor', 'log', 'metric', 'alert', 'trace', 'health'],
  [ToolCategory.DATABASE]: ['database', 'db', 'sql', 'query', 'migrate', 'schema'],
  [ToolCategory.API]: ['api', 'rest', 'http', 'request', 'endpoint', 'graphql'],
  [ToolCategory.AI]: ['ai', 'ml', 'llm', 'generate', 'embed', 'inference', 'model'],
  [ToolCategory.UTILITY]: ['util', 'helper', 'convert', 'format', 'validate', 'transform']
};

/**
 * Discovered Tool with metadata
 */
class DiscoveredTool {
  constructor(tool, options = {}) {
    this.name = tool.name;
    this.description = tool.description || '';
    this.inputSchema = tool.inputSchema || {};
    this.server = tool.server || options.server || 'unknown';
    this.category = options.category || ToolCategory.UNKNOWN;
    this.tags = options.tags || [];
    this.capabilities = options.capabilities || [];
    this.usageCount = 0;
    this.lastUsed = null;
    this.averageLatency = 0;
    this.errorRate = 0;
    this.discoveredAt = new Date();
  }

  /**
   * Record tool usage
   * @param {number} latency - Execution latency in ms
   * @param {boolean} success - Whether execution succeeded
   */
  recordUsage(latency, success = true) {
    this.usageCount++;
    this.lastUsed = new Date();
    
    // Update running average latency
    this.averageLatency = (this.averageLatency * (this.usageCount - 1) + latency) / this.usageCount;
    
    // Update error rate
    if (!success) {
      this.errorRate = ((this.errorRate * (this.usageCount - 1)) + 1) / this.usageCount;
    } else {
      this.errorRate = (this.errorRate * (this.usageCount - 1)) / this.usageCount;
    }
  }

  /**
   * Get tool reliability score
   * @returns {number} Score 0-1
   */
  getReliabilityScore() {
    if (this.usageCount === 0) return 0.5; // Neutral for unused tools
    return 1 - this.errorRate;
  }

  toJSON() {
    return {
      name: this.name,
      description: this.description,
      server: this.server,
      category: this.category,
      tags: this.tags,
      capabilities: this.capabilities,
      usageCount: this.usageCount,
      lastUsed: this.lastUsed,
      averageLatency: this.averageLatency,
      reliability: this.getReliabilityScore(),
      discoveredAt: this.discoveredAt
    };
  }
}

/**
 * Tool Discovery Service
 */
class ToolDiscovery extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      autoDiscovery: true,
      refreshInterval: 300000, // 5 minutes
      enableAnalytics: true,
      ...options
    };
    
    this.tools = new Map();
    this.toolsByCategory = new Map();
    this.toolsByServer = new Map();
    this.skillToolMappings = new Map();
    this._refreshTimer = null;
  }

  /**
   * Discover tools from MCP connector
   * @param {MCPConnector} connector - MCP connector instance
   * @returns {Promise<Array<DiscoveredTool>>} Discovered tools
   */
  async discoverFromConnector(connector) {
    const discoveredTools = [];
    const allTools = connector.getAllTools();

    for (const tool of allTools) {
      const discovered = this._processTool(tool);
      discoveredTools.push(discovered);
    }

    this.emit('discovered', discoveredTools);
    return discoveredTools;
  }

  /**
   * Process and categorize a tool
   * @private
   * @param {Object} tool - Raw tool definition
   * @returns {DiscoveredTool} Processed tool
   */
  _processTool(tool) {
    const category = this._detectCategory(tool);
    const tags = this._extractTags(tool);
    const capabilities = this._analyzeCapabilities(tool);

    const discovered = new DiscoveredTool(tool, {
      category,
      tags,
      capabilities
    });

    // Index the tool
    this.tools.set(tool.name, discovered);
    
    // Index by category
    if (!this.toolsByCategory.has(category)) {
      this.toolsByCategory.set(category, new Set());
    }
    this.toolsByCategory.get(category).add(tool.name);

    // Index by server
    const server = tool.server || 'unknown';
    if (!this.toolsByServer.has(server)) {
      this.toolsByServer.set(server, new Set());
    }
    this.toolsByServer.get(server).add(tool.name);

    return discovered;
  }

  /**
   * Detect tool category based on name and description
   * @private
   */
  _detectCategory(tool) {
    const text = `${tool.name} ${tool.description}`.toLowerCase();
    
    let bestCategory = ToolCategory.UNKNOWN;
    let bestScore = 0;

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          score++;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    return bestCategory;
  }

  /**
   * Extract tags from tool definition
   * @private
   */
  _extractTags(tool) {
    const tags = new Set();
    const text = `${tool.name} ${tool.description}`.toLowerCase();

    // Extract from name (split by common separators)
    const nameParts = tool.name.split(/[-_./]/);
    for (const part of nameParts) {
      if (part.length > 2) {
        tags.add(part.toLowerCase());
      }
    }

    // Extract common action verbs
    const actionVerbs = ['read', 'write', 'create', 'update', 'delete', 'list', 'search', 'analyze', 'generate'];
    for (const verb of actionVerbs) {
      if (text.includes(verb)) {
        tags.add(verb);
      }
    }

    // Add category as tag
    const category = this._detectCategory(tool);
    if (category !== ToolCategory.UNKNOWN) {
      tags.add(category);
    }

    return Array.from(tags);
  }

  /**
   * Analyze tool capabilities based on schema
   * @private
   */
  _analyzeCapabilities(tool) {
    const capabilities = [];
    const schema = tool.inputSchema || {};

    // Analyze input parameters
    if (schema.properties) {
      const propNames = Object.keys(schema.properties);
      
      if (propNames.some(p => p.includes('file') || p.includes('path'))) {
        capabilities.push('file-operations');
      }
      if (propNames.some(p => p.includes('query') || p.includes('search'))) {
        capabilities.push('search');
      }
      if (propNames.some(p => p.includes('code') || p.includes('source'))) {
        capabilities.push('code-processing');
      }
      if (propNames.some(p => p.includes('url') || p.includes('endpoint'))) {
        capabilities.push('network');
      }
    }

    // Analyze based on tool name patterns
    const name = tool.name.toLowerCase();
    if (name.includes('list') || name.includes('get')) {
      capabilities.push('read');
    }
    if (name.includes('create') || name.includes('write') || name.includes('add')) {
      capabilities.push('write');
    }
    if (name.includes('delete') || name.includes('remove')) {
      capabilities.push('delete');
    }
    if (name.includes('update') || name.includes('modify') || name.includes('edit')) {
      capabilities.push('update');
    }

    return [...new Set(capabilities)];
  }

  /**
   * Find tools matching criteria
   * @param {Object} criteria - Search criteria
   * @returns {Array<DiscoveredTool>} Matching tools
   */
  findTools(criteria = {}) {
    let results = Array.from(this.tools.values());

    // Filter by category
    if (criteria.category) {
      results = results.filter(t => t.category === criteria.category);
    }

    // Filter by server
    if (criteria.server) {
      results = results.filter(t => t.server === criteria.server);
    }

    // Filter by tags
    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter(t => 
        criteria.tags.some(tag => t.tags.includes(tag))
      );
    }

    // Filter by capabilities
    if (criteria.capabilities && criteria.capabilities.length > 0) {
      results = results.filter(t => 
        criteria.capabilities.some(cap => t.capabilities.includes(cap))
      );
    }

    // Filter by name pattern
    if (criteria.namePattern) {
      const pattern = new RegExp(criteria.namePattern, 'i');
      results = results.filter(t => pattern.test(t.name));
    }

    // Filter by minimum reliability
    if (typeof criteria.minReliability === 'number') {
      results = results.filter(t => t.getReliabilityScore() >= criteria.minReliability);
    }

    // Sort by relevance or usage
    if (criteria.sortBy === 'usage') {
      results.sort((a, b) => b.usageCount - a.usageCount);
    } else if (criteria.sortBy === 'reliability') {
      results.sort((a, b) => b.getReliabilityScore() - a.getReliabilityScore());
    } else if (criteria.sortBy === 'latency') {
      results.sort((a, b) => a.averageLatency - b.averageLatency);
    }

    // Limit results
    if (criteria.limit) {
      results = results.slice(0, criteria.limit);
    }

    return results;
  }

  /**
   * Match tools to a task description
   * @param {string} taskDescription - Task description
   * @param {Object} options - Matching options
   * @returns {Array<Object>} Matched tools with scores
   */
  matchToolsToTask(taskDescription, options = {}) {
    const { limit = 5, minScore = 0.3 } = options;
    const matches = [];
    const taskWords = taskDescription.toLowerCase().split(/\s+/);

    for (const tool of this.tools.values()) {
      let score = 0;
      const toolText = `${tool.name} ${tool.description} ${tool.tags.join(' ')}`.toLowerCase();

      // Calculate word overlap
      for (const word of taskWords) {
        if (word.length > 2 && toolText.includes(word)) {
          score += 0.2;
        }
      }

      // Bonus for capability match
      for (const capability of tool.capabilities) {
        if (taskDescription.toLowerCase().includes(capability)) {
          score += 0.3;
        }
      }

      // Bonus for category match
      for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (tool.category === category) {
          for (const keyword of keywords) {
            if (taskDescription.toLowerCase().includes(keyword)) {
              score += 0.15;
              break;
            }
          }
        }
      }

      // Apply reliability factor
      score *= (0.5 + 0.5 * tool.getReliabilityScore());

      // Normalize score to 0-1
      score = Math.min(1.0, score);

      if (score >= minScore) {
        matches.push({ tool, score });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    return matches.slice(0, limit);
  }

  /**
   * Map skills to available tools
   * @param {Array<Object>} skills - Skill definitions
   * @returns {Map<string, Array<string>>} Skill to tools mapping
   */
  mapSkillsToTools(skills) {
    const mappings = new Map();

    for (const skill of skills) {
      const skillName = skill.name || skill.id;
      const matchedTools = [];

      // Match by allowed-tools if defined
      if (skill.allowedTools && Array.isArray(skill.allowedTools)) {
        for (const toolName of skill.allowedTools) {
          if (this.tools.has(toolName)) {
            matchedTools.push(toolName);
          }
        }
      }

      // Match by skill description/purpose
      if (skill.description || skill.purpose) {
        const taskMatch = this.matchToolsToTask(
          skill.description || skill.purpose,
          { limit: 3, minScore: 0.4 }
        );
        for (const { tool } of taskMatch) {
          if (!matchedTools.includes(tool.name)) {
            matchedTools.push(tool.name);
          }
        }
      }

      mappings.set(skillName, matchedTools);
    }

    this.skillToolMappings = mappings;
    return mappings;
  }

  /**
   * Get tools for a specific skill
   * @param {string} skillName - Skill name
   * @returns {Array<DiscoveredTool>} Tools for the skill
   */
  getToolsForSkill(skillName) {
    const toolNames = this.skillToolMappings.get(skillName) || [];
    return toolNames
      .map(name => this.tools.get(name))
      .filter(Boolean);
  }

  /**
   * Record tool usage
   * @param {string} toolName - Tool name
   * @param {number} latency - Execution latency
   * @param {boolean} success - Whether execution succeeded
   */
  recordToolUsage(toolName, latency, success = true) {
    const tool = this.tools.get(toolName);
    if (tool) {
      tool.recordUsage(latency, success);
      this.emit('toolUsed', { toolName, latency, success });
    }
  }

  /**
   * Get analytics summary
   * @returns {Object} Analytics data
   */
  getAnalytics() {
    const tools = Array.from(this.tools.values());
    
    const byCategory = {};
    for (const [category, toolNames] of this.toolsByCategory) {
      byCategory[category] = toolNames.size;
    }

    const byServer = {};
    for (const [server, toolNames] of this.toolsByServer) {
      byServer[server] = toolNames.size;
    }

    const topUsed = tools
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map(t => ({ name: t.name, usageCount: t.usageCount }));

    const leastReliable = tools
      .filter(t => t.usageCount > 0)
      .sort((a, b) => a.getReliabilityScore() - b.getReliabilityScore())
      .slice(0, 5)
      .map(t => ({ name: t.name, reliability: t.getReliabilityScore() }));

    return {
      totalTools: this.tools.size,
      byCategory,
      byServer,
      topUsed,
      leastReliable,
      totalUsage: tools.reduce((sum, t) => sum + t.usageCount, 0)
    };
  }

  /**
   * Start auto-refresh timer
   */
  startAutoRefresh(connector) {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
    }

    this._refreshTimer = setInterval(async () => {
      try {
        await this.discoverFromConnector(connector);
        this.emit('refreshed');
      } catch (error) {
        this.emit('refreshError', error);
      }
    }, this.options.refreshInterval);
  }

  /**
   * Stop auto-refresh timer
   */
  stopAutoRefresh() {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
  }

  /**
   * Clear all discovered tools
   */
  clear() {
    this.tools.clear();
    this.toolsByCategory.clear();
    this.toolsByServer.clear();
    this.skillToolMappings.clear();
  }

  /**
   * Export tool catalog
   * @returns {Object} Catalog data
   */
  exportCatalog() {
    return {
      exportedAt: new Date().toISOString(),
      tools: Array.from(this.tools.values()).map(t => t.toJSON()),
      categories: Object.values(ToolCategory),
      analytics: this.getAnalytics()
    };
  }
}

module.exports = {
  ToolDiscovery,
  DiscoveredTool,
  ToolCategory,
  CapabilityScore,
  CATEGORY_KEYWORDS
};
