/**
 * @fileoverview Screenshot Capture for Browser Automation
 * @module agents/browser/screenshot
 */

const path = require('path');
const fs = require('fs-extra');

/**
 * Screenshot Capture - Handles screenshot taking and management
 */
class ScreenshotCapture {
  /**
   * Create a new ScreenshotCapture instance
   * @param {string} outputDir - Output directory for screenshots
   */
  constructor(outputDir) {
    this.outputDir = outputDir;
    this.screenshots = [];
    this.counter = 0;
  }

  /**
   * Ensure the output directory exists
   * @returns {Promise<void>}
   */
  async ensureDir() {
    await fs.ensureDir(this.outputDir);
  }

  /**
   * Capture a screenshot
   * @param {import('playwright').Page} page - Playwright page
   * @param {Object} options - Capture options
   * @param {string} [options.name] - Screenshot name
   * @param {boolean} [options.fullPage=false] - Capture full page
   * @param {string} [options.type='png'] - Image type (png/jpeg)
   * @param {number} [options.quality] - JPEG quality (0-100)
   * @returns {Promise<string>} Screenshot file path
   */
  async capture(page, options = {}) {
    await this.ensureDir();

    const timestamp = Date.now();
    this.counter++;
    
    const name = options.name || `screenshot-${this.counter}`;
    const extension = options.type || 'png';
    const filename = `${timestamp}-${name}.${extension}`;
    const filePath = path.join(this.outputDir, filename);

    const screenshotOptions = {
      path: filePath,
      fullPage: options.fullPage || false,
      type: extension,
    };

    if (extension === 'jpeg' && options.quality) {
      screenshotOptions.quality = options.quality;
    }

    await page.screenshot(screenshotOptions);

    const metadata = {
      path: filePath,
      filename,
      name,
      timestamp,
      fullPage: options.fullPage || false,
      url: page.url(),
      title: await page.title(),
    };

    this.screenshots.push(metadata);

    return filePath;
  }

  /**
   * Capture an element screenshot
   * @param {import('playwright').Page} page - Playwright page
   * @param {string} selector - Element selector
   * @param {Object} options - Capture options
   * @returns {Promise<string>} Screenshot file path
   */
  async captureElement(page, selector, options = {}) {
    await this.ensureDir();

    const timestamp = Date.now();
    this.counter++;
    
    const name = options.name || `element-${this.counter}`;
    const extension = options.type || 'png';
    const filename = `${timestamp}-${name}.${extension}`;
    const filePath = path.join(this.outputDir, filename);

    const element = page.locator(selector);
    await element.screenshot({ path: filePath });

    const metadata = {
      path: filePath,
      filename,
      name,
      timestamp,
      selector,
      url: page.url(),
    };

    this.screenshots.push(metadata);

    return filePath;
  }

  /**
   * Get all captured screenshots
   * @returns {Array<Object>}
   */
  getAll() {
    return [...this.screenshots];
  }

  /**
   * Get the latest screenshot
   * @returns {Object|null}
   */
  getLatest() {
    if (this.screenshots.length === 0) {
      return null;
    }
    return this.screenshots[this.screenshots.length - 1];
  }

  /**
   * Get a screenshot by name
   * @param {string} name
   * @returns {Object|undefined}
   */
  getByName(name) {
    return this.screenshots.find(s => s.name === name);
  }

  /**
   * Clear screenshot history
   */
  clearHistory() {
    this.screenshots = [];
    this.counter = 0;
  }

  /**
   * Delete all screenshots from disk
   * @returns {Promise<void>}
   */
  async cleanup() {
    for (const screenshot of this.screenshots) {
      try {
        await fs.remove(screenshot.path);
      } catch (e) {
        // Ignore errors
      }
    }
    this.clearHistory();
  }

  /**
   * Get screenshot count
   * @returns {number}
   */
  get count() {
    return this.screenshots.length;
  }
}

module.exports = ScreenshotCapture;
