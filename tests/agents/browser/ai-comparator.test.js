/**
 * @fileoverview Tests for AI Comparator
 * @module tests/agents/browser/ai-comparator.test.js
 */

const AIComparator = require('../../../src/agents/browser/ai-comparator');
const path = require('path');
const fs = require('fs-extra');

describe('AIComparator', () => {
  const TEST_DIR = path.join(__dirname, 'test-comparison');
  let comparator;

  beforeEach(() => {
    comparator = new AIComparator({
      threshold: 0.95,
    });
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  describe('constructor', () => {
    test('should initialize with default values', () => {
      const c = new AIComparator();
      expect(c.model).toBe('gpt-4-vision-preview');
      expect(c.threshold).toBe(0.95);
    });

    test('should accept custom options', () => {
      const c = new AIComparator({
        model: 'claude-3-opus-20240229',
        threshold: 0.90,
        apiKey: 'test-key',
      });
      expect(c.model).toBe('claude-3-opus-20240229');
      expect(c.threshold).toBe(0.90);
      expect(c.apiKey).toBe('test-key');
    });
  });

  describe('compare', () => {
    test('should throw error if expected file not found', async () => {
      await expect(
        comparator.compare('/nonexistent/expected.png', '/nonexistent/actual.png')
      ).rejects.toThrow('Expected screenshot not found');
    });

    test('should throw error if actual file not found', async () => {
      // Create expected file
      await fs.ensureDir(TEST_DIR);
      const expectedPath = path.join(TEST_DIR, 'expected.png');
      await fs.writeFile(expectedPath, Buffer.from('fake image data'));

      await expect(
        comparator.compare(expectedPath, '/nonexistent/actual.png')
      ).rejects.toThrow('Actual screenshot not found');
    });

    test('should use fallback comparison when no API key', async () => {
      // Create test files
      await fs.ensureDir(TEST_DIR);
      const expectedPath = path.join(TEST_DIR, 'expected.png');
      const actualPath = path.join(TEST_DIR, 'actual.png');
      
      const imageData = Buffer.from('PNG image data here');
      await fs.writeFile(expectedPath, imageData);
      await fs.writeFile(actualPath, imageData);

      const result = await comparator.compare(expectedPath, actualPath);

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
      expect(typeof result.similarity).toBe('number');
      expect(result.details.method).toBe('fallback-size-comparison');
    });

    test('should pass for identical files', async () => {
      await fs.ensureDir(TEST_DIR);
      const expectedPath = path.join(TEST_DIR, 'expected.png');
      const actualPath = path.join(TEST_DIR, 'actual.png');
      
      const imageData = Buffer.from('identical image data');
      await fs.writeFile(expectedPath, imageData);
      await fs.writeFile(actualPath, imageData);

      const result = await comparator.compare(expectedPath, actualPath, {
        threshold: 0.95,
      });

      expect(result.passed).toBe(true);
      expect(result.similarity).toBe(100);
    });

    test('should fail for different files with high threshold', async () => {
      await fs.ensureDir(TEST_DIR);
      const expectedPath = path.join(TEST_DIR, 'expected.png');
      const actualPath = path.join(TEST_DIR, 'actual.png');
      
      await fs.writeFile(expectedPath, Buffer.from('data1'));
      await fs.writeFile(actualPath, Buffer.from('completely different data here'));

      const result = await comparator.compare(expectedPath, actualPath, {
        threshold: 0.99,
      });

      expect(result.passed).toBe(false);
      expect(result.similarity).toBeLessThan(100);
    });
  });

  describe('imageToBase64', () => {
    test('should convert image to base64', async () => {
      await fs.ensureDir(TEST_DIR);
      const imagePath = path.join(TEST_DIR, 'test.png');
      await fs.writeFile(imagePath, Buffer.from('test image'));

      const base64 = await comparator.imageToBase64(imagePath);

      expect(typeof base64).toBe('string');
      expect(base64).toBe(Buffer.from('test image').toString('base64'));
    });
  });

  describe('generateReport', () => {
    test('should generate report for passed comparison', () => {
      const result = {
        passed: true,
        similarity: 98,
        threshold: 95,
        differences: [],
        details: { method: 'ai-comparison' },
      };

      const report = comparator.generateReport(result);

      expect(report).toContain('# Screenshot Comparison Report');
      expect(report).toContain('✅ PASSED');
      expect(report).toContain('98%');
    });

    test('should generate report for failed comparison', () => {
      const result = {
        passed: false,
        similarity: 70,
        threshold: 95,
        differences: ['Layout differs', 'Color mismatch'],
        details: { method: 'ai-comparison' },
      };

      const report = comparator.generateReport(result);

      expect(report).toContain('❌ FAILED');
      expect(report).toContain('70%');
      expect(report).toContain('## Differences Found');
      expect(report).toContain('Layout differs');
      expect(report).toContain('Color mismatch');
    });
  });
});
