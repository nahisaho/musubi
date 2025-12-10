/**
 * MCP Tool Adapters Tests
 * Tests for Sprint 3.3.5: MCP Tool Ecosystem
 */

const {
  MCPTransport,
  AdapterDirection,
  MCPToolDefinition,
  SchemaTranslator,
  MCPToSkillAdapter,
  SkillToMCPAdapter,
  MCPAdapterManager
} = require('../../src/orchestration/mcp-tool-adapters');

// Mock SkillRegistry
const createMockRegistry = () => ({
  skills: new Map(),
  register(skill) {
    this.skills.set(skill.id, skill);
    return { success: true };
  },
  unregister(id) {
    return this.skills.delete(id);
  },
  getSkill(id) {
    return this.skills.get(id) || null;
  },
  hasSkill(id) {
    return this.skills.has(id);
  },
  findByCategory(category) {
    const result = [];
    for (const skill of this.skills.values()) {
      if (skill.category === category) {
        result.push(skill);
      }
    }
    return result;
  }
});

// Mock SkillExecutor
const createMockExecutor = () => ({
  async execute(_skillId, _input) {
    return { success: true, output: { result: 'executed' } };
  }
});

describe('MCPToolDefinition', () => {
  test('should create valid tool definition', () => {
    const tool = new MCPToolDefinition({
      name: 'test_tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          input: { type: 'string' }
        }
      }
    });

    const validation = tool.validate();
    expect(validation.valid).toBe(true);
  });

  test('should reject tool without name', () => {
    const tool = new MCPToolDefinition({
      description: 'Missing name'
    });

    const validation = tool.validate();
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Tool name is required');
  });

  test('should have default transport', () => {
    const tool = new MCPToolDefinition({
      name: 'default_transport'
    });

    expect(tool.transport).toBe(MCPTransport.STDIO);
  });
});

describe('SchemaTranslator', () => {
  describe('MCP to MUSUBI conversion', () => {
    test('should convert basic schema', () => {
      const mcpSchema = {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Input text' },
          count: { type: 'number' }
        },
        required: ['text']
      };

      const musubiSchema = SchemaTranslator.mcpToMusubi(mcpSchema);

      expect(musubiSchema.type).toBe('object');
      expect(musubiSchema.properties.text.type).toBe('string');
      expect(musubiSchema.required).toContain('text');
      expect(musubiSchema.$schema).toBe('https://musubi.dev/schemas/skill-input/v1');
    });

    test('should handle nested objects', () => {
      const mcpSchema = {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' }
            }
          }
        }
      };

      const musubiSchema = SchemaTranslator.mcpToMusubi(mcpSchema);

      expect(musubiSchema.properties.config.type).toBe('object');
      expect(musubiSchema.properties.config.properties.enabled.type).toBe('boolean');
    });

    test('should handle arrays', () => {
      const mcpSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      };

      const musubiSchema = SchemaTranslator.mcpToMusubi(mcpSchema);

      expect(musubiSchema.properties.items.type).toBe('array');
      expect(musubiSchema.properties.items.items.type).toBe('string');
    });

    test('should handle null/undefined input', () => {
      const musubiSchema = SchemaTranslator.mcpToMusubi(null);

      expect(musubiSchema.type).toBe('object');
      expect(musubiSchema.properties).toEqual({});
    });
  });

  describe('MUSUBI to MCP conversion', () => {
    test('should convert basic schema', () => {
      const musubiSchema = {
        type: 'object',
        properties: {
          input: { type: 'string' }
        },
        required: ['input']
      };

      const mcpSchema = SchemaTranslator.musubiToMcp(musubiSchema);

      expect(mcpSchema.type).toBe('object');
      expect(mcpSchema.properties.input.type).toBe('string');
      expect(mcpSchema.required).toContain('input');
    });

    test('should handle null/undefined input', () => {
      const mcpSchema = SchemaTranslator.musubiToMcp(null);

      expect(mcpSchema.type).toBe('object');
      expect(mcpSchema.properties).toEqual({});
    });
  });
});

