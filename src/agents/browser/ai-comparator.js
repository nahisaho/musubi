/**
 * @fileoverview AI Comparator for Screenshot Comparison
 * @module agents/browser/ai-comparator
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * @typedef {Object} ComparisonResult
 * @property {boolean} passed - Whether comparison passed
 * @property {number} similarity - Similarity percentage (0-100)
 * @property {Array<string>} differences - List of differences found
 * @property {Object} details - Detailed comparison info
 */

/**
 * AI Comparator - Compares screenshots using AI vision models
 */
class AIComparator {
  /**
   * Create a new AIComparator instance
   * @param {Object} options - Configuration options
   * @param {string} [options.model='gpt-4-vision-preview'] - Vision model to use
   * @param {number} [options.threshold=0.95] - Similarity threshold (0-1)
   * @param {string} [options.apiKey] - API key for the vision service
   */
  constructor(options = {}) {
    this.model = options.model || 'gpt-4-vision-preview';
    this.threshold = options.threshold || 0.95;
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  }

  /**
   * Compare two screenshots
   * @param {string} expectedPath - Path to expected screenshot
   * @param {string} actualPath - Path to actual screenshot
   * @param {Object} options - Comparison options
   * @param {number} [options.threshold] - Override threshold
   * @param {string} [options.description] - What to verify
   * @returns {Promise<ComparisonResult>}
   */
  async compare(expectedPath, actualPath, options = {}) {
    const threshold = options.threshold || this.threshold;
    const description = options.description || 'Compare visual appearance';

    // Check if files exist
    if (!await fs.pathExists(expectedPath)) {
      throw new Error(`Expected screenshot not found: ${expectedPath}`);
    }
    if (!await fs.pathExists(actualPath)) {
      throw new Error(`Actual screenshot not found: ${actualPath}`);
    }

    // If no API key, use fallback comparison
    if (!this.apiKey) {
      return this.fallbackCompare(expectedPath, actualPath, threshold);
    }

    try {
      // Read images as base64
      const expectedBase64 = await this.imageToBase64(expectedPath);
      const actualBase64 = await this.imageToBase64(actualPath);

      // Call Vision API
      const result = await this.callVisionAPI(expectedBase64, actualBase64, description);
      
      return {
        passed: result.similarity >= threshold * 100,
        similarity: result.similarity,
        differences: result.differences || [],
        details: result.details || {},
        threshold: threshold * 100,
      };
    } catch (error) {
      console.warn(`Vision API error, using fallback: ${error.message}`);
      return this.fallbackCompare(expectedPath, actualPath, threshold);
    }
  }

  /**
   * Convert image file to base64
   * @param {string} imagePath
   * @returns {Promise<string>}
   */
  async imageToBase64(imagePath) {
    const buffer = await fs.readFile(imagePath);
    return buffer.toString('base64');
  }

  /**
   * Call the Vision API for comparison
   * @param {string} expectedBase64
   * @param {string} actualBase64
   * @param {string} description
   * @returns {Promise<Object>}
   */
  async callVisionAPI(expectedBase64, actualBase64, description) {
    // OpenAI API call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert at comparing web page screenshots. 
            Analyze the two images and provide:
            1. A similarity score from 0-100
            2. A list of visual differences
            3. Whether this is a critical difference
            
            Respond in JSON format:
            {
              "similarity": <number 0-100>,
              "differences": ["difference 1", "difference 2"],
              "critical": <boolean>,
              "details": { "layout": "...", "content": "...", "style": "..." }
            }`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Compare these two screenshots. ${description}`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${expectedBase64}`,
                  detail: 'high',
                },
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${actualBase64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    try {
      // Try to parse JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Parsing failed
    }

    // Return a default result if parsing failed
    return {
      similarity: 50,
      differences: ['Unable to parse comparison result'],
      critical: true,
      details: { raw: content },
    };
  }

  /**
   * Fallback comparison when Vision API is not available
   * Uses file size comparison as a basic heuristic
   * @param {string} expectedPath
   * @param {string} actualPath
   * @param {number} threshold
   * @returns {Promise<ComparisonResult>}
   */
  async fallbackCompare(expectedPath, actualPath, threshold) {
    const [expectedStat, actualStat] = await Promise.all([
      fs.stat(expectedPath),
      fs.stat(actualPath),
    ]);

    // Calculate size difference
    const sizeDiff = Math.abs(expectedStat.size - actualStat.size);
    const maxSize = Math.max(expectedStat.size, actualStat.size);
    const sizeRatio = 1 - (sizeDiff / maxSize);

    // Simple heuristic: if sizes are similar, likely similar images
    // This is a rough approximation and should be replaced with actual image comparison
    const similarity = Math.round(sizeRatio * 100);

    return {
      passed: similarity >= threshold * 100,
      similarity,
      differences: similarity < threshold * 100 
        ? [`File size differs by ${sizeDiff} bytes (${((1 - sizeRatio) * 100).toFixed(1)}%)`]
        : [],
      details: {
        method: 'fallback-size-comparison',
        expectedSize: expectedStat.size,
        actualSize: actualStat.size,
        note: 'Using fallback comparison. Set OPENAI_API_KEY for AI-powered comparison.',
      },
      threshold: threshold * 100,
    };
  }

  /**
   * Generate a comparison report
   * @param {ComparisonResult} result
   * @param {Object} options
   * @returns {string}
   */
  generateReport(result, options = {}) {
    const lines = [
      '# Screenshot Comparison Report',
      '',
      `**Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`,
      `**Similarity**: ${result.similarity}%`,
      `**Threshold**: ${result.threshold}%`,
      '',
    ];

    if (result.differences.length > 0) {
      lines.push('## Differences Found');
      lines.push('');
      for (const diff of result.differences) {
        lines.push(`- ${diff}`);
      }
      lines.push('');
    }

    if (result.details) {
      lines.push('## Details');
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(result.details, null, 2));
      lines.push('```');
    }

    return lines.join('\n');
  }
}

module.exports = AIComparator;
