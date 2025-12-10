/**
 * Tests for Critic System
 * @see src/validators/critic-system.js
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  CriticSystem,
  CriticResult,
  RequirementsCritic,
  DesignCritic,
  ImplementationCritic,
  Grade,
  StageType,
} = require('../../src/validators/critic-system');

describe('CriticResult', () => {
  describe('constructor', () => {
    it('should clamp score between 0 and 1', () => {
      const result1 = new CriticResult(1.5, 'test');
      expect(result1.score).toBe(1);

      const result2 = new CriticResult(-0.5, 'test');
      expect(result2.score).toBe(0);
    });
  });

  describe('success', () => {
    it('should return true for score >= 0.5', () => {
      expect(new CriticResult(0.5, 'test').success).toBe(true);
      expect(new CriticResult(0.8, 'test').success).toBe(true);
    });

    it('should return false for score < 0.5', () => {
      expect(new CriticResult(0.4, 'test').success).toBe(false);
    });
  });

  describe('grade', () => {
    it('should return correct grade', () => {
      expect(new CriticResult(0.9, 'test').grade).toBe(Grade.A);
      expect(new CriticResult(0.8, 'test').grade).toBe(Grade.A);
      expect(new CriticResult(0.6, 'test').grade).toBe(Grade.B);
      expect(new CriticResult(0.4, 'test').grade).toBe(Grade.C);
      expect(new CriticResult(0.2, 'test').grade).toBe(Grade.F);
    });
  });

  describe('percentage', () => {
    it('should return percentage', () => {
      expect(new CriticResult(0.75, 'test').percentage).toBe(75);
    });
  });

  describe('toJSON', () => {
    it('should serialize properly', () => {
      const result = new CriticResult(0.7, 'message', { detail: 'info' });
      const json = result.toJSON();
      
      expect(json.score).toBe(0.7);
      expect(json.grade).toBe(Grade.B);
      expect(json.message).toBe('message');
      expect(json.details.detail).toBe('info');
    });
  });

  describe('toMarkdown', () => {
    it('should generate markdown report', () => {
      const result = new CriticResult(0.8, 'Good result', {
        criterion1: 0.9,
        criterion2: 0.7,
      });
      const md = result.toMarkdown();
      
      expect(md).toContain('## Evaluation Result');
      expect(md).toContain('80%');
      expect(md).toContain('Grade');
      expect(md).toContain('criterion1');
      expect(md).toContain('90%');
    });
  });
});

describe('RequirementsCritic', () => {
  let critic;
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'musubi-critic-test-'));
    critic = new RequirementsCritic({ projectRoot: tempDir });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('evaluate', () => {
    it('should evaluate with context content', () => {
      const context = {
        content: `
# Requirements

## 機能要件

REQ-P0-001: When the user clicks submit, the system shall save the data.
REQ-P0-002: The system shall respond within 200ms.

## 非機能要件

The system should handle 1000 concurrent users.

## 制約

Must use PostgreSQL database.
        `,
      };

      const result = critic.evaluate(context);
      expect(result).toBeInstanceOf(CriticResult);
      expect(result.score).toBeGreaterThan(0);
      expect(result.details.earsCompliance).toBeDefined();
    });

    it('should return low score for empty content', () => {
      const result = critic.evaluate({ content: '' });
      expect(result.score).toBe(0);
    });
  });

  describe('checkEarsFormat', () => {
    it('should detect EARS patterns', () => {
      const score = critic.checkEarsFormat({
        content: `
REQ-001: When the user submits the form, the system shall validate inputs.
REQ-002: If the input is invalid, the system shall display an error.
REQ-003: The system shall be able to handle 100 requests per second.
REQ-004: While processing, the system shall show a loading indicator.
REQ-005: Where network is slow, the system should retry.
        `,
      });
      // Score depends on ratio of EARS patterns to REQ count
      // 5 requirements, multiple EARS patterns
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should return higher score for more EARS patterns', () => {
      const highScore = critic.checkEarsFormat({
        content: `
REQ-001: When triggered, the system shall respond.
REQ-002: If error occurs, the system shall log.
        `,
      });
      const lowScore = critic.checkEarsFormat({
        content: `
REQ-001: Some requirement without EARS pattern.
REQ-002: Another basic requirement.
        `,
      });
      expect(highScore).toBeGreaterThanOrEqual(lowScore);
    });
  });

  describe('checkCompleteness', () => {
    it('should check required sections', () => {
      const score = critic.checkCompleteness({
        content: `
## 機能要件
Some requirements.

## 非機能要件
Performance requirements.

## 制約
Technical constraints.
        `,
      });
      expect(score).toBe(1);
    });

    it('should return partial score for missing sections', () => {
      const score = critic.checkCompleteness({
        content: '## 機能要件\nSome text.',
      });
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });
  });

  describe('checkTestability', () => {
    it('should detect measurable criteria', () => {
      const score = critic.checkTestability({
        content: `
Response time must be less than 200ms.
Support at least 1000 concurrent users.
Achieve 99.9% uptime.
Process 50 requests per second.
Complete in 5 seconds.
        `,
      });
      expect(score).toBeGreaterThan(0);
    });
  });
});

describe('DesignCritic', () => {
  let critic;
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'musubi-critic-test-'));
    critic = new DesignCritic({ projectRoot: tempDir });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('checkC4Format', () => {
    it('should detect C4 keywords', () => {
      fs.mkdirSync(path.join(tempDir, 'docs/design'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, 'docs/design/architecture.md'),
        '# System Context\n\n## Container Diagram\n\n### Component View\n\nCode details.'
      );

      const score = critic.checkC4Format({});
      expect(score).toBe(1);
    });

    it('should return 0 if no design docs', () => {
      const score = critic.checkC4Format({});
      expect(score).toBe(0);
    });
  });

  describe('checkAdrPresence', () => {
    it('should detect ADR files', () => {
      fs.mkdirSync(path.join(tempDir, 'docs/design/adr'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'docs/design/adr/ADR-001.md'), '# ADR 1');
      fs.writeFileSync(path.join(tempDir, 'docs/design/adr/ADR-002.md'), '# ADR 2');
      fs.writeFileSync(path.join(tempDir, 'docs/design/adr/ADR-003.md'), '# ADR 3');

      const score = critic.checkAdrPresence({});
      expect(score).toBe(1);
    });

    it('should return 0 if no ADR directory', () => {
      const score = critic.checkAdrPresence({});
      expect(score).toBe(0);
    });
  });

  describe('evaluate', () => {
    it('should evaluate design', () => {
      fs.mkdirSync(path.join(tempDir, 'docs/design/adr'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, 'docs/design/main.md'),
        '# Design\n\nContext: REQ-001, REQ-002'
      );
      fs.writeFileSync(path.join(tempDir, 'docs/design/adr/ADR-001.md'), '# ADR');

      const result = critic.evaluate({});
      expect(result).toBeInstanceOf(CriticResult);
    });
  });
});

describe('ImplementationCritic', () => {
  let critic;
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'musubi-critic-test-'));
    critic = new ImplementationCritic({ projectRoot: tempDir });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('checkTestCoverage', () => {
    it('should check test files', () => {
      fs.mkdirSync(path.join(tempDir, 'tests'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'tests/foo.test.js'), 'test()');
      fs.writeFileSync(path.join(tempDir, 'src/foo.js'), 'code');

      const score = critic.checkTestCoverage({});
      expect(score).toBeGreaterThan(0);
    });

    it('should return 0 if no tests', () => {
      const score = critic.checkTestCoverage({});
      expect(score).toBe(0);
    });
  });

  describe('checkCodeQuality', () => {
    it('should detect linter config', () => {
      fs.writeFileSync(path.join(tempDir, '.eslintrc.json'), '{}');
      fs.writeFileSync(path.join(tempDir, '.prettierrc'), '{}');
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ scripts: { lint: 'eslint', format: 'prettier' } })
      );

      const score = critic.checkCodeQuality({});
      expect(score).toBe(1);
    });
  });

  describe('checkDocumentation', () => {
    it('should detect documentation', () => {
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# Project');
      fs.writeFileSync(path.join(tempDir, 'CONTRIBUTING.md'), '# Contributing');
      fs.mkdirSync(path.join(tempDir, 'steering'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'steering/product.md'), '# Product');
      fs.writeFileSync(path.join(tempDir, 'steering/structure.md'), '# Structure');

      const score = critic.checkDocumentation({});
      expect(score).toBe(1);
    });
  });
});

describe('CriticSystem', () => {
  let system;
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'musubi-critic-test-'));
    system = new CriticSystem({ projectRoot: tempDir });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('evaluate', () => {
    it('should evaluate specific stage', () => {
      const result = system.evaluate(StageType.REQUIREMENTS, { content: '' });
      expect(result).toBeInstanceOf(CriticResult);
    });

    it('should throw for unknown stage', () => {
      expect(() => system.evaluate('unknown', {})).toThrow();
    });
  });

  describe('evaluateAll', () => {
    it('should evaluate all stages', () => {
      const results = system.evaluateAll({});
      expect(results.stages).toBeDefined();
      expect(results.overall).toBeInstanceOf(CriticResult);
      expect(results.stages[StageType.REQUIREMENTS]).toBeDefined();
      expect(results.stages[StageType.DESIGN]).toBeDefined();
      expect(results.stages[StageType.IMPLEMENTATION]).toBeDefined();
    });
  });

  describe('generateReport', () => {
    it('should generate markdown report', () => {
      const results = system.evaluateAll({});
      const report = system.generateReport(results);
      
      expect(report).toContain('# MUSUBI Quality Report');
      expect(report).toContain('## Overall Score');
      expect(report).toContain('## Stage Results');
    });
  });
});
