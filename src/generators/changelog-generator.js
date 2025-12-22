/**
 * CHANGELOG Generator
 *
 * Generates CHANGELOG entries from git commits and workflow history.
 * Follows Keep a Changelog format (https://keepachangelog.com/)
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Change categories following Keep a Changelog format
 */
const CHANGE_CATEGORIES = {
  added: 'Added',
  changed: 'Changed',
  deprecated: 'Deprecated',
  removed: 'Removed',
  fixed: 'Fixed',
  security: 'Security',
};

/**
 * Commit type to category mapping
 */
const COMMIT_TYPE_MAPPING = {
  feat: 'added',
  feature: 'added',
  add: 'added',
  change: 'changed',
  refactor: 'changed',
  perf: 'changed',
  deprecate: 'deprecated',
  remove: 'removed',
  delete: 'removed',
  fix: 'fixed',
  bugfix: 'fixed',
  hotfix: 'fixed',
  security: 'security',
  sec: 'security',
};

class ChangelogGenerator {
  /**
   * Create a new ChangelogGenerator
   * @param {string} projectRoot - Project root directory
   * @param {object} options - Generator options
   */
  constructor(projectRoot = process.cwd(), options = {}) {
    this.projectRoot = projectRoot;
    this.changelogPath = path.join(projectRoot, options.changelogFile || 'CHANGELOG.md');
    this.options = {
      repoUrl: options.repoUrl || this._detectRepoUrl(),
      dateFormat: options.dateFormat || 'YYYY-MM-DD',
      ...options,
    };
  }

  /**
   * Detect repository URL from git config
   * @private
   */
  _detectRepoUrl() {
    try {
      const url = execSync('git config --get remote.origin.url', {
        cwd: this.projectRoot,
        encoding: 'utf8',
      }).trim();

      // Convert SSH URL to HTTPS
      if (url.startsWith('git@')) {
        return url.replace('git@', 'https://').replace(':', '/').replace('.git', '');
      }
      return url.replace('.git', '');
    } catch {
      return null;
    }
  }

