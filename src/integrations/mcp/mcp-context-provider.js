/**
 * MUSUBI MCP Context Provider
 * 
 * Provides context information from MCP resources to the Agent Loop.
 * Manages resources, prompts, and context from MCP servers.
 * 
 * @module integrations/mcp/mcp-context-provider
 */

'use strict';

const EventEmitter = require('events');

/**
 * @typedef {Object} MCPResource
 * @property {string} uri - Resource URI
 * @property {string} name - Resource name
 * @property {string} [description] - Resource description
 * @property {string} [mimeType] - MIME type
 * @property {string} serverName - Source server
 */

/**
 * @typedef {Object} MCPPrompt
 * @property {string} name - Prompt name
 * @property {string} [description] - Prompt description
 * @property {Object[]} [arguments] - Prompt arguments
 * @property {string} serverName - Source server
 */

/**
 * @typedef {Object} ContextData
 * @property {string} type - Context type (resource, prompt, sampling)
 * @property {string} source - Source identifier
 * @property {*} content - Context content
 * @property {Object} metadata - Additional metadata
 */

/**
 * MCP Context Provider for managing context from MCP servers
 */
class MCPContextProvider extends EventEmitter {
  /**
   * @param {Object} options
   * @param {Object} [options.connector] - MCP connector instance
   * @param {number} [options.cacheTTL=300000] - Cache TTL in ms (5 min)
   * @param {number} [options.maxCacheSize=100] - Max cached items
   */
  constructor(options = {}) {
    super();
    
    this.connector = options.connector || null;
    this.cacheTTL = options.cacheTTL ?? 300000;
    this.maxCacheSize = options.maxCacheSize ?? 100;
    
    /** @type {Map<string, MCPResource[]>} */
    this.resources = new Map();
    
    /** @type {Map<string, MCPPrompt[]>} */
    this.prompts = new Map();
    
    /** @type {Map<string, { data: *, timestamp: number }>} */
    this.cache = new Map();
    
    /** @type {Map<string, Function>} */
    this.subscriptions = new Map();
  }
  
  /**
   * Set the MCP connector
   * @param {Object} connector
   */
  setConnector(connector) {
    this.connector = connector;
  }
  
  /**
   * Discover resources from an MCP server
   * @param {string} serverName
   * @returns {Promise<MCPResource[]>}
   */
  async discoverResources(serverName) {
    if (!this.connector) {
      throw new Error('MCP connector not set');
    }
    
    try {
      const response = await this.connector.listResources(serverName);
      const resources = (response.resources || []).map(r => ({
        ...r,
        serverName
      }));
      
      this.resources.set(serverName, resources);
      
      this.emit('resources:discovered', {
        serverName,
        count: resources.length
      });
      
      return resources;
      
    } catch (error) {
      this.emit('resources:error', { serverName, error });
      throw error;
    }
  }
  
  /**
   * Discover prompts from an MCP server
   * @param {string} serverName
   * @returns {Promise<MCPPrompt[]>}
   */
  async discoverPrompts(serverName) {
    if (!this.connector) {
      throw new Error('MCP connector not set');
    }
    
    try {
      const response = await this.connector.listPrompts(serverName);
      const prompts = (response.prompts || []).map(p => ({
        ...p,
        serverName
      }));
      
      this.prompts.set(serverName, prompts);
      
      this.emit('prompts:discovered', {
        serverName,
        count: prompts.length
      });
      
      return prompts;
      
    } catch (error) {
      this.emit('prompts:error', { serverName, error });
      throw error;
    }
  }
  
  /**
   * Read a resource
   * @param {string} serverName
   * @param {string} uri
   * @param {Object} [options]
   * @param {boolean} [options.useCache=true]
   * @returns {Promise<ContextData>}
   */
  async readResource(serverName, uri, options = {}) {
    const cacheKey = `resource:${serverName}:${uri}`;
    const useCache = options.useCache ?? true;
    
    // Check cache
    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    if (!this.connector) {
      throw new Error('MCP connector not set');
    }
    
    const response = await this.connector.readResource(serverName, uri);
    
    const contextData = {
      type: 'resource',
      source: `${serverName}:${uri}`,
      content: response.contents,
      metadata: {
        uri,
        serverName,
        mimeType: response.mimeType
      }
    };
    
    this.addToCache(cacheKey, contextData);
    this.emit('resource:read', { serverName, uri });
    
    return contextData;
  }
  
  /**
   * Get a prompt with arguments
   * @param {string} serverName
   * @param {string} promptName
   * @param {Object} [args]
   * @returns {Promise<ContextData>}
   */
  async getPrompt(serverName, promptName, args = {}) {
    if (!this.connector) {
      throw new Error('MCP connector not set');
    }
    
    const response = await this.connector.getPrompt(serverName, promptName, args);
    
    const contextData = {
      type: 'prompt',
      source: `${serverName}:${promptName}`,
      content: response.messages,
      metadata: {
        promptName,
        serverName,
        arguments: args,
        description: response.description
      }
    };
    
    this.emit('prompt:retrieved', { serverName, promptName });
    
    return contextData;
  }
  
