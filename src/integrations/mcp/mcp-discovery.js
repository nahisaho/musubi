/**
 * MUSUBI MCP Server Discovery
 * 
 * Discovers and manages MCP servers from various configuration sources:
 * - claude_desktop_config.json
 * - .mcp/config.json (project-level)
 * - Environment variables
 * - Dynamic discovery via well-known paths
 * 
 * @module integrations/mcp/mcp-discovery
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const EventEmitter = require('events');

/**
 * @typedef {Object} MCPServerConfig
 * @property {string} name - Server name
 * @property {string} command - Command to start server
 * @property {string[]} [args] - Command arguments
 * @property {Object<string, string>} [env] - Environment variables
 * @property {string} [cwd] - Working directory
 * @property {string} [transport] - Transport type (stdio, sse, http)
 * @property {string} [url] - URL for SSE/HTTP transports
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} DiscoveryResult
 * @property {MCPServerConfig[]} servers - Discovered servers
 * @property {string[]} sources - Config sources used
 * @property {Object<string, Error>} errors - Errors per source
 */

/**
 * Known configuration file locations
 */
const CONFIG_LOCATIONS = {
  // Claude Desktop config
  claudeDesktop: {
    darwin: path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
    win32: path.join(os.homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'),
    linux: path.join(os.homedir(), '.config', 'claude', 'claude_desktop_config.json')
  },
  // Project-level config
  project: [
    '.mcp/config.json',
    '.mcp.json',
    'mcp.config.json'
  ],
  // VS Code settings
  vscode: '.vscode/mcp.json'
};

/**
 * MCP Server Discovery class
 */
class MCPDiscovery extends EventEmitter {
  /**
   * @param {Object} options
   * @param {string} [options.projectRoot] - Project root directory
   * @param {boolean} [options.includeGlobal=true] - Include global configs
   * @param {boolean} [options.includeProject=true] - Include project configs
   * @param {boolean} [options.includeEnv=true] - Include env var configs
   */
  constructor(options = {}) {
    super();
    
    this.projectRoot = options.projectRoot || process.cwd();
    this.includeGlobal = options.includeGlobal ?? true;
    this.includeProject = options.includeProject ?? true;
    this.includeEnv = options.includeEnv ?? true;
    
    /** @type {Map<string, MCPServerConfig>} */
    this.servers = new Map();
    
    /** @type {string[]} */
    this.discoveredSources = [];
    
    /** @type {Object<string, Error>} */
    this.errors = {};
  }
  
  /**
   * Discover all available MCP servers
   * @returns {Promise<DiscoveryResult>}
   */
  async discover() {
    this.servers.clear();
    this.discoveredSources = [];
    this.errors = {};
    
    const promises = [];
    
    // Global configs (Claude Desktop, etc.)
    if (this.includeGlobal) {
      promises.push(this.discoverGlobalConfigs());
    }
    
    // Project-level configs
    if (this.includeProject) {
      promises.push(this.discoverProjectConfigs());
    }
    
    // Environment variable configs
    if (this.includeEnv) {
      promises.push(this.discoverEnvConfigs());
    }
    
    await Promise.all(promises);
    
    this.emit('discovery:complete', {
      serverCount: this.servers.size,
      sources: this.discoveredSources
    });
    
    return {
      servers: Array.from(this.servers.values()),
      sources: this.discoveredSources,
      errors: this.errors
    };
  }
  
  /**
   * Discover global configuration files
   */
  async discoverGlobalConfigs() {
    // Claude Desktop config
    const platform = process.platform;
    const claudeConfigPath = CONFIG_LOCATIONS.claudeDesktop[platform];
    
    if (claudeConfigPath) {
      await this.loadConfigFile(claudeConfigPath, 'claude-desktop');
    }
  }
  
  /**
   * Discover project-level configuration files
   */
  async discoverProjectConfigs() {
    for (const configPath of CONFIG_LOCATIONS.project) {
      const fullPath = path.join(this.projectRoot, configPath);
      await this.loadConfigFile(fullPath, `project:${configPath}`);
    }
    
    // VS Code config
    const vscodePath = path.join(this.projectRoot, CONFIG_LOCATIONS.vscode);
    await this.loadConfigFile(vscodePath, 'vscode');
  }
  
  /**
   * Discover servers from environment variables
   */
  async discoverEnvConfigs() {
    // MCP_SERVERS environment variable (JSON array)
    const envServers = process.env.MCP_SERVERS;
    if (envServers) {
      try {
        const servers = JSON.parse(envServers);
        if (Array.isArray(servers)) {
          for (const server of servers) {
            this.addServer(server, 'env:MCP_SERVERS');
          }
        }
      } catch (error) {
        this.errors['env:MCP_SERVERS'] = error;
      }
    }
    
    // Individual MCP_SERVER_* environment variables
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('MCP_SERVER_') && key !== 'MCP_SERVERS') {
        try {
          const server = JSON.parse(value);
          const name = key.replace('MCP_SERVER_', '').toLowerCase();
          this.addServer({ name, ...server }, `env:${key}`);
        } catch (error) {
          this.errors[`env:${key}`] = error;
        }
      }
    }
  }
  
  /**
   * Load configuration from a file
   * @param {string} filePath - Path to config file
   * @param {string} source - Source identifier
   */
  async loadConfigFile(filePath, source) {
    try {
      if (!fs.existsSync(filePath)) {
        return;
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const config = JSON.parse(content);
      
      // Handle different config formats
      if (config.mcpServers) {
        // Claude Desktop format
        for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
          this.addServer({ name, ...serverConfig }, source);
        }
      } else if (config.servers) {
        // Alternative format with servers array
        for (const server of config.servers) {
          this.addServer(server, source);
        }
      } else if (Array.isArray(config)) {
        // Direct array of servers
        for (const server of config) {
          this.addServer(server, source);
        }
      }
      
      this.discoveredSources.push(source);
      this.emit('config:loaded', { source, path: filePath });
      
    } catch (error) {
      this.errors[source] = error;
      this.emit('config:error', { source, error });
    }
  }
  
  /**
   * Add a server to the registry
   * @param {MCPServerConfig} serverConfig
   * @param {string} source
   */
  addServer(serverConfig, source) {
    if (!serverConfig.name) {
      return;
    }
    
    const existing = this.servers.get(serverConfig.name);
    if (existing) {
      // Merge configurations, later sources override
      this.servers.set(serverConfig.name, {
        ...existing,
        ...serverConfig,
        metadata: {
          ...existing.metadata,
          ...serverConfig.metadata,
          sources: [...(existing.metadata?.sources || []), source]
        }
      });
    } else {
      this.servers.set(serverConfig.name, {
        ...serverConfig,
        metadata: {
          ...serverConfig.metadata,
          sources: [source]
        }
      });
    }
    
    this.emit('server:discovered', { name: serverConfig.name, source });
  }
  
  /**
   * Get a server by name
   * @param {string} name
   * @returns {MCPServerConfig|undefined}
   */
  getServer(name) {
    return this.servers.get(name);
  }
  
  /**
   * Get all servers
   * @returns {MCPServerConfig[]}
   */
  getAllServers() {
    return Array.from(this.servers.values());
  }
  
  /**
   * Get servers by transport type
   * @param {string} transport
   * @returns {MCPServerConfig[]}
   */
  getServersByTransport(transport) {
    return this.getAllServers().filter(s => 
      (s.transport || 'stdio') === transport
    );
  }
  
  /**
   * Filter servers by criteria
   * @param {Function} predicate
   * @returns {MCPServerConfig[]}
   */
  filterServers(predicate) {
    return this.getAllServers().filter(predicate);
  }
  
  /**
   * Check if a server exists
   * @param {string} name
   * @returns {boolean}
   */
  hasServer(name) {
    return this.servers.has(name);
  }
  
  /**
   * Get server count
   * @returns {number}
   */
  get serverCount() {
    return this.servers.size;
  }
  
  /**
   * Create a project configuration file
   * @param {MCPServerConfig[]} servers - Servers to include
   * @param {Object} [options]
   * @param {string} [options.format='mcp'] - Config format
   * @param {string} [options.path] - Custom path
   * @returns {Promise<string>} Path to created file
   */
  async createProjectConfig(servers, options = {}) {
    const format = options.format || 'mcp';
    const configPath = options.path || path.join(this.projectRoot, '.mcp', 'config.json');
    
    // Ensure directory exists
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    let config;
    if (format === 'claude') {
      // Claude Desktop format
      config = {
        mcpServers: Object.fromEntries(
          servers.map(s => [s.name, {
            command: s.command,
            args: s.args,
            env: s.env
          }])
        )
      };
    } else {
      // MUSUBI MCP format
      config = {
        version: '1.0',
        servers: servers.map(s => ({
          name: s.name,
          command: s.command,
          args: s.args,
          env: s.env,
          transport: s.transport || 'stdio',
          metadata: s.metadata
        }))
      };
    }
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    this.emit('config:created', { path: configPath });
    
    return configPath;
  }
  
  /**
   * Watch for configuration changes
   * @param {Function} callback
   * @returns {Function} Unwatch function
   */
  watch(callback) {
    const watchers = [];
    
    // Watch project configs
    for (const configPath of CONFIG_LOCATIONS.project) {
      const fullPath = path.join(this.projectRoot, configPath);
      const dir = path.dirname(fullPath);
      
      if (fs.existsSync(dir)) {
        try {
          const watcher = fs.watch(dir, (eventType, filename) => {
            if (filename === path.basename(fullPath)) {
              this.discover().then(result => callback(result));
            }
          });
          watchers.push(watcher);
        } catch (e) {
          // Directory may not exist
        }
      }
    }
    
    // Return unwatch function
    return () => {
      for (const watcher of watchers) {
        watcher.close();
      }
    };
  }
  
  /**
   * Get discovery summary
   * @returns {Object}
   */
  getSummary() {
    return {
      totalServers: this.servers.size,
      sources: this.discoveredSources,
      errors: Object.keys(this.errors),
      servers: this.getAllServers().map(s => ({
        name: s.name,
        transport: s.transport || 'stdio',
        sources: s.metadata?.sources || []
      }))
    };
  }
}

/**
 * Create a discovery instance and run discovery
 * @param {Object} options
 * @returns {Promise<DiscoveryResult>}
 */
async function discoverMCPServers(options = {}) {
  const discovery = new MCPDiscovery(options);
  return discovery.discover();
}

module.exports = {
  MCPDiscovery,
  discoverMCPServers,
  CONFIG_LOCATIONS
};