  /**
   * Get commits since last tag
   * @param {string} fromTag - Starting tag (optional)
   * @param {string} toRef - Ending reference (default: HEAD)
   * @returns {object[]} Array of commit objects
   */
  getCommitsSinceTag(fromTag = null, toRef = 'HEAD') {
    try {
      let range = toRef;
      if (fromTag) {
        range = `${fromTag}..${toRef}`;
      } else {
        // Get the most recent tag
        try {
          const lastTag = execSync('git describe --tags --abbrev=0', {
            cwd: this.projectRoot,
            encoding: 'utf8',
          }).trim();
          range = `${lastTag}..${toRef}`;
        } catch {
          // No tags yet, get all commits
          range = toRef;
        }
      }

      const logFormat = '%H|%s|%b|%an|%ai';
      const log = execSync(`git log ${range} --pretty=format:"${logFormat}" --no-merges`, {
        cwd: this.projectRoot,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      });

      if (!log.trim()) {
        return [];
      }

      return log
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [hash, subject, body, author, date] = line.split('|');
          const parsed = this._parseCommitSubject(subject);
          return {
            hash: hash?.substring(0, 7),
            subject,
            body: body || '',
            author,
            date,
            ...parsed,
          };
        });
    } catch (error) {
      console.warn(`Warning: Could not get commits: ${error.message}`);
      return [];
    }
  }

  /**
   * Parse commit subject to extract type, scope, and description
   * @private
   */
  _parseCommitSubject(subject) {
    // Conventional Commits format: type(scope): description
    const conventionalMatch = subject.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.+)/);
    if (conventionalMatch) {
      const [, type, scope, description] = conventionalMatch;
      const category = COMMIT_TYPE_MAPPING[type.toLowerCase()] || 'changed';
      return { type, scope, description, category };
    }

    // Detect type from prefix
    for (const [prefix, category] of Object.entries(COMMIT_TYPE_MAPPING)) {
      if (subject.toLowerCase().startsWith(prefix + ':')) {
        return {
          type: prefix,
          scope: null,
          description: subject.substring(prefix.length + 1).trim(),
          category,
        };
      }
    }

    return {
      type: null,
      scope: null,
      description: subject,
      category: 'changed',
    };
  }

  /**
   * Group commits by category
   * @param {object[]} commits - Array of commits
   * @returns {object} Grouped commits by category
   */
  groupCommitsByCategory(commits) {
    const grouped = {};

    for (const category of Object.keys(CHANGE_CATEGORIES)) {
      grouped[category] = [];
    }

    for (const commit of commits) {
      const category = commit.category || 'changed';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(commit);
    }

    return grouped;
  }

  /**
   * Generate changelog entry for a version
   * @param {string} version - Version number
   * @param {object[]} commits - Array of commits
   * @param {Date} date - Release date
   * @returns {string} Markdown changelog entry
   */
  generateEntry(version, commits, date = new Date()) {
    const dateStr = date.toISOString().split('T')[0];
    const grouped = this.groupCommitsByCategory(commits);

    let entry = `## [${version}] - ${dateStr}\n\n`;

    for (const [category, categoryCommits] of Object.entries(grouped)) {
      if (categoryCommits.length === 0) continue;

      entry += `### ${CHANGE_CATEGORIES[category]}\n\n`;

      for (const commit of categoryCommits) {
        const scope = commit.scope ? `**${commit.scope}**: ` : '';
        const description = commit.description || commit.subject;
        const hashLink = this.options.repoUrl
          ? `([${commit.hash}](${this.options.repoUrl}/commit/${commit.hash}))`
          : `(${commit.hash})`;

        entry += `- ${scope}${description} ${hashLink}\n`;
      }
      entry += '\n';
    }

    return entry;
  }

  /**
   * Read existing CHANGELOG content
   * @returns {Promise<string>} Existing content or default header
   */
  async readChangelog() {
    try {
      if (await fs.pathExists(this.changelogPath)) {
        return await fs.readFile(this.changelogPath, 'utf8');
      }
    } catch {
      // File doesn't exist
    }

    // Return default header
    return `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;
  }

  /**
   * Write changelog to file
   * @param {string} content - Changelog content
   */
  async writeChangelog(content) {
    await fs.ensureDir(path.dirname(this.changelogPath));
    await fs.writeFile(this.changelogPath, content, 'utf8');
  }

  /**
   * Update CHANGELOG with new version
   * @param {string} version - New version
   * @param {string} fromTag - Previous tag (optional)
   * @returns {Promise<object>} Result with generated entry
   */
  async update(version, fromTag = null) {
    const commits = this.getCommitsSinceTag(fromTag);
    const entry = this.generateEntry(version, commits);

    const existingContent = await this.readChangelog();

    // Find insertion point (after header, before first version)
    const headerEndMatch = existingContent.match(
      /# Changelog[\s\S]*?(?=\n## \[|$)/
    );
    
    let newContent;
    if (headerEndMatch) {
      const headerEnd = headerEndMatch[0].length;
      newContent =
        existingContent.substring(0, headerEnd) +
        '\n' +
        entry +
        existingContent.substring(headerEnd);
    } else {
      newContent = existingContent + '\n' + entry;
    }

    await this.writeChangelog(newContent);

    return {
      version,
      entry,
      commitCount: commits.length,
      categories: this.groupCommitsByCategory(commits),
    };
  }

  /**
   * Generate release notes (summary format)
   * @param {string} version - Version number
   * @param {string} fromTag - Previous tag
   * @returns {string} Release notes in markdown
   */
  generateReleaseNotes(version, fromTag = null) {
    const commits = this.getCommitsSinceTag(fromTag);
    const grouped = this.groupCommitsByCategory(commits);

    let notes = `# Release ${version}\n\n`;

    // Summary
    notes += `## Summary\n\n`;
    notes += `This release includes ${commits.length} commits.\n\n`;

    // Highlights (breaking changes and major features first)
    const highlights = [
      ...grouped.security,
      ...grouped.added.filter(c => c.scope === 'breaking' || c.description?.includes('!:')),
    ];

    if (highlights.length > 0) {
      notes += `## Highlights\n\n`;
      for (const commit of highlights) {
        notes += `- ${commit.description || commit.subject}\n`;
      }
      notes += '\n';
    }

    // Categories
    for (const [category, categoryCommits] of Object.entries(grouped)) {
      if (categoryCommits.length === 0) continue;

      notes += `## ${CHANGE_CATEGORIES[category]}\n\n`;
      for (const commit of categoryCommits) {
        notes += `- ${commit.description || commit.subject}\n`;
      }
      notes += '\n';
    }

    return notes;
  }
}

module.exports = { ChangelogGenerator, CHANGE_CATEGORIES, COMMIT_TYPE_MAPPING };
