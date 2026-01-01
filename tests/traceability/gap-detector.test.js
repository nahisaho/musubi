/**
 * GapDetector Tests
 *
 * Requirement: IMP-6.2-004-02
 * Constitutional: Article III - Test-First
 */

const { GapDetector } = require('../../src/traceability/gap-detector');

describe('GapDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new GapDetector();
  });

  describe('detectGaps()', () => {
    it('should detect requirements without design links', () => {
      const links = [
        {
          requirementId: 'REQ-001-001',
          design: [], // No design
          code: [{ path: 'src/auth.js', line: 10 }],
          tests: [{ path: 'tests/auth.test.js', line: 5 }],
          commits: [],
        },
      ];

      const gaps = detector.detectGaps(links);

      expect(gaps.some(g => g.requirementId === 'REQ-001-001' && g.gapType === 'no-design')).toBe(
        true
      );
    });

    it('should detect requirements without code links', () => {
      const links = [
        {
          requirementId: 'REQ-001-002',
          design: [{ path: 'docs/design.md' }],
          code: [], // No code
          tests: [{ path: 'tests/feature.test.js' }],
          commits: [],
        },
      ];

      const gaps = detector.detectGaps(links);

      expect(gaps.some(g => g.requirementId === 'REQ-001-002' && g.gapType === 'no-code')).toBe(
        true
      );
    });

    it('should detect requirements without test links', () => {
      const links = [
        {
          requirementId: 'REQ-001-003',
          design: [{ path: 'docs/design.md' }],
          code: [{ path: 'src/feature.js' }],
          tests: [], // No tests
          commits: [],
        },
      ];

      const gaps = detector.detectGaps(links);

      expect(gaps.some(g => g.requirementId === 'REQ-001-003' && g.gapType === 'no-test')).toBe(
        true
      );
    });

    it('should not report gap for fully linked requirements', () => {
      const links = [
        {
          requirementId: 'REQ-001-004',
          design: [{ path: 'docs/design.md' }],
          code: [{ path: 'src/feature.js' }],
          tests: [{ path: 'tests/feature.test.js' }],
          commits: [{ hash: 'abc123', message: 'feat', date: '2025-12-31' }],
        },
      ];

      const gaps = detector.detectGaps(links);

      expect(gaps.filter(g => g.requirementId === 'REQ-001-004').length).toBe(0);
    });

    it('should detect multiple gap types for same requirement', () => {
      const links = [
        {
          requirementId: 'REQ-001-005',
          design: [],
          code: [],
          tests: [],
          commits: [],
        },
      ];

      const gaps = detector.detectGaps(links);
      const reqGaps = gaps.filter(g => g.requirementId === 'REQ-001-005');

      expect(reqGaps.length).toBe(3); // no-design, no-code, no-test
    });
  });

  describe('severity assignment', () => {
    it('should assign critical severity to no-test gap', () => {
      const links = [
        {
          requirementId: 'REQ-001-001',
          design: [{ path: 'docs/design.md' }],
          code: [{ path: 'src/auth.js' }],
          tests: [],
          commits: [],
        },
      ];

      const gaps = detector.detectGaps(links);
      const testGap = gaps.find(g => g.gapType === 'no-test');

      expect(testGap.severity).toBe('critical');
    });

    it('should assign high severity to no-code gap', () => {
      const links = [
        {
          requirementId: 'REQ-001-001',
          design: [{ path: 'docs/design.md' }],
          code: [],
          tests: [{ path: 'tests/auth.test.js' }],
          commits: [],
        },
      ];

      const gaps = detector.detectGaps(links);
      const codeGap = gaps.find(g => g.gapType === 'no-code');

      expect(codeGap.severity).toBe('high');
    });

    it('should assign medium severity to no-design gap', () => {
      const links = [
        {
          requirementId: 'REQ-001-001',
          design: [],
          code: [{ path: 'src/auth.js' }],
          tests: [{ path: 'tests/auth.test.js' }],
          commits: [],
        },
      ];

      const gaps = detector.detectGaps(links);
      const designGap = gaps.find(g => g.gapType === 'no-design');

      expect(designGap.severity).toBe('medium');
    });
  });

  describe('suggestion generation', () => {
    it('should provide suggestion for no-test gap', () => {
      const links = [
        {
          requirementId: 'REQ-001-001',
          design: [{ path: 'docs/design.md' }],
          code: [{ path: 'src/auth.js' }],
          tests: [],
          commits: [],
        },
      ];

      const gaps = detector.detectGaps(links);
      const testGap = gaps.find(g => g.gapType === 'no-test');

      expect(testGap.suggestion).toContain('テスト');
    });

    it('should provide suggestion for no-code gap', () => {
      const links = [
        {
          requirementId: 'REQ-001-001',
          design: [{ path: 'docs/design.md' }],
          code: [],
          tests: [{ path: 'tests/auth.test.js' }],
          commits: [],
        },
      ];

      const gaps = detector.detectGaps(links);
      const codeGap = gaps.find(g => g.gapType === 'no-code');

      expect(codeGap.suggestion).toContain('実装');
    });
  });

  describe('analyzeMatrix()', () => {
    it('should analyze full traceability matrix', () => {
      const matrix = {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        requirements: {
          'REQ-001-001': {
            requirementId: 'REQ-001-001',
            design: [{ path: 'docs/design.md' }],
            code: [{ path: 'src/auth.js' }],
            tests: [],
            commits: [],
          },
          'REQ-001-002': {
            requirementId: 'REQ-001-002',
            design: [],
            code: [{ path: 'src/user.js' }],
            tests: [{ path: 'tests/user.test.js' }],
            commits: [],
          },
        },
        summary: {
          totalRequirements: 2,
          linkedRequirements: 2,
          withDesign: 1,
          withCode: 2,
          withTests: 1,
          gaps: 2,
          coveragePercentage: 50,
        },
      };

      const analysis = detector.analyzeMatrix(matrix);

      expect(analysis.totalGaps).toBe(2);
      expect(analysis.criticalGaps).toBe(1); // no-test for REQ-001-001
      expect(analysis.gapsByType['no-test']).toBe(1);
      expect(analysis.gapsByType['no-design']).toBe(1);
    });
  });

  describe('getGapReport()', () => {
    it('should generate gap report sorted by severity', () => {
      const links = [
        {
          requirementId: 'REQ-001-001',
          design: [{ path: 'docs/design.md' }],
          code: [{ path: 'src/auth.js' }],
          tests: [],
          commits: [],
        },
        {
          requirementId: 'REQ-001-002',
          design: [],
          code: [{ path: 'src/user.js' }],
          tests: [{ path: 'tests/user.test.js' }],
          commits: [],
        },
      ];

      const report = detector.getGapReport(links);

      // Critical gaps should come first
      expect(report.gaps[0].severity).toBe('critical');
    });

    it('should include summary in report', () => {
      const links = [
        {
          requirementId: 'REQ-001-001',
          design: [],
          code: [],
          tests: [],
          commits: [],
        },
      ];

      const report = detector.getGapReport(links);

      expect(report.summary.totalGaps).toBeGreaterThan(0);
      expect(report.summary.criticalGaps).toBeDefined();
      expect(report.summary.highGaps).toBeDefined();
    });

    it('should include generatedAt timestamp', () => {
      const links = [];
      const report = detector.getGapReport(links);

      expect(report.generatedAt).toBeDefined();
      expect(() => new Date(report.generatedAt)).not.toThrow();
    });
  });

  describe('filterGapsBySeverity()', () => {
    it('should filter gaps by severity', () => {
      const links = [
        {
          requirementId: 'REQ-001-001',
          design: [],
          code: [],
          tests: [],
          commits: [],
        },
      ];

      const gaps = detector.detectGaps(links);
      const criticalOnly = detector.filterGapsBySeverity(gaps, 'critical');

      expect(criticalOnly.every(g => g.severity === 'critical')).toBe(true);
    });

    it('should return empty array when no gaps match severity', () => {
      const links = [
        {
          requirementId: 'REQ-001-001',
          design: [{ path: 'docs/design.md' }],
          code: [{ path: 'src/auth.js' }],
          tests: [{ path: 'tests/auth.test.js' }],
          commits: [],
        },
      ];

      const gaps = detector.detectGaps(links);
      const criticalOnly = detector.filterGapsBySeverity(gaps, 'critical');

      expect(criticalOnly).toHaveLength(0);
    });
  });

  describe('getRequirementsWithGaps()', () => {
    it('should return unique requirement IDs with gaps', () => {
      const links = [
        {
          requirementId: 'REQ-001-001',
          design: [],
          code: [],
          tests: [],
          commits: [],
        },
        {
          requirementId: 'REQ-001-002',
          design: [{ path: 'docs/design.md' }],
          code: [{ path: 'src/feature.js' }],
          tests: [{ path: 'tests/feature.test.js' }],
          commits: [],
        },
      ];

      const reqsWithGaps = detector.getRequirementsWithGaps(links);

      expect(reqsWithGaps).toContain('REQ-001-001');
      expect(reqsWithGaps).not.toContain('REQ-001-002');
    });
  });

  describe('hasCriticalGap()', () => {
    it('should return true when no tests', () => {
      const link = {
        requirementId: 'REQ-001-001',
        design: [{ path: 'docs/design.md' }],
        code: [{ path: 'src/auth.js' }],
        tests: [],
        commits: [],
      };

      expect(detector.hasCriticalGap(link)).toBe(true);
    });

    it('should return false when has tests', () => {
      const link = {
        requirementId: 'REQ-001-001',
        design: [],
        code: [],
        tests: [{ path: 'tests/auth.test.js' }],
        commits: [],
      };

      expect(detector.hasCriticalGap(link)).toBe(false);
    });
  });

  describe('getGapCoverage()', () => {
    it('should return 100% for empty links', () => {
      const coverage = detector.getGapCoverage([]);
      expect(coverage).toBe(100);
    });

    it('should calculate coverage percentage', () => {
      const links = [
        {
          requirementId: 'REQ-001-001',
          design: [{ path: 'docs/design.md' }],
          code: [{ path: 'src/auth.js' }],
          tests: [{ path: 'tests/auth.test.js' }],
          commits: [],
        },
        {
          requirementId: 'REQ-001-002',
          design: [],
          code: [],
          tests: [],
          commits: [],
        },
      ];

      const coverage = detector.getGapCoverage(links);

      expect(coverage).toBe(50); // 1 out of 2 has no gaps
    });
  });
});
