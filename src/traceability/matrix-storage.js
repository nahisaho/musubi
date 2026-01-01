/**
 * MatrixStorage Implementation
 *
 * YAML-based persistence for traceability matrices.
 *
 * Requirement: IMP-6.2-004-03
 * Design: ADR-6.2-002
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('yaml');

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  storageDir: 'storage/traceability',
};

/**
 * MatrixStorage
 *
 * Persists traceability matrices as YAML files.
 */
class MatrixStorage {
  /**
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Save traceability matrix
   * @param {string} featureId - Feature ID
   * @param {Object} matrix - Traceability matrix
   * @returns {Promise<string>} Saved file path
   */
  async save(featureId, matrix) {
    await this.ensureStorageDir();

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${featureId}-${timestamp}.yaml`;
    const filePath = path.join(this.config.storageDir, filename);

    const yamlContent = yaml.stringify(matrix, {
      indent: 2,
      lineWidth: 0,
    });

    await fs.writeFile(filePath, yamlContent, 'utf-8');

    return filePath;
  }

  /**
   * Load traceability matrix by filename
   * @param {string} filename - Filename to load
   * @returns {Promise<Object|null>} Traceability matrix
   */
  async load(filename) {
    try {
      let filePath;

      if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
        filePath = path.join(this.config.storageDir, filename);
      } else {
        // Try to find matching file
        const files = await this.list(filename);
        if (files.length === 0) return null;
        filePath = path.join(this.config.storageDir, files[0]);
      }

      await fs.access(filePath);
      const content = await fs.readFile(filePath, 'utf-8');

      return yaml.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Load most recent matrix for feature
   * @param {string} featureId - Feature ID
   * @returns {Promise<Object|null>} Traceability matrix
   */
  async loadLatest(featureId) {
    const files = await this.list(featureId);

    if (files.length === 0) return null;

    // Sort by date (newest first)
    files.sort().reverse();

    const latestFile = files[0];
    const filePath = path.join(this.config.storageDir, latestFile);

    const content = await fs.readFile(filePath, 'utf-8');
    return yaml.parse(content);
  }

  /**
   * List saved matrices
   * @param {string} [prefix] - Optional prefix filter
   * @returns {Promise<Array>} List of filenames
   */
  async list(prefix) {
    try {
      const files = await fs.readdir(this.config.storageDir);
      const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

      if (prefix) {
        return yamlFiles.filter(f => f.startsWith(prefix));
      }

      return yamlFiles;
    } catch {
      return [];
    }
  }

  /**
   * Delete matrix file
   * @param {string} filename - Filename to delete
   */
  async delete(filename) {
    const filePath = path.join(this.config.storageDir, filename);
    await fs.access(filePath);
    await fs.unlink(filePath);
  }

  /**
   * Merge two matrices
   * @param {Object} matrix1 - First matrix
   * @param {Object} matrix2 - Second matrix
   * @returns {Object} Merged matrix
   */
  merge(matrix1, matrix2) {
    const requirements = {};

    // Get all requirement IDs
    const allReqIds = new Set([
      ...Object.keys(matrix1.requirements),
      ...Object.keys(matrix2.requirements),
    ]);

    for (const reqId of allReqIds) {
      const link1 = matrix1.requirements[reqId];
      const link2 = matrix2.requirements[reqId];

      if (link1 && link2) {
        // Merge links
        requirements[reqId] = {
          requirementId: reqId,
          design: this.mergeLinks(link1.design, link2.design),
          code: this.mergeLinks(link1.code, link2.code),
          tests: this.mergeLinks(link1.tests, link2.tests),
          commits: this.mergeLinks(link1.commits, link2.commits),
        };
      } else {
        requirements[reqId] = link1 || link2;
      }
    }

    return {
      version: matrix2.version,
      generatedAt: new Date().toISOString(),
      requirements,
      summary: this.calculateSummary(requirements),
    };
  }

  /**
   * Merge link arrays
   * @param {Array} links1 - First links array
   * @param {Array} links2 - Second links array
   * @returns {Array} Merged links
   */
  mergeLinks(links1, links2) {
    const merged = [...links1];

    for (const link of links2) {
      const exists = merged.some(l => {
        if (l.path && link.path) {
          return l.path === link.path;
        }
        if (l.hash && link.hash) {
          return l.hash === link.hash;
        }
        return false;
      });

      if (!exists) {
        merged.push(link);
      }
    }

    return merged;
  }

  /**
   * Calculate summary statistics
   * @param {Object} requirements - Requirements map
   * @returns {Object} Summary
   */
  calculateSummary(requirements) {
    const links = Object.values(requirements);
    const total = links.length;

    if (total === 0) {
      return {
        totalRequirements: 0,
        linkedRequirements: 0,
        withDesign: 0,
        withCode: 0,
        withTests: 0,
        gaps: 0,
        coveragePercentage: 0,
      };
    }

    let withDesign = 0;
    let withCode = 0;
    let withTests = 0;
    let linked = 0;
    let gapCount = 0;

    for (const link of links) {
      const hasDesign = link.design.length > 0;
      const hasCode = link.code.length > 0;
      const hasTests = link.tests.length > 0;

      if (hasDesign) withDesign++;
      if (hasCode) withCode++;
      if (hasTests) withTests++;

      if (hasDesign || hasCode || hasTests) {
        linked++;
      }

      // Count gaps
      if (!hasDesign) gapCount++;
      if (!hasCode) gapCount++;
      if (!hasTests) gapCount++;
    }

    // Calculate coverage as percentage of requirements with full coverage
    const fullyLinked = links.filter(
      l => l.design.length > 0 && l.code.length > 0 && l.tests.length > 0
    ).length;

    return {
      totalRequirements: total,
      linkedRequirements: linked,
      withDesign,
      withCode,
      withTests,
      gaps: gapCount,
      coveragePercentage: Math.round((fullyLinked / total) * 100),
    };
  }

  /**
   * Export matrix as JSON
   * @param {Object} matrix - Matrix to export
   * @returns {string} JSON string
   */
  exportAsJson(matrix) {
    return JSON.stringify(matrix, null, 2);
  }

  /**
   * Export matrix as Markdown
   * @param {Object} matrix - Matrix to export
   * @returns {string} Markdown string
   */
  exportAsMarkdown(matrix) {
    const lines = [];

    lines.push('# Traceability Matrix');
    lines.push('');
    lines.push(`Generated: ${matrix.generatedAt}`);
    lines.push(`Version: ${matrix.version}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Requirements | ${matrix.summary.totalRequirements} |`);
    lines.push(`| With Design | ${matrix.summary.withDesign} |`);
    lines.push(`| With Code | ${matrix.summary.withCode} |`);
    lines.push(`| With Tests | ${matrix.summary.withTests} |`);
    lines.push(`| Gaps | ${matrix.summary.gaps} |`);
    lines.push(`| Coverage | ${matrix.summary.coveragePercentage}% |`);
    lines.push('');

    // Requirements table
    lines.push('## Requirements');
    lines.push('');
    lines.push('| Requirement | Design | Code | Tests | Commits |');
    lines.push('|-------------|--------|------|-------|---------|');

    for (const [reqId, link] of Object.entries(matrix.requirements)) {
      const design = link.design.length > 0 ? '✅' : '❌';
      const code = link.code.length > 0 ? '✅' : '❌';
      const tests = link.tests.length > 0 ? '✅' : '❌';
      const commits = link.commits.length > 0 ? '✅' : '-';

      lines.push(`| ${reqId} | ${design} | ${code} | ${tests} | ${commits} |`);
    }

    lines.push('');

    // Details
    lines.push('## Details');
    lines.push('');

    for (const [reqId, link] of Object.entries(matrix.requirements)) {
      lines.push(`### ${reqId}`);
      lines.push('');

      if (link.design.length > 0) {
        lines.push('**Design:**');
        for (const d of link.design) {
          lines.push(`- ${d.path}`);
        }
        lines.push('');
      }

      if (link.code.length > 0) {
        lines.push('**Code:**');
        for (const c of link.code) {
          lines.push(`- ${c.path}${c.line ? `:${c.line}` : ''}`);
        }
        lines.push('');
      }

      if (link.tests.length > 0) {
        lines.push('**Tests:**');
        for (const t of link.tests) {
          lines.push(`- ${t.path}${t.line ? `:${t.line}` : ''}`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Ensure storage directory exists
   */
  async ensureStorageDir() {
    try {
      await fs.access(this.config.storageDir);
    } catch {
      await fs.mkdir(this.config.storageDir, { recursive: true });
    }
  }
}

module.exports = { MatrixStorage };
