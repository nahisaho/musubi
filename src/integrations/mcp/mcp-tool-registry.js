/**
 * MUSUBI MCP Tool Registry
 * 
 * Manages MCP tools from discovered servers and provides
 * automatic registration with the Agent Loop and Skill System.
 * 
 * @module integrations/mcp/mcp-tool-registry
 */

'use strict';

const EventEmitter = require('events');

/**
 * @typedef {Object} MCPToolDefinition
 * @property {string} name - Tool name
 * @property {string} description - Tool description
 * @property {Object} inputSchema - JSON Schema for input
 * @property {string} serverName - Source MCP server
 * @property {Object} [annotations] - Tool annotations
 */

/**
 * @typedef {Object} ToolInvocationResult
 * @property {boolean} success - Whether invocation succeeded
 * @property {*} result - Tool result
 * @property {Error} [error] - Error if failed
 * @property {number} duration - Execution time in ms
 */

/**
 * MCP Tool Registry for managing tools from MCP servers
 */
class MCPToolRegistry extends EventEmitter {
  /**
   * @param {Object} options
   * @param {Object} [options.connector] - MCP connector instance
   * @param {Object} [options.skillRegistry] - MUSUBI skill registry
   * @param {boolean} [options.autoRegister=true] - Auto-register with skills
   */
  constructor(options = {}) {
    super();
    
    this.connector = options.connector || null;
    this.skillRegistry = options.skillRegistry || null;
    this.autoRegister = options.autoRegister ?? true;
    
    /** @type {Map<string, MCPToolDefinition>} */
    this.tools = new Map();
    
    /** @type {Map<string, string[]>} */
    this.serverTools = new Map();
    
    /** @type {Map<string, number>} */
    this.invocationCounts = new Map();
    
    /** @type {Map<string, number[]>} */
    this.latencyHistory = new Map();
  }
  
  /**
   * Set the MCP connector
   * @param {Object} connector
   */
  setConnector(connector) {
    this.connector = connector;
  }
  
  /**
   * Set the skill registry for auto-registration
   * @param {Object} skillRegistry
   */
  setSkillRegistry(skillRegistry) {
    this.skillRegistry = skillRegistry;
  }
  
  /**
   * Discover and register tools from an MCP server
   * @param {string} serverName - Server name
   * @param {Object} serverConfig - Server configuration
   * @returns {Promise<MCPToolDefinition[]>}
   */
  async discoverTools(serverName, serverConfig) {
    if (!this.connector) {
      throw new Error('MCP connector not set');
    }
    
    try {
      // Connect to server
      await this.connector.connect(serverName, serverConfig);
      
      // List tools
      const toolsResponse = await this.connector.listTools(serverName);
      const tools = toolsResponse.tools || [];
      
      const registered = [];
      
      for (const tool of tools) {
        const toolDef = {
          name: `${serverName}/${tool.name}`,
          originalName: tool.name,
          description: tool.description || '',
          inputSchema: tool.inputSchema || { type: 'object', properties: {} },
          serverName,
          annotations: tool.annotations || {}
        };
        
        this.registerTool(toolDef);
        registered.push(toolDef);
      }
      
      // Track tools per server
      this.serverTools.set(serverName, registered.map(t => t.name));
      
      this.emit('tools:discovered', {
        serverName,
        count: registered.length,
        tools: registered.map(t => t.name)
      });
      
      return registered;
      
    } catch (error) {
      this.emit('tools:discovery:error', { serverName, error });
      throw error;
    }
  }
  
  /**
   * Register a tool
   * @param {MCPToolDefinition} toolDef
   */
  registerTool(toolDef) {
    this.tools.set(toolDef.name, toolDef);
    this.invocationCounts.set(toolDef.name, 0);
    this.latencyHistory.set(toolDef.name, []);
    
    // Auto-register with skill registry
    if (this.autoRegister && this.skillRegistry) {
      this.registerAsSkill(toolDef);
    }
    
    this.emit('tool:registered', { name: toolDef.name });
  }
  
  /**
   * Register tool as a MUSUBI skill
   * @param {MCPToolDefinition} toolDef
   */
  registerAsSkill(toolDef) {
    if (!this.skillRegistry) return;
    
    const skill = {
      id: `mcp-${toolDef.name.replace('/', '-')}`,
      name: toolDef.name,
      category: 'mcp-tool',
      description: toolDef.description,
      metadata: {
        serverName: toolDef.serverName,
        originalName: toolDef.originalName,
        inputSchema: toolDef.inputSchema,
        source: 'mcp'
      },
      handler: async (input) => {
        return this.invokeTool(toolDef.name, input);
      }
    };
    
    try {
      this.skillRegistry.registerSkill(skill);
      this.emit('skill:registered', { skillId: skill.id, toolName: toolDef.name });
    } catch (error) {
      this.emit('skill:registration:error', { toolName: toolDef.name, error });
    }
  }
  
  /**
   * Invoke a tool
   * @param {string} toolName - Full tool name (serverName/toolName)
   * @param {Object} input - Tool input
   * @returns {Promise<ToolInvocationResult>}
   */
  async invokeTool(toolName, input) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    
    if (!this.connector) {
      throw new Error('MCP connector not set');
    }
    
    const startTime = Date.now();
    
