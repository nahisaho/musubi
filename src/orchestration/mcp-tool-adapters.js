/**
 * MCP Tool Adapters - Bidirectional MCP-Skill Integration
 * Sprint 3.3.5: MCP Tool Ecosystem
 * 
 * Features:
 * - MCP tool to MUSUBI skill conversion
 * - MUSUBI skill to MCP tool export
 * - Schema translation (JSON Schema ↔ MCP)
 * - Capability mapping
 * - Transport abstraction (stdio, sse, http)
 */

const EventEmitter = require('events');

/**
 * MCP Transport types
 */
const MCPTransport = {
  STDIO: 'stdio',
  SSE: 'sse',
  HTTP: 'http',
  WEBSOCKET: 'websocket'
};

/**
 * Adapter direction
 */
const AdapterDirection = {
  MCP_TO_SKILL: 'mcp-to-skill',
  SKILL_TO_MCP: 'skill-to-mcp'
};

/**
 * MCP Tool Definition (incoming format)
 */
class MCPToolDefinition {
  constructor(options = {}) {
    this.name = options.name || '';
    this.description = options.description || '';
    this.inputSchema = options.inputSchema || { type: 'object', properties: {} };
    this.annotations = options.annotations || {};
    this.server = options.server || null;
    this.transport = options.transport || MCPTransport.STDIO;
  }

