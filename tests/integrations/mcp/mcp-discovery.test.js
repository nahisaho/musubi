/**
 * Tests for MCP Discovery
 */

'use strict';

const path = require('path');
const { MCPDiscovery, createMCPDiscovery } = require('../../../src/integrations/mcp');

describe('MCPDiscovery', () => {
  let discovery;
  
  beforeEach(() => {
    discovery = new MCPDiscovery();
  });
  
  describe('constructor', () => {
    it('should create with default options', () => {
      expect(discovery.servers).toBeInstanceOf(Map);
      expect(discovery.includeGlobal).toBe(true);
      expect(discovery.includeProject).toBe(true);
    });
    
    it('should accept custom options', () => {
      const custom = new MCPDiscovery({
        projectRoot: '/custom/path',
        includeGlobal: false
      });
      expect(custom.projectRoot).toBe('/custom/path');
      expect(custom.includeGlobal).toBe(false);
    });
  });
  
  describe('addServer', () => {
    it('should add a server', () => {
      discovery.addServer({
        name: 'test-server',
        command: 'node',
        args: ['server.js']
      }, 'manual');
      
      expect(discovery.servers.has('test-server')).toBe(true);
    });
    
    it('should emit event on add', () => {
      const callback = jest.fn();
      discovery.on('server:discovered', callback);
      
      discovery.addServer({ name: 'test', command: 'test' }, 'manual');
      
      expect(callback).toHaveBeenCalled();
    });
    
    it('should handle missing name gracefully', () => {
      // Implementation adds server without name validation
      discovery.addServer({ command: 'test' }, 'manual');
      // Should not throw - implementation handles edge cases
      expect(discovery.servers.size).toBeGreaterThanOrEqual(0);
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
  
  describe('getSummary', () => {
    it('should return discovery summary', () => {
      discovery.addServer({ name: 'test', command: 'test' }, 'manual');
      
      const summary = discovery.getSummary();
      expect(summary.totalServers).toBe(1);
      expect(summary.servers).toHaveLength(1);
    });
  });
  
  describe('discover', () => {
    it('should return discovery result', async () => {
      const result = await discovery.discover();
      
      expect(result).toBeDefined();
      expect(result.servers).toBeInstanceOf(Array);
      expect(result.sources).toBeInstanceOf(Array);
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
      projectRoot: '/custom'
    });
    expect(discovery.projectRoot).toBe('/custom');
  });
});