  /**
   * Subscribe to resource updates
   * @param {string} serverName
   * @param {string} uri
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  subscribeToResource(serverName, uri, callback) {
    const key = `${serverName}:${uri}`;
    
    // Store callback
    this.subscriptions.set(key, callback);
    
    // Setup MCP subscription if connector supports it
    if (this.connector && this.connector.subscribe) {
      this.connector.subscribe(serverName, uri, (update) => {
        // Invalidate cache
        this.cache.delete(`resource:${serverName}:${uri}`);
        
        // Call callback
        callback({
          type: 'resource:updated',
          source: key,
          content: update
        });
      });
    }
    
    this.emit('subscription:created', { serverName, uri });
    
    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(key);
      if (this.connector && this.connector.unsubscribe) {
        this.connector.unsubscribe(serverName, uri);
      }
      this.emit('subscription:removed', { serverName, uri });
    };
  }
  
  /**
   * Get all resources
   * @returns {MCPResource[]}
   */
  getAllResources() {
    const all = [];
    for (const resources of this.resources.values()) {
      all.push(...resources);
    }
    return all;
  }
  
  /**
   * Get resources by server
   * @param {string} serverName
   * @returns {MCPResource[]}
   */
  getResourcesByServer(serverName) {
    return this.resources.get(serverName) || [];
  }
  
  /**
   * Get all prompts
   * @returns {MCPPrompt[]}
   */
  getAllPrompts() {
    const all = [];
    for (const prompts of this.prompts.values()) {
      all.push(...prompts);
    }
    return all;
  }
  
  /**
   * Get prompts by server
   * @param {string} serverName
   * @returns {MCPPrompt[]}
   */
  getPromptsByServer(serverName) {
    return this.prompts.get(serverName) || [];
  }
  
  /**
   * Build context for Agent Loop
   * @param {Object} options
   * @param {string[]} [options.resources] - Resource URIs to include
   * @param {string[]} [options.prompts] - Prompt names to include
   * @param {Object} [options.promptArgs] - Arguments for prompts
   * @returns {Promise<Object>}
   */
  async buildContext(options = {}) {
    const context = {
      resources: [],
      prompts: [],
      metadata: {
        builtAt: new Date().toISOString(),
        sources: []
      }
    };
    
    // Gather resources
    if (options.resources) {
      for (const resourceSpec of options.resources) {
        const [serverName, uri] = this.parseResourceSpec(resourceSpec);
        try {
          const data = await this.readResource(serverName, uri);
          context.resources.push(data);
          context.metadata.sources.push(data.source);
        } catch (error) {
          this.emit('context:resource:error', { resourceSpec, error });
        }
      }
    }
    
    // Gather prompts
    if (options.prompts) {
      for (const promptSpec of options.prompts) {
        const [serverName, promptName] = this.parseResourceSpec(promptSpec);
        const args = options.promptArgs?.[promptSpec] || {};
        try {
          const data = await this.getPrompt(serverName, promptName, args);
          context.prompts.push(data);
          context.metadata.sources.push(data.source);
        } catch (error) {
          this.emit('context:prompt:error', { promptSpec, error });
        }
      }
    }
    
    this.emit('context:built', {
      resourceCount: context.resources.length,
      promptCount: context.prompts.length
    });
    
    return context;
  }
  
  /**
   * Parse resource specification (serverName:uri or serverName/name)
   * @param {string} spec
   * @returns {[string, string]}
   */
  parseResourceSpec(spec) {
    if (spec.includes(':')) {
      const [serverName, ...rest] = spec.split(':');
      return [serverName, rest.join(':')];
    } else if (spec.includes('/')) {
      const [serverName, ...rest] = spec.split('/');
      return [serverName, rest.join('/')];
    }
    return [spec, ''];
  }
  
  /**
   * Add item to cache
   * @param {string} key
   * @param {*} data
   */
  addToCache(key, data) {
    // Evict old entries if at capacity
    if (this.cache.size >= this.maxCacheSize) {
      const oldest = this.findOldestCacheEntry();
      if (oldest) {
        this.cache.delete(oldest);
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  /**
   * Get item from cache
   * @param {string} key
   * @returns {*|null}
   */
  getFromCache(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check TTL
    if (Date.now() - entry.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  /**
   * Find oldest cache entry
   * @returns {string|null}
   */
  findOldestCacheEntry() {
    let oldest = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldest = key;
      }
    }
    
    return oldest;
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.emit('cache:cleared');
  }
  
  /**
   * Get provider statistics
   * @returns {Object}
   */
  getStats() {
    return {
      resources: {
        total: this.getAllResources().length,
        byServer: Object.fromEntries(
          Array.from(this.resources.entries()).map(([s, r]) => [s, r.length])
        )
      },
      prompts: {
        total: this.getAllPrompts().length,
        byServer: Object.fromEntries(
          Array.from(this.prompts.entries()).map(([s, p]) => [s, p.length])
        )
      },
      cache: {
        size: this.cache.size,
        maxSize: this.maxCacheSize
      },
      subscriptions: this.subscriptions.size
    };
  }
  
  /**
   * Clear all data
   */
  clear() {
    this.resources.clear();
    this.prompts.clear();
    this.cache.clear();
    this.subscriptions.clear();
    this.emit('provider:cleared');
  }
}

module.exports = {
  MCPContextProvider
};
