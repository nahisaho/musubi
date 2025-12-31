/**
 * Rollback Manager
 * 
 * Supports rollback to previous state with cleanup.
 * 
 * Requirement: IMP-6.2-008-02
 * 
 * @module enterprise/rollback-manager
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

/**
 * Rollback granularity levels
 */
const ROLLBACK_LEVEL = {
  FILE: 'file',
  COMMIT: 'commit',
  STAGE: 'stage',
  SPRINT: 'sprint'
};

/**
 * Rollback status
 */
const ROLLBACK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Workflow stages
 */
const WORKFLOW_STAGE = {
  REQUIREMENTS: 'requirements',
  DESIGN: 'design',
  TASKS: 'tasks',
  IMPLEMENT: 'implement',
  VALIDATE: 'validate'
};

/**
 * Rollback Manager
 */
class RollbackManager {
  /**
   * Create a new RollbackManager
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = {
      storageDir: config.storageDir || 'storage/rollbacks',
      backupDir: config.backupDir || 'storage/backups',
      maxHistory: config.maxHistory || 50,
      requireConfirmation: config.requireConfirmation !== false,
      gitEnabled: config.gitEnabled !== false,
      ...config
    };

    this.rollbackHistory = [];
    this.checkpoints = new Map();
  }

  /**
   * Create a checkpoint for rollback
   * @param {string} name - Checkpoint name
   * @param {Object} options - Checkpoint options
   * @returns {Promise<Object>} Checkpoint info
   */
  async createCheckpoint(name, options = {}) {
    const checkpoint = {
      id: this.generateId('ckpt'),
      name,
      timestamp: new Date().toISOString(),
      level: options.level || ROLLBACK_LEVEL.COMMIT,
      stage: options.stage || WORKFLOW_STAGE.IMPLEMENT,
      description: options.description || '',
      files: [],
      gitRef: null,
      metadata: options.metadata || {}
    };

    // Capture current state
    if (options.files && options.files.length > 0) {
      checkpoint.files = await this.captureFiles(options.files);
    }

    // Capture git ref if enabled
    if (this.config.gitEnabled) {
      checkpoint.gitRef = this.getCurrentGitRef();
    }

    // Store checkpoint
    this.checkpoints.set(checkpoint.id, checkpoint);
    await this.saveCheckpoint(checkpoint);

    return checkpoint;
  }

