/**
 * TraceabilityExtractor Tests
 *
 * Requirement: IMP-6.2-004-01
 * Constitutional: Article III - Test-First
 */

const { TraceabilityExtractor } = require('../../src/traceability/extractor');

// Mock fs module
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readFile: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    access: jest.fn(),
  },
}));

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

const fs = require('fs');
const { exec } = require('child_process');

const mockFs = fs.promises;

describe('TraceabilityExtractor', () => {
  let extractor;

  beforeEach(() => {
    extractor = new TraceabilityExtractor();
    jest.clearAllMocks();
  });

  describe('extractFromFile()', () => {
    it('should extract REQ-XXX-NNN pattern from code', async () => {
      const codeContent = `
        // REQ-001-001: User authentication
        export function authenticate(user) {
          // Implementation for REQ-001-001
        }
      `;

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(codeContent);

      const refs = await extractor.extractFromFile('src/auth.js', 'code');

      expect(refs.length).toBeGreaterThanOrEqual(1);
      expect(refs[0].requirementId).toBe('REQ-001-001');
      expect(refs[0].sourceType).toBe('code');
    });

    it('should extract IMP-X.X-XXX pattern', async () => {
      const codeContent = `
        /**
         * Implementation for IMP-6.2-001
         * @requirement IMP-6.2-001-01
         */
        class ReviewGate {
        }
      `;

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(codeContent);

      const refs = await extractor.extractFromFile('src/review-gate.js', 'code');

      expect(refs.length).toBeGreaterThanOrEqual(2);
      expect(refs.some(r => r.requirementId === 'IMP-6.2-001')).toBe(true);
      expect(refs.some(r => r.requirementId === 'IMP-6.2-001-01')).toBe(true);
    });

    it('should include line numbers', async () => {
      const codeContent = `line 1
line 2
// REQ-002-001: Feature
line 4`;

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(codeContent);

      const refs = await extractor.extractFromFile('src/feature.js', 'code');

      expect(refs[0].lineNumber).toBe(3);
    });

    it('should extract FEAT-XXX pattern', async () => {
      const codeContent = `
        // FEAT-001: New dashboard feature
        function dashboard() {}
      `;

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(codeContent);

      const refs = await extractor.extractFromFile('src/dashboard.js', 'code');

      expect(refs[0].requirementId).toBe('FEAT-001');
    });
  });

  describe('extractFromTest()', () => {
    it('should extract requirement IDs from test files', async () => {
      const testContent = `
        /**
         * Tests for REQ-001-001
         */
        describe('Authentication', () => {
          it('should authenticate user per IMP-6.2-001', () => {
            // test
          });
        });
      `;

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(testContent);

      const refs = await extractor.extractFromFile('tests/auth.test.js', 'test');

      expect(refs.length).toBeGreaterThanOrEqual(2);
      expect(refs[0].sourceType).toBe('test');
    });

    it('should include test file path', async () => {
      const testContent = `// REQ-001-001`;

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(testContent);

      const refs = await extractor.extractFromFile('tests/feature.test.js', 'test');

      expect(refs[0].filePath).toBe('tests/feature.test.js');
    });
  });

  describe('extractFromCommits()', () => {
    it('should extract requirement IDs from commit messages', async () => {
      const gitLog = `abc123|feat(REQ-001-001): implement authentication|2025-12-31|dev@example.com
def456|fix(IMP-6.2-001): resolve gate issue|2025-12-30|dev@example.com`;

      exec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: gitLog, stderr: '' });
        return {};
      });

      const refs = await extractor.extractFromCommits();

      expect(refs.length).toBeGreaterThanOrEqual(2);
      expect(refs[0].sourceType).toBe('commit');
      expect(refs[0].commitHash).toBeDefined();
    });

    it('should include commit message and date', async () => {
      const gitLog = `abc123|feat(REQ-001-001): implement authentication|2025-12-31|dev@example.com`;

      exec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: gitLog, stderr: '' });
        return {};
      });

      const refs = await extractor.extractFromCommits();

      expect(refs[0].commitMessage).toContain('authentication');
    });
  });

  describe('extractFromDocument()', () => {
    it('should extract requirement IDs from markdown documents', async () => {
      const docContent = `
# Design Document

## REQ-001-001: Authentication

This section describes REQ-001-001 implementation.

### Related Requirements
- IMP-6.2-001
- IMP-6.2-001-01
      `;

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(docContent);

      const refs = await extractor.extractFromFile('docs/design.md', 'document');

      expect(refs.length).toBeGreaterThanOrEqual(3);
      expect(refs[0].sourceType).toBe('document');
    });
  });

  describe('scanDirectory()', () => {
    it('should scan all files in a directory', async () => {
      const fileStructure = {
        src: ['auth.js', 'user.js'],
        'src/auth.js': '// REQ-001-001\nfunction auth() {}',
        'src/user.js': '// IMP-6.2-001\nclass User {}',
      };

      mockFs.readdir.mockImplementation(async dir => {
        return fileStructure[dir] || [];
      });

      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
      });

      mockFs.readFile.mockImplementation(async path => {
        return fileStructure[path] || '';
      });

      mockFs.access.mockResolvedValue(undefined);

      const refs = await extractor.scanDirectory('src', 'code');

      expect(refs.length).toBeGreaterThanOrEqual(2);
    });

    it('should respect file patterns', async () => {
      const customExtractor = new TraceabilityExtractor({
        includePatterns: ['*.js'],
        excludePatterns: ['*.test.js'],
      });

      mockFs.readdir.mockResolvedValue(['auth.js', 'auth.test.js', 'user.js']);
      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
      });
      mockFs.readFile.mockResolvedValue('// REQ-001-001');
      mockFs.access.mockResolvedValue(undefined);

      await customExtractor.scanDirectory('src', 'code');

      // Should only scan .js files, not .test.js
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('extractAll()', () => {
    it('should extract from all sources', async () => {
      mockFs.readdir.mockResolvedValue(['file.js']);
      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
      });
      mockFs.readFile.mockResolvedValue('// REQ-001-001');
      mockFs.access.mockResolvedValue(undefined);

      exec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: 'abc|REQ-001-001|2025-12-31|dev', stderr: '' });
        return {};
      });

      const customExtractor = new TraceabilityExtractor({
        sourceDir: 'src',
        testDir: 'tests',
        docDir: 'docs',
        scanCommits: true,
      });

      const refs = await customExtractor.extractAll();

      expect(refs.length).toBeGreaterThan(0);
    });
  });

  describe('Pattern Matching', () => {
    it('should handle various ID formats', async () => {
      const content = `
        REQ-001-001
        REQ-ABC-123
        IMP-6.2-001
        IMP-6.2-001-01
        FEAT-001
        TASK-001
      `;

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(content);

      const refs = await extractor.extractFromFile('test.js', 'code');

      expect(refs.some(r => r.requirementId === 'REQ-001-001')).toBe(true);
      expect(refs.some(r => r.requirementId === 'IMP-6.2-001')).toBe(true);
      expect(refs.some(r => r.requirementId === 'FEAT-001')).toBe(true);
    });

    it('should capture multiple occurrences in same file', async () => {
      const content = `
        // REQ-001-001: First mention
        // REQ-001-001: Second mention
      `;

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(content);

      const refs = await extractor.extractFromFile('test.js', 'code');
      const reqRefs = refs.filter(r => r.requirementId === 'REQ-001-001');

      // Should return both occurrences with different line numbers
      expect(reqRefs).toHaveLength(2);
      expect(reqRefs[0].lineNumber).not.toBe(reqRefs[1].lineNumber);
    });
  });

  describe('groupByRequirement()', () => {
    it('should group references by requirement ID', () => {
      const refs = [
        { requirementId: 'REQ-001-001', sourceType: 'code', filePath: 'a.js' },
        { requirementId: 'REQ-001-001', sourceType: 'test', filePath: 'a.test.js' },
        { requirementId: 'REQ-001-002', sourceType: 'code', filePath: 'b.js' },
      ];

      const grouped = extractor.groupByRequirement(refs);

      expect(grouped.get('REQ-001-001').length).toBe(2);
      expect(grouped.get('REQ-001-002').length).toBe(1);
    });
  });
});
