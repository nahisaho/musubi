/**
 * Steering Sync
 *
 * Automatically synchronizes steering files.
 *
 * Requirement: IMP-6.2-007-01, IMP-6.2-007-02
 * Design: Section 5.3
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  steeringDir: 'steering',
  steeringFiles: ['tech.md', 'structure.md', 'product.md'],
  projectFile: 'project.yml',
  backupDir: 'steering/backups',
};

/**
 * SteeringSync
 *
 * Manages steering file synchronization.
 */
class SteeringSync {
  /**
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update steering files for new version
   * @param {Object} versionInfo - Version information
   * @returns {Promise<Object>} Update result
   */
  async updateForVersion(versionInfo) {
    const updates = [];

    // Backup current files
    await this.backupFiles();

    // Update project.yml
    const projectUpdate = await this.updateProjectFile(versionInfo);
    if (projectUpdate) updates.push(projectUpdate);

    // Update product.md
    const productUpdate = await this.updateProductFile(versionInfo);
    if (productUpdate) updates.push(productUpdate);

    // Update tech.md if needed
    if (versionInfo.techChanges) {
      const techUpdate = await this.updateTechFile(versionInfo);
      if (techUpdate) updates.push(techUpdate);
    }

    // Update structure.md if needed
    if (versionInfo.structureChanges) {
      const structureUpdate = await this.updateStructureFile(versionInfo);
      if (structureUpdate) updates.push(structureUpdate);
    }

    return {
      version: versionInfo.version,
      updatedAt: new Date().toISOString(),
      updates,
      filesUpdated: updates.length,
    };
  }

