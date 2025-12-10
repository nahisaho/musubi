/**
 * Tests for Hierarchical Reporter
 *
 * Verifies:
 * - Hierarchy building
 * - Hotspot identification
 * - Summary generation
 * - Drill-down functionality
 */

const { HierarchicalReporter } = require('../../src/reporters/hierarchical-reporter');

describe('HierarchicalReporter', () => {
  let reporter;

  beforeEach(() => {
    reporter = new HierarchicalReporter();
  });

  describe('Hierarchy Building', () => {
    test('should build hierarchy from file list', () => {
      const files = [
        { path: 'src/analyzers/test.js', lines: 100, complexity: 10 },
        { path: 'src/analyzers/other.js', lines: 50, complexity: 5 },
        { path: 'src/generators/gen.js', lines: 200, complexity: 20 },
        { path: 'tests/test.js', lines: 75, complexity: 8 },
      ];

      const hierarchy = reporter.buildHierarchy(files, 2);

      expect(hierarchy.children.src).toBeDefined();
      expect(hierarchy.children.tests).toBeDefined();
      expect(hierarchy.children.src.stats.files).toBe(3);
      expect(hierarchy.children.tests.stats.files).toBe(1);
    });

    test('should aggregate statistics correctly', () => {
      const files = [
        { path: 'src/a.js', lines: 100, complexity: 10, issues: [] },
        { path: 'src/b.js', lines: 200, complexity: 20, issues: [{ type: 'test' }] },
      ];

      const hierarchy = reporter.buildHierarchy(files, 1);

      expect(hierarchy.children.src.stats.lines).toBe(300);
      expect(hierarchy.children.src.stats.complexity).toBe(30);
      expect(hierarchy.children.src.stats.issues).toBe(1);
    });

    test('should calculate averages', () => {
      const files = [
        { path: 'src/a.js', lines: 100, complexity: 10 },
        { path: 'src/b.js', lines: 100, complexity: 20 },
      ];

      const hierarchy = reporter.buildHierarchy(files, 1);

      expect(hierarchy.children.src.stats.averageComplexity).toBe(15);
    });
  });

  describe('Hotspot Identification', () => {
    test('should identify high-complexity hotspots', () => {
      const analysis = {
        files: [
          { path: 'src/complex.js', complexity: 50, issues: [] },
          { path: 'src/simple.js', complexity: 5, issues: [] },
        ],
        results: { giantFunctions: [] },
      };

      const hotspots = reporter.identifyHotspots(analysis, 25);

      // May include directory-level hotspot as well
      expect(hotspots.length).toBeGreaterThanOrEqual(1);
      expect(hotspots.some(h => h.path === 'src/complex.js')).toBe(true);
      expect(hotspots.some(h => h.reason === 'high-complexity')).toBe(true);
    });

    test('should identify files with many issues', () => {
      const analysis = {
        files: [
          { path: 'src/buggy.js', complexity: 5, issues: [1, 2, 3, 4, 5] },
          { path: 'src/clean.js', complexity: 5, issues: [] },
        ],
        results: { giantFunctions: [] },
      };

      const hotspots = reporter.identifyHotspots(analysis);

      expect(hotspots.some(h => h.path === 'src/buggy.js')).toBe(true);
    });

    test('should identify giant functions', () => {
      const analysis = {
        files: [],
        results: {
          giantFunctions: [{ file: 'src/big.js', name: 'giantFunc', lines: 2000 }],
        },
      };

      const hotspots = reporter.identifyHotspots(analysis);

      expect(hotspots.some(h => h.type === 'function')).toBe(true);
      expect(hotspots.some(h => h.path.includes('giantFunc'))).toBe(true);
    });
  });

  describe('Summary Generation', () => {
    test('should generate correct summary', () => {
      const analysis = {
        files: [
          {
            path: 'a.js',
            lines: 100,
            complexity: 10,
            maintainability: 80,
            language: 'javascript',
            issues: [],
          },
          {
            path: 'b.py',
            lines: 200,
            complexity: 20,
            maintainability: 60,
            language: 'python',
            issues: [1],
          },
        ],
      };

      const summary = reporter.generateSummary(analysis);

      expect(summary.totalFiles).toBe(2);
      expect(summary.totalLines).toBe(300);
      expect(summary.averageComplexity).toBe(15);
      expect(summary.averageMaintainability).toBe(70);
      expect(summary.languageDistribution.javascript).toBe(1);
      expect(summary.languageDistribution.python).toBe(1);
      expect(summary.issueCount).toBe(1);
    });

    test('should calculate health score', () => {
      const files = [
        { path: 'a.js', complexity: 5, maintainability: 90, issues: [] },
        { path: 'b.js', complexity: 5, maintainability: 90, issues: [] },
      ];

      const score = reporter.calculateHealthScore(files);

      expect(score).toBeGreaterThan(80);
    });
  });

  describe('Recommendations', () => {
    test('should recommend refactoring giant functions', () => {
      const analysis = {
        files: [],
        results: {
          giantFunctions: [{ file: 'a.js', name: 'giant', lines: 2000 }],
        },
      };

      const recommendations = reporter.generateRecommendations(analysis);

      expect(recommendations.some(r => r.priority === 'P0')).toBe(true);
      expect(recommendations.some(r => r.category === 'refactoring')).toBe(true);
    });

    test('should recommend addressing hotspots', () => {
      const analysis = {
        files: [{ path: 'complex.js', complexity: 100, issues: [] }],
        results: { giantFunctions: [] },
      };

      const recommendations = reporter.generateRecommendations(analysis);

      expect(recommendations.some(r => r.category === 'quality')).toBe(true);
    });
  });

  describe('Drill-down', () => {
    test('should provide drill-down data', () => {
      const report = {
        hierarchy: {
          children: {
            src: {
              name: 'src',
              path: 'src',
              stats: { files: 10, lines: 1000 },
              children: {
                analyzers: {
                  name: 'analyzers',
                  path: 'src/analyzers',
                  stats: { files: 5, lines: 500 },
                  children: {},
                },
              },
            },
          },
        },
      };

      const drillDown = reporter.drillDown(report, 'src');

      expect(drillDown).toBeDefined();
      expect(drillDown.path).toBe('src');
      expect(drillDown.stats.files).toBe(10);
      expect(drillDown.children.length).toBe(1);
      expect(drillDown.children[0].name).toBe('analyzers');
    });

    test('should return null for invalid path', () => {
      const report = {
        hierarchy: { children: {} },
      };

      const drillDown = reporter.drillDown(report, 'nonexistent/path');

      expect(drillDown).toBeNull();
    });
  });

  describe('Markdown Formatting', () => {
    test('should generate valid markdown', () => {
      const report = {
        generatedAt: new Date().toISOString(),
        projectPath: '/test/project',
        summary: {
          totalFiles: 100,
          totalLines: 10000,
          averageComplexity: 15,
          averageMaintainability: 70,
          languageDistribution: { javascript: 80, typescript: 20 },
          issueCount: 25,
          healthScore: 75,
        },
        hierarchy: {
          children: {
            src: {
              name: 'src',
              path: 'src',
              stats: { files: 80, lines: 8000, averageComplexity: 15, issues: 20 },
              children: {},
            },
          },
        },
        hotspots: [
          { type: 'file', path: 'src/complex.js', severity: 'critical', reason: 'high-complexity' },
        ],
        recommendations: [
          {
            priority: 'P0',
            title: 'Refactor',
            category: 'refactoring',
            impact: 'High',
            effort: 'Medium',
            description: 'Test',
          },
        ],
        trends: {
          complexityDistribution: { low: 50, medium: 30, high: 15, extreme: 5 },
        },
      };

      const markdown = reporter.formatAsMarkdown(report);

      expect(markdown).toContain('# Hierarchical Code Analysis Report');
      expect(markdown).toContain('## Executive Summary');
      expect(markdown).toContain('## Project Structure');
      expect(markdown).toContain('## Hotspots');
      expect(markdown).toContain('## Recommendations');
      expect(markdown).toContain('| javascript | 80 |');
    });
  });
});
