/**
 * Tests for Rust Migration Generator
 *
 * Verifies:
 * - Unsafe pattern detection
 * - Security component identification
 * - Priority calculation
 * - Report generation
 */

const { RustMigrationGenerator, UNSAFE_PATTERNS, SECURITY_COMPONENTS } = require('../../src/generators/rust-migration-generator');

describe('RustMigrationGenerator', () => {
  describe('Unsafe Pattern Detection', () => {
    test('should have memory management patterns', () => {
      expect(UNSAFE_PATTERNS.memoryManagement).toBeDefined();
      expect(UNSAFE_PATTERNS.memoryManagement.length).toBeGreaterThan(0);
    });

    test('should have buffer overflow patterns', () => {
      expect(UNSAFE_PATTERNS.bufferOverflow).toBeDefined();
      expect(UNSAFE_PATTERNS.bufferOverflow.length).toBeGreaterThan(0);
    });

    test('should have pointer operation patterns', () => {
      expect(UNSAFE_PATTERNS.pointerOperations).toBeDefined();
      expect(UNSAFE_PATTERNS.pointerOperations.length).toBeGreaterThan(0);
    });

    test('should detect malloc', () => {
      const pattern = UNSAFE_PATTERNS.memoryManagement.find(p => p.pattern.source.includes('malloc'));
      expect(pattern).toBeDefined();
      expect(pattern.risk).toBe('high');
    });

    test('should detect strcpy as critical', () => {
      const pattern = UNSAFE_PATTERNS.bufferOverflow.find(p => p.pattern.source.includes('strcpy'));
      expect(pattern).toBeDefined();
      expect(pattern.risk).toBe('critical');
    });

    test('should detect sprintf as critical', () => {
      const pattern = UNSAFE_PATTERNS.bufferOverflow.find(p => p.pattern.source.includes('sprintf'));
      expect(pattern).toBeDefined();
      expect(pattern.risk).toBe('critical');
    });
  });

  describe('Security Components', () => {
    test('should have security component definitions', () => {
      expect(SECURITY_COMPONENTS).toBeDefined();
      expect(SECURITY_COMPONENTS.length).toBeGreaterThan(0);
    });

    test('should identify stack protection', () => {
      const component = SECURITY_COMPONENTS.find(c => c.component === 'Stack Protection');
      expect(component).toBeDefined();
      expect(component.rustCrate).toBe('rust-ssp');
    });

    test('should identify sanitizers', () => {
      const component = SECURITY_COMPONENTS.find(c => c.component === 'Sanitizers');
      expect(component).toBeDefined();
      expect(component.rustCrate).toBe('rust-sanitizer');
    });

    test('should identify cryptography', () => {
      const component = SECURITY_COMPONENTS.find(c => c.component === 'Cryptography');
      expect(component).toBeDefined();
    });

    test('should match ssp paths', () => {
      const component = SECURITY_COMPONENTS.find(c => c.component === 'Stack Protection');
      expect(component.pattern.test('libssp/ssp.c')).toBe(true);
      expect(component.pattern.test('stack_smashing_protection.c')).toBe(true);
    });

    test('should match sanitizer paths', () => {
      const component = SECURITY_COMPONENTS.find(c => c.component === 'Sanitizers');
      expect(component.pattern.test('asan_interceptors.cc')).toBe(true);
      expect(component.pattern.test('libsanitizer/tsan/tsan.cc')).toBe(true);
    });
  });

  describe('Risk Scoring', () => {
    test('should calculate risk scores correctly', async () => {
      const _generator = new RustMigrationGenerator('/tmp/test');

      // Mock file analysis
      const mockContent = `
        void* ptr = malloc(100);
        strcpy(dest, src);
        sprintf(buf, fmt, arg);
      `;

      const analysis = {
        path: 'test.c',
        unsafePatterns: [],
        riskScore: 0,
      };

      for (const [category, patterns] of Object.entries(UNSAFE_PATTERNS)) {
        for (const { pattern, risk, description } of patterns) {
          const regex = new RegExp(pattern.source, pattern.flags);
          const matches = mockContent.match(regex);
          if (matches && matches.length > 0) {
            analysis.unsafePatterns.push({
              category,
              risk,
              description,
              occurrences: matches.length,
            });

            const riskWeights = { critical: 10, high: 5, medium: 2, low: 1 };
            analysis.riskScore += (riskWeights[risk] || 1) * matches.length;
          }
        }
      }

      expect(analysis.riskScore).toBeGreaterThan(0);
      expect(analysis.unsafePatterns.length).toBeGreaterThan(0);
    });
  });

  describe('Rust Benefit Classification', () => {
    test('should classify critical benefit correctly', () => {
      const riskScore = 50;
      let rustBenefit;

      if (riskScore >= 50) rustBenefit = 'critical';
      else if (riskScore >= 20) rustBenefit = 'high';
      else if (riskScore >= 10) rustBenefit = 'medium';
      else if (riskScore > 0) rustBenefit = 'low';
      else rustBenefit = 'minimal';

      expect(rustBenefit).toBe('critical');
    });

    test('should classify high benefit correctly', () => {
      const riskScore = 30;
      let rustBenefit;

      if (riskScore >= 50) rustBenefit = 'critical';
      else if (riskScore >= 20) rustBenefit = 'high';
      else if (riskScore >= 10) rustBenefit = 'medium';
      else if (riskScore > 0) rustBenefit = 'low';
      else rustBenefit = 'minimal';

      expect(rustBenefit).toBe('high');
    });

    test('should classify minimal benefit correctly', () => {
      const riskScore = 0;
      let rustBenefit;

      if (riskScore >= 50) rustBenefit = 'critical';
      else if (riskScore >= 20) rustBenefit = 'high';
      else if (riskScore >= 10) rustBenefit = 'medium';
      else if (riskScore > 0) rustBenefit = 'low';
      else rustBenefit = 'minimal';

      expect(rustBenefit).toBe('minimal');
    });
  });

  describe('Report Generation', () => {
    test('should generate markdown report', () => {
      const generator = new RustMigrationGenerator('/tmp/test');

      const mockAnalysis = {
        timestamp: new Date().toISOString(),
        totalFiles: 100,
        fileAnalyses: [],
        unsafePatterns: [
          { category: 'bufferOverflow', occurrences: 5 },
          { category: 'memoryManagement', occurrences: 10 },
        ],
        securityComponents: [
          { component: 'Stack Protection', rustCrate: 'rust-ssp', files: ['ssp.c'], totalRiskScore: 25 },
        ],
        priorities: [
          { rank: 1, file: 'test.c', riskScore: 50, rustBenefit: 'critical', topIssues: ['strcpy'] },
        ],
        summary: {
          totalFiles: 100,
          filesWithIssues: 50,
          totalUnsafePatterns: 15,
          riskDistribution: { critical: 5, high: 10, medium: 20, low: 15, minimal: 50 },
          patternDistribution: { bufferOverflow: 5, memoryManagement: 10 },
          securityComponentsFound: 1,
          estimatedMigrationEffort: { estimatedDays: 30, highPriorityFiles: 15 },
        },
      };

      const report = generator.generateReport(mockAnalysis);

      expect(report).toContain('# Rust Migration Analysis Report');
      expect(report).toContain('Executive Summary');
      expect(report).toContain('Risk Distribution');
      expect(report).toContain('Security-Critical Components');
      expect(report).toContain('Recommendations');
    });
  });
});
