/**
 * @fileoverview Tests for Tool Discovery Service
 */

'use strict';

const {
  ToolDiscovery,
  DiscoveredTool,
  ToolCategory,
  CapabilityScore,
  CATEGORY_KEYWORDS
} = require('../../src/integrations/tool-discovery');

describe('ToolDiscovery', () => {
  describe('DiscoveredTool', () => {
    it('should create discovered tool with metadata', () => {
      const tool = new DiscoveredTool({
        name: 'read_file',
        description: 'Read file contents',
        inputSchema: {},
        server: 'filesystem'
      }, {
        category: ToolCategory.FILE_SYSTEM,
        tags: ['file', 'read']
      });

      expect(tool.name).toBe('read_file');
      expect(tool.category).toBe(ToolCategory.FILE_SYSTEM);
      expect(tool.tags).toContain('file');
      expect(tool.usageCount).toBe(0);
    });

    it('should record usage statistics', () => {
      const tool = new DiscoveredTool({ name: 'test_tool' });

      tool.recordUsage(100, true);
      tool.recordUsage(200, true);
      tool.recordUsage(150, false);

      expect(tool.usageCount).toBe(3);
      expect(tool.averageLatency).toBe(150);
      expect(tool.errorRate).toBeCloseTo(1/3, 2);
      expect(tool.lastUsed).toBeInstanceOf(Date);
    });

    it('should calculate reliability score', () => {
      const tool = new DiscoveredTool({ name: 'test_tool' });

      // Unused tool has neutral score
      expect(tool.getReliabilityScore()).toBe(0.5);

      // All successful
      tool.recordUsage(100, true);
      tool.recordUsage(100, true);
      expect(tool.getReliabilityScore()).toBe(1.0);

      // One failure
      tool.recordUsage(100, false);
      expect(tool.getReliabilityScore()).toBeCloseTo(2/3, 2);
    });

    it('should convert to JSON', () => {
      const tool = new DiscoveredTool({
        name: 'test_tool',
        description: 'Test',
        server: 'test-server'
      }, {
        category: ToolCategory.UTILITY,
        tags: ['test']
      });

      const json = tool.toJSON();

      expect(json.name).toBe('test_tool');
      expect(json.category).toBe(ToolCategory.UTILITY);
      expect(json.server).toBe('test-server');
      expect(json.reliability).toBeDefined();
    });
  });

  describe('ToolDiscovery Service', () => {
    let discovery;

    beforeEach(() => {
      discovery = new ToolDiscovery();
    });

    afterEach(() => {
      discovery.stopAutoRefresh();
      discovery.clear();
    });

    describe('_detectCategory', () => {
      it('should detect file system category', () => {
        const category = discovery._detectCategory({
          name: 'read_file',
          description: 'Read file contents from path'
        });
        expect(category).toBe(ToolCategory.FILE_SYSTEM);
      });

      it('should detect code analysis category', () => {
        const category = discovery._detectCategory({
          name: 'analyze_code',
          description: 'Parse and analyze source code'
        });
        expect(category).toBe(ToolCategory.CODE_ANALYSIS);
      });

      it('should detect search category', () => {
        const category = discovery._detectCategory({
          name: 'grep_search',
          description: 'Search for patterns in files'
        });
        expect(category).toBe(ToolCategory.SEARCH);
      });

      it('should return unknown for unrecognized tools', () => {
        const category = discovery._detectCategory({
          name: 'xyz',
          description: 'Something unusual'
        });
        expect(category).toBe(ToolCategory.UNKNOWN);
      });
    });

    describe('_extractTags', () => {
      it('should extract tags from tool name', () => {
        const tags = discovery._extractTags({
          name: 'file-system-read',
          description: ''
        });
        expect(tags).toContain('file');
        expect(tags).toContain('system');
        expect(tags).toContain('read');
      });

      it('should extract action verbs', () => {
        const tags = discovery._extractTags({
          name: 'tool',
          description: 'Create and update files'
        });
        expect(tags).toContain('create');
        expect(tags).toContain('update');
      });
    });

    describe('_analyzeCapabilities', () => {
      it('should detect file operations', () => {
        const capabilities = discovery._analyzeCapabilities({
          name: 'read_file',
          inputSchema: {
            properties: {
              filePath: { type: 'string' }
            }
          }
        });
        expect(capabilities).toContain('file-operations');
      });

      it('should detect read capabilities', () => {
        const capabilities = discovery._analyzeCapabilities({
          name: 'list_files',
          inputSchema: {}
        });
        expect(capabilities).toContain('read');
      });

      it('should detect write capabilities', () => {
        const capabilities = discovery._analyzeCapabilities({
          name: 'create_document',
          inputSchema: {}
        });
        expect(capabilities).toContain('write');
      });

      it('should detect network capabilities', () => {
        const capabilities = discovery._analyzeCapabilities({
          name: 'tool',
          inputSchema: {
            properties: {
              url: { type: 'string' }
            }
          }
        });
        expect(capabilities).toContain('network');
      });
    });

    describe('_processTool', () => {
      it('should process and index tool', () => {
        const mockTool = {
          name: 'test_read_file',
          description: 'Read a file',
          inputSchema: {},
          server: 'test-server'
        };

        const discovered = discovery._processTool(mockTool);

        expect(discovery.tools.has('test_read_file')).toBe(true);
        expect(discovered.category).toBe(ToolCategory.FILE_SYSTEM);
      });

      it('should index by category and server', () => {
        discovery._processTool({
          name: 'tool1',
          description: 'Read file',
          server: 'server1'
        });
        discovery._processTool({
          name: 'tool2',
          description: 'Write file',
          server: 'server1'
        });

        expect(discovery.toolsByCategory.get(ToolCategory.FILE_SYSTEM).size).toBe(2);
        expect(discovery.toolsByServer.get('server1').size).toBe(2);
      });
    });

    describe('discoverFromConnector', () => {
      it('should discover tools from mock connector', async () => {
        const mockConnector = {
          getAllTools: () => [
            { name: 'tool1', description: 'File read', server: 's1' },
            { name: 'tool2', description: 'Search files', server: 's2' }
          ]
        };

        const discovered = await discovery.discoverFromConnector(mockConnector);

        expect(discovered).toHaveLength(2);
        expect(discovery.tools.size).toBe(2);
      });

      it('should emit discovered event', async () => {
        const onDiscovered = jest.fn();
        discovery.on('discovered', onDiscovered);

        const mockConnector = {
          getAllTools: () => [{ name: 'tool1', description: 'Test' }]
        };

        await discovery.discoverFromConnector(mockConnector);

        expect(onDiscovered).toHaveBeenCalled();
      });
    });

    describe('findTools', () => {
      beforeEach(() => {
        discovery._processTool({ name: 'read_file', description: 'Read file', server: 's1' });
        discovery._processTool({ name: 'write_file', description: 'Write file', server: 's1' });
        discovery._processTool({ name: 'search_code', description: 'Search code', server: 's2' });
      });

      it('should find all tools with no criteria', () => {
        const results = discovery.findTools();
        expect(results).toHaveLength(3);
      });

      it('should filter by category', () => {
        const results = discovery.findTools({ category: ToolCategory.FILE_SYSTEM });
        expect(results.length).toBeGreaterThan(0);
        expect(results.every(t => t.category === ToolCategory.FILE_SYSTEM)).toBe(true);
      });

      it('should filter by server', () => {
        const results = discovery.findTools({ server: 's1' });
        expect(results).toHaveLength(2);
      });

      it('should filter by tags', () => {
        const results = discovery.findTools({ tags: ['file'] });
        expect(results.length).toBeGreaterThan(0);
      });

      it('should filter by name pattern', () => {
        const results = discovery.findTools({ namePattern: 'read' });
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('read_file');
      });

      it('should limit results', () => {
        const results = discovery.findTools({ limit: 1 });
        expect(results).toHaveLength(1);
      });

      it('should sort by usage', () => {
        discovery.tools.get('read_file').recordUsage(100, true);
        discovery.tools.get('read_file').recordUsage(100, true);
        discovery.tools.get('write_file').recordUsage(100, true);

        const results = discovery.findTools({ sortBy: 'usage' });
        expect(results[0].name).toBe('read_file');
      });
    });

    describe('matchToolsToTask', () => {
      beforeEach(() => {
        discovery._processTool({ name: 'read_file', description: 'Read file contents' });
        discovery._processTool({ name: 'search_code', description: 'Search for code patterns' });
        discovery._processTool({ name: 'run_tests', description: 'Execute test suite' });
      });

      it('should match tools to task description', () => {
        const matches = discovery.matchToolsToTask('I need to read a file');

        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0].tool.name).toBe('read_file');
        expect(matches[0].score).toBeGreaterThan(0);
      });

      it('should respect minimum score', () => {
        const matches = discovery.matchToolsToTask('completely unrelated task', {
          minScore: 0.5
        });

        expect(matches).toHaveLength(0);
      });

      it('should limit results', () => {
        const matches = discovery.matchToolsToTask('file operations', {
          limit: 1
        });

        expect(matches.length).toBeLessThanOrEqual(1);
      });
    });

    describe('mapSkillsToTools', () => {
      beforeEach(() => {
        discovery._processTool({ name: 'read_file', description: 'Read file' });
        discovery._processTool({ name: 'write_file', description: 'Write file' });
        discovery._processTool({ name: 'run_tests', description: 'Run tests' });
      });

      it('should map skills to tools by allowed-tools', () => {
        const skills = [
          { name: 'requirements', allowedTools: ['read_file', 'write_file'] }
        ];

        const mappings = discovery.mapSkillsToTools(skills);

        expect(mappings.get('requirements')).toContain('read_file');
        expect(mappings.get('requirements')).toContain('write_file');
      });

      it('should map skills by description', () => {
        const skills = [
          { name: 'tester', description: 'Run and validate tests' }
        ];

        const mappings = discovery.mapSkillsToTools(skills);

        expect(mappings.get('tester').length).toBeGreaterThan(0);
      });
    });

    describe('getToolsForSkill', () => {
      beforeEach(() => {
        discovery._processTool({ name: 'read_file', description: 'Read file' });
        discovery.mapSkillsToTools([
          { name: 'reader', allowedTools: ['read_file'] }
        ]);
      });

      it('should get tools for mapped skill', () => {
        const tools = discovery.getToolsForSkill('reader');
        expect(tools).toHaveLength(1);
        expect(tools[0].name).toBe('read_file');
      });

      it('should return empty for unknown skill', () => {
        const tools = discovery.getToolsForSkill('unknown');
        expect(tools).toHaveLength(0);
      });
    });

    describe('recordToolUsage', () => {
      it('should record usage for existing tool', () => {
        discovery._processTool({ name: 'test_tool', description: 'Test' });

        discovery.recordToolUsage('test_tool', 150, true);

        const tool = discovery.tools.get('test_tool');
        expect(tool.usageCount).toBe(1);
        expect(tool.averageLatency).toBe(150);
      });

      it('should emit toolUsed event', () => {
        discovery._processTool({ name: 'test_tool', description: 'Test' });
        const onUsed = jest.fn();
        discovery.on('toolUsed', onUsed);

        discovery.recordToolUsage('test_tool', 100, true);

        expect(onUsed).toHaveBeenCalledWith({
          toolName: 'test_tool',
          latency: 100,
          success: true
        });
      });
    });

    describe('getAnalytics', () => {
      beforeEach(() => {
        discovery._processTool({ name: 'tool1', description: 'File read', server: 's1' });
        discovery._processTool({ name: 'tool2', description: 'Code search', server: 's2' });
        discovery.tools.get('tool1').recordUsage(100, true);
        discovery.tools.get('tool1').recordUsage(100, true);
        discovery.tools.get('tool2').recordUsage(100, false);
      });

      it('should return analytics summary', () => {
        const analytics = discovery.getAnalytics();

        expect(analytics.totalTools).toBe(2);
        expect(analytics.byServer).toBeDefined();
        expect(analytics.topUsed.length).toBeGreaterThan(0);
        expect(analytics.totalUsage).toBe(3);
      });

      it('should identify least reliable tools', () => {
        const analytics = discovery.getAnalytics();

        expect(analytics.leastReliable.length).toBeGreaterThan(0);
        expect(analytics.leastReliable[0].reliability).toBeLessThan(1);
      });
    });

    describe('exportCatalog', () => {
      it('should export tool catalog', () => {
        discovery._processTool({ name: 'tool1', description: 'Test' });

        const catalog = discovery.exportCatalog();

        expect(catalog.exportedAt).toBeDefined();
        expect(catalog.tools).toHaveLength(1);
        expect(catalog.categories).toContain(ToolCategory.FILE_SYSTEM);
        expect(catalog.analytics).toBeDefined();
      });
    });

    describe('clear', () => {
      it('should clear all data', () => {
        discovery._processTool({ name: 'tool1', description: 'Test' });
        discovery.clear();

        expect(discovery.tools.size).toBe(0);
        expect(discovery.toolsByCategory.size).toBe(0);
        expect(discovery.toolsByServer.size).toBe(0);
      });
    });
  });

  describe('Constants', () => {
    it('should have all tool categories', () => {
      expect(ToolCategory.FILE_SYSTEM).toBe('file-system');
      expect(ToolCategory.CODE_ANALYSIS).toBe('code-analysis');
      expect(ToolCategory.SEARCH).toBe('search');
      expect(ToolCategory.UNKNOWN).toBe('unknown');
    });

    it('should have capability scores', () => {
      expect(CapabilityScore.EXACT_MATCH).toBe(1.0);
      expect(CapabilityScore.NO_MATCH).toBe(0.0);
    });

    it('should have category keywords', () => {
      expect(CATEGORY_KEYWORDS[ToolCategory.FILE_SYSTEM]).toContain('file');
      expect(CATEGORY_KEYWORDS[ToolCategory.SEARCH]).toContain('search');
    });
  });
});