  validate() {
    const errors = [];
    
    if (!this.name) {
      errors.push('Tool name is required');
    }
    
    if (!this.inputSchema || this.inputSchema.type !== 'object') {
      errors.push('Input schema must be an object type');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Schema translator between MCP and MUSUBI formats
 */
class SchemaTranslator {
  /**
   * Convert MCP input schema to MUSUBI skill schema
   */
  static mcpToMusubi(mcpSchema) {
    if (!mcpSchema) {
      return {
        type: 'object',
        properties: {},
        required: []
      };
    }

    const musubiSchema = {
      type: mcpSchema.type || 'object',
      properties: {},
      required: mcpSchema.required || []
    };

    if (mcpSchema.properties) {
      for (const [key, prop] of Object.entries(mcpSchema.properties)) {
        musubiSchema.properties[key] = this._translateProperty(prop);
      }
    }

    // Add MUSUBI-specific metadata
    musubiSchema.$schema = 'https://musubi.dev/schemas/skill-input/v1';
    
    return musubiSchema;
  }

  /**
   * Convert MUSUBI skill schema to MCP format
   */
  static musubiToMcp(musubiSchema) {
    if (!musubiSchema) {
      return {
        type: 'object',
        properties: {}
      };
    }

    const mcpSchema = {
      type: musubiSchema.type || 'object',
      properties: {}
    };

    if (musubiSchema.required && musubiSchema.required.length > 0) {
      mcpSchema.required = musubiSchema.required;
    }

    if (musubiSchema.properties) {
      for (const [key, prop] of Object.entries(musubiSchema.properties)) {
        mcpSchema.properties[key] = this._translatePropertyToMcp(prop);
      }
    }

    return mcpSchema;
  }

  /**
   * Translate individual property from MCP to MUSUBI
   */
  static _translateProperty(prop) {
    const result = {
      type: prop.type || 'string'
    };

    if (prop.description) {
      result.description = prop.description;
    }

    if (prop.default !== undefined) {
      result.default = prop.default;
    }

    if (prop.enum) {
      result.enum = prop.enum;
    }

    // Handle nested objects
    if (prop.type === 'object' && prop.properties) {
      result.properties = {};
      for (const [key, nestedProp] of Object.entries(prop.properties)) {
        result.properties[key] = this._translateProperty(nestedProp);
      }
    }

    // Handle arrays
    if (prop.type === 'array' && prop.items) {
      result.items = this._translateProperty(prop.items);
    }

    // Handle anyOf/oneOf
    if (prop.anyOf) {
      result.anyOf = prop.anyOf.map(p => this._translateProperty(p));
    }
    if (prop.oneOf) {
      result.oneOf = prop.oneOf.map(p => this._translateProperty(p));
    }

    return result;
  }

  /**
   * Translate individual property from MUSUBI to MCP
   */
  static _translatePropertyToMcp(prop) {
    const result = {
      type: prop.type || 'string'
    };

    if (prop.description) {
      result.description = prop.description;
    }

    if (prop.default !== undefined) {
      result.default = prop.default;
    }

    if (prop.enum) {
      result.enum = prop.enum;
    }

    // Handle nested objects
    if (prop.type === 'object' && prop.properties) {
      result.properties = {};
      for (const [key, nestedProp] of Object.entries(prop.properties)) {
        result.properties[key] = this._translatePropertyToMcp(nestedProp);
      }
    }

    // Handle arrays
    if (prop.type === 'array' && prop.items) {
      result.items = this._translatePropertyToMcp(prop.items);
    }

    return result;
  }
}

/**
 * MCP to MUSUBI Skill Adapter
 * Wraps MCP tools as MUSUBI skills
 */
class MCPToSkillAdapter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.registry = options.registry || null;
    this.adapters = new Map();
    this.connections = new Map();
    this.defaultTimeout = options.timeout || 30000;
    this.retryConfig = options.retry || {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000
    };
  }

  /**
   * Register an MCP server and import its tools as skills
   */
  async registerServer(serverConfig) {
    const { id, transport, endpoint, tools } = serverConfig;

    if (this.connections.has(id)) {
      throw new Error(`Server ${id} is already registered`);
    }

    // Store connection config
    this.connections.set(id, {
      id,
      transport,
      endpoint,
      status: 'connected',
      registeredAt: new Date()
    });

    // Import tools as skills
    const importedSkills = [];
    for (const tool of tools || []) {
      try {
        const skill = await this.importTool(id, tool);
        importedSkills.push(skill);
      } catch (error) {
        this.emit('import-error', { serverId: id, tool, error });
      }
    }

    this.emit('server-registered', { 
      serverId: id, 
      skillCount: importedSkills.length 
    });

    return importedSkills;
  }

  /**
   * Import a single MCP tool as a MUSUBI skill
   */
  async importTool(serverId, mcpTool) {
    const toolDef = new MCPToolDefinition(mcpTool);
    const validation = toolDef.validate();
    
    if (!validation.valid) {
      throw new Error(`Invalid MCP tool: ${validation.errors.join(', ')}`);
    }

    // Generate skill ID from server and tool name
    const skillId = `mcp.${serverId}.${mcpTool.name}`;
    
    // Create skill definition
    const skillDefinition = {
      id: skillId,
      name: mcpTool.name,
      description: mcpTool.description || `MCP tool: ${mcpTool.name}`,
      category: 'mcp-imported',
      version: '1.0.0',
      inputSchema: SchemaTranslator.mcpToMusubi(mcpTool.inputSchema),
      outputSchema: {
        type: 'object',
        properties: {
          content: { type: 'array' },
          isError: { type: 'boolean' }
        }
      },
      tags: ['mcp', `mcp-server:${serverId}`],
      metadata: {
        source: 'mcp',
        serverId,
        originalName: mcpTool.name,
        transport: toolDef.transport,
        annotations: mcpTool.annotations || {}
      },
      // Execution handler
      handler: async (input) => {
        return this.executeMCPTool(serverId, mcpTool.name, input);
      }
    };

    // Store adapter mapping
    this.adapters.set(skillId, {
      skillId,
      serverId,
      toolName: mcpTool.name,
      definition: toolDef
    });

    // Register with skill registry if available
    if (this.registry) {
      this.registry.register(skillDefinition);
    }

    this.emit('tool-imported', { skillId, serverId, toolName: mcpTool.name });

    return skillDefinition;
  }

  /**
   * Execute an MCP tool via its server
   */
  async executeMCPTool(serverId, toolName, input) {
    const connection = this.connections.get(serverId);
    
    if (!connection) {
      throw new Error(`Server ${serverId} not found`);
    }

    if (connection.status !== 'connected') {
      throw new Error(`Server ${serverId} is not connected (status: ${connection.status})`);
    }

    const startTime = Date.now();

    try {
      // Create MCP tool call request
      const request = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: input
        },
        id: this._generateRequestId()
      };

      // Execute based on transport
      const response = await this._sendRequest(connection, request);

      const duration = Date.now() - startTime;
      this.emit('tool-executed', { 
        serverId, 
        toolName, 
        duration,
        success: !response.isError
      });

      return response;

    } catch (error) {
      this.emit('tool-error', { serverId, toolName, error });
      throw error;
    }
  }

  /**
   * Send request to MCP server (transport abstraction)
   */
  async _sendRequest(connection, request) {
    // Note: This is a simplified implementation
    // Real implementation would handle actual transport protocols
    
    switch (connection.transport) {
      case MCPTransport.STDIO:
        return this._sendStdioRequest(connection, request);
      
      case MCPTransport.HTTP:
        return this._sendHttpRequest(connection, request);
      
      case MCPTransport.SSE:
        return this._sendSseRequest(connection, request);
      
      case MCPTransport.WEBSOCKET:
        return this._sendWebSocketRequest(connection, request);
      
      default:
        throw new Error(`Unsupported transport: ${connection.transport}`);
    }
  }

  /**
   * Stdio transport (placeholder)
   */
  async _sendStdioRequest(_connection, _request) {
    // Placeholder for stdio transport implementation
    // In real implementation, this would:
    // 1. Spawn child process
    // 2. Send JSON-RPC request via stdin
    // 3. Read response from stdout
    return {
      content: [{ type: 'text', text: 'Stdio transport result' }],
      isError: false
    };
  }

  /**
   * HTTP transport (placeholder)
   */
  async _sendHttpRequest(_connection, _request) {
    // Placeholder for HTTP transport implementation
    return {
      content: [{ type: 'text', text: 'HTTP transport result' }],
      isError: false
    };
  }

  /**
   * SSE transport (placeholder)
   */
  async _sendSseRequest(_connection, _request) {
    // Placeholder for SSE transport implementation
    return {
      content: [{ type: 'text', text: 'SSE transport result' }],
      isError: false
    };
  }

  /**
   * WebSocket transport (placeholder)
   */
  async _sendWebSocketRequest(_connection, _request) {
    // Placeholder for WebSocket transport implementation
    return {
      content: [{ type: 'text', text: 'WebSocket transport result' }],
      isError: false
    };
  }

  /**
   * Generate unique request ID
   */
  _generateRequestId() {
    return `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnectServer(serverId) {
    const connection = this.connections.get(serverId);
    
    if (!connection) {
      return false;
    }

    // Remove all skills from this server
    for (const [skillId, adapter] of this.adapters) {
      if (adapter.serverId === serverId) {
        if (this.registry) {
          this.registry.unregister(skillId);
        }
        this.adapters.delete(skillId);
      }
    }

    this.connections.delete(serverId);
    this.emit('server-disconnected', { serverId });

    return true;
  }

  /**
   * Get all imported skills from a server
   */
  getServerSkills(serverId) {
    const skills = [];
    
    for (const [_skillId, adapter] of this.adapters) {
      if (adapter.serverId === serverId) {
        skills.push(adapter);
      }
    }

    return skills;
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    const status = {};
    
    for (const [id, conn] of this.connections) {
      status[id] = {
        status: conn.status,
        transport: conn.transport,
        skillCount: this.getServerSkills(id).length,
        registeredAt: conn.registeredAt
      };
    }

    return status;
  }
}

/**
 * MUSUBI Skill to MCP Tool Adapter
 * Exports MUSUBI skills as MCP tools
 */
class SkillToMCPAdapter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.registry = options.registry || null;
    this.executor = options.executor || null;
    this.exportedTools = new Map();
    this.serverInfo = {
      name: options.serverName || 'musubi-mcp-server',
      version: options.version || '1.0.0',
      protocolVersion: '2024-11-05'
    };
  }

  /**
   * Export a MUSUBI skill as MCP tool
   */
  exportSkill(skillId) {
    if (!this.registry) {
      throw new Error('Skill registry is required');
    }

    const skill = this.registry.getSkill(skillId);
    if (!skill) {
      throw new Error(`Skill ${skillId} not found`);
    }

    const mcpTool = {
      name: this._sanitizeToolName(skillId),
      description: skill.description || '',
      inputSchema: SchemaTranslator.musubiToMcp(skill.inputSchema),
      annotations: {
        musubiSkillId: skillId,
        category: skill.category,
        version: skill.version,
        tags: skill.tags
      }
    };

    this.exportedTools.set(skillId, mcpTool);
    this.emit('skill-exported', { skillId, toolName: mcpTool.name });

    return mcpTool;
  }

  /**
   * Export multiple skills
   */
  exportSkills(skillIds) {
    const tools = [];
    
    for (const skillId of skillIds) {
      try {
        tools.push(this.exportSkill(skillId));
      } catch (error) {
        this.emit('export-error', { skillId, error });
      }
    }

    return tools;
  }

  /**
   * Export all skills from a category
   */
  exportCategory(category) {
    if (!this.registry) {
      throw new Error('Skill registry is required');
    }

    const skills = this.registry.findByCategory(category);
    return this.exportSkills(skills.map(s => s.id));
  }

  /**
   * Handle MCP tools/list request
   */
  handleListTools() {
    const tools = [];
    
    for (const [_skillId, tool] of this.exportedTools) {
      tools.push(tool);
    }

    return { tools };
  }

  /**
   * Handle MCP tools/call request
   */
  async handleCallTool(params) {
    const { name, arguments: args } = params;
    
    // Find skill by tool name
    let skillId = null;
    for (const [id, tool] of this.exportedTools) {
      if (tool.name === name) {
        skillId = id;
        break;
      }
    }

    if (!skillId) {
      return {
        content: [{ type: 'text', text: `Tool not found: ${name}` }],
        isError: true
      };
    }

    try {
      // Execute via skill executor if available
      if (this.executor) {
        const result = await this.executor.execute(skillId, args);
        return this._formatMCPResult(result);
      }

      // Direct execution via registry
      const skill = this.registry.getSkill(skillId);
      if (skill.handler) {
        const result = await skill.handler(args);
        return this._formatMCPResult(result);
      }

      return {
        content: [{ type: 'text', text: 'No handler available for skill' }],
        isError: true
      };

    } catch (error) {
      this.emit('call-error', { toolName: name, skillId, error });
      return {
        content: [{ type: 'text', text: error.message }],
        isError: true
      };
    }
  }

  /**
   * Format skill result as MCP response
   */
  _formatMCPResult(result) {
    if (result === null || result === undefined) {
      return {
        content: [{ type: 'text', text: 'null' }],
        isError: false
      };
    }

    if (typeof result === 'string') {
      return {
        content: [{ type: 'text', text: result }],
        isError: false
      };
    }

    if (typeof result === 'object') {
      // Check if already in MCP format
      if (result.content && Array.isArray(result.content)) {
        return result;
      }

      // Convert to JSON text
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify(result, null, 2) 
        }],
        isError: false
      };
    }

    return {
      content: [{ type: 'text', text: String(result) }],
      isError: false
    };
  }

  /**
   * Sanitize skill ID to valid MCP tool name
   */
  _sanitizeToolName(skillId) {
    // MCP tool names should be alphanumeric with underscores
    return skillId.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  /**
   * Get MCP server manifest
   */
  getServerManifest() {
    return {
      ...this.serverInfo,
      capabilities: {
        tools: { listChanged: true }
      }
    };
  }

  /**
   * Create MCP protocol handler
   */
  createProtocolHandler() {
    return async (request) => {
      const { method, params, id } = request;

      switch (method) {
        case 'initialize':
          return {
            jsonrpc: '2.0',
            id,
            result: this.getServerManifest()
          };

        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id,
            result: this.handleListTools()
          };

        case 'tools/call': {
          const result = await this.handleCallTool(params);
          return {
            jsonrpc: '2.0',
            id,
            result
          };
        }

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`
            }
          };
      }
    };
  }
}

