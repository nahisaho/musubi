/**
 * Tests for MCP Integration index
 */

'use strict';

const {
  MCPDiscovery,
  createMCPDiscovery,
  MCPToolRegistry,
  createMCPToolRegistry,
  MCPContextProvider,
  createMCPContextProvider,
  createMCPIntegration
} = require('../../../src/integrations/mcp');

describe('MCP Integration Exports', () => {
  it('should export MCPDiscovery', () => {
    expect(MCPDiscovery).toBeDefined();
    expect(typeof MCPDiscovery).toBe('function');
  });
  
  it('should export createMCPDiscovery', () => {
    expect(createMCPDiscovery).toBeDefined();
    expect(typeof createMCPDiscovery).toBe('function');
  });
  
  it('should export MCPToolRegistry', () => {
    expect(MCPToolRegistry).toBeDefined();
    expect(typeof MCPToolRegistry).toBe('function');
  });
  
  it('should export createMCPToolRegistry', () => {
    expect(createMCPToolRegistry).toBeDefined();
    expect(typeof createMCPToolRegistry).toBe('function');
  });
  
  it('should export MCPContextProvider', () => {
    expect(MCPContextProvider).toBeDefined();
    expect(typeof MCPContextProvider).toBe('function');
  });
  
  it('should export createMCPContextProvider', () => {
    expect(createMCPContextProvider).toBeDefined();
    expect(typeof createMCPContextProvider).toBe('function');
  });
  
  it('should export createMCPIntegration', () => {
    expect(createMCPIntegration).toBeDefined();
    expect(typeof createMCPIntegration).toBe('function');
  });
});

describe('createMCPIntegration', () => {
  let integration;
  let mockConnector;
  
  beforeEach(() => {
    mockConnector = {
      connect: jest.fn().mockResolvedValue(undefined),
      listTools: jest.fn().mockResolvedValue({ tools: [] }),
      listResources: jest.fn().mockResolvedValue({ resources: [] }),
      listPrompts: jest.fn().mockResolvedValue({ prompts: [] }),
      callTool: jest.fn().mockResolvedValue({ content: [] }),
      readResource: jest.fn().mockResolvedValue({ contents: '' }),
      getPrompt: jest.fn().mockResolvedValue({ messages: [] })
    };
    
    integration = createMCPIntegration({
      connector: mockConnector
    });
  });
  
  afterEach(() => {
    if (integration) {
      integration.cleanup();
    }
  });
  
  describe('structure', () => {
    it('should have discovery component', () => {
      expect(integration.discovery).toBeInstanceOf(MCPDiscovery);
    });
    
    it('should have registry component', () => {
      expect(integration.registry).toBeInstanceOf(MCPToolRegistry);
    });
    
    it('should have context component', () => {
      expect(integration.context).toBeInstanceOf(MCPContextProvider);
    });
  });
  
  describe('initialize', () => {
    it('should initialize without errors', async () => {
      const status = await integration.initialize({
        autoDiscover: false,
        watchChanges: false
      });
      
      expect(status).toBeDefined();
      expect(status.discovery).toBeDefined();
      expect(status.registry).toBeDefined();
      expect(status.context).toBeDefined();
    });
  });
  
  describe('getTools', () => {
    it('should return empty array initially', () => {
      const tools = integration.getTools();
      expect(tools).toEqual([]);
    });
    
    it('should return registered tools', () => {
      integration.registry.registerTool({
        name: 'server/test_tool',
        description: 'Test',
        serverName: 'server'
      });
      
      const tools = integration.getTools();
      expect(tools).toHaveLength(1);
    });
  });
  
  describe('getToolDefinitions', () => {
    it('should return tool definitions for Agent Loop', () => {
      integration.registry.registerTool({
        name: 'server/test_tool',
        description: 'Test tool',
        inputSchema: { type: 'object' },
        serverName: 'server'
      });
      
      const defs = integration.getToolDefinitions();
      expect(defs).toHaveLength(1);
      expect(defs[0].description).toBe('Test tool');
    });
  });
  
  describe('buildContext', () => {
    it('should build empty context', async () => {
      const context = await integration.buildContext({});
      
      expect(context.resources).toEqual([]);
      expect(context.prompts).toEqual([]);
      expect(context.metadata).toBeDefined();
    });
  });
  
  describe('getStatus', () => {
    it('should return integration status', () => {
      const status = integration.getStatus();
      
      expect(status.discovery).toBeDefined();
      expect(status.registry).toBeDefined();
      expect(status.context).toBeDefined();
    });
  });
  
  describe('cleanup', () => {
    it('should clean up resources', () => {
      integration.registry.registerTool({
        name: 'server/tool',
        serverName: 'server'
      });
      
      integration.cleanup();
      
      expect(integration.registry.tools.size).toBe(0);
    });
  });
});

describe('Factory Functions', () => {
  describe('createMCPDiscovery', () => {
    it('should create discovery instance', () => {
      const discovery = createMCPDiscovery();
      expect(discovery).toBeInstanceOf(MCPDiscovery);
    });
  });
  
  describe('createMCPToolRegistry', () => {
    it('should create registry instance', () => {
      const registry = createMCPToolRegistry();
      expect(registry).toBeInstanceOf(MCPToolRegistry);
    });
  });
  
  describe('createMCPContextProvider', () => {
    it('should create context provider instance', () => {
      const context = createMCPContextProvider();
      expect(context).toBeInstanceOf(MCPContextProvider);
    });
  });
});
