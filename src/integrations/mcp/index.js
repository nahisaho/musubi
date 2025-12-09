/**
 * MUSUBI MCP Integration
 * 
 * Unified exports for MCP (Model Context Protocol) integration.
 * Provides discovery, tool registration, and context management.
 * 
 * @module integrations/mcp
 */

'use strict';

const { MCPDiscovery, discoverMCPServers, CONFIG_LOCATIONS } = require('./mcp-discovery');
const { MCPToolRegistry } = require('./mcp-tool-registry');
const { MCPContextProvider } = require('./mcp-context-provider');

/**
 * @typedef {Object} MCPIntegrationOptions
 * @property {Object} [discovery] - Discovery options
 * @property {Object} [registry] - Registry options
 * @property {Object} [context] - Context provider options
 * @property {Object} [connector] - MCP connector instance
 */

/**
 * Create a discovery instance
 * @param {Object} options
 * @returns {MCPDiscovery}
 */
function createMCPDiscovery(options = {}) {
  return new MCPDiscovery(options);
}

/**
 * Create a tool registry instance
 * @param {Object} options
 * @returns {MCPToolRegistry}
 */
function createMCPToolRegistry(options = {}) {
  return new MCPToolRegistry(options);
}

/**
 * Create context provider instance
 * @param {Object} options
 * @returns {MCPContextProvider}
 */
function createMCPContextProvider(options = {}) {
  return new MCPContextProvider(options);
}

/**
 * Create a fully integrated MCP system
 * @param {MCPIntegrationOptions} options
 * @returns {Object}
 */
function createMCPIntegration(options = {}) {
  const discovery = createMCPDiscovery(options.discovery);
  const registry = createMCPToolRegistry(options.registry);
  const context = new MCPContextProvider(options.context);
  
  // Set connector if provided
  if (options.connector) {
    registry.setConnector(options.connector);
    context.setConnector(options.connector);
  }
  
  // Wire up discovery to registry
  discovery.on('server:discovered', async ({ server }) => {
    try {
      if (options.connector) {
        await registry.registerFromServer(server.name);
      }
    } catch (error) {
      // Silently handle - server might not be running
    }
  });
  
  return {
    discovery,
    registry,
    context,
    
    /**
     * Initialize the MCP integration
     * @param {Object} [initOptions]
     * @param {boolean} [initOptions.autoDiscover=true] - Auto-discover servers
     * @param {boolean} [initOptions.watchChanges=false] - Watch for config changes
     */
    async initialize(initOptions = {}) {
      const autoDiscover = initOptions.autoDiscover ?? true;
      const watchChanges = initOptions.watchChanges ?? false;
      
      if (autoDiscover) {
        await discovery.discover();
      }
      
      if (watchChanges && discovery.watch) {
        discovery.watch();
      }
      
      return this.getStatus();
    },
    
    /**
     * Get all tools from the registry
     * @returns {Object[]}
     */
    getTools() {
      return registry.getAllTools();
    },
    
    /**
     * Get tool definitions in Agent Loop format
     * @returns {Object[]}
     */
    getToolDefinitions() {
      return registry.getAllTools().map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }));
    },
    
    /**
     * Build context for a request
     * @param {Object} contextOptions
     * @returns {Promise<Object>}
     */
    async buildContext(contextOptions) {
      return context.buildContext(contextOptions);
    },
    
    /**
     * Get integration status
     * @returns {Object}
     */
    getStatus() {
      return {
        discovery: discovery.getSummary(),
        registry: registry.getStats(),
        context: context.getStats()
      };
    },
    
    /**
     * Clean up resources
     */
    cleanup() {
      if (discovery.stopWatching) {
        discovery.stopWatching();
      }
      registry.clear();
      context.clear();
    }
  };
}

module.exports = {
  // Discovery
  MCPDiscovery,
  createMCPDiscovery,
  discoverMCPServers,
  CONFIG_LOCATIONS,
  
  // Tool Registry
  MCPToolRegistry,
  createMCPToolRegistry,
  
  // Context Provider
  MCPContextProvider,
  createMCPContextProvider,
  
  // Integration
  createMCPIntegration
};