/**
 * Unified MCP Adapter Manager
 * Manages both import and export adapters
 */
class MCPAdapterManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.registry = options.registry || null;
    this.executor = options.executor || null;
    
    this.importAdapter = new MCPToSkillAdapter({
      registry: this.registry,
      timeout: options.timeout,
      retry: options.retry
    });

    this.exportAdapter = new SkillToMCPAdapter({
      registry: this.registry,
      executor: this.executor,
      serverName: options.serverName,
      version: options.version
    });

    // Forward events
    this._setupEventForwarding();
  }

  /**
   * Setup event forwarding from child adapters
   */
  _setupEventForwarding() {
    const importEvents = [
      'server-registered', 
      'server-disconnected', 
      'tool-imported', 
      'tool-executed',
      'tool-error',
      'import-error'
    ];

    const exportEvents = [
      'skill-exported',
      'export-error',
      'call-error'
    ];

    for (const event of importEvents) {
      this.importAdapter.on(event, (data) => {
        this.emit(`import:${event}`, data);
      });
    }

    for (const event of exportEvents) {
      this.exportAdapter.on(event, (data) => {
        this.emit(`export:${event}`, data);
      });
    }
  }

  /**
   * Register MCP server and import tools
   */
  async registerMCPServer(serverConfig) {
    return this.importAdapter.registerServer(serverConfig);
  }

  /**
   * Disconnect from MCP server
   */
  async disconnectMCPServer(serverId) {
    return this.importAdapter.disconnectServer(serverId);
  }

  /**
   * Execute imported MCP tool
   */
  async executeMCPTool(serverId, toolName, input) {
    return this.importAdapter.executeMCPTool(serverId, toolName, input);
  }

  /**
   * Export skill as MCP tool
   */
  exportSkill(skillId) {
    return this.exportAdapter.exportSkill(skillId);
  }

  /**
   * Export multiple skills
   */
  exportSkills(skillIds) {
    return this.exportAdapter.exportSkills(skillIds);
  }

  /**
   * Get MCP protocol handler for exported skills
   */
  getMCPHandler() {
    return this.exportAdapter.createProtocolHandler();
  }

  /**
   * Get comprehensive status
   */
  getStatus() {
    return {
      import: {
        connections: this.importAdapter.getConnectionStatus(),
        adapterCount: this.importAdapter.adapters.size
      },
      export: {
        toolCount: this.exportAdapter.exportedTools.size,
        serverInfo: this.exportAdapter.serverInfo
      }
    };
  }

  /**
   * Get imported skill count
   */
  getImportedSkillCount() {
    return this.importAdapter.adapters.size;
  }

  /**
   * Get exported tool count
   */
  getExportedToolCount() {
    return this.exportAdapter.exportedTools.size;
  }
}

module.exports = {
  MCPTransport,
  AdapterDirection,
  MCPToolDefinition,
  SchemaTranslator,
  MCPToSkillAdapter,
  SkillToMCPAdapter,
  MCPAdapterManager
};
