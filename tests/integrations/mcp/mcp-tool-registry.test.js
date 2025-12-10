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
                path: { type: 'string' },
              },
              required: ['path'],
            },
          },
          {
            name: 'write_file',
            description: 'Write content to a file',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                content: { type: 'string' },
              },
              required: ['path', 'content'],
            },
          },
        ],
      }),
      callTool: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Success' }],
      }),
    };
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      expect(registry.tools).toBeInstanceOf(Map);
      expect(registry.serverTools).toBeInstanceOf(Map);
    });

    it('should accept custom options', () => {
      const custom = new MCPToolRegistry({
        autoRegister: false,
      });
      expect(custom.autoRegister).toBe(false);
    });

    it('should accept connector and skill registry', () => {
      const mockSkillRegistry = { registerSkill: jest.fn() };
      const custom = new MCPToolRegistry({
        connector: mockConnector,
        skillRegistry: mockSkillRegistry,
      });
      expect(custom.connector).toBe(mockConnector);
      expect(custom.skillRegistry).toBe(mockSkillRegistry);
    });
  });

  describe('setConnector', () => {
    it('should set the connector', () => {
      registry.setConnector(mockConnector);
      expect(registry.connector).toBe(mockConnector);
    });
  });

  describe('setSkillRegistry', () => {
    it('should set the skill registry', () => {
      const mockSkillRegistry = { registerSkill: jest.fn() };
      registry.setSkillRegistry(mockSkillRegistry);
      expect(registry.skillRegistry).toBe(mockSkillRegistry);
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
      await expect(noConnectorRegistry.discoverTools('test', {})).rejects.toThrow(
        'MCP connector not set'
      );
    });

    it('should emit tools:discovered event', async () => {
      const callback = jest.fn();
      registry.on('tools:discovered', callback);

      await registry.discoverTools('test-server', { command: 'test' });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          serverName: 'test-server',
          count: 2,
        })
      );
    });

    it('should emit error event on discovery failure', async () => {
      mockConnector.connect.mockRejectedValue(new Error('Connection failed'));
      const callback = jest.fn();
      registry.on('tools:discovery:error', callback);

      await expect(registry.discoverTools('bad-server', {})).rejects.toThrow('Connection failed');
      expect(callback).toHaveBeenCalled();
    });

    it('should track tools per server', async () => {
      await registry.discoverTools('test-server', { command: 'test' });

      const serverToolNames = registry.serverTools.get('test-server');
      expect(serverToolNames).toHaveLength(2);
    });
  });

  describe('registerTool', () => {
    it('should register a tool directly', () => {
      registry.registerTool({
        name: 'server/my_tool',
        description: 'A custom tool',
        inputSchema: { type: 'object' },
        serverName: 'server',
      });

      expect(registry.tools.size).toBe(1);
    });

    it('should emit event on registration', () => {
      const callback = jest.fn();
      registry.on('tool:registered', callback);

      registry.registerTool({
        name: 'server/tool',
        description: 'Test',
        serverName: 'server',
      });

      expect(callback).toHaveBeenCalled();
    });

    it('should auto-register with skill registry when enabled', () => {
      const mockSkillRegistry = { registerSkill: jest.fn() };
      registry.setSkillRegistry(mockSkillRegistry);

      registry.registerTool({
        name: 'server/tool',
        description: 'Test',
        serverName: 'server',
        originalName: 'tool',
        inputSchema: { type: 'object' },
      });

      expect(mockSkillRegistry.registerSkill).toHaveBeenCalled();
    });

    it('should initialize invocation counts and latency history', () => {
      registry.registerTool({
        name: 'server/tool',
        description: 'Test',
        serverName: 'server',
      });

      expect(registry.invocationCounts.get('server/tool')).toBe(0);
      expect(registry.latencyHistory.get('server/tool')).toEqual([]);
    });
  });

  describe('registerAsSkill', () => {
    it('should not register when no skill registry', () => {
      expect(() => {
        registry.registerAsSkill({
          name: 'server/tool',
          description: 'Test',
          serverName: 'server',
        });
      }).not.toThrow();
    });

    it('should emit skill:registered event', () => {
      const mockSkillRegistry = { registerSkill: jest.fn() };
      registry.setSkillRegistry(mockSkillRegistry);

      const callback = jest.fn();
      registry.on('skill:registered', callback);

      registry.registerAsSkill({
        name: 'server/tool',
        description: 'Test',
        serverName: 'server',
        originalName: 'tool',
        inputSchema: { type: 'object' },
      });

      expect(callback).toHaveBeenCalled();
    });

    it('should emit error on skill registration failure', () => {
      const mockSkillRegistry = {
        registerSkill: jest.fn().mockImplementation(() => {
          throw new Error('Registration failed');
        }),
      };
      registry.setSkillRegistry(mockSkillRegistry);

      const callback = jest.fn();
      registry.on('skill:registration:error', callback);

      registry.registerAsSkill({
        name: 'server/tool',
        description: 'Test',
        serverName: 'server',
      });

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('invokeTool', () => {
    beforeEach(() => {
      registry.setConnector(mockConnector);
      registry.registerTool({
        name: 'server/tool',
        originalName: 'tool',
        description: 'Test tool',
        serverName: 'server',
        inputSchema: {
          type: 'object',
          properties: {
            arg: { type: 'string' },
          },
          required: ['arg'],
        },
      });
    });

    it('should invoke tool successfully', async () => {
      const result = await registry.invokeTool('server/tool', { arg: 'test' });

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(mockConnector.callTool).toHaveBeenCalledWith('server', 'tool', { arg: 'test' });
    });

    it('should throw error for unknown tool', async () => {
      await expect(registry.invokeTool('unknown/tool', {})).rejects.toThrow('Tool not found');
    });

    it('should throw error without connector', async () => {
      registry.connector = null;
      await expect(registry.invokeTool('server/tool', { arg: 'test' })).rejects.toThrow(
        'MCP connector not set'
      );
    });

    it('should validate input and reject invalid input', async () => {
      const result = await registry.invokeTool('server/tool', {}); // missing required 'arg'

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Invalid input');
    });

    it('should emit tool:invoked event on success', async () => {
      const callback = jest.fn();
      registry.on('tool:invoked', callback);

      await registry.invokeTool('server/tool', { arg: 'test' });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'server/tool',
          success: true,
        })
      );
    });

    it('should emit tool:error event on failure', async () => {
      mockConnector.callTool.mockRejectedValue(new Error('Tool failed'));
      const callback = jest.fn();
      registry.on('tool:error', callback);

      const result = await registry.invokeTool('server/tool', { arg: 'test' });

      expect(result.success).toBe(false);
      expect(callback).toHaveBeenCalled();
    });

    it('should record invocation metrics', async () => {
      await registry.invokeTool('server/tool', { arg: 'test' });
      await registry.invokeTool('server/tool', { arg: 'test2' });

      expect(registry.invocationCounts.get('server/tool')).toBe(2);
      expect(registry.latencyHistory.get('server/tool').length).toBe(2);
    });
  });

  describe('validateInput', () => {
    it('should return valid for empty schema', () => {
      const tool = { inputSchema: {} };
      const result = registry.validateInput(tool, { any: 'value' });
      expect(result.valid).toBe(true);
    });

    it('should check required fields', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: { field: { type: 'string' } },
          required: ['field'],
        },
      };
      const result = registry.validateInput(tool, {});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: field');
    });

    it('should validate string type', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: { field: { type: 'string' } },
        },
      };
      const result = registry.validateInput(tool, { field: 123 });
      expect(result.valid).toBe(false);
    });

    it('should validate number type', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: { field: { type: 'number' } },
        },
      };
      expect(registry.validateInput(tool, { field: 123 }).valid).toBe(true);
      expect(registry.validateInput(tool, { field: 'str' }).valid).toBe(false);
    });

    it('should validate integer type', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: { field: { type: 'integer' } },
        },
      };
      expect(registry.validateInput(tool, { field: 123 }).valid).toBe(true);
      expect(registry.validateInput(tool, { field: 12.5 }).valid).toBe(false);
    });

    it('should validate boolean type', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: { field: { type: 'boolean' } },
        },
      };
      expect(registry.validateInput(tool, { field: true }).valid).toBe(true);
      expect(registry.validateInput(tool, { field: 'true' }).valid).toBe(false);
    });

    it('should validate array type', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: { field: { type: 'array' } },
        },
      };
      expect(registry.validateInput(tool, { field: [1, 2, 3] }).valid).toBe(true);
      expect(registry.validateInput(tool, { field: {} }).valid).toBe(false);
    });

    it('should validate object type', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: { field: { type: 'object' } },
        },
      };
      expect(registry.validateInput(tool, { field: { a: 1 } }).valid).toBe(true);
      expect(registry.validateInput(tool, { field: [1, 2] }).valid).toBe(false);
      expect(registry.validateInput(tool, { field: null }).valid).toBe(false);
    });

    it('should validate null type', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: { field: { type: 'null' } },
        },
      };
      expect(registry.validateInput(tool, { field: null }).valid).toBe(true);
      expect(registry.validateInput(tool, { field: 'null' }).valid).toBe(false);
    });

    it('should pass for unknown type', () => {
      const tool = {
        inputSchema: {
          type: 'object',
          properties: { field: { type: 'unknown' } },
        },
      };
      expect(registry.validateInput(tool, { field: 'anything' }).valid).toBe(true);
    });
  });

  describe('getToolStats', () => {
    it('should return stats for registered tool', () => {
      registry.registerTool({
        name: 'server/tool',
        serverName: 'server',
      });

      const stats = registry.getToolStats('server/tool');

      expect(stats.invocations).toBe(0);
      expect(stats.avgLatency).toBe(0);
      expect(stats.minLatency).toBe(0);
      expect(stats.maxLatency).toBe(0);
    });

    it('should calculate latency stats after invocations', () => {
      registry.registerTool({
        name: 'server/tool',
        serverName: 'server',
      });
      registry.recordInvocation('server/tool', 100, true);
      registry.recordInvocation('server/tool', 200, true);
      registry.recordInvocation('server/tool', 150, true);

      const stats = registry.getToolStats('server/tool');

      expect(stats.invocations).toBe(3);
      expect(stats.avgLatency).toBe(150);
      expect(stats.minLatency).toBe(100);
      expect(stats.maxLatency).toBe(200);
    });

    it('should return default stats for unknown tool', () => {
      const stats = registry.getToolStats('unknown/tool');
      expect(stats.invocations).toBe(0);
    });
  });

  describe('recordInvocation', () => {
    it('should limit latency history to 100 entries', () => {
      registry.registerTool({ name: 'server/tool', serverName: 'server' });

      for (let i = 0; i < 110; i++) {
        registry.recordInvocation('server/tool', i, true);
      }

      const history = registry.latencyHistory.get('server/tool');
      expect(history.length).toBe(100);
      expect(history[0]).toBe(10); // First 10 removed
    });
  });

  describe('getTool', () => {
    it('should return registered tool', () => {
      registry.registerTool({
        name: 'server/tool',
        description: 'Test',
        serverName: 'server',
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
          properties: { arg: { type: 'string' } },
        },
        serverName: 'server',
      });

      const openai = registry.getOpenAITools();
      expect(openai).toHaveLength(1);
      expect(openai[0].type).toBe('function');
      expect(openai[0].function.name).toBe('server_tool');
    });
  });

  describe('getAnthropicTools', () => {
    it('should convert to Anthropic tool format', () => {
      registry.registerTool({
        name: 'server/tool',
        description: 'A tool',
        inputSchema: {
          type: 'object',
          properties: { arg: { type: 'string' } },
        },
        serverName: 'server',
      });

      const anthropic = registry.getAnthropicTools();
      expect(anthropic).toHaveLength(1);
      expect(anthropic[0].input_schema).toBeDefined();
      expect(anthropic[0].name).toBe('server_tool');
    });
  });

  describe('unregisterServer', () => {
    it('should remove all tools from a server', () => {
      registry.serverTools.set('server1', ['server1/tool1', 'server1/tool2']);
      registry.registerTool({ name: 'server1/tool1', serverName: 'server1' });
      registry.registerTool({ name: 'server1/tool2', serverName: 'server1' });

      registry.unregisterServer('server1');

      expect(registry.tools.size).toBe(0);
      expect(registry.serverTools.has('server1')).toBe(false);
    });

    it('should emit server:unregistered event', () => {
      const callback = jest.fn();
      registry.on('server:unregistered', callback);

      registry.serverTools.set('server1', ['server1/tool1']);
      registry.registerTool({ name: 'server1/tool1', serverName: 'server1' });

      registry.unregisterServer('server1');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          serverName: 'server1',
          toolCount: 1,
        })
      );
    });

    it('should unregister from skill registry', () => {
      const mockSkillRegistry = {
        registerSkill: jest.fn(),
        unregisterSkill: jest.fn(),
      };
      registry.setSkillRegistry(mockSkillRegistry);
      registry.serverTools.set('server1', ['server1/tool1']);
      registry.tools.set('server1/tool1', { name: 'server1/tool1' });

      registry.unregisterServer('server1');

      expect(mockSkillRegistry.unregisterSkill).toHaveBeenCalledWith('mcp-server1-tool1');
    });

    it('should handle skill unregister error gracefully', () => {
      const mockSkillRegistry = {
        registerSkill: jest.fn(),
        unregisterSkill: jest.fn().mockImplementation(() => {
          throw new Error('Not found');
        }),
      };
      registry.setSkillRegistry(mockSkillRegistry);
      registry.serverTools.set('server1', ['server1/tool1']);
      registry.tools.set('server1/tool1', { name: 'server1/tool1' });

      expect(() => registry.unregisterServer('server1')).not.toThrow();
    });

    it('should handle unregistering non-existent server', () => {
      expect(() => registry.unregisterServer('non-existent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all tools', () => {
      registry.registerTool({ name: 'server/tool', serverName: 'server' });
      registry.clear();

      expect(registry.tools.size).toBe(0);
      expect(registry.serverTools.size).toBe(0);
      expect(registry.invocationCounts.size).toBe(0);
      expect(registry.latencyHistory.size).toBe(0);
    });

    it('should emit registry:cleared event', () => {
      const callback = jest.fn();
      registry.on('registry:cleared', callback);

      registry.clear();

      expect(callback).toHaveBeenCalled();
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
      expect(stats.totalInvocations).toBe(0);
      expect(stats.toolsByServer).toEqual({ s1: 1, s2: 1 });
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
      autoRegister: false,
    });
    expect(registry.autoRegister).toBe(false);
  });
});