describe('MCPToSkillAdapter', () => {
  let adapter;
  let mockRegistry;

  beforeEach(() => {
    mockRegistry = createMockRegistry();
    adapter = new MCPToSkillAdapter({
      registry: mockRegistry,
      timeout: 5000
    });
  });

  describe('Server Registration', () => {
    test('should register MCP server', async () => {
      const skills = await adapter.registerServer({
        id: 'test-server',
        transport: MCPTransport.STDIO,
        endpoint: 'test',
        tools: [
          {
            name: 'tool1',
            description: 'Test tool 1',
            inputSchema: { type: 'object', properties: {} }
          }
        ]
      });

      expect(skills.length).toBe(1);
      expect(skills[0].id).toBe('mcp.test-server.tool1');
    });

    test('should emit server-registered event', async () => {
      const listener = jest.fn();
      adapter.on('server-registered', listener);

      await adapter.registerServer({
        id: 'event-server',
        transport: MCPTransport.HTTP,
        tools: []
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          serverId: 'event-server'
        })
      );
    });

    test('should reject duplicate server registration', async () => {
      await adapter.registerServer({
        id: 'dup-server',
        transport: MCPTransport.STDIO,
        tools: []
      });

      await expect(adapter.registerServer({
        id: 'dup-server',
        transport: MCPTransport.STDIO,
        tools: []
      })).rejects.toThrow('already registered');
    });
  });

  describe('Tool Import', () => {
    test('should import MCP tool as skill', async () => {
      const skill = await adapter.importTool('test-server', {
        name: 'imported_tool',
        description: 'An imported tool',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          }
        }
      });

      expect(skill.id).toBe('mcp.test-server.imported_tool');
      expect(skill.category).toBe('mcp-imported');
      expect(skill.tags).toContain('mcp');
    });

    test('should emit tool-imported event', async () => {
      const listener = jest.fn();
      adapter.on('tool-imported', listener);

      await adapter.importTool('event-server', {
        name: 'event_tool',
        description: 'Test'
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: 'event_tool'
        })
      );
    });

    test('should reject invalid tool', async () => {
      await expect(adapter.importTool('test-server', {
        // Missing name
        description: 'Invalid tool'
      })).rejects.toThrow('Invalid MCP tool');
    });
  });

  describe('Server Disconnection', () => {
    test('should disconnect from server', async () => {
      await adapter.registerServer({
        id: 'disconnect-server',
        transport: MCPTransport.STDIO,
        tools: [
          { name: 'tool1', description: 'Test' }
        ]
      });

      const result = await adapter.disconnectServer('disconnect-server');
      expect(result).toBe(true);
    });

    test('should emit server-disconnected event', async () => {
      const listener = jest.fn();
      adapter.on('server-disconnected', listener);

      await adapter.registerServer({
        id: 'dc-server',
        transport: MCPTransport.HTTP,
        tools: []
      });

      await adapter.disconnectServer('dc-server');
      expect(listener).toHaveBeenCalled();
    });

    test('should return false for non-existent server', async () => {
      const result = await adapter.disconnectServer('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('Connection Status', () => {
    test('should return connection status', async () => {
      await adapter.registerServer({
        id: 'status-server',
        transport: MCPTransport.STDIO,
        tools: []
      });

      const status = adapter.getConnectionStatus();
      expect(status['status-server']).toBeDefined();
      expect(status['status-server'].status).toBe('connected');
    });
  });
});

describe('SkillToMCPAdapter', () => {
  let adapter;
  let mockRegistry;
  let mockExecutor;

  beforeEach(() => {
    mockRegistry = createMockRegistry();
    mockExecutor = createMockExecutor();
    
    adapter = new SkillToMCPAdapter({
      registry: mockRegistry,
      executor: mockExecutor,
      serverName: 'test-musubi-server',
      version: '1.0.0'
    });

    // Add test skills
    mockRegistry.register({
      id: 'export-skill',
      name: 'Export Skill',
      description: 'A skill to export',
      category: 'test',
      version: '1.0.0',
      inputSchema: {
        type: 'object',
        properties: {
          input: { type: 'string' }
        }
      },
      handler: async (input) => ({ result: input.input })
    });
  });

  describe('Skill Export', () => {
    test('should export skill as MCP tool', () => {
      const tool = adapter.exportSkill('export-skill');

      expect(tool.name).toBe('export_skill');
      expect(tool.description).toBe('A skill to export');
      expect(tool.inputSchema).toBeDefined();
    });

    test('should emit skill-exported event', () => {
      const listener = jest.fn();
      adapter.on('skill-exported', listener);

      adapter.exportSkill('export-skill');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          skillId: 'export-skill'
        })
      );
    });

    test('should throw for non-existent skill', () => {
      expect(() => adapter.exportSkill('non-existent'))
        .toThrow('not found');
    });

    test('should sanitize skill ID to valid tool name', () => {
      mockRegistry.register({
        id: 'skill-with.special/chars',
        name: 'Special Skill',
        description: 'Test',
        category: 'test',
        version: '1.0.0'
      });

      const tool = adapter.exportSkill('skill-with.special/chars');
      expect(tool.name).toMatch(/^[a-zA-Z0-9_]+$/);
    });
  });

  describe('MCP Tools List', () => {
    test('should list exported tools', () => {
      adapter.exportSkill('export-skill');

      const result = adapter.handleListTools();
      expect(result.tools.length).toBe(1);
      expect(result.tools[0].name).toBe('export_skill');
    });
  });

  describe('MCP Tool Call', () => {
    test('should handle tool call', async () => {
      adapter.exportSkill('export-skill');

      const result = await adapter.handleCallTool({
        name: 'export_skill',
        arguments: { input: 'test' }
      });

      expect(result.isError).toBe(false);
    });

    test('should return error for unknown tool', async () => {
      const result = await adapter.handleCallTool({
        name: 'unknown_tool',
        arguments: {}
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });
  });

  describe('Server Manifest', () => {
    test('should return server manifest', () => {
      const manifest = adapter.getServerManifest();

      expect(manifest.name).toBe('test-musubi-server');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.capabilities.tools).toBeDefined();
    });
  });

  describe('Protocol Handler', () => {
    test('should create protocol handler', () => {
      const handler = adapter.createProtocolHandler();
      expect(typeof handler).toBe('function');
    });

    test('should handle initialize request', async () => {
      const handler = adapter.createProtocolHandler();
      
      const response = await handler({
        method: 'initialize',
        id: 1
      });

      expect(response.result.name).toBe('test-musubi-server');
    });

    test('should handle tools/list request', async () => {
      adapter.exportSkill('export-skill');
      const handler = adapter.createProtocolHandler();
      
      const response = await handler({
        method: 'tools/list',
        id: 2
      });

      expect(response.result.tools.length).toBe(1);
    });

    test('should handle tools/call request', async () => {
      adapter.exportSkill('export-skill');
      const handler = adapter.createProtocolHandler();
      
      const response = await handler({
        method: 'tools/call',
        id: 3,
        params: {
          name: 'export_skill',
          arguments: { input: 'test' }
        }
      });

      expect(response.result).toBeDefined();
    });

    test('should handle unknown method', async () => {
      const handler = adapter.createProtocolHandler();
      
      const response = await handler({
        method: 'unknown/method',
        id: 4
      });

      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32601);
    });
  });
});