  /**
   * Check consistency between steering files
   * @returns {Promise<Object>} Consistency check result
   */
  async checkConsistency() {
    const issues = [];

    // Load all steering files
    const project = await this.loadProjectFile();
    const product = await this.loadSteeringFile('product.md');
    const tech = await this.loadSteeringFile('tech.md');
    const structure = await this.loadSteeringFile('structure.md');

    // Check version consistency
    if (project) {
      const versionPattern = new RegExp(`v?${project.version?.replace('.', '\\.')}`, 'i');

      if (product && !versionPattern.test(product)) {
        issues.push({
          type: 'version-mismatch',
          file: 'product.md',
          message: `product.mdのバージョン（${project.version}）が不整合です`,
          suggestion: `product.mdを更新してバージョン${project.version}を反映してください`,
        });
      }
    }

    // Check for orphaned references
    if (structure) {
      // Check if directories mentioned in structure.md exist
      const dirPattern = /`([a-z-]+\/)`/g;
      let match;
      while ((match = dirPattern.exec(structure)) !== null) {
        const dirName = match[1].replace('/', '');
        try {
          await fs.access(dirName);
        } catch {
          issues.push({
            type: 'missing-directory',
            file: 'structure.md',
            message: `structure.mdで参照されているディレクトリ "${dirName}" が存在しません`,
            suggestion: `ディレクトリを作成するか、structure.mdから参照を削除してください`,
          });
        }
      }
    }

    // Check tech stack consistency
    if (tech && project?.techStack) {
      for (const techItem of project.techStack || []) {
        if (!tech.includes(techItem)) {
          issues.push({
            type: 'tech-mismatch',
            file: 'tech.md',
            message: `project.ymlの技術スタック "${techItem}" がtech.mdに記載されていません`,
            suggestion: `tech.mdに "${techItem}" を追加してください`,
          });
        }
      }
    }

    return {
      consistent: issues.length === 0,
      issues,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Auto-fix consistency issues
   * @param {Array} issues - Issues to fix
   * @returns {Promise<Object>} Fix result
   */
  async autoFix(issues) {
    const fixed = [];
    const failed = [];

    for (const issue of issues) {
      try {
        switch (issue.type) {
          case 'version-mismatch':
            // Version updates require manual review
            failed.push({
              issue,
              reason: 'バージョン更新は手動レビューが必要です',
            });
            break;

          case 'missing-directory':
            // Create missing directory
            await fs.mkdir(issue.file, { recursive: true });
            fixed.push(issue);
            break;

          default:
            failed.push({
              issue,
              reason: '自動修正がサポートされていません',
            });
        }
      } catch (error) {
        failed.push({
          issue,
          reason: error.message,
        });
      }
    }

    return {
      fixed: fixed.length,
      failed: failed.length,
      details: { fixed, failed },
      fixedAt: new Date().toISOString(),
    };
  }

  /**
   * Update project.yml file
   * @param {Object} versionInfo - Version info
   * @returns {Promise<Object|null>} Update result
   */
  async updateProjectFile(versionInfo) {
    const filePath = path.join(this.config.steeringDir, this.config.projectFile);

    try {
      let content = await fs.readFile(filePath, 'utf-8');

      // Update version
      if (versionInfo.version) {
        content = content.replace(
          /version:\s*['"]?[\d.]+['"]?/,
          `version: '${versionInfo.version}'`
        );
      }

      // Update status if provided
      if (versionInfo.status) {
        content = content.replace(/status:\s*\w+/, `status: ${versionInfo.status}`);
      }

      await fs.writeFile(filePath, content, 'utf-8');

      return {
        file: this.config.projectFile,
        changes: ['version', 'status'].filter(k => versionInfo[k]),
      };
    } catch {
      return null;
    }
  }

  /**
   * Update product.md file
   * @param {Object} versionInfo - Version info
   * @returns {Promise<Object|null>} Update result
   */
  async updateProductFile(versionInfo) {
    const filePath = path.join(this.config.steeringDir, 'product.md');

    try {
      let content = await fs.readFile(filePath, 'utf-8');
      const changes = [];

      // Update version in header
      if (versionInfo.version) {
        const versionRegex = /\*\*Version\*\*:\s*[\d.]+/;
        if (versionRegex.test(content)) {
          content = content.replace(versionRegex, `**Version**: ${versionInfo.version}`);
          changes.push('version');
        }
      }

      // Add new features to changelog section if exists
      if (versionInfo.features && versionInfo.features.length > 0) {
        const changelogMarker = '## Changelog';
        if (content.includes(changelogMarker)) {
          const featureList = versionInfo.features.map(f => `- ${f}`).join('\n');
          const changelogEntry = `\n### v${versionInfo.version}\n${featureList}\n`;
          content = content.replace(changelogMarker, `${changelogMarker}${changelogEntry}`);
          changes.push('changelog');
        }
      }

      if (changes.length > 0) {
        await fs.writeFile(filePath, content, 'utf-8');
        return { file: 'product.md', changes };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Update tech.md file
   * @param {Object} versionInfo - Version info
   * @returns {Promise<Object|null>} Update result
   */
  async updateTechFile(versionInfo) {
    const filePath = path.join(this.config.steeringDir, 'tech.md');

    try {
      let content = await fs.readFile(filePath, 'utf-8');
      const changes = [];

      // Add new dependencies
      if (versionInfo.techChanges?.newDependencies) {
        for (const dep of versionInfo.techChanges.newDependencies) {
          if (!content.includes(dep.name)) {
            // Find dependencies section and add
            const depsSection = '## Dependencies';
            if (content.includes(depsSection)) {
              const depEntry = `\n- **${dep.name}**: ${dep.description || dep.version || 'Added'}`;
              content = content.replace(depsSection, `${depsSection}${depEntry}`);
              changes.push(`added-dep:${dep.name}`);
            }
          }
        }
      }

      if (changes.length > 0) {
        await fs.writeFile(filePath, content, 'utf-8');
        return { file: 'tech.md', changes };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Update structure.md file
   * @param {Object} versionInfo - Version info
   * @returns {Promise<Object|null>} Update result
   */
  async updateStructureFile(versionInfo) {
    const filePath = path.join(this.config.steeringDir, 'structure.md');

    try {
      let content = await fs.readFile(filePath, 'utf-8');
      const changes = [];

      // Add new directories
      if (versionInfo.structureChanges?.newDirectories) {
        for (const dir of versionInfo.structureChanges.newDirectories) {
          if (!content.includes(dir.path)) {
            // Find appropriate section
            const dirEntry = `\n- \`${dir.path}/\`: ${dir.description || 'New directory'}`;
            content += dirEntry;
            changes.push(`added-dir:${dir.path}`);
          }
        }
      }

      if (changes.length > 0) {
        await fs.writeFile(filePath, content, 'utf-8');
        return { file: 'structure.md', changes };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Backup steering files
   * @returns {Promise<string>} Backup directory
   */
  async backupFiles() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.config.backupDir, timestamp);

    try {
      await fs.mkdir(backupPath, { recursive: true });

      for (const file of this.config.steeringFiles) {
        const sourcePath = path.join(this.config.steeringDir, file);
        const destPath = path.join(backupPath, file);

        try {
          const content = await fs.readFile(sourcePath, 'utf-8');
          await fs.writeFile(destPath, content, 'utf-8');
        } catch {
          // Skip files that don't exist
        }
      }

      // Also backup project.yml
      try {
        const projectSource = path.join(this.config.steeringDir, this.config.projectFile);
        const projectDest = path.join(backupPath, this.config.projectFile);
        const content = await fs.readFile(projectSource, 'utf-8');
        await fs.writeFile(projectDest, content, 'utf-8');
      } catch {
        // Skip if doesn't exist
      }

      return backupPath;
    } catch {
      return null;
    }
  }

  /**
   * Load project.yml file
   * @returns {Promise<Object|null>} Project config
   */
  async loadProjectFile() {
    try {
      const filePath = path.join(this.config.steeringDir, this.config.projectFile);
      const content = await fs.readFile(filePath, 'utf-8');

      // Simple YAML parsing for common fields
      const version = content.match(/version:\s*['"]?([\d.]+)['"]?/)?.[1];
      const name = content.match(/name:\s*['"]?([^'\n]+)['"]?/)?.[1];
      const status = content.match(/status:\s*(\w+)/)?.[1];

      return { version, name, status };
    } catch {
      return null;
    }
  }

  /**
   * Load steering file content
   * @param {string} filename - File name
   * @returns {Promise<string|null>} File content
   */
  async loadSteeringFile(filename) {
    try {
      const filePath = path.join(this.config.steeringDir, filename);
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  /**
   * Generate sync report
   * @returns {Promise<string>} Markdown report
   */
  async generateReport() {
    const consistency = await this.checkConsistency();
    const project = await this.loadProjectFile();
    const lines = [];

    lines.push('# Steering Sync Report');
    lines.push('');
    lines.push(`**Generated:** ${new Date().toISOString()}`);
    lines.push(`**Project Version:** ${project?.version || 'Unknown'}`);
    lines.push('');

    // Consistency status
    lines.push('## Consistency Check');
    lines.push('');
    if (consistency.consistent) {
      lines.push('✅ All steering files are consistent.');
    } else {
      lines.push(`⚠️ Found ${consistency.issues.length} inconsistency issues:`);
      lines.push('');
      for (const issue of consistency.issues) {
        lines.push(`- **${issue.file}**: ${issue.message}`);
        lines.push(`  - Suggestion: ${issue.suggestion}`);
      }
    }
    lines.push('');

    // File status
    lines.push('## File Status');
    lines.push('');
    lines.push('| File | Status |');
    lines.push('|------|--------|');

    for (const file of this.config.steeringFiles) {
      const content = await this.loadSteeringFile(file);
      const status = content ? '✅ Present' : '❌ Missing';
      lines.push(`| ${file} | ${status} |`);
    }
    lines.push('');

    return lines.join('\n');
  }
}

module.exports = { SteeringSync };
