/**
 * Tests for MCP Tool Registry
 */

'use strict';

const { MCPToolRegistry, createMCPToolRegistry } = require('../../../src/integrations/mcp');

describe('MCPToolRegistry', () => {
  let registry;
  let mockConnector;
  
  beforeEach(() => {
    registry = new MCPToolRegistry();
    
    mockConnector = {
      connect: jest.fn().mockResolvedValue(undefined),
      listTools: jest.fn().mockResolvedValue({
        tools: [
          {
            name: 'read_file',
            description: 'Read a file from disk',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string' }
              },
              required: ['path']
            }
          },
          {
            name: 'write_file',
            description: 'Write content to a file',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                content: { type: 'string' }
              },
              required: ['path', 'content']
            }
          }
        ]
      }),
      callTool: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Success' }]
      })
    };
  });
  
  describe('constructor', () => {
    it('should create with default options', () => {
      expect(registry.tools).toBeInstanceOf(Map);
      expect(registry.serverTools).toBeInstanceOf(Map);
    });
    
    it('should accept custom options', () => {
      const custom = new MCPToolRegistry({
        autoRegister: false
      });
      expect(custom.autoRegister).toBe(false);
    });
  });
  
  describe('setConnector', () => {
    it('should set the connector', () => {
      registry.setConnector(mockConnector);
      expect(registry.connector).toBe(mockConnector);
    });
  });
  
  describe('discoverTools', () => {
    beforeEach(() => {
      registry.setConnector(mockConnector);
    });
    
    it('should discover tools from server', async () => {
      const tools = await registry.discoverTools('test-server', { command: 'test' });
      
      expect(mockConnector.connect).toHaveBeenCalledWith('test-server', { command: 'test' });
      expect(mockConnector.listTools).toHaveBeenCalledWith('test-server');
      expect(tools).toHaveLength(2);
    });
    
    it('should throw error without connector', async () => {
      const noConnectorRegistry = new MCPToolRegistry();
      await expect(noConnectorRegistry.discoverTools('test', {}))
        .rejects.toThrow('MCP connector not set');
    });
  });
  
  describe('registerTool', () => {
    it('should register a tool directly', () => {
      registry.registerTool({
        name: 'server/my_tool',
        description: 'A custom tool',
        inputSchema: { type: 'object' },
        serverName: 'server'
      });
      
      expect(registry.tools.size).toBe(1);
    });
    
    it('should emit event on registration', () => {
      const callback = jest.fn();
      registry.on('tool:registered', callback);
      
      registry.registerTool({
        name: 'server/tool',
        description: 'Test',
        serverName: 'server'
      });
      
      expect(callback).toHaveBeenCalled();
    });
  });
  
  describe('getTool', () => {
    it('should return registered tool', () => {
      registry.registerTool({
        name: 'server/tool',
        description: 'Test',
        serverName: 'server'
      });
      const tool = registry.getTool('server/tool');
      
      expect(tool).toBeDefined();
      expect(tool.name).toBe('server/tool');
    });
    
    it('should return undefined for unknown tool', () => {
      expect(registry.getTool('unknown')).toBeUndefined();
    });
  });
  
  describe('getAllTools', () => {
    it('should return all tools', () => {
      registry.registerTool({ name: 's1/t1', serverName: 's1' });
      registry.registerTool({ name: 's2/t2', serverName: 's2' });
      
      const all = registry.getAllTools();
      expect(all).toHaveLength(2);
    });
  });
  
  describe('getToolsByServer', () => {
    it('should return tools for specific server', () => {
      // Note: serverTools only tracks tools discovered via discoverTools
      // registerTool adds to tools map but not serverTools map
      registry.serverTools.set('server1', ['server1/tool1', 'server1/tool2']);
      registry.registerTool({ name: 'server1/tool1', serverName: 'server1' });
      registry.registerTool({ name: 'server1/tool2', serverName: 'server1' });
      
      const server1Tools = registry.getToolsByServer('server1');
      expect(server1Tools).toHaveLength(2);
    });
    
    it('should return empty array for unknown server', () => {
      expect(registry.getToolsByServer('unknown')).toEqual([]);
    });
  });
  
  describe('getOpenAITools', () => {
    it('should convert to OpenAI function format', () => {
      registry.registerTool({
        name: 'server/tool',
        description: 'A tool',
        inputSchema: {
          type: 'object',
          properties: { arg: { type: 'string' } }
        },
        serverName: 'server'
      });
      
      const openai = registry.getOpenAITools();
      expect(openai).toHaveLength(1);
      expect(openai[0].type).toBe('function');
    });
  });
  
  describe('getAnthropicTools', () => {
    it('should convert to Anthropic tool format', () => {
      registry.registerTool({
        name: 'server/tool',
        description: 'A tool',
        inputSchema: {
          type: 'object',
          properties: { arg: { type: 'string' } }
        },
        serverName: 'server'
      });
      
      const anthropic = registry.getAnthropicTools();
      expect(anthropic).toHaveLength(1);
      expect(anthropic[0].input_schema).toBeDefined();
    });
  });
  
  describe('clear', () => {
    it('should clear all tools', () => {
      registry.registerTool({ name: 'server/tool', serverName: 'server' });
      registry.clear();
      
      expect(registry.tools.size).toBe(0);
      expect(registry.serverTools.size).toBe(0);
    });
  });
  
  describe('getStats', () => {
    it('should return registry statistics', () => {
      // serverTools map must be set for server count
      registry.serverTools.set('s1', ['s1/t1']);
      registry.serverTools.set('s2', ['s2/t2']);
      registry.registerTool({ name: 's1/t1', serverName: 's1' });
      registry.registerTool({ name: 's2/t2', serverName: 's2' });
      
      const stats = registry.getStats();
      
      expect(stats.totalTools).toBe(2);
      expect(stats.servers).toBe(2);
    });
  });
});

describe('createMCPToolRegistry', () => {
  it('should create registry instance', () => {
    const registry = createMCPToolRegistry();
    expect(registry).toBeInstanceOf(MCPToolRegistry);
  });
  
  it('should pass options', () => {
    const registry = createMCPToolRegistry({
      autoRegister: false
    });
    expect(registry.autoRegister).toBe(false);
  });
});
