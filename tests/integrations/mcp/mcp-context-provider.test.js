/**
 * Tests for MCP Context Provider
 */

'use strict';

const { MCPContextProvider } = require('../../../src/integrations/mcp/mcp-context-provider');

describe('MCPContextProvider', () => {
  let provider;
  let mockConnector;
  
  beforeEach(() => {
    provider = new MCPContextProvider();
    
    mockConnector = {
      listResources: jest.fn().mockResolvedValue({
        resources: [
          { uri: 'file:///project/README.md', name: 'README.md', mimeType: 'text/markdown' },
          { uri: 'file:///project/src/index.js', name: 'index.js', mimeType: 'text/javascript' }
        ]
      }),
      listPrompts: jest.fn().mockResolvedValue({
        prompts: [
          { name: 'code-review', description: 'Review code' },
          { name: 'explain', description: 'Explain code' }
        ]
      }),
      readResource: jest.fn().mockResolvedValue({
        contents: '# README\nThis is a test project.',
        mimeType: 'text/markdown'
      }),
      getPrompt: jest.fn().mockResolvedValue({
        messages: [
          { role: 'user', content: 'Please review this code.' }
        ],
        description: 'Code review prompt'
      })
    };
  });
  
  describe('constructor', () => {
    it('should create with default options', () => {
      expect(provider.resources).toBeInstanceOf(Map);
      expect(provider.prompts).toBeInstanceOf(Map);
      expect(provider.cache).toBeInstanceOf(Map);
    });
    
    it('should accept custom options', () => {
      const custom = new MCPContextProvider({
        cacheTTL: 60000,
        maxCacheSize: 50
      });
      expect(custom.cacheTTL).toBe(60000);
      expect(custom.maxCacheSize).toBe(50);
    });
  });
  
  describe('setConnector', () => {
    it('should set the connector', () => {
      provider.setConnector(mockConnector);
      expect(provider.connector).toBe(mockConnector);
    });
  });
  
  describe('discoverResources', () => {
    beforeEach(() => {
      provider.setConnector(mockConnector);
    });
    
    it('should discover resources from server', async () => {
      const resources = await provider.discoverResources('test-server');
      
      expect(mockConnector.listResources).toHaveBeenCalledWith('test-server');
      expect(resources).toHaveLength(2);
      expect(resources[0].serverName).toBe('test-server');
    });
    
    it('should emit event on discovery', async () => {
      const callback = jest.fn();
      provider.on('resources:discovered', callback);
      
      await provider.discoverResources('test-server');
      
      expect(callback).toHaveBeenCalledWith({
        serverName: 'test-server',
        count: 2
      });
    });
    
    it('should throw error without connector', async () => {
      const noConnector = new MCPContextProvider();
      await expect(noConnector.discoverResources('test'))
        .rejects.toThrow('MCP connector not set');
    });
  });
  
  describe('discoverPrompts', () => {
    beforeEach(() => {
      provider.setConnector(mockConnector);
    });
    
    it('should discover prompts from server', async () => {
      const prompts = await provider.discoverPrompts('test-server');
      
      expect(mockConnector.listPrompts).toHaveBeenCalledWith('test-server');
      expect(prompts).toHaveLength(2);
      expect(prompts[0].serverName).toBe('test-server');
    });
    
    it('should emit event on discovery', async () => {
      const callback = jest.fn();
      provider.on('prompts:discovered', callback);
      
      await provider.discoverPrompts('test-server');
      
      expect(callback).toHaveBeenCalledWith({
        serverName: 'test-server',
        count: 2
      });
    });
  });
  
  describe('readResource', () => {
    beforeEach(() => {
      provider.setConnector(mockConnector);
    });
    
    it('should read a resource', async () => {
      const result = await provider.readResource('test-server', 'file:///test.md');
      
      expect(result.type).toBe('resource');
      expect(result.content).toBe('# README\nThis is a test project.');
      expect(result.metadata.serverName).toBe('test-server');
    });
    
    it('should cache resource', async () => {
      await provider.readResource('test-server', 'file:///test.md');
      await provider.readResource('test-server', 'file:///test.md');
      
      // Should only call connector once
      expect(mockConnector.readResource).toHaveBeenCalledTimes(1);
    });
    
    it('should skip cache when requested', async () => {
      await provider.readResource('test-server', 'file:///test.md');
      await provider.readResource('test-server', 'file:///test.md', { useCache: false });
      
      expect(mockConnector.readResource).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('getPrompt', () => {
    beforeEach(() => {
      provider.setConnector(mockConnector);
    });
    
    it('should get a prompt', async () => {
      const result = await provider.getPrompt('test-server', 'code-review');
      
      expect(result.type).toBe('prompt');
      expect(result.content).toBeInstanceOf(Array);
      expect(result.metadata.promptName).toBe('code-review');
    });
    
    it('should pass arguments to prompt', async () => {
      await provider.getPrompt('test-server', 'code-review', { language: 'javascript' });
      
      expect(mockConnector.getPrompt).toHaveBeenCalledWith(
        'test-server',
        'code-review',
        { language: 'javascript' }
      );
    });
  });
  
  describe('subscribeToResource', () => {
    it('should create subscription', () => {
      const callback = jest.fn();
      const unsubscribe = provider.subscribeToResource('server', 'file:///test', callback);
      
      expect(typeof unsubscribe).toBe('function');
      expect(provider.subscriptions.has('server:file:///test')).toBe(true);
    });
    
    it('should unsubscribe', () => {
      const callback = jest.fn();
      const unsubscribe = provider.subscribeToResource('server', 'file:///test', callback);
      
      unsubscribe();
      
      expect(provider.subscriptions.has('server:file:///test')).toBe(false);
    });
  });
  
  describe('getAllResources', () => {
    it('should return all resources', async () => {
      provider.setConnector(mockConnector);
      await provider.discoverResources('server1');
      await provider.discoverResources('server2');
      
      const all = provider.getAllResources();
      expect(all).toHaveLength(4); // 2 resources per server
    });
  });
  
  describe('getResourcesByServer', () => {
    it('should return resources for specific server', async () => {
      provider.setConnector(mockConnector);
      await provider.discoverResources('server1');
      
      const resources = provider.getResourcesByServer('server1');
      expect(resources).toHaveLength(2);
    });
    
    it('should return empty array for unknown server', () => {
      expect(provider.getResourcesByServer('unknown')).toEqual([]);
    });
  });
  
  describe('getAllPrompts', () => {
    it('should return all prompts', async () => {
      provider.setConnector(mockConnector);
      await provider.discoverPrompts('server1');
      
      const all = provider.getAllPrompts();
      expect(all).toHaveLength(2);
    });
  });
  
  describe('buildContext', () => {
    beforeEach(() => {
      provider.setConnector(mockConnector);
    });
    
    it('should build context with resources', async () => {
      const context = await provider.buildContext({
        resources: ['test-server:file:///test.md']
      });
      
      expect(context.resources).toHaveLength(1);
      expect(context.metadata.sources).toContain('test-server:file:///test.md');
    });
    
    it('should build context with prompts', async () => {
      const context = await provider.buildContext({
        prompts: ['test-server:code-review']
      });
      
      expect(context.prompts).toHaveLength(1);
    });
    
    it('should handle errors gracefully', async () => {
      mockConnector.readResource.mockRejectedValueOnce(new Error('Not found'));
      
      const callback = jest.fn();
      provider.on('context:resource:error', callback);
      
      const context = await provider.buildContext({
        resources: ['test-server:file:///missing.md']
      });
      
      expect(context.resources).toHaveLength(0);
      expect(callback).toHaveBeenCalled();
    });
  });
  
  describe('parseResourceSpec', () => {
    it('should parse colon-separated spec', () => {
      const [server, uri] = provider.parseResourceSpec('server:file:///path');
      expect(server).toBe('server');
      expect(uri).toBe('file:///path');
    });
    
    it('should parse slash-separated spec', () => {
      const [server, name] = provider.parseResourceSpec('server/prompt-name');
      expect(server).toBe('server');
      expect(name).toBe('prompt-name');
    });
  });
  
  describe('cache management', () => {
    it('should add to cache', () => {
      provider.addToCache('key', { data: 'value' });
      expect(provider.cache.has('key')).toBe(true);
    });
    
    it('should get from cache', () => {
      provider.addToCache('key', { data: 'value' });
      const result = provider.getFromCache('key');
      expect(result).toEqual({ data: 'value' });
    });
    
    it('should return null for expired cache', async () => {
      provider.cacheTTL = 1; // 1ms expiry
      provider.addToCache('key', { data: 'value' });
      // Wait for cache to expire
      await new Promise(r => setTimeout(r, 5));
      const result = provider.getFromCache('key');
      expect(result).toBeNull();
    });
    
    it('should evict oldest entry when at capacity', () => {
      provider.maxCacheSize = 2;
      provider.addToCache('key1', 'value1');
      provider.addToCache('key2', 'value2');
      provider.addToCache('key3', 'value3');
      
      expect(provider.cache.size).toBe(2);
    });
    
    it('should clear cache', () => {
      provider.addToCache('key', 'value');
      provider.clearCache();
      expect(provider.cache.size).toBe(0);
    });
  });
  
  describe('getStats', () => {
    it('should return provider statistics', async () => {
      provider.setConnector(mockConnector);
      await provider.discoverResources('server1');
      await provider.discoverPrompts('server1');
      
      const stats = provider.getStats();
      
      expect(stats.resources.total).toBe(2);
      expect(stats.prompts.total).toBe(2);
      expect(stats.cache.size).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('clear', () => {
    it('should clear all data', async () => {
      provider.setConnector(mockConnector);
      await provider.discoverResources('server1');
      await provider.discoverPrompts('server1');
      provider.addToCache('key', 'value');
      
      provider.clear();
      
      expect(provider.resources.size).toBe(0);
      expect(provider.prompts.size).toBe(0);
      expect(provider.cache.size).toBe(0);
    });
  });
});
