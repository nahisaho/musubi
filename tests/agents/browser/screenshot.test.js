/**
 * @fileoverview Tests for Screenshot Capture
 * @module tests/agents/browser/screenshot.test.js
 */

const ScreenshotCapture = require('../../../src/agents/browser/screenshot');
const path = require('path');
const fs = require('fs-extra');

describe('ScreenshotCapture', () => {
  const TEST_OUTPUT_DIR = path.join(__dirname, 'test-screenshots');
  let capture;

  beforeEach(() => {
    capture = new ScreenshotCapture(TEST_OUTPUT_DIR);
  });

  afterEach(async () => {
    await fs.remove(TEST_OUTPUT_DIR);
  });

  describe('constructor', () => {
    test('should initialize with output directory', () => {
      expect(capture.outputDir).toBe(TEST_OUTPUT_DIR);
      expect(capture.screenshots).toEqual([]);
      expect(capture.counter).toBe(0);
    });
  });

  describe('ensureDir', () => {
    test('should create output directory', async () => {
      await capture.ensureDir();
      expect(await fs.pathExists(TEST_OUTPUT_DIR)).toBe(true);
    });
  });

  describe('getAll', () => {
    test('should return empty array initially', () => {
      expect(capture.getAll()).toEqual([]);
    });
  });

  describe('getLatest', () => {
    test('should return null when no screenshots', () => {
      expect(capture.getLatest()).toBeNull();
    });
  });

  describe('getByName', () => {
    test('should return undefined when screenshot not found', () => {
      expect(capture.getByName('nonexistent')).toBeUndefined();
    });
  });

  describe('clearHistory', () => {
    test('should clear screenshots and reset counter', () => {
      capture.screenshots = [{ path: '/test/path.png' }];
      capture.counter = 5;

      capture.clearHistory();

      expect(capture.screenshots).toEqual([]);
      expect(capture.counter).toBe(0);
    });
  });

  describe('count', () => {
    test('should return number of screenshots', () => {
      expect(capture.count).toBe(0);

      capture.screenshots = [{ path: '/a.png' }, { path: '/b.png' }];
      expect(capture.count).toBe(2);
    });
  });

  // Integration tests with mock page would require Playwright
  // These are tested in e2e tests
});
