/**
 * MUSUBI Change Manager
 *
 * Manages delta specifications for brownfield projects
 * Implements ADDED/MODIFIED/REMOVED/RENAMED change tracking
 */

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');

class ChangeManager {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Initialize new change proposal
   */
  async initChange(changeId, options = {}) {
    const changesDir = path.join(this.workspaceRoot, options.changesDir || 'storage/changes');
    const changeFile = path.join(changesDir, `${changeId}.md`);

    // Check if change already exists
    if (await fs.pathExists(changeFile)) {
      throw new Error(`Change ${changeId} already exists`);
    }

    // Create changes directory if it doesn't exist
    await fs.mkdirp(changesDir);

    // Load template
    const template = await this.loadTemplate(options.template);

    // Create change document
    const content = this.renderTemplate(template, {
      changeId,
      title: options.title || 'New Change',
      description: options.description || 'Description of the change',
      date: new Date().toISOString().split('T')[0],
    });

    await fs.writeFile(changeFile, content, 'utf-8');

    return {
      file: changeFile,
      changeId,
    };
  }

  /**
   * Apply change to codebase
   */
  async applyChange(changeId, options = {}) {
    const changesDir = path.join(this.workspaceRoot, options.changesDir || 'storage/changes');
    const changeFile = path.join(changesDir, `${changeId}.md`);

    // Check if change exists
    if (!(await fs.pathExists(changeFile))) {
      throw new Error(`Change ${changeId} not found`);
    }

    // Parse delta specification
    const delta = await this.parseDelta(changeFile);

    // Validate if not force
    if (!options.force) {
      const validation = await this.validateDelta(delta);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }
    }

    const stats = {
      added: 0,
      modified: 0,
      removed: 0,
      renamed: 0,
    };

    if (!options.dryRun) {
      // Apply ADDED items
      for (const item of delta.added) {
        await this.applyAdded(item);
        stats.added++;
      }

      // Apply MODIFIED items
      for (const item of delta.modified) {
        await this.applyModified(item);
        stats.modified++;
      }

      // Apply REMOVED items
      for (const item of delta.removed) {
        await this.applyRemoved(item);
        stats.removed++;
      }

      // Apply RENAMED items
      for (const item of delta.renamed) {
        await this.applyRenamed(item);
        stats.renamed++;
      }
    } else {
      // Dry run - just count
      stats.added = delta.added.length;
      stats.modified = delta.modified.length;
      stats.removed = delta.removed.length;
      stats.renamed = delta.renamed.length;
    }