describe('MCPAdapterManager', () => {
  let manager;
  let mockRegistry;
  let mockExecutor;

  beforeEach(() => {
    mockRegistry = createMockRegistry();
    mockExecutor = createMockExecutor();
    
    manager = new MCPAdapterManager({
      registry: mockRegistry,
      executor: mockExecutor,
      serverName: 'test-manager',
      version: '1.0.0'
    });

    // Add test skill
    mockRegistry.register({
      id: 'managed-skill',
      name: 'Managed Skill',
      description: 'Test',
      category: 'test',
      version: '1.0.0',
      handler: async () => ({ done: true })
    });
  });

  describe('Unified Interface', () => {
    test('should register MCP server', async () => {
      const skills = await manager.registerMCPServer({
        id: 'managed-server',
        transport: MCPTransport.STDIO,
        tools: [
          { name: 'tool1', description: 'Test' }
        ]
      });

      expect(skills.length).toBe(1);
    });

    test('should export skill', () => {
      const tool = manager.exportSkill('managed-skill');
      expect(tool.name).toBe('managed_skill');
    });

    test('should get MCP handler', () => {
      const handler = manager.getMCPHandler();
      expect(typeof handler).toBe('function');
    });
  });

  describe('Status Reporting', () => {
    test('should return comprehensive status', async () => {
      await manager.registerMCPServer({
        id: 'status-server',
        transport: MCPTransport.HTTP,
        tools: [
          { name: 'tool1', description: 'Test' }
        ]
      });

      manager.exportSkill('managed-skill');

      const status = manager.getStatus();

      expect(status.import.adapterCount).toBe(1);
      expect(status.export.toolCount).toBe(1);
    });

    test('should count imported skills', async () => {
      await manager.registerMCPServer({
        id: 'count-server',
        transport: MCPTransport.STDIO,
        tools: [
          { name: 'tool1', description: 'Test' },
          { name: 'tool2', description: 'Test' }
        ]
      });

      expect(manager.getImportedSkillCount()).toBe(2);
    });

    test('should count exported tools', () => {
      manager.exportSkill('managed-skill');
      expect(manager.getExportedToolCount()).toBe(1);
    });
  });

  describe('Event Forwarding', () => {
    test('should forward import events', async () => {
      const listener = jest.fn();
      manager.on('import:server-registered', listener);

      await manager.registerMCPServer({
        id: 'event-server',
        transport: MCPTransport.STDIO,
        tools: []
      });

      expect(listener).toHaveBeenCalled();
    });

    test('should forward export events', () => {
      const listener = jest.fn();
      manager.on('export:skill-exported', listener);

      manager.exportSkill('managed-skill');

      expect(listener).toHaveBeenCalled();
    });
  });
});

describe('MCPTransport', () => {
  test('should have correct transport values', () => {
    expect(MCPTransport.STDIO).toBe('stdio');
    expect(MCPTransport.SSE).toBe('sse');
    expect(MCPTransport.HTTP).toBe('http');
    expect(MCPTransport.WEBSOCKET).toBe('websocket');
  });
});

describe('AdapterDirection', () => {
  test('should have correct direction values', () => {
    expect(AdapterDirection.MCP_TO_SKILL).toBe('mcp-to-skill');
    expect(AdapterDirection.SKILL_TO_MCP).toBe('skill-to-mcp');
  });
});
