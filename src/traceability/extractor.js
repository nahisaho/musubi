/**
 * TraceabilityExtractor Implementation
 *
 * Extracts requirement ID patterns from code, tests, commits, and documents.
 *
 * Requirement: IMP-6.2-004-01
 * Design: Section 5.1
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Requirement ID patterns
 */
const REQ_PATTERNS = [
  /REQ-[A-Z0-9]+-\d{3}/g, // REQ-XXX-NNN
  /IMP-\d+\.\d+-\d{3}(?:-\d{2})?/g, // IMP-6.2-001 or IMP-6.2-001-01
  /FEAT-\d{3}/g, // FEAT-001
  /TASK-\d{3}/g, // TASK-001
];

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  sourceDir: 'src',
  testDir: 'tests',
  docDir: 'docs',
  includePatterns: ['*.js', '*.ts', '*.tsx', '*.jsx', '*.md'],
  excludePatterns: ['node_modules/**', '*.test.js', '*.spec.js'],
  scanCommits: false,
  maxCommits: 100,
};

/**
 * TraceabilityExtractor
 *
 * Extracts requirement references from various sources.
 */
class TraceabilityExtractor {
  /**
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Extract references from a single file
   * @param {string} filePath - Path to file
   * @param {string} sourceType - Type of source (code|test|document)
   * @returns {Promise<Array>} Requirement references
   */
  async extractFromFile(filePath, sourceType) {
    try {
      await fs.access(filePath);
      const content = await fs.readFile(filePath, 'utf-8');

      return this.extractFromContent(content, filePath, sourceType);
    } catch {
      return [];
    }
  }

  /**
   * Extract references from content string
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @param {string} sourceType - Source type
   * @returns {Array} Requirement references
   */
  extractFromContent(content, filePath, sourceType) {
    const refs = [];
    const lines = content.split('\n');
    const now = new Date().toISOString();

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];

      for (const pattern of REQ_PATTERNS) {
        // Reset regex state
        pattern.lastIndex = 0;

        let match;
        while ((match = pattern.exec(line)) !== null) {
          refs.push({
            requirementId: match[0],
            sourceType,
            filePath,
            lineNumber: lineNum + 1,
            context: line.trim().substring(0, 100),
            foundAt: now,
          });
        }
      }
    }

    return refs;
  }

  /**
   * Extract references from git commits
   * @returns {Promise<Array>} Requirement references from commits
   */
  async extractFromCommits() {
    const refs = [];
    const now = new Date().toISOString();

    try {
      const maxCommits = this.config.maxCommits || 100;
      const { stdout } = await execAsync(
        `git log -${maxCommits} --format="%H|%s|%ad|%ae" --date=short`
      );

      const lines = stdout
        .trim()
        .split('\n')
        .filter(l => l.length > 0);

      for (const line of lines) {
        const [hash, message] = line.split('|');

        for (const pattern of REQ_PATTERNS) {
          pattern.lastIndex = 0;

          let match;
          while ((match = pattern.exec(message)) !== null) {
            refs.push({
              requirementId: match[0],
              sourceType: 'commit',
              commitHash: hash,
              commitMessage: message,
              context: message,
              foundAt: now,
            });
          }
        }
      }
    } catch {
      // Git not available or not in a git repo
    }

    return refs;
  }

  /**
   * Scan a directory for references
   * @param {string} dirPath - Directory path
   * @param {string} sourceType - Source type
   * @returns {Promise<Array>} Requirement references
   */
  async scanDirectory(dirPath, sourceType) {
    const refs = [];

    try {
      const entries = await fs.readdir(dirPath);

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stat = await fs.stat(fullPath);

        if (stat.isDirectory()) {
          // Skip excluded directories
          if (this.isExcluded(entry)) continue;

          const subRefs = await this.scanDirectory(fullPath, sourceType);
          refs.push(...subRefs);
        } else if (stat.isFile() && this.shouldInclude(entry)) {
          const fileRefs = await this.extractFromFile(fullPath, sourceType);
          refs.push(...fileRefs);
        }
      }
    } catch {
      // Directory not accessible
    }

    return refs;
  }

  /**
   * Extract from all configured sources
   * @returns {Promise<Array>} All requirement references
   */
  async extractAll() {
    const refs = [];

    // Extract from source code
    if (this.config.sourceDir) {
      const codeRefs = await this.scanDirectory(this.config.sourceDir, 'code');
      refs.push(...codeRefs);
    }

    // Extract from tests
    if (this.config.testDir) {
      const testRefs = await this.scanDirectory(this.config.testDir, 'test');
      refs.push(...testRefs);
    }

    // Extract from documents
    if (this.config.docDir) {
      const docRefs = await this.scanDirectory(this.config.docDir, 'document');
      refs.push(...docRefs);
    }

    // Extract from commits
    if (this.config.scanCommits) {
      const commitRefs = await this.extractFromCommits();
      refs.push(...commitRefs);
    }

    return refs;
  }

  /**
   * Group references by requirement ID
   * @param {Array} refs - References to group
   * @returns {Map<string, Array>} Grouped references
   */
  groupByRequirement(refs) {
    const grouped = new Map();

    for (const ref of refs) {
      const existing = grouped.get(ref.requirementId) || [];
      existing.push(ref);
      grouped.set(ref.requirementId, existing);
    }

    return grouped;
  }

  /**
   * Check if file should be included
   * @param {string} filename - Filename to check
   * @returns {boolean} Should include
   */
  shouldInclude(filename) {
    const includePatterns = this.config.includePatterns || [];
    const excludePatterns = this.config.excludePatterns || [];

    // Check exclude patterns first
    for (const pattern of excludePatterns) {
      if (this.matchPattern(filename, pattern)) {
        return false;
      }
    }

    // Check include patterns
    for (const pattern of includePatterns) {
      if (this.matchPattern(filename, pattern)) {
        return true;
      }
    }

    return includePatterns.length === 0;
  }

  /**
   * Check if directory/file should be excluded
   * @param {string} name - Name to check
   * @returns {boolean} Should exclude
   */
  isExcluded(name) {
    const excludePatterns = this.config.excludePatterns || [];

    for (const pattern of excludePatterns) {
      if (pattern.includes('**')) {
        // Glob pattern with directory
        const dirPattern = pattern.split('**')[0].replace(/\/$/, '');
        if (name === dirPattern) return true;
      }
    }

    return name === 'node_modules' || name.startsWith('.');
  }

  /**
   * Simple glob pattern matching
   * @param {string} filename - Filename to match
   * @param {string} pattern - Pattern to match against
   * @returns {boolean} Matches
   */
  matchPattern(filename, pattern) {
    // Convert glob pattern to regex
    const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');

    return new RegExp(`^${regexPattern}$`).test(filename);
  }
}

module.exports = { TraceabilityExtractor };