    return { stats };
  }

  /**
   * Archive completed change
   */
  async archiveChange(changeId, options = {}) {
    const changesDir = path.join(this.workspaceRoot, options.changesDir || 'storage/changes');
    const specsDir = path.join(this.workspaceRoot, options.specsDir || 'specs');
    const sourceFile = path.join(changesDir, `${changeId}.md`);
    const archiveFile = path.join(specsDir, 'changes', `${changeId}.md`);

    // Check if change exists
    if (!(await fs.pathExists(sourceFile))) {
      throw new Error(`Change ${changeId} not found`);
    }

    // Create specs/changes directory
    await fs.mkdirp(path.dirname(archiveFile));

    // Parse delta and merge to canonical specs
    const delta = await this.parseDelta(sourceFile);
    await this.mergeDeltaToSpecs(delta, specsDir);

    // Move change file to archive
    await fs.move(sourceFile, archiveFile, { overwrite: true });

    return {
      source: sourceFile,
      archive: archiveFile,
    };
  }

  /**
   * List all changes
   */
  async listChanges(options = {}) {
    const changesDir = path.join(this.workspaceRoot, options.changesDir || 'storage/changes');

    if (!(await fs.pathExists(changesDir))) {
      return [];
    }

    const files = glob.sync('*.md', { cwd: changesDir, absolute: true });
    const changes = [];

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const changeId = path.basename(file, '.md');

      // Extract title and date
      const titleMatch = content.match(/# (.+)/);
      const dateMatch = content.match(/\*\*Date\*\*: (.+)/);

      // Determine status (simplified - could be more sophisticated)
      const status = 'pending'; // In real implementation, track applied/archived status

      changes.push({
        id: changeId,
        title: titleMatch ? titleMatch[1] : changeId,
        date: dateMatch ? dateMatch[1] : 'Unknown',
        status,
        file: path.relative(this.workspaceRoot, file),
      });
    }

    // Filter by status if specified
    if (options.status) {
      return changes.filter(c => c.status === options.status);
    }

    // Sort by ID for consistent ordering
    return changes.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Validate delta specification
   */
  async validateChange(changeId, options = {}) {
    const changesDir = path.join(this.workspaceRoot, options.changesDir || 'storage/changes');
    const changeFile = path.join(changesDir, `${changeId}.md`);

    // Check if change exists
    if (!(await fs.pathExists(changeFile))) {
      throw new Error(`Change ${changeId} not found`);
    }

    // Parse delta
    const delta = await this.parseDelta(changeFile);

    // Validate
    const validation = await this.validateDelta(delta);

    return {
      valid: validation.valid,
      errors: validation.errors,
      stats: {
        added: delta.added.length,
        modified: delta.modified.length,
        removed: delta.removed.length,
        renamed: delta.renamed.length,
      },
    };
  }

  /**
   * Load template
   */
  async loadTemplate(customTemplate) {
    if (customTemplate && (await fs.pathExists(customTemplate))) {
      return fs.readFile(customTemplate, 'utf-8');
    }

    // Default template
    return `# {{title}}

**Change ID**: {{changeId}}  
**Date**: {{date}}  
**Status**: Pending

## Description

{{description}}

## Requirements Changes

### ADDED

<!-- List new requirements here -->

### MODIFIED

<!-- List modified requirements here -->

### REMOVED

<!-- List removed requirements here -->

### RENAMED

<!-- List renamed requirements here -->

## Design Changes

### ADDED

<!-- List new design elements -->

### MODIFIED

<!-- List modified design elements -->

### REMOVED

<!-- List removed design elements -->

## Code Changes

### ADDED

<!-- List new files/modules -->

### MODIFIED

<!-- List modified files/modules -->

### REMOVED

<!-- List removed files/modules -->

### RENAMED

<!-- List renamed files/modules -->

## Impact Analysis

### Affected Components

- [Component 1]
- [Component 2]

### Breaking Changes

- [ ] No breaking changes
- [ ] Breaking changes (list below)

### Migration Steps

1. [Migration step 1]
2. [Migration step 2]

## Testing

### Test Changes

- [ ] Unit tests updated
- [ ] Integration tests updated
- [ ] E2E tests updated

### Test Coverage

- Current coverage: XX%
- Target coverage: XX%

## Traceability

### Requirements → Design → Code → Tests

- REQ-XXX-001 → Design-A → Module-B → Test-C

## Approval

- [ ] Technical review complete
- [ ] Product review complete
- [ ] Security review complete (if needed)
- [ ] Ready to apply
`;
  }

  /**
   * Render template with data
   */
  renderTemplate(template, data) {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  /**
   * Parse delta specification
   */
  async parseDelta(deltaFile) {
    const content = await fs.readFile(deltaFile, 'utf-8');

    const delta = {
      added: [],
      modified: [],
      removed: [],
      renamed: [],
    };

    // Simple parser - extract items under each section
    const sections = ['ADDED', 'MODIFIED', 'REMOVED', 'RENAMED'];

    for (const section of sections) {
      const sectionRegex = new RegExp(`### ${section}\\s+([\\s\\S]*?)(?=###|$)`, 'g');
      const matches = content.matchAll(sectionRegex);

      for (const match of matches) {
        const sectionContent = match[1];
        const items = this.parseItems(sectionContent);
        delta[section.toLowerCase()].push(...items);
      }
    }

    return delta;
  }

  /**
   * Parse items from section content
   */
  parseItems(content) {
    const items = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and HTML comments
      if (!trimmed || trimmed.startsWith('<!--') || trimmed.startsWith('##')) {
        continue;
      }

      if (trimmed.startsWith('- REQ-')) {
        // Extract requirement ID and title
        const match = trimmed.match(/- (REQ-[A-Z0-9]+-\d{3}):?\s*(.+)?/);
        if (match) {
          items.push({
            id: match[1],
            title: match[2] || '',
            line: trimmed,
          });
        }
      }
    }

    return items;
  }

  /**
   * Validate delta specification
   */
  async validateDelta(delta) {
    const errors = [];

    // Check for valid REQ IDs
    const allItems = [...delta.added, ...delta.modified, ...delta.removed, ...delta.renamed];

    for (const item of allItems) {
      if (!item.id || !item.id.match(/^REQ-[A-Z0-9]+-\d{3}$/)) {
        errors.push({
          message: `Invalid requirement ID: ${item.id}`,
          line: item.line,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Apply ADDED item
   */
  async applyAdded(item) {
    // In real implementation, this would create new requirement/design/code
    // For now, just a placeholder
    return item;
  }

  /**
   * Apply MODIFIED item
   */
  async applyModified(item) {
    // In real implementation, this would update existing requirement/design/code
    return item;
  }

  /**
   * Apply REMOVED item
   */
  async applyRemoved(item) {
    // In real implementation, this would remove requirement/design/code
    return item;
  }

  /**
   * Apply RENAMED item
   */
  async applyRenamed(item) {
    // In real implementation, this would rename requirement/design/code
    return item;
  }

  /**
   * Merge delta to canonical specs
   */
  async mergeDeltaToSpecs(delta, specsDir) {
    // In real implementation, this would merge changes to canonical specs
    // For now, just ensure specs directory exists
    await fs.mkdirp(specsDir);
    return delta;
  }
}

module.exports = ChangeManager;
