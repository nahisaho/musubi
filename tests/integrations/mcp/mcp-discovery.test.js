/**
 * Tests for MCP Discovery
 */

'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { MCPDiscovery, createMCPDiscovery } = require('../../../src/integrations/mcp');

describe('MCPDiscovery', () => {
  let discovery;
  let tempDir;

  beforeEach(() => {
    discovery = new MCPDiscovery();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    // Clean up env vars
    delete process.env.MCP_SERVERS;
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('MCP_SERVER_')) {
        delete process.env[key];
      }
    }
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      expect(discovery.servers).toBeInstanceOf(Map);
      expect(discovery.includeGlobal).toBe(true);
      expect(discovery.includeProject).toBe(true);
      expect(discovery.includeEnv).toBe(true);
    });

    it('should accept custom options', () => {
      const custom = new MCPDiscovery({
        projectRoot: '/custom/path',
        includeGlobal: false,
        includeProject: false,
        includeEnv: false,
      });
      expect(custom.projectRoot).toBe('/custom/path');
      expect(custom.includeGlobal).toBe(false);
      expect(custom.includeProject).toBe(false);
      expect(custom.includeEnv).toBe(false);
    });
  });

  describe('addServer', () => {
    it('should add a server', () => {
      discovery.addServer(
        {
          name: 'test-server',
          command: 'node',
          args: ['server.js'],
        },
        'manual'
      );

      expect(discovery.servers.has('test-server')).toBe(true);
    });

    it('should emit event on add', () => {
      const callback = jest.fn();
      discovery.on('server:discovered', callback);

      discovery.addServer({ name: 'test', command: 'test' }, 'manual');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test',
          source: 'manual',
        })
      );
    });

    it('should handle missing name gracefully', () => {
      discovery.addServer({ command: 'test' }, 'manual');
      expect(discovery.servers.size).toBe(0);
    });

    it('should merge configurations for duplicate servers', () => {
      discovery.addServer({ name: 'test', command: 'cmd1', env: { A: '1' } }, 'source1');
      discovery.addServer({ name: 'test', command: 'cmd2', env: { B: '2' } }, 'source2');

      const server = discovery.getServer('test');
      expect(server.command).toBe('cmd2');
      expect(server.metadata.sources).toEqual(['source1', 'source2']);
    });

    it('should preserve metadata when merging', () => {
      discovery.addServer(
        { name: 'test', command: 'cmd1', metadata: { custom: 'value1' } },
        'source1'
      );
      discovery.addServer(
        { name: 'test', command: 'cmd2', metadata: { other: 'value2' } },
        'source2'
      );

      const server = discovery.getServer('test');
      expect(server.metadata.custom).toBe('value1');
      expect(server.metadata.other).toBe('value2');
    });
  });

  describe('getServer', () => {
    it('should return added server', () => {
      discovery.addServer({ name: 'test', command: 'test' }, 'manual');
      const server = discovery.getServer('test');

      expect(server).toBeDefined();
      expect(server.name).toBe('test');
    });

    it('should return undefined for unknown server', () => {
      expect(discovery.getServer('unknown')).toBeUndefined();
    });
  });

  describe('getAllServers', () => {
    it('should return all added servers', () => {
      discovery.addServer({ name: 'server1', command: 'cmd1' }, 'manual');
      discovery.addServer({ name: 'server2', command: 'cmd2' }, 'manual');

      const all = discovery.getAllServers();
      expect(all).toHaveLength(2);
    });
  });

  describe('getServersByTransport', () => {
    it('should filter by transport type', () => {
      discovery.addServer({ name: 'stdio-server', command: 'cmd', transport: 'stdio' }, 'manual');
      discovery.addServer({ name: 'sse-server', command: 'cmd', transport: 'sse' }, 'manual');
      discovery.addServer({ name: 'default-server', command: 'cmd' }, 'manual'); // default is stdio

      const stdioServers = discovery.getServersByTransport('stdio');
      expect(stdioServers).toHaveLength(2);

      const sseServers = discovery.getServersByTransport('sse');
      expect(sseServers).toHaveLength(1);
    });
  });

  describe('filterServers', () => {
    it('should filter servers by predicate', () => {
      discovery.addServer({ name: 'server1', command: 'node' }, 'manual');
      discovery.addServer({ name: 'server2', command: 'python' }, 'manual');

      const nodeServers = discovery.filterServers(s => s.command === 'node');
      expect(nodeServers).toHaveLength(1);
      expect(nodeServers[0].name).toBe('server1');
    });
  });

  describe('hasServer', () => {
    it('should return true for existing server', () => {
      discovery.addServer({ name: 'test', command: 'cmd' }, 'manual');
      expect(discovery.hasServer('test')).toBe(true);
    });

    it('should return false for non-existing server', () => {
      expect(discovery.hasServer('unknown')).toBe(false);
    });
  });

  describe('serverCount', () => {
    it('should return correct count', () => {
      expect(discovery.serverCount).toBe(0);
      discovery.addServer({ name: 'test', command: 'cmd' }, 'manual');
      expect(discovery.serverCount).toBe(1);
    });
  });

  describe('getSummary', () => {
    it('should return discovery summary', () => {
      discovery.addServer({ name: 'test', command: 'test', transport: 'sse' }, 'manual');
      discovery.discoveredSources.push('manual');

      const summary = discovery.getSummary();
      expect(summary.totalServers).toBe(1);
      expect(summary.servers).toHaveLength(1);
      expect(summary.sources).toContain('manual');
    });
  });

  describe('discover', () => {
    it('should return discovery result', async () => {
      const result = await discovery.discover();

      expect(result).toBeDefined();
      expect(result.servers).toBeInstanceOf(Array);
      expect(result.sources).toBeInstanceOf(Array);
      expect(result.errors).toBeDefined();
    });

    it('should emit discovery:complete event', async () => {
      const callback = jest.fn();
      discovery.on('discovery:complete', callback);

      await discovery.discover();

      expect(callback).toHaveBeenCalled();
    });

    it('should respect includeGlobal option', async () => {
      const noGlobalDiscovery = new MCPDiscovery({
        projectRoot: tempDir,
        includeGlobal: false,
        includeProject: false,
        includeEnv: false,
      });

      const result = await noGlobalDiscovery.discover();
      expect(result.sources).toEqual([]);
    });

    it('should clear previous results on rediscover', async () => {
      discovery.addServer({ name: 'old', command: 'cmd' }, 'manual');
      await discovery.discover();

      // Manual additions should be cleared
      expect(discovery.servers.has('old')).toBe(false);
    });
  });

  describe('discoverEnvConfigs', () => {
    it('should parse MCP_SERVERS env variable', async () => {
      process.env.MCP_SERVERS = JSON.stringify([
        { name: 'env-server', command: 'node', args: ['server.js'] },
      ]);

      const envDiscovery = new MCPDiscovery({
        projectRoot: tempDir,
        includeGlobal: false,
        includeProject: false,
        includeEnv: true,
      });

      await envDiscovery.discover();

      expect(envDiscovery.hasServer('env-server')).toBe(true);
    });

    it('should handle invalid MCP_SERVERS JSON', async () => {
      process.env.MCP_SERVERS = 'invalid json';

      const envDiscovery = new MCPDiscovery({
        projectRoot: tempDir,
        includeGlobal: false,
        includeProject: false,
        includeEnv: true,
      });

      const result = await envDiscovery.discover();

      expect(result.errors['env:MCP_SERVERS']).toBeDefined();
    });

    it('should parse individual MCP_SERVER_* env variables', async () => {
      process.env.MCP_SERVER_TEST = JSON.stringify({ command: 'test-cmd' });

      const envDiscovery = new MCPDiscovery({
        projectRoot: tempDir,
        includeGlobal: false,
        includeProject: false,
        includeEnv: true,
      });

      await envDiscovery.discover();

      expect(envDiscovery.hasServer('test')).toBe(true);
    });

    it('should handle invalid MCP_SERVER_* JSON', async () => {
      process.env.MCP_SERVER_BAD = 'not json';

      const envDiscovery = new MCPDiscovery({
        projectRoot: tempDir,
        includeGlobal: false,
        includeProject: false,
        includeEnv: true,
      });

      const result = await envDiscovery.discover();

      expect(result.errors['env:MCP_SERVER_BAD']).toBeDefined();
    });
  });

  describe('loadConfigFile', () => {
    it('should load Claude Desktop format', async () => {
      const configPath = path.join(tempDir, 'claude_config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          mcpServers: {
            'claude-server': { command: 'node', args: ['server.js'] },
          },
        })
      );

      await discovery.loadConfigFile(configPath, 'claude');

      expect(discovery.hasServer('claude-server')).toBe(true);
      expect(discovery.discoveredSources).toContain('claude');
    });

    it('should load servers array format', async () => {
      const configPath = path.join(tempDir, 'config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          servers: [{ name: 'array-server', command: 'cmd' }],
        })
      );

      await discovery.loadConfigFile(configPath, 'project');

      expect(discovery.hasServer('array-server')).toBe(true);
    });

    it('should load direct array format', async () => {
      const configPath = path.join(tempDir, 'servers.json');
      fs.writeFileSync(configPath, JSON.stringify([{ name: 'direct-server', command: 'cmd' }]));

      await discovery.loadConfigFile(configPath, 'direct');

      expect(discovery.hasServer('direct-server')).toBe(true);
    });

    it('should handle non-existent file gracefully', async () => {
      await discovery.loadConfigFile('/non/existent/path.json', 'missing');

      expect(discovery.discoveredSources).not.toContain('missing');
    });

    it('should handle invalid JSON gracefully', async () => {
      const configPath = path.join(tempDir, 'invalid.json');
      fs.writeFileSync(configPath, 'not valid json');

      await discovery.loadConfigFile(configPath, 'invalid');

      expect(discovery.errors['invalid']).toBeDefined();
    });

    it('should emit config:loaded event', async () => {
      const callback = jest.fn();
      discovery.on('config:loaded', callback);

      const configPath = path.join(tempDir, 'test.json');
      fs.writeFileSync(configPath, JSON.stringify({ servers: [] }));

      await discovery.loadConfigFile(configPath, 'test');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'test',
          path: configPath,
        })
      );
    });

    it('should emit config:error event on failure', async () => {
      const callback = jest.fn();
      discovery.on('config:error', callback);

      const configPath = path.join(tempDir, 'bad.json');
      fs.writeFileSync(configPath, 'invalid');

      await discovery.loadConfigFile(configPath, 'bad');

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('createProjectConfig', () => {
    it('should create MCP format config', async () => {
      const testDiscovery = new MCPDiscovery({ projectRoot: tempDir });
      const servers = [{ name: 'test', command: 'cmd', args: ['-a'] }];

      const configPath = await testDiscovery.createProjectConfig(servers);

      expect(fs.existsSync(configPath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(content.version).toBe('1.0');
      expect(content.servers).toHaveLength(1);
    });

    it('should create Claude format config', async () => {
      const testDiscovery = new MCPDiscovery({ projectRoot: tempDir });
      const servers = [{ name: 'test', command: 'cmd' }];

      const configPath = await testDiscovery.createProjectConfig(servers, { format: 'claude' });

      const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(content.mcpServers).toBeDefined();
      expect(content.mcpServers.test).toBeDefined();
    });

    it('should create config at custom path', async () => {
      const testDiscovery = new MCPDiscovery({ projectRoot: tempDir });
      const customPath = path.join(tempDir, 'custom', 'mcp.json');

      const configPath = await testDiscovery.createProjectConfig([], { path: customPath });

      expect(configPath).toBe(customPath);
      expect(fs.existsSync(customPath)).toBe(true);
    });

    it('should emit config:created event', async () => {
      const testDiscovery = new MCPDiscovery({ projectRoot: tempDir });
      const callback = jest.fn();
      testDiscovery.on('config:created', callback);

      await testDiscovery.createProjectConfig([]);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('watch', () => {
    it('should return unwatch function', () => {
      const testDiscovery = new MCPDiscovery({ projectRoot: tempDir });
      const unwatch = testDiscovery.watch(jest.fn());

      expect(typeof unwatch).toBe('function');
      unwatch(); // Should not throw
    });
  });
});

describe('createMCPDiscovery', () => {
  it('should create discovery instance', () => {
    const discovery = createMCPDiscovery();
    expect(discovery).toBeInstanceOf(MCPDiscovery);
  });

  it('should pass options', () => {
    const discovery = createMCPDiscovery({
      projectRoot: '/custom',
    });
    expect(discovery.projectRoot).toBe('/custom');
  });
});
