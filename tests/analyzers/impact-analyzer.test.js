/**
 * Impact Analyzer Tests
 * Tests for the ImpactAnalyzer class
 */

const path = require('path');
const fs = require('fs-extra');
const { ImpactAnalyzer, ImpactLevel, ImpactCategory } = require('../../src/analyzers/impact-analyzer.js');

describe('ImpactAnalyzer', () => {
  let analyzer;
  let testDir;

  beforeAll(async () => {
    testDir = path.join(__dirname, '../test-output/impact-analyzer');
    await fs.ensureDir(testDir);
    
    // Create test file structure
    await fs.ensureDir(path.join(testDir, 'src'));
    await fs.ensureDir(path.join(testDir, 'tests'));
    await fs.ensureDir(path.join(testDir, 'docs'));

    // Create sample files
    await fs.writeFile(
      path.join(testDir, 'src', 'auth.js'),
      `
      const AuthModule = require('./auth-module');
      const UserService = require('./user-service');
      
      function authenticate(user) {
        return AuthModule.verify(user);
      }
      module.exports = { authenticate };
      `
    );

    await fs.writeFile(
      path.join(testDir, 'src', 'user-service.js'),
      `
      const AuthModule = require('./auth-module');
      
      class UserService {
        constructor() {}
        getUser(id) { return { id }; }
      }
      module.exports = UserService;
      `
    );

    await fs.writeFile(
      path.join(testDir, 'tests', 'auth.test.js'),
      `
      const { authenticate } = require('../src/auth');
      describe('Auth', () => {
        test('authenticates user', () => {
          expect(authenticate({})).toBeDefined();
        });
      });
      `
    );

    await fs.writeFile(
      path.join(testDir, 'docs', 'auth.md'),
      '# Authentication\n\nDocumentation for AuthModule.'
    );

    analyzer = new ImpactAnalyzer(testDir);
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  describe('constructor', () => {
    it('should create analyzer with default options', () => {
      const a = new ImpactAnalyzer('/test');
      expect(a.workspaceRoot).toBe('/test');
      expect(a.options.includeTests).toBe(true);
      expect(a.options.includeDocs).toBe(true);
      expect(a.options.maxDepth).toBe(3);
    });

    it('should allow custom options', () => {
      const a = new ImpactAnalyzer('/test', { maxDepth: 5, includeTests: false });
      expect(a.options.maxDepth).toBe(5);
      expect(a.options.includeTests).toBe(false);
    });
  });

  describe('analyzeImpact', () => {
    it('should analyze ADDED delta impact', async () => {
      const delta = {
        id: 'DELTA-TEST-001',
        type: 'ADDED',
        target: 'new-feature',
        description: 'Adding new feature'
      };

      const report = await analyzer.analyzeImpact(delta);

      expect(report.id).toBe('DELTA-TEST-001');
      expect(report.type).toBe('ADDED');
      expect(report.target).toBe('new-feature');
      expect(report.summary).toBeDefined();
      expect(report.affectedItems).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.risks).toBeDefined();
    });

    it('should analyze MODIFIED delta impact', async () => {
      const delta = {
        id: 'DELTA-TEST-002',
        type: 'MODIFIED',
        target: 'auth',
        description: 'Modifying auth module',
        before: { version: '1.0' },
        after: { version: '2.0' }
      };

      const report = await analyzer.analyzeImpact(delta);

      expect(report.id).toBe('DELTA-TEST-002');
      expect(report.type).toBe('MODIFIED');
      expect(report.summary.byCategory).toBeDefined();
      expect(report.summary.byLevel).toBeDefined();
    });

    it('should analyze REMOVED delta impact', async () => {
      const delta = {
        id: 'DELTA-TEST-003',
        type: 'REMOVED',
        target: 'AuthModule',
        description: 'Removing deprecated module'
      };

      const report = await analyzer.analyzeImpact(delta);

      expect(report.id).toBe('DELTA-TEST-003');
      expect(report.type).toBe('REMOVED');
      // Should find referencing files
      expect(report.affectedItems.length).toBeGreaterThan(0);
    });

    it('should analyze RENAMED delta impact', async () => {
      const delta = {
        id: 'DELTA-TEST-004',
        type: 'RENAMED',
        target: 'auth',
        before: 'auth',
        after: 'authentication',
        description: 'Renaming auth to authentication'
      };

      const report = await analyzer.analyzeImpact(delta);

      expect(report.id).toBe('DELTA-TEST-004');
      expect(report.type).toBe('RENAMED');
    });

    it('should include impacted areas in analysis', async () => {
      const delta = {
        id: 'DELTA-TEST-005',
        type: 'MODIFIED',
        target: 'user-service',
        description: 'Modifying user service',
        impactedAreas: ['authentication', 'user-management']
      };

      const report = await analyzer.analyzeImpact(delta);

      expect(report.dependencyChain.length).toBeGreaterThan(0);
    });
  });

  describe('findMatchingFiles', () => {
    it('should find files matching pattern', async () => {
      const files = await analyzer.findMatchingFiles('auth');
      expect(Array.isArray(files)).toBe(true);
    });

    it('should return empty array for non-matching pattern', async () => {
      const files = await analyzer.findMatchingFiles('nonexistent-xyz-123');
      expect(files).toEqual([]);
    });
  });

  describe('findReferencingFiles', () => {
    it('should find files referencing a target', async () => {
      const files = await analyzer.findReferencingFiles('AuthModule');
      expect(files.length).toBeGreaterThan(0);
    });

    it('should return unique files', async () => {
      const files = await analyzer.findReferencingFiles('auth');
      const unique = [...new Set(files)];
      expect(files.length).toBe(unique.length);
    });
  });

  describe('findRelatedTests', () => {
    it('should find test files for a target', async () => {
      const files = await analyzer.findRelatedTests('auth');
      expect(files.length).toBeGreaterThan(0);
      expect(files.some(f => f.includes('test'))).toBe(true);
    });
  });

  describe('categorizeFile', () => {
    it('should categorize test files', () => {
      expect(analyzer.categorizeFile('tests/auth.test.js')).toBe(ImpactCategory.TESTS);
      expect(analyzer.categorizeFile('src/__tests__/util.js')).toBe(ImpactCategory.TESTS);
    });

    it('should categorize documentation files', () => {
      expect(analyzer.categorizeFile('docs/README.md')).toBe(ImpactCategory.DOCUMENTATION);
      expect(analyzer.categorizeFile('CHANGELOG.md')).toBe(ImpactCategory.DOCUMENTATION);
    });

    it('should categorize code files', () => {
      expect(analyzer.categorizeFile('src/index.js')).toBe(ImpactCategory.CODE);
    });

    it('should categorize config files', () => {
      expect(analyzer.categorizeFile('config/settings.json')).toBe(ImpactCategory.CONFIGURATION);
      expect(analyzer.categorizeFile('app.config.yml')).toBe(ImpactCategory.CONFIGURATION);
    });
  });

  describe('determineImpactLevel', () => {
    it('should return HIGH for core source files', () => {
      const delta = { type: 'MODIFIED' };
      expect(analyzer.determineImpactLevel('src/core/index.js', delta)).toBe(ImpactLevel.HIGH);
    });

    it('should return MEDIUM for test files', () => {
      const delta = { type: 'MODIFIED' };
      expect(analyzer.determineImpactLevel('tests/unit.test.js', delta)).toBe(ImpactLevel.MEDIUM);
    });

    it('should return LOW for documentation', () => {
      const delta = { type: 'MODIFIED' };
      expect(analyzer.determineImpactLevel('docs/guide.md', delta)).toBe(ImpactLevel.LOW);
    });
  });

  describe('extractSearchName', () => {
    it('should extract name from REQ format', () => {
      expect(analyzer.extractSearchName('REQ-AUTH-001')).toBe('REQ-AUTH-001');
    });

    it('should extract filename without extension', () => {
      expect(analyzer.extractSearchName('src/auth/index.js')).toBe('index');
    });

    it('should handle simple names', () => {
      expect(analyzer.extractSearchName('authentication')).toBe('authentication');
    });
  });

  describe('generateRecommendations', () => {
    it('should add recommendations for large changes', () => {
      const report = {
        summary: {
          totalAffected: 15,
          byLevel: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
          byCategory: { tests: 0 }
        },
        dependencyChain: [],
        recommendations: []
      };

      analyzer.generateRecommendations(report);

      expect(report.recommendations.some(r => 
        r.message.includes('splitting') || r.message.includes('smaller')
      )).toBe(true);
    });

    it('should add warnings for critical impacts', () => {
      const report = {
        summary: {
          totalAffected: 5,
          byLevel: { critical: 2, high: 0, medium: 0, low: 0, info: 0 },
          byCategory: { tests: 0 }
        },
        dependencyChain: [],
        recommendations: []
      };

      analyzer.generateRecommendations(report);

      expect(report.recommendations.some(r => 
        r.priority === 'critical'
      )).toBe(true);
    });
  });

  describe('identifyRisks', () => {
    it('should identify breaking change risks', () => {
      const report = {
        summary: {
          byLevel: { critical: 1, high: 0, medium: 0, low: 0, info: 0 },
          byCategory: { code: 0, tests: 0 }
        },
        risks: []
      };

      analyzer.identifyRisks(report);

      expect(report.risks.some(r => r.level === 'high')).toBe(true);
    });

    it('should identify test coverage gaps', () => {
      const report = {
        summary: {
          byLevel: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
          byCategory: { code: 10, tests: 2 }
        },
        risks: []
      };

      analyzer.identifyRisks(report);

      expect(report.risks.some(r => 
        r.description.includes('test coverage')
      )).toBe(true);
    });
  });

  describe('generateSummary', () => {
    it('should generate markdown summary', () => {
      const report = {
        id: 'DELTA-TEST-001',
        type: 'MODIFIED',
        target: 'auth',
        timestamp: new Date().toISOString(),
        summary: {
          totalAffected: 5,
          byCategory: { code: 3, tests: 2, documentation: 0, configuration: 0, requirements: 0, design: 0 },
          byLevel: { critical: 0, high: 1, medium: 2, low: 1, info: 1 }
        },
        affectedItems: [],
        dependencyChain: [],
        recommendations: [{ priority: 'info', message: 'Test recommendation' }],
        risks: [{ level: 'medium', description: 'Test risk', mitigation: 'Fix it' }]
      };

      const summary = analyzer.generateSummary(report);

      expect(summary).toContain('## Impact Analysis Summary');
      expect(summary).toContain('DELTA-TEST-001');
      expect(summary).toContain('MODIFIED');
      expect(summary).toContain('### Recommendations');
      expect(summary).toContain('### Risks');
    });
  });
});

describe('ImpactLevel', () => {
  it('should have all expected levels', () => {
    expect(ImpactLevel.CRITICAL).toBe('critical');
    expect(ImpactLevel.HIGH).toBe('high');
    expect(ImpactLevel.MEDIUM).toBe('medium');
    expect(ImpactLevel.LOW).toBe('low');
    expect(ImpactLevel.INFO).toBe('info');
  });
});

describe('ImpactCategory', () => {
  it('should have all expected categories', () => {
    expect(ImpactCategory.REQUIREMENTS).toBe('requirements');
    expect(ImpactCategory.DESIGN).toBe('design');
    expect(ImpactCategory.CODE).toBe('code');
    expect(ImpactCategory.TESTS).toBe('tests');
    expect(ImpactCategory.DOCUMENTATION).toBe('documentation');
    expect(ImpactCategory.CONFIGURATION).toBe('configuration');
  });
});
