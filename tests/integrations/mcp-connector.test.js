/**
 * @fileoverview Tests for MCP Connector
 */

'use strict';

const {
  MCPConnector,
  MCPServerConnection,
  MCPTool,
  MCPResource,
  MCPPrompt,
  ConnectionState,
  TransportType
} = require('../../src/integrations/mcp-connector');

describe('MCPConnector', () => {
  describe('MCPTool', () => {
    it('should create tool with basic properties', () => {
      const tool = new MCPTool({
        name: 'read_file',
        description: 'Read file contents',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' }
          },
          required: ['path']
        }
      });

      expect(tool.name).toBe('read_file');
      expect(tool.description).toBe('Read file contents');
      expect(tool.inputSchema.required).toContain('path');
    });

    it('should validate input against schema', () => {
      const tool = new MCPTool({
        name: 'read_file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            encoding: { type: 'string' }
          },
          required: ['path']
        }
      });

      const valid = tool.validateInput({ path: '/test.txt' });
      expect(valid.valid).toBe(true);
      expect(valid.errors).toHaveLength(0);

      const invalid = tool.validateInput({});
      expect(invalid.valid).toBe(false);
      expect(invalid.errors).toContain('Missing required field: path');
    });

    it('should convert to JSON', () => {
      const tool = new MCPTool({
        name: 'test_tool',
        description: 'Test',
        inputSchema: {}
      });

      const json = tool.toJSON();
      expect(json.name).toBe('test_tool');
      expect(json.description).toBe('Test');
    });
  });

  describe('MCPResource', () => {
    it('should create resource with properties', () => {
      const resource = new MCPResource({
        uri: 'file:///test.txt',
        name: 'Test File',
        description: 'A test file',
        mimeType: 'text/plain'
      });

      expect(resource.uri).toBe('file:///test.txt');
      expect(resource.name).toBe('Test File');
      expect(resource.mimeType).toBe('text/plain');
    });

    it('should convert to JSON', () => {
      const resource = new MCPResource({
        uri: 'file:///test.txt',
        name: 'Test'
      });

      const json = resource.toJSON();
      expect(json.uri).toBe('file:///test.txt');
    });
  });

  describe('MCPPrompt', () => {
    it('should create prompt with arguments', () => {
      const prompt = new MCPPrompt({
        name: 'code_review',
        description: 'Review code',
        arguments: [
          { name: 'code', type: 'string', required: true }
        ]
      });

      expect(prompt.name).toBe('code_review');
      expect(prompt.arguments).toHaveLength(1);
    });

    it('should convert to JSON', () => {
      const prompt = new MCPPrompt({
        name: 'test_prompt',
        description: 'Test'
      });

      const json = prompt.toJSON();
      expect(json.name).toBe('test_prompt');
    });
  });

  describe('MCPServerConnection', () => {
    let connection;

    beforeEach(() => {
      connection = new MCPServerConnection({
        name: 'test-server',
        transport: TransportType.STDIO,
        mockTools: [
          { name: 'tool1', description: 'Tool 1', inputSchema: {} },
          { name: 'tool2', description: 'Tool 2', inputSchema: {} }
        ],
        mockResources: [
          { uri: 'file:///test.txt', name: 'Test' }
        ]
      });
    });

    afterEach(async () => {
      await connection.disconnect();
    });

    it('should have initial disconnected state', () => {
      expect(connection.state).toBe(ConnectionState.DISCONNECTED);
    });

    it('should connect and discover tools', async () => {
      await connection.connect();

      expect(connection.state).toBe(ConnectionState.CONNECTED);
      expect(connection.tools.size).toBe(2);
      expect(connection.tools.has('tool1')).toBe(true);
    });

    it('should emit connected event', async () => {
      const onConnected = jest.fn();
      connection.on('connected', onConnected);

      await connection.connect();

      expect(onConnected).toHaveBeenCalled();
    });

    it('should disconnect properly', async () => {
      await connection.connect();
      await connection.disconnect();

      expect(connection.state).toBe(ConnectionState.DISCONNECTED);
      expect(connection.tools.size).toBe(0);
    });

    it('should call tool', async () => {
      await connection.connect();

      const result = await connection.callTool('tool1', {});
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should throw on unknown tool', async () => {
      await connection.connect();

      await expect(connection.callTool('unknown_tool'))
        .rejects.toThrow('Tool not found: unknown_tool');
    });

    it('should read resource', async () => {
      await connection.connect();

      const result = await connection.readResource('file:///test.txt');
      expect(result.contents).toBeDefined();
    });

    it('should get status', async () => {
      await connection.connect();

      const status = connection.getStatus();
      expect(status.name).toBe('test-server');
      expect(status.state).toBe(ConnectionState.CONNECTED);
      expect(status.toolCount).toBe(2);
    });
  });

  describe('MCPConnector (Multi-Server)', () => {
    let connector;

    beforeEach(() => {
      connector = new MCPConnector();
    });

    afterEach(async () => {
      await connector.disconnectAll();
    });

    it('should add servers', () => {
      connector.addServer('server1', {
        transport: TransportType.STDIO,
        mockTools: [{ name: 'tool1', description: 'Tool 1' }]
      });

      expect(connector.servers.size).toBe(1);
    });

    it('should throw on duplicate server', () => {
      connector.addServer('server1', {});

      expect(() => connector.addServer('server1', {}))
        .toThrow('Server already exists: server1');
    });

    it('should connect all servers', async () => {
      connector.addServer('server1', {
        mockTools: [{ name: 'tool1', description: 'Tool 1' }]
      });
      connector.addServer('server2', {
        mockTools: [{ name: 'tool2', description: 'Tool 2' }]
      });

      const results = await connector.connectAll();

      expect(results.success).toHaveLength(2);
      expect(results.failed).toHaveLength(0);
    });

    it('should get all tools from all servers', async () => {
      connector.addServer('server1', {
        mockTools: [{ name: 'tool1', description: 'Tool 1' }]
      });
      connector.addServer('server2', {
        mockTools: [{ name: 'tool2', description: 'Tool 2' }]
      });

      await connector.connectAll();

      const tools = connector.getAllTools();
      expect(tools).toHaveLength(2);
    });

    it('should find tool and route to correct server', async () => {
      connector.addServer('server1', {
        mockTools: [{ name: 'tool1', description: 'Tool 1' }]
      });
      connector.addServer('server2', {
        mockTools: [{ name: 'tool2', description: 'Tool 2' }]
      });

      await connector.connectAll();

      const found = connector.findTool('tool2');
      expect(found).not.toBeNull();
      expect(found.server).toBe('server2');
    });

    it('should call tool across servers', async () => {
      connector.addServer('server1', {
        mockTools: [{ name: 'tool1', description: 'Tool 1', inputSchema: {} }]
      });

      await connector.connectAll();

      const result = await connector.callTool('tool1', {});
      expect(result.content).toBeDefined();
    });

    it('should remove server', async () => {
      connector.addServer('server1', {});
      await connector.connectServer('server1');

      await connector.removeServer('server1');

      expect(connector.servers.size).toBe(0);
    });

    it('should load config', () => {
      connector.loadConfig({
        mcpServers: {
          server1: { transport: 'stdio' },
          server2: { transport: 'sse' }
        }
      });

      expect(connector.servers.size).toBe(2);
    });

    it('should export config', () => {
      connector.addServer('server1', { transport: 'stdio' });

      const config = connector.exportConfig();

      expect(config.mcpServers.server1).toBeDefined();
    });

    it('should get overall status', async () => {
      connector.addServer('server1', {
        mockTools: [{ name: 'tool1', description: 'Tool 1' }]
      });
      connector.addServer('server2', {});

      await connector.connectServer('server1');

      const status = connector.getStatus();

      expect(status.serverCount).toBe(2);
      expect(status.connectedCount).toBe(1);
      expect(status.totalTools).toBe(1);
    });

    it('should emit server events', async () => {
      const onConnected = jest.fn();
      connector.on('serverConnected', onConnected);

      connector.addServer('server1', {});
      await connector.connectServer('server1');

      expect(onConnected).toHaveBeenCalledWith('server1', expect.any(Object));
    });
  });

  describe('Transport Types', () => {
    it('should have all transport types defined', () => {
      expect(TransportType.STDIO).toBe('stdio');
      expect(TransportType.SSE).toBe('sse');
      expect(TransportType.HTTP).toBe('http');
      expect(TransportType.WEBSOCKET).toBe('websocket');
    });
  });

  describe('Connection States', () => {
    it('should have all connection states defined', () => {
      expect(ConnectionState.DISCONNECTED).toBe('disconnected');
      expect(ConnectionState.CONNECTING).toBe('connecting');
      expect(ConnectionState.CONNECTED).toBe('connected');
      expect(ConnectionState.RECONNECTING).toBe('reconnecting');
      expect(ConnectionState.ERROR).toBe('error');
    });
  });
});