    try {
      // Validate input
      const validation = this.validateInput(tool, input);
      if (!validation.valid) {
        throw new Error(`Invalid input: ${validation.errors.join(', ')}`);
      }
      
      // Call tool via connector
      const result = await this.connector.callTool(
        tool.serverName,
        tool.originalName,
        input
      );
      
      const duration = Date.now() - startTime;
      this.recordInvocation(toolName, duration, true);
      
      this.emit('tool:invoked', {
        name: toolName,
        duration,
        success: true
      });
      
      return {
        success: true,
        result: result.content || result,
        duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordInvocation(toolName, duration, false);
      
      this.emit('tool:error', {
        name: toolName,
        error: error.message,
        duration
      });
      
      return {
        success: false,
        error,
        duration
      };
    }
  }
  
  /**
   * Validate tool input against schema
   * @param {MCPToolDefinition} tool
   * @param {Object} input
   * @returns {Object}
   */
  validateInput(tool, input) {
    const errors = [];
    const schema = tool.inputSchema;
    
    if (!schema || !schema.properties) {
      return { valid: true, errors: [] };
    }
    
    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in input)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }
    
    // Type checking
    for (const [key, prop] of Object.entries(schema.properties)) {
      if (key in input) {
        const value = input[key];
        const expectedType = prop.type;
        
        if (expectedType && !this.checkType(value, expectedType)) {
          errors.push(`Invalid type for ${key}: expected ${expectedType}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Check if value matches expected type
   * @param {*} value
   * @param {string} expectedType
   * @returns {boolean}
   */
  checkType(value, expectedType) {
    switch (expectedType) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number';
      case 'integer': return Number.isInteger(value);
      case 'boolean': return typeof value === 'boolean';
      case 'array': return Array.isArray(value);
      case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'null': return value === null;
      default: return true;
    }
  }
  
  /**
   * Record invocation metrics
   * @param {string} toolName
   * @param {number} duration
   * @param {boolean} success
   */
  recordInvocation(toolName, duration, _success) {
    const count = this.invocationCounts.get(toolName) || 0;
    this.invocationCounts.set(toolName, count + 1);
    
    const history = this.latencyHistory.get(toolName) || [];
    history.push(duration);
    
    // Keep last 100 latencies
    if (history.length > 100) {
      history.shift();
    }
    this.latencyHistory.set(toolName, history);
  }
  
  /**
   * Get tool by name
   * @param {string} name
   * @returns {MCPToolDefinition|undefined}
   */
  getTool(name) {
    return this.tools.get(name);
  }
  
  /**
   * Get all tools
   * @returns {MCPToolDefinition[]}
   */
  getAllTools() {
    return Array.from(this.tools.values());
  }
  
  /**
   * Get tools by server
   * @param {string} serverName
   * @returns {MCPToolDefinition[]}
   */
  getToolsByServer(serverName) {
    const toolNames = this.serverTools.get(serverName) || [];
    return toolNames.map(name => this.tools.get(name)).filter(Boolean);
  }
  
  /**
   * Get tools in OpenAI format
   * @returns {Object[]}
   */
  getOpenAITools() {
    return this.getAllTools().map(tool => ({
      type: 'function',
      function: {
        name: tool.name.replace('/', '_'),
        description: tool.description,
        parameters: tool.inputSchema
      }
    }));
  }
  
  /**
   * Get tools in Anthropic format
   * @returns {Object[]}
   */
  getAnthropicTools() {
    return this.getAllTools().map(tool => ({
      name: tool.name.replace('/', '_'),
      description: tool.description,
      input_schema: tool.inputSchema
    }));
  }
  
  /**
   * Get tool statistics
   * @param {string} toolName
   * @returns {Object}
   */
  getToolStats(toolName) {
    const invocations = this.invocationCounts.get(toolName) || 0;
    const latencies = this.latencyHistory.get(toolName) || [];
    
    let avgLatency = 0;
    let minLatency = 0;
    let maxLatency = 0;
    
    if (latencies.length > 0) {
      avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      minLatency = Math.min(...latencies);
      maxLatency = Math.max(...latencies);
    }
    
    return {
      invocations,
      avgLatency: Math.round(avgLatency),
      minLatency,
      maxLatency,
      recentLatencies: latencies.slice(-10)
    };
  }
  
  /**
   * Get registry statistics
   * @returns {Object}
   */
  getStats() {
    const tools = this.getAllTools();
    let totalInvocations = 0;
    
    for (const count of this.invocationCounts.values()) {
      totalInvocations += count;
    }
    
    return {
      totalTools: tools.length,
      servers: this.serverTools.size,
      totalInvocations,
      toolsByServer: Object.fromEntries(
        Array.from(this.serverTools.entries()).map(([server, tools]) => [server, tools.length])
      )
    };
  }
  
  /**
   * Unregister tools from a server
   * @param {string} serverName
   */
  unregisterServer(serverName) {
    const toolNames = this.serverTools.get(serverName) || [];
    
    for (const name of toolNames) {
      this.tools.delete(name);
      this.invocationCounts.delete(name);
      this.latencyHistory.delete(name);
      
      // Unregister from skill registry
      if (this.skillRegistry) {
        const skillId = `mcp-${name.replace('/', '-')}`;
        try {
          this.skillRegistry.unregisterSkill(skillId);
        } catch (e) {
          // Ignore if not found
        }
      }
    }
    
    this.serverTools.delete(serverName);
    this.emit('server:unregistered', { serverName, toolCount: toolNames.length });
  }
  
  /**
   * Clear all tools
   */
  clear() {
    this.tools.clear();
    this.serverTools.clear();
    this.invocationCounts.clear();
    this.latencyHistory.clear();
    this.emit('registry:cleared');
  }
}

module.exports = {
  MCPToolRegistry
};
