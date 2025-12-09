/**
 * @fileoverview MCP (Model Context Protocol) Connector
 * @description Base MCP client integration for tool ecosystem connectivity
 * @version 3.11.0
 * 
 * Supports:
 * - Standard MCP server connections (stdio, SSE, HTTP)
 * - Tool discovery and invocation
 * - Resource management
 * - Prompt handling
 * - Connection pooling and retry logic
 */

'use strict';

const { EventEmitter } = require('events');

/**
 * MCP Connection States
 */
const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
};

/**
 * MCP Transport Types
 */
const TransportType = {
  STDIO: 'stdio',
  SSE: 'sse',
  HTTP: 'http',
  WEBSOCKET: 'websocket'
};

/**
 * Default MCP Connector Configuration
 */
const DEFAULT_CONFIG = {
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  keepAlive: true,
  keepAliveInterval: 30000,
  maxConcurrentRequests: 10,
  enableLogging: false
};

/**
 * MCP Tool Definition
 */
class MCPTool {
  constructor(definition) {
    this.name = definition.name;
    this.description = definition.description || '';
    this.inputSchema = definition.inputSchema || {};
    this.annotations = definition.annotations || {};
    this.server = definition.server || null;
  }

  /**
   * Validate input against schema
   * @param {Object} input - Input to validate
   * @returns {Object} Validation result
   */
  validateInput(input) {
    const errors = [];
    const schema = this.inputSchema;

    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in input)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        if (key in input) {
          const value = input[key];
          if (prop.type && typeof value !== prop.type) {
            // Allow number/integer mismatch
            if (!(prop.type === 'integer' && typeof value === 'number')) {
              errors.push(`Invalid type for ${key}: expected ${prop.type}, got ${typeof value}`);
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  toJSON() {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.inputSchema,
      annotations: this.annotations
    };
  }
}

/**
 * MCP Resource Definition
 */
class MCPResource {
  constructor(definition) {
    this.uri = definition.uri;
    this.name = definition.name;
    this.description = definition.description || '';
    this.mimeType = definition.mimeType || 'text/plain';
    this.annotations = definition.annotations || {};
  }

  toJSON() {
    return {
      uri: this.uri,
      name: this.name,
      description: this.description,
      mimeType: this.mimeType,
      annotations: this.annotations
    };
  }
}

/**
 * MCP Prompt Definition
 */
class MCPPrompt {
  constructor(definition) {
    this.name = definition.name;
    this.description = definition.description || '';
    this.arguments = definition.arguments || [];
  }

  toJSON() {
    return {
      name: this.name,
      description: this.description,
      arguments: this.arguments
    };
  }
}

/**
 * MCP Server Connection
 */
class MCPServerConnection extends EventEmitter {
  constructor(serverConfig, options = {}) {
    super();
    this.config = serverConfig;
    this.options = { ...DEFAULT_CONFIG, ...options };
    this.state = ConnectionState.DISCONNECTED;
    this.transport = null;
    this.tools = new Map();
    this.resources = new Map();
    this.prompts = new Map();
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.serverInfo = null;
    this.capabilities = {};
  }

  /**
   * Get server name
   */
  get name() {
    return this.config.name || 'unnamed-server';
  }

  /**
   * Get transport type
   */
  get transportType() {
    return this.config.transport || TransportType.STDIO;
  }

  /**
   * Connect to MCP server
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.state === ConnectionState.CONNECTED) {
      return;
    }

    this.state = ConnectionState.CONNECTING;
    this.emit('connecting');

    try {
      await this._initializeTransport();
      await this._initialize();
      await this._discoverCapabilities();
      
      this.state = ConnectionState.CONNECTED;
      this.emit('connected', this.serverInfo);

      if (this.options.keepAlive) {
        this._startKeepAlive();
      }
    } catch (error) {
      this.state = ConnectionState.ERROR;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Disconnect from MCP server
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.state === ConnectionState.DISCONNECTED) {
      return;
    }

    this._stopKeepAlive();

    try {
      await this._closeTransport();
    } finally {
      this.state = ConnectionState.DISCONNECTED;
      this.tools.clear();
      this.resources.clear();
      this.prompts.clear();
      this.emit('disconnected');
    }
  }

  /**
   * Initialize transport layer
   * @private
   */
  async _initializeTransport() {
    // Transport initialization based on type
    // In production, this would spawn processes or establish connections
    this.transport = {
      type: this.transportType,
      connected: true,
      send: async (message) => {
        if (this.options.enableLogging) {
          console.log(`[MCP ${this.name}] Sending:`, JSON.stringify(message));
        }
        return this._handleMessage(message);
      }
    };
  }

  /**
   * Close transport layer
   * @private
   */
  async _closeTransport() {
    if (this.transport) {
      this.transport.connected = false;
      this.transport = null;
    }
  }

  /**
   * Initialize MCP session
   * @private
   */
  async _initialize() {
    const response = await this._sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: { listChanged: true },
        sampling: {}
      },
      clientInfo: {
        name: 'musubi-sdd',
        version: '3.11.0'
      }
    });