  /**
   * Capture file contents for backup
   * @param {Array<string>} files - File paths
   * @returns {Promise<Array>} File backups
   */
  async captureFiles(files) {
    const backups = [];

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const stats = await fs.stat(filePath);
        
        backups.push({
          path: filePath,
          content,
          mode: stats.mode,
          mtime: stats.mtime.toISOString(),
          size: stats.size
        });
      } catch (error) {
        // File doesn't exist or can't be read
        backups.push({
          path: filePath,
          exists: false,
          error: error.message
        });
      }
    }

    return backups;
  }

  /**
   * Get current git reference
   * @returns {string|null} Git ref
   */
  getCurrentGitRef() {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      return null;
    }
  }

  /**
   * Rollback to checkpoint
   * @param {string} checkpointId - Checkpoint ID
   * @param {Object} options - Rollback options
   * @returns {Promise<Object>} Rollback result
   */
  async rollback(checkpointId, options = {}) {
    const checkpoint = this.checkpoints.get(checkpointId) || await this.loadCheckpoint(checkpointId);
    
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    // Create rollback record
    const rollback = {
      id: this.generateId('rb'),
      checkpointId,
      timestamp: new Date().toISOString(),
      status: ROLLBACK_STATUS.PENDING,
      level: checkpoint.level,
      beforeState: null,
      changes: [],
      options
    };

    // Require confirmation if enabled
    if (this.config.requireConfirmation && !options.confirmed) {
      return {
        ...rollback,
        status: ROLLBACK_STATUS.PENDING,
        requiresConfirmation: true,
        checkpoint: this.summarizeCheckpoint(checkpoint)
      };
    }

    try {
      rollback.status = ROLLBACK_STATUS.IN_PROGRESS;

      // Capture current state before rollback
      if (checkpoint.files.length > 0) {
        rollback.beforeState = await this.captureFiles(
          checkpoint.files.map(f => f.path)
        );
      }

      // Perform rollback based on level
      switch (checkpoint.level) {
        case ROLLBACK_LEVEL.FILE:
          rollback.changes = await this.rollbackFiles(checkpoint);
          break;
        case ROLLBACK_LEVEL.COMMIT:
          rollback.changes = await this.rollbackToCommit(checkpoint);
          break;
        case ROLLBACK_LEVEL.STAGE:
          rollback.changes = await this.rollbackToStage(checkpoint);
          break;
        case ROLLBACK_LEVEL.SPRINT:
          rollback.changes = await this.rollbackToSprint(checkpoint);
          break;
        default:
          throw new Error(`Unknown rollback level: ${checkpoint.level}`);
      }

      rollback.status = ROLLBACK_STATUS.COMPLETED;
    } catch (error) {
      rollback.status = ROLLBACK_STATUS.FAILED;
      rollback.error = error.message;
    }

    // Record rollback
    this.rollbackHistory.unshift(rollback);
    await this.saveRollback(rollback);

    return rollback;
  }

  /**
   * Rollback files to checkpoint state
   * @param {Object} checkpoint - Checkpoint data
   * @returns {Promise<Array>} Changes made
   */
  async rollbackFiles(checkpoint) {
    const changes = [];

    for (const file of checkpoint.files) {
      try {
        if (file.exists === false) {
          // File didn't exist at checkpoint - delete if exists now
          try {
            await fs.unlink(file.path);
            changes.push({ path: file.path, action: 'deleted' });
          } catch {
            // File doesn't exist, nothing to delete
          }
        } else {
          // Restore file content
          await fs.mkdir(path.dirname(file.path), { recursive: true });
          await fs.writeFile(file.path, file.content, 'utf-8');
          changes.push({ path: file.path, action: 'restored' });
        }
      } catch (error) {
        changes.push({ path: file.path, action: 'failed', error: error.message });
      }
    }

    return changes;
  }

  /**
   * Rollback to git commit
   * @param {Object} checkpoint - Checkpoint data
   * @returns {Promise<Array>} Changes made
   */
  async rollbackToCommit(checkpoint) {
    const changes = [];

    if (!this.config.gitEnabled || !checkpoint.gitRef) {
      throw new Error('Git rollback not available');
    }

    try {
      // Create backup branch
      const backupBranch = `backup-${Date.now()}`;
      execSync(`git branch ${backupBranch}`, { encoding: 'utf-8' });
      changes.push({ action: 'branch-created', branch: backupBranch });

      // Reset to checkpoint
      execSync(`git reset --hard ${checkpoint.gitRef}`, { encoding: 'utf-8' });
      changes.push({ action: 'reset', ref: checkpoint.gitRef });
    } catch (error) {
      changes.push({ action: 'failed', error: error.message });
    }

    return changes;
  }

  /**
   * Rollback to workflow stage
   * @param {Object} checkpoint - Checkpoint data
   * @returns {Promise<Array>} Changes made
   */
  async rollbackToStage(checkpoint) {
    const changes = [];

    // Rollback files first
    if (checkpoint.files.length > 0) {
      const fileChanges = await this.rollbackFiles(checkpoint);
      changes.push(...fileChanges);
    }

    // Update workflow state
    changes.push({ action: 'stage-reset', stage: checkpoint.stage });

    return changes;
  }

  /**
   * Rollback to sprint start
   * @param {Object} checkpoint - Checkpoint data
   * @returns {Promise<Array>} Changes made
   */
  async rollbackToSprint(checkpoint) {
    const changes = [];

    // Full rollback including git and files
    if (checkpoint.gitRef && this.config.gitEnabled) {
      const commitChanges = await this.rollbackToCommit(checkpoint);
      changes.push(...commitChanges);
    }

    if (checkpoint.files.length > 0) {
      const fileChanges = await this.rollbackFiles(checkpoint);
      changes.push(...fileChanges);
    }

    changes.push({ action: 'sprint-reset', metadata: checkpoint.metadata });

    return changes;
  }

  /**
   * Cancel pending rollback
   * @param {string} rollbackId - Rollback ID
   * @returns {Object} Updated rollback
   */
  cancelRollback(rollbackId) {
    const rollback = this.rollbackHistory.find(r => r.id === rollbackId);
    
    if (!rollback) {
      throw new Error(`Rollback not found: ${rollbackId}`);
    }

    if (rollback.status !== ROLLBACK_STATUS.PENDING) {
      throw new Error(`Cannot cancel rollback in status: ${rollback.status}`);
    }

    rollback.status = ROLLBACK_STATUS.CANCELLED;
    rollback.cancelledAt = new Date().toISOString();

    return rollback;
  }

  /**
   * Get rollback history
   * @param {Object} filter - Filter options
   * @returns {Array} Filtered history
   */
  getHistory(filter = {}) {
    let history = [...this.rollbackHistory];

    if (filter.status) {
      history = history.filter(r => r.status === filter.status);
    }
    if (filter.level) {
      history = history.filter(r => r.level === filter.level);
    }
    if (filter.limit) {
      history = history.slice(0, filter.limit);
    }

    return history;
  }

  /**
   * List checkpoints
   * @param {Object} filter - Filter options
   * @returns {Array} Checkpoints
   */
  listCheckpoints(filter = {}) {
    let checkpoints = Array.from(this.checkpoints.values());

    if (filter.level) {
      checkpoints = checkpoints.filter(c => c.level === filter.level);
    }
    if (filter.stage) {
      checkpoints = checkpoints.filter(c => c.stage === filter.stage);
    }

    return checkpoints.map(c => this.summarizeCheckpoint(c));
  }

  /**
   * Summarize checkpoint for display
   * @param {Object} checkpoint - Checkpoint data
   * @returns {Object} Summary
   */
  summarizeCheckpoint(checkpoint) {
    return {
      id: checkpoint.id,
      name: checkpoint.name,
      timestamp: checkpoint.timestamp,
      level: checkpoint.level,
      stage: checkpoint.stage,
      description: checkpoint.description,
      fileCount: checkpoint.files.length,
      hasGitRef: !!checkpoint.gitRef
    };
  }

  /**
   * Save checkpoint to storage
   * @param {Object} checkpoint - Checkpoint data
   * @returns {Promise<string>} File path
   */
  async saveCheckpoint(checkpoint) {
    await this.ensureStorageDir();
    
    const fileName = `checkpoint-${checkpoint.id}.json`;
    const filePath = path.join(this.config.storageDir, fileName);
    
    await fs.writeFile(filePath, JSON.stringify(checkpoint, null, 2), 'utf-8');
    return filePath;
  }

  /**
   * Load checkpoint from storage
   * @param {string} id - Checkpoint ID
   * @returns {Promise<Object|null>} Checkpoint or null
   */
  async loadCheckpoint(id) {
    const fileName = `checkpoint-${id}.json`;
    const filePath = path.join(this.config.storageDir, fileName);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const checkpoint = JSON.parse(content);
      this.checkpoints.set(id, checkpoint);
      return checkpoint;
    } catch {
      return null;
    }
  }

  /**
   * Save rollback record
   * @param {Object} rollback - Rollback data
   * @returns {Promise<string>} File path
   */
  async saveRollback(rollback) {
    await this.ensureStorageDir();
    
    const fileName = `rollback-${rollback.id}.json`;
    const filePath = path.join(this.config.storageDir, fileName);
    
    await fs.writeFile(filePath, JSON.stringify(rollback, null, 2), 'utf-8');
    return filePath;
  }

  /**
   * Ensure storage directory exists
   * @returns {Promise<void>}
   */
  async ensureStorageDir() {
    await fs.mkdir(this.config.storageDir, { recursive: true });
  }

  /**
   * Generate unique ID
   * @param {string} prefix - ID prefix
   * @returns {string} Unique ID
   */
  generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate rollback report
   * @param {string} rollbackId - Rollback ID
   * @returns {string} Markdown report
   */
  generateReport(rollbackId) {
    const rollback = this.rollbackHistory.find(r => r.id === rollbackId);
    
    if (!rollback) {
      throw new Error(`Rollback not found: ${rollbackId}`);
    }

    const lines = [];

    lines.push('# Rollback Report');
    lines.push('');
    lines.push(`**Rollback ID**: ${rollback.id}`);
    lines.push(`**Checkpoint ID**: ${rollback.checkpointId}`);
    lines.push(`**Timestamp**: ${rollback.timestamp}`);
    lines.push(`**Status**: ${rollback.status}`);
    lines.push(`**Level**: ${rollback.level}`);
    lines.push('');

    if (rollback.status === ROLLBACK_STATUS.COMPLETED) {
      lines.push('## Changes Applied');
      lines.push('');
      lines.push('| Path/Action | Result |');
      lines.push('|-------------|--------|');
      for (const change of rollback.changes) {
        if (change.path) {
          lines.push(`| ${change.path} | ${change.action} |`);
        } else {
          lines.push(`| ${change.action} | ${change.ref || change.branch || 'OK'} |`);
        }
      }
      lines.push('');
    }

    if (rollback.status === ROLLBACK_STATUS.FAILED) {
      lines.push('## Error');
      lines.push('');
      lines.push(`\`\`\`\n${rollback.error}\n\`\`\``);
    }

    return lines.join('\n');
  }

  /**
   * Delete checkpoint
   * @param {string} checkpointId - Checkpoint ID
   * @returns {Promise<boolean>} Success
   */
  async deleteCheckpoint(checkpointId) {
    this.checkpoints.delete(checkpointId);
    
    const fileName = `checkpoint-${checkpointId}.json`;
    const filePath = path.join(this.config.storageDir, fileName);
    
    try {
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean old checkpoints
   * @param {number} maxAge - Max age in days
   * @returns {Promise<number>} Number deleted
   */
  async cleanOldCheckpoints(maxAge = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxAge);

    let deleted = 0;
    const toDelete = [];

    for (const [id, checkpoint] of this.checkpoints) {
      if (new Date(checkpoint.timestamp) < cutoff) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      if (await this.deleteCheckpoint(id)) {
        deleted++;
      }
    }

    return deleted;
  }
}

/**
 * Create a new RollbackManager instance
 * @param {Object} config - Configuration options
 * @returns {RollbackManager}
 */
function createRollbackManager(config = {}) {
  return new RollbackManager(config);
}

module.exports = {
  RollbackManager,
  createRollbackManager,
  ROLLBACK_LEVEL,
  ROLLBACK_STATUS,
  WORKFLOW_STAGE
};
