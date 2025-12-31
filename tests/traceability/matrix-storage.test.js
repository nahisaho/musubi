/**
 * MatrixStorage Tests
 * 
 * Requirement: IMP-6.2-004-03
 * Constitutional: Article III - Test-First
 */

const { MatrixStorage } = require('../../src/traceability/matrix-storage');

// Mock fs module
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn(),
    readdir: jest.fn(),
    unlink: jest.fn()
  }
}));

// Mock yaml module
jest.mock('yaml', () => ({
  stringify: jest.fn((obj) => JSON.stringify(obj)),
  parse: jest.fn((str) => JSON.parse(str))
}));

const fs = require('fs');
const yaml = require('yaml');

const mockFs = fs.promises;

describe('MatrixStorage', () => {
  let storage;
  const testStorageDir = 'storage/traceability';

  beforeEach(() => {
    storage = new MatrixStorage({ storageDir: testStorageDir });
    jest.clearAllMocks();
    mockFs.mkdir.mockResolvedValue(undefined);
  });

  describe('save()', () => {
    it('should save traceability matrix', async () => {
      const matrix = {
        version: '1.0.0',
        generatedAt: '2025-12-31T12:00:00Z',
        requirements: {
          'REQ-001-001': {
            requirementId: 'REQ-001-001',
            design: [{ path: 'docs/design.md' }],
            code: [{ path: 'src/auth.js' }],
            tests: [{ path: 'tests/auth.test.js' }],
            commits: []
          }
        },
        summary: {
          totalRequirements: 1,
          linkedRequirements: 1,
          withDesign: 1,
          withCode: 1,
          withTests: 1,
          gaps: 0,
          coveragePercentage: 100
        }
      };

      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.writeFile.mockResolvedValue(undefined);

      await storage.save('feature-auth', matrix);

      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
      
      const [filePath, content] = mockFs.writeFile.mock.calls[0];
      expect(filePath).toContain('feature-auth');
      expect(content).toBeDefined();
    });

    it('should include timestamp in filename', async () => {
      const matrix = {
        version: '1.0.0',
        generatedAt: '2025-12-31T12:00:00Z',
        requirements: {},
        summary: {
          totalRequirements: 0,
          linkedRequirements: 0,
          withDesign: 0,
          withCode: 0,
          withTests: 0,
          gaps: 0,
          coveragePercentage: 0
        }
      };

      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.writeFile.mockResolvedValue(undefined);

      await storage.save('feature-test', matrix);

      const [filePath] = mockFs.writeFile.mock.calls[0];
      expect(filePath).toMatch(/feature-test.*\.yaml$/);
    });
  });

  describe('load()', () => {
    it('should load traceability matrix', async () => {
      const matrixData = {
        version: '1.0.0',
        generatedAt: '2025-12-31T12:00:00Z',
        requirements: {
          'REQ-001-001': {
            requirementId: 'REQ-001-001',
            design: [{ path: 'docs/design.md' }],
            code: [{ path: 'src/auth.js' }],
            tests: [{ path: 'tests/auth.test.js' }],
            commits: []
          }
        },
        summary: {
          totalRequirements: 1,
          linkedRequirements: 1,
          withDesign: 1,
          withCode: 1,
          withTests: 1,
          gaps: 0,
          coveragePercentage: 100
        }
      };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(matrixData));

      const matrix = await storage.load('feature-auth.yaml');

      expect(matrix).toBeDefined();
      expect(matrix.version).toBe('1.0.0');
      expect(matrix.requirements['REQ-001-001']).toBeDefined();
    });

    it('should return null for non-existent file', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.readdir.mockResolvedValue([]);

      const matrix = await storage.load('non-existent');

      expect(matrix).toBeNull();
    });
  });

  describe('loadLatest()', () => {
    it('should load most recent matrix for feature', async () => {
      mockFs.readdir.mockResolvedValue([
        'feature-auth-2025-12-30.yaml',
        'feature-auth-2025-12-31.yaml',
        'feature-auth-2025-12-29.yaml'
      ]);

      const matrixData = {
        version: '1.0.0',
        generatedAt: '2025-12-31T12:00:00Z',
        requirements: {},
        summary: {
          totalRequirements: 0,
          linkedRequirements: 0,
          withDesign: 0,
          withCode: 0,
          withTests: 0,
          gaps: 0,
          coveragePercentage: 0
        }
      };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(matrixData));

      const matrix = await storage.loadLatest('feature-auth');

      expect(matrix).toBeDefined();
      // Should load the latest (2025-12-31) file
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('2025-12-31'),
        'utf-8'
      );
    });

    it('should return null when no files exist', async () => {
      mockFs.readdir.mockResolvedValue([]);

      const matrix = await storage.loadLatest('non-existent');

      expect(matrix).toBeNull();
    });
  });

  describe('list()', () => {
    it('should list all saved matrices', async () => {
      mockFs.readdir.mockResolvedValue([
        'feature-auth-2025-12-31.yaml',
        'feature-user-2025-12-30.yaml'
      ]);

      const list = await storage.list();

      expect(list).toContain('feature-auth-2025-12-31.yaml');
      expect(list).toContain('feature-user-2025-12-30.yaml');
    });

    it('should filter by feature prefix', async () => {
      mockFs.readdir.mockResolvedValue([
        'feature-auth-2025-12-31.yaml',
        'feature-user-2025-12-30.yaml'
      ]);

      const list = await storage.list('feature-auth');

      expect(list).toContain('feature-auth-2025-12-31.yaml');
      expect(list).not.toContain('feature-user-2025-12-30.yaml');
    });

    it('should return empty array on error', async () => {
      mockFs.readdir.mockRejectedValue(new Error('ENOENT'));

      const list = await storage.list();

      expect(list).toEqual([]);
    });
  });

  describe('delete()', () => {
    it('should delete matrix file', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);

      await storage.delete('feature-auth-2025-12-31.yaml');

      expect(mockFs.unlink).toHaveBeenCalled();
    });
  });

  describe('merge()', () => {
    it('should merge two matrices', () => {
      const matrix1 = {
        version: '1.0.0',
        generatedAt: '2025-12-30T12:00:00Z',
        requirements: {
          'REQ-001-001': {
            requirementId: 'REQ-001-001',
            design: [{ path: 'docs/design.md' }],
            code: [],
            tests: [],
            commits: []
          }
        },
        summary: {}
      };

      const matrix2 = {
        version: '1.0.0',
        generatedAt: '2025-12-31T12:00:00Z',
        requirements: {
          'REQ-001-001': {
            requirementId: 'REQ-001-001',
            design: [],
            code: [{ path: 'src/auth.js' }],
            tests: [{ path: 'tests/auth.test.js' }],
            commits: []
          }
        },
        summary: {}
      };

      const merged = storage.merge(matrix1, matrix2);

      expect(merged.requirements['REQ-001-001'].design.length).toBe(1);
      expect(merged.requirements['REQ-001-001'].code.length).toBe(1);
      expect(merged.requirements['REQ-001-001'].tests.length).toBe(1);
    });

    it('should include requirements from both matrices', () => {
      const matrix1 = {
        version: '1.0.0',
        generatedAt: '2025-12-30T12:00:00Z',
        requirements: {
          'REQ-001-001': {
            requirementId: 'REQ-001-001',
            design: [{ path: 'docs/design.md' }],
            code: [],
            tests: [],
            commits: []
          }
        },
        summary: {}
      };

      const matrix2 = {
        version: '1.0.0',
        generatedAt: '2025-12-31T12:00:00Z',
        requirements: {
          'REQ-001-002': {
            requirementId: 'REQ-001-002',
            design: [],
            code: [{ path: 'src/user.js' }],
            tests: [],
            commits: []
          }
        },
        summary: {}
      };

      const merged = storage.merge(matrix1, matrix2);

      expect(merged.requirements['REQ-001-001']).toBeDefined();
      expect(merged.requirements['REQ-001-002']).toBeDefined();
    });
  });

  describe('calculateSummary()', () => {
    it('should calculate summary statistics', () => {
      const requirements = {
        'REQ-001-001': {
          requirementId: 'REQ-001-001',
          design: [{ path: 'docs/design.md' }],
          code: [{ path: 'src/auth.js' }],
          tests: [{ path: 'tests/auth.test.js' }],
          commits: []
        },
        'REQ-001-002': {
          requirementId: 'REQ-001-002',
          design: [],
          code: [{ path: 'src/user.js' }],
          tests: [],
          commits: []
        }
      };

      const summary = storage.calculateSummary(requirements);

      expect(summary.totalRequirements).toBe(2);
      expect(summary.withDesign).toBe(1);
      expect(summary.withCode).toBe(2);
      expect(summary.withTests).toBe(1);
      expect(summary.gaps).toBe(2); // no-design + no-test for REQ-001-002
      expect(summary.coveragePercentage).toBe(50);
    });

    it('should return zeros for empty requirements', () => {
      const summary = storage.calculateSummary({});

      expect(summary.totalRequirements).toBe(0);
      expect(summary.coveragePercentage).toBe(0);
    });
  });

  describe('exportAsJson()', () => {
    it('should export matrix as valid JSON', () => {
      const matrix = {
        version: '1.0.0',
        generatedAt: '2025-12-31T12:00:00Z',
        requirements: {},
        summary: {
          totalRequirements: 0,
          linkedRequirements: 0,
          withDesign: 0,
          withCode: 0,
          withTests: 0,
          gaps: 0,
          coveragePercentage: 0
        }
      };

      const json = storage.exportAsJson(matrix);

      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe('exportAsMarkdown()', () => {
    it('should export matrix as Markdown', () => {
      const matrix = {
        version: '1.0.0',
        generatedAt: '2025-12-31T12:00:00Z',
        requirements: {
          'REQ-001-001': {
            requirementId: 'REQ-001-001',
            design: [{ path: 'docs/design.md' }],
            code: [{ path: 'src/auth.js' }],
            tests: [{ path: 'tests/auth.test.js' }],
            commits: []
          }
        },
        summary: {
          totalRequirements: 1,
          linkedRequirements: 1,
          withDesign: 1,
          withCode: 1,
          withTests: 1,
          gaps: 0,
          coveragePercentage: 100
        }
      };

      const markdown = storage.exportAsMarkdown(matrix);

      expect(markdown).toContain('# Traceability Matrix');
      expect(markdown).toContain('REQ-001-001');
      expect(markdown).toContain('100%');
    });

    it('should include summary table', () => {
      const matrix = {
        version: '1.0.0',
        generatedAt: '2025-12-31T12:00:00Z',
        requirements: {},
        summary: {
          totalRequirements: 0,
          linkedRequirements: 0,
          withDesign: 0,
          withCode: 0,
          withTests: 0,
          gaps: 0,
          coveragePercentage: 0
        }
      };

      const markdown = storage.exportAsMarkdown(matrix);

      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('| Metric | Value |');
    });
  });
});