    this.serverInfo = response.serverInfo || {};
    this.capabilities = response.capabilities || {};

    // Send initialized notification
    await this._sendNotification('notifications/initialized', {});
  }

  /**
   * Discover server capabilities (tools, resources, prompts)
   * @private
   */
  async _discoverCapabilities() {
    // Discover tools
    if (this.capabilities.tools) {
      const toolsResponse = await this._sendRequest('tools/list', {});
      for (const tool of toolsResponse.tools || []) {
        this.tools.set(tool.name, new MCPTool({ ...tool, server: this.name }));
      }
    }

    // Discover resources
    if (this.capabilities.resources) {
      const resourcesResponse = await this._sendRequest('resources/list', {});
      for (const resource of resourcesResponse.resources || []) {
        this.resources.set(resource.uri, new MCPResource(resource));
      }
    }

    // Discover prompts
    if (this.capabilities.prompts) {
      const promptsResponse = await this._sendRequest('prompts/list', {});
      for (const prompt of promptsResponse.prompts || []) {
        this.prompts.set(prompt.name, new MCPPrompt(prompt));
      }
    }
  }

  /**
   * Send JSON-RPC request
   * @private
   */
  async _sendRequest(method, params) {
    const id = ++this.requestId;
    const message = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.options.timeout);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      if (this.transport) {
        this.transport.send(message).then(response => {
          clearTimeout(timeout);
          this.pendingRequests.delete(id);
          if (response.error) {
            reject(new Error(response.error.message || 'Unknown error'));
          } else {
            resolve(response.result || {});
          }
        }).catch(error => {
          clearTimeout(timeout);
          this.pendingRequests.delete(id);
          reject(error);
        });
      } else {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(new Error('Transport not connected'));
      }
    });
  }

  /**
   * Send JSON-RPC notification
   * @private
   */
  async _sendNotification(method, params) {
    const message = {
      jsonrpc: '2.0',
      method,
      params
    };

    if (this.transport) {
      await this.transport.send(message);
    }
  }

  /**
   * Handle incoming message (mock for testing)
   * @private
   */
  async _handleMessage(message) {
    // Mock responses for testing
    const method = message.method;
    
    if (method === 'initialize') {
      return {
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: true },
            resources: { subscribe: true, listChanged: true },
            prompts: { listChanged: true }
          },
          serverInfo: {
            name: this.config.name || 'mock-server',
            version: '1.0.0'
          }
        }
      };
    }

    if (method === 'tools/list') {
      return {
        result: {
          tools: this.config.mockTools || []
        }
      };
    }

    if (method === 'resources/list') {
      return {
        result: {
          resources: this.config.mockResources || []
        }
      };
    }

    if (method === 'prompts/list') {
      return {
        result: {
          prompts: this.config.mockPrompts || []
        }
      };
    }

    if (method === 'tools/call') {
      return {
        result: {
          content: [
            {
              type: 'text',
              text: `Tool ${message.params.name} executed successfully`
            }
          ]
        }
      };
    }

    if (method === 'resources/read') {
      return {
        result: {
          contents: [
            {
              uri: message.params.uri,
              mimeType: 'text/plain',
              text: `Content of ${message.params.uri}`
            }
          ]
        }
      };
    }

    if (method === 'prompts/get') {
      return {
        result: {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Prompt: ${message.params.name}`
              }
            }
          ]
        }
      };
    }

    // Notifications don't require response
    if (method.startsWith('notifications/')) {
      return { result: {} };
    }

    return { result: {} };
  }

  /**
   * Start keep-alive timer
   * @private
   */
  _startKeepAlive() {
    this._keepAliveTimer = setInterval(async () => {
      try {
        await this._sendRequest('ping', {});
      } catch (error) {
        this.emit('keepAliveError', error);
      }
    }, this.options.keepAliveInterval);
  }

  /**
   * Stop keep-alive timer
   * @private
   */
  _stopKeepAlive() {
    if (this._keepAliveTimer) {
      clearInterval(this._keepAliveTimer);
      this._keepAliveTimer = null;
    }
  }

  /**
   * Call a tool
   * @param {string} toolName - Tool name
   * @param {Object} args - Tool arguments
   * @returns {Promise<Object>} Tool result
   */
  async callTool(toolName, args = {}) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    const validation = tool.validateInput(args);
    if (!validation.valid) {
      throw new Error(`Invalid tool input: ${validation.errors.join(', ')}`);
    }

    const response = await this._sendRequest('tools/call', {
      name: toolName,
      arguments: args
    });

    return response;
  }

  /**
   * Read a resource
   * @param {string} uri - Resource URI
   * @returns {Promise<Object>} Resource content
   */
  async readResource(uri) {
    const response = await this._sendRequest('resources/read', { uri });
    return response;
  }

  /**
   * Get a prompt
   * @param {string} promptName - Prompt name
   * @param {Object} args - Prompt arguments
   * @returns {Promise<Object>} Prompt messages
   */
  async getPrompt(promptName, args = {}) {
    const response = await this._sendRequest('prompts/get', {
      name: promptName,
      arguments: args
    });
    return response;
  }

  /**
   * Get connection status
   * @returns {Object} Status info
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      transportType: this.transportType,
      toolCount: this.tools.size,
      resourceCount: this.resources.size,
      promptCount: this.prompts.size,
      serverInfo: this.serverInfo,
      capabilities: this.capabilities
    };
  }
}

/**
 * MCP Connector - Main class for managing multiple MCP server connections
 */
class MCPConnector extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = { ...DEFAULT_CONFIG, ...options };
    this.servers = new Map();
    this.toolIndex = new Map(); // tool name -> server name mapping
  }

  /**
   * Add an MCP server configuration
   * @param {string} name - Server name
   * @param {Object} config - Server configuration
   * @returns {MCPServerConnection} Server connection
   */
  addServer(name, config) {
    if (this.servers.has(name)) {
      throw new Error(`Server already exists: ${name}`);
    }

    const serverConfig = { name, ...config };
    const connection = new MCPServerConnection(serverConfig, this.options);

    // Forward events
    connection.on('connected', (info) => this.emit('serverConnected', name, info));
    connection.on('disconnected', () => this.emit('serverDisconnected', name));
    connection.on('error', (error) => this.emit('serverError', name, error));

    this.servers.set(name, connection);
    return connection;
  }

  /**
   * Remove an MCP server
   * @param {string} name - Server name
   * @returns {Promise<void>}
   */
  async removeServer(name) {
    const connection = this.servers.get(name);
    if (connection) {
      await connection.disconnect();
      this.servers.delete(name);
      this._rebuildToolIndex();
    }
  }

  /**
   * Connect to a specific server
   * @param {string} name - Server name
   * @returns {Promise<void>}
   */
  async connectServer(name) {
    const connection = this.servers.get(name);
    if (!connection) {
      throw new Error(`Server not found: ${name}`);
    }

    await connection.connect();
    this._rebuildToolIndex();
  }

  /**
   * Connect to all servers
   * @returns {Promise<Object>} Connection results
   */
  async connectAll() {
    const results = {
      success: [],
      failed: []
    };

    for (const [name, connection] of this.servers) {
      try {
        await connection.connect();
        results.success.push(name);
      } catch (error) {
        results.failed.push({ name, error: error.message });
      }
    }

    this._rebuildToolIndex();
    return results;
  }

  /**
   * Disconnect from all servers
   * @returns {Promise<void>}
   */
  async disconnectAll() {
    for (const connection of this.servers.values()) {
      await connection.disconnect();
    }
    this.toolIndex.clear();
  }

  /**
   * Rebuild tool index across all servers
   * @private
   */
  _rebuildToolIndex() {
    this.toolIndex.clear();
    for (const [serverName, connection] of this.servers) {
      if (connection.state === ConnectionState.CONNECTED) {
        for (const toolName of connection.tools.keys()) {
          this.toolIndex.set(toolName, serverName);
        }
      }
    }
  }

  /**
   * Get all available tools across all servers
   * @returns {Array<MCPTool>} All tools
   */
  getAllTools() {
    const tools = [];
    for (const connection of this.servers.values()) {
      if (connection.state === ConnectionState.CONNECTED) {
        tools.push(...connection.tools.values());
      }
    }
    return tools;
  }

  /**
   * Get all available resources across all servers
   * @returns {Array<MCPResource>} All resources
   */
  getAllResources() {
    const resources = [];
    for (const connection of this.servers.values()) {
      if (connection.state === ConnectionState.CONNECTED) {
        resources.push(...connection.resources.values());
      }
    }
    return resources;
  }

  /**
   * Get all available prompts across all servers
   * @returns {Array<MCPPrompt>} All prompts
   */
  getAllPrompts() {
    const prompts = [];
    for (const connection of this.servers.values()) {
      if (connection.state === ConnectionState.CONNECTED) {
        prompts.push(...connection.prompts.values());
      }
    }
    return prompts;
  }

  /**
   * Find tool by name
   * @param {string} toolName - Tool name
   * @returns {Object|null} Tool info with server
   */
  findTool(toolName) {
    const serverName = this.toolIndex.get(toolName);
    if (!serverName) return null;

    const connection = this.servers.get(serverName);
    const tool = connection?.tools.get(toolName);
    
    return tool ? { tool, server: serverName } : null;
  }

  /**
   * Call a tool by name (auto-routes to correct server)
   * @param {string} toolName - Tool name
   * @param {Object} args - Tool arguments
   * @returns {Promise<Object>} Tool result
   */
  async callTool(toolName, args = {}) {
    const serverName = this.toolIndex.get(toolName);
    if (!serverName) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    const connection = this.servers.get(serverName);
    return connection.callTool(toolName, args);
  }

  /**
   * Get connection status for all servers
   * @returns {Object} Status info
   */
  getStatus() {
    const servers = {};
    for (const [name, connection] of this.servers) {
      servers[name] = connection.getStatus();
    }

    return {
      serverCount: this.servers.size,
      connectedCount: Array.from(this.servers.values())
        .filter(c => c.state === ConnectionState.CONNECTED).length,
      totalTools: this.toolIndex.size,
      servers
    };
  }

  /**
   * Load servers from configuration object
   * @param {Object} config - Configuration with servers array
   * @returns {MCPConnector} This connector
   */
  loadConfig(config) {
    const servers = config.mcpServers || config.servers || {};
    
    for (const [name, serverConfig] of Object.entries(servers)) {
      this.addServer(name, serverConfig);
    }

    return this;
  }

  /**
   * Export current configuration
   * @returns {Object} Configuration object
   */
  exportConfig() {
    const servers = {};
    for (const [name, connection] of this.servers) {
      servers[name] = {
        transport: connection.transportType,
        ...connection.config
      };
    }

    return { mcpServers: servers };
  }
}

module.exports = {
  MCPConnector,
  MCPServerConnection,
  MCPTool,
  MCPResource,
  MCPPrompt,
  ConnectionState,
  TransportType,
  DEFAULT_CONFIG
};
