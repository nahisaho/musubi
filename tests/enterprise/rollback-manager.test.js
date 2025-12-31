/**
 * Rollback Manager Tests
 * 
 * Requirement: IMP-6.2-008-02
 */

const { 
  RollbackManager, 
  createRollbackManager,
  ROLLBACK_LEVEL,
  ROLLBACK_STATUS,
  WORKFLOW_STAGE
} = require('../../src/enterprise/rollback-manager');
const fs = require('fs').promises;
const path = require('path');

describe('RollbackManager', () => {
  let manager;
  const testDir = 'test-rollback-manager-temp';

  beforeEach(async () => {
    manager = new RollbackManager({ 
      storageDir: testDir, 
      gitEnabled: false,
      requireConfirmation: false
    });
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('constructor', () => {
    it('should create manager with default config', () => {
      const m = new RollbackManager();
      expect(m.config.maxHistory).toBe(50);
      expect(m.config.requireConfirmation).toBe(true);
    });

    it('should initialize empty checkpoints', () => {
      expect(manager.checkpoints.size).toBe(0);
    });
  });

  describe('ROLLBACK_LEVEL', () => {
    it('should define all levels', () => {
      expect(ROLLBACK_LEVEL.FILE).toBe('file');
      expect(ROLLBACK_LEVEL.COMMIT).toBe('commit');
      expect(ROLLBACK_LEVEL.STAGE).toBe('stage');
      expect(ROLLBACK_LEVEL.SPRINT).toBe('sprint');
    });
  });

  describe('ROLLBACK_STATUS', () => {
    it('should define all statuses', () => {
      expect(ROLLBACK_STATUS.PENDING).toBe('pending');
      expect(ROLLBACK_STATUS.IN_PROGRESS).toBe('in-progress');
      expect(ROLLBACK_STATUS.COMPLETED).toBe('completed');
      expect(ROLLBACK_STATUS.FAILED).toBe('failed');
      expect(ROLLBACK_STATUS.CANCELLED).toBe('cancelled');
    });
  });

  describe('WORKFLOW_STAGE', () => {
    it('should define all stages', () => {
      expect(WORKFLOW_STAGE.REQUIREMENTS).toBe('requirements');
      expect(WORKFLOW_STAGE.DESIGN).toBe('design');
      expect(WORKFLOW_STAGE.TASKS).toBe('tasks');
      expect(WORKFLOW_STAGE.IMPLEMENT).toBe('implement');
      expect(WORKFLOW_STAGE.VALIDATE).toBe('validate');
    });
  });

  describe('createCheckpoint', () => {
    it('should create checkpoint with basic info', async () => {
      const checkpoint = await manager.createCheckpoint('test-checkpoint');

      expect(checkpoint.id).toContain('ckpt-');
      expect(checkpoint.name).toBe('test-checkpoint');
      expect(checkpoint.timestamp).toBeDefined();
    });

    it('should capture files', async () => {
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'test content', 'utf-8');

      const checkpoint = await manager.createCheckpoint('with-files', {
        files: [filePath]
      });

      expect(checkpoint.files.length).toBe(1);
      expect(checkpoint.files[0].content).toBe('test content');
    });

    it('should handle non-existent files', async () => {
      const checkpoint = await manager.createCheckpoint('missing-files', {
        files: ['/non/existent/file.txt']
      });

      expect(checkpoint.files[0].exists).toBe(false);
    });

    it('should store checkpoint in map', async () => {
      const checkpoint = await manager.createCheckpoint('stored');

      expect(manager.checkpoints.has(checkpoint.id)).toBe(true);
    });
  });

  describe('captureFiles', () => {
    it('should capture file content and metadata', async () => {
      const filePath = path.join(testDir, 'capture-test.txt');
      await fs.writeFile(filePath, 'capture content', 'utf-8');

      const backups = await manager.captureFiles([filePath]);

      expect(backups.length).toBe(1);
      expect(backups[0].content).toBe('capture content');
      expect(backups[0].size).toBeGreaterThan(0);
    });
  });

  describe('rollback', () => {
    it('should rollback files to checkpoint state', async () => {
      // Create file and checkpoint
      const filePath = path.join(testDir, 'rollback-test.txt');
      await fs.writeFile(filePath, 'original content', 'utf-8');

      const checkpoint = await manager.createCheckpoint('rollback-test', {
        level: ROLLBACK_LEVEL.FILE,
        files: [filePath]
      });

      // Modify file
      await fs.writeFile(filePath, 'modified content', 'utf-8');

      // Rollback
      const result = await manager.rollback(checkpoint.id, { confirmed: true });

      expect(result.status).toBe(ROLLBACK_STATUS.COMPLETED);
      
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('original content');
    });

    it('should require confirmation when enabled', async () => {
      const m = new RollbackManager({ storageDir: testDir, requireConfirmation: true });
      const checkpoint = await m.createCheckpoint('confirm-test');

      const result = await m.rollback(checkpoint.id); // No confirmation

      expect(result.status).toBe(ROLLBACK_STATUS.PENDING);
      expect(result.requiresConfirmation).toBe(true);
    });

    it('should throw for non-existent checkpoint', async () => {
      await expect(manager.rollback('non-existent'))
        .rejects.toThrow('Checkpoint not found');
    });

    it('should capture before state', async () => {
      const filePath = path.join(testDir, 'before-state.txt');
      await fs.writeFile(filePath, 'original', 'utf-8');

      const checkpoint = await manager.createCheckpoint('before-test', {
        level: ROLLBACK_LEVEL.FILE,
        files: [filePath]
      });

      await fs.writeFile(filePath, 'modified', 'utf-8');

      const result = await manager.rollback(checkpoint.id, { confirmed: true });

      expect(result.beforeState).toBeDefined();
      expect(result.beforeState[0].content).toBe('modified');
    });
  });

  describe('rollbackFiles', () => {
    it('should restore file content', async () => {
      const filePath = path.join(testDir, 'restore-test.txt');
      
      const checkpoint = {
        files: [{
          path: filePath,
          content: 'restored content'
        }]
      };

      const changes = await manager.rollbackFiles(checkpoint);

      expect(changes[0].action).toBe('restored');
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('restored content');
    });

    it('should delete files that did not exist', async () => {
      const filePath = path.join(testDir, 'delete-test.txt');
      await fs.writeFile(filePath, 'should be deleted', 'utf-8');
      
      const checkpoint = {
        files: [{
          path: filePath,
          exists: false
        }]
      };

      const changes = await manager.rollbackFiles(checkpoint);

      expect(changes[0].action).toBe('deleted');
      await expect(fs.access(filePath)).rejects.toThrow();
    });
  });

  describe('cancelRollback', () => {
    it('should cancel pending rollback', async () => {
      const m = new RollbackManager({ storageDir: testDir, requireConfirmation: true, gitEnabled: false });
      const checkpoint = await m.createCheckpoint('cancel-test');
      const result = await m.rollback(checkpoint.id);
      
      // Manually add to history for testing (normally done by confirmed rollback)
      m.rollbackHistory.unshift(result);

      const cancelled = m.cancelRollback(result.id);

      expect(cancelled.status).toBe(ROLLBACK_STATUS.CANCELLED);
    });

    it('should throw for non-pending rollback', async () => {
      const checkpoint = await manager.createCheckpoint('non-pending');
      const result = await manager.rollback(checkpoint.id, { confirmed: true });

      expect(() => manager.cancelRollback(result.id)).toThrow('Cannot cancel');
    });
  });

  describe('getHistory', () => {
    it('should return rollback history', async () => {
      const cp1 = await manager.createCheckpoint('history-1', { level: ROLLBACK_LEVEL.FILE });
      const cp2 = await manager.createCheckpoint('history-2', { level: ROLLBACK_LEVEL.STAGE });
      
      await manager.rollback(cp1.id, { confirmed: true });
      await manager.rollback(cp2.id, { confirmed: true });

      const history = manager.getHistory();

      expect(history.length).toBe(2);
    });

    it('should filter by status', async () => {
      const filePath = path.join(testDir, 'filter-file.txt');
      await fs.writeFile(filePath, 'content', 'utf-8');
      
      const cp = await manager.createCheckpoint('filter-test', {
        level: ROLLBACK_LEVEL.FILE,
        files: [filePath]
      });
      await manager.rollback(cp.id, { confirmed: true });

      const completed = manager.getHistory({ status: ROLLBACK_STATUS.COMPLETED });

      expect(completed.length).toBe(1);
    });
  });

  describe('listCheckpoints', () => {
    it('should list all checkpoints', async () => {
      await manager.createCheckpoint('list-1');
      await manager.createCheckpoint('list-2');

      const list = manager.listCheckpoints();

      expect(list.length).toBe(2);
    });

    it('should filter by level', async () => {
      await manager.createCheckpoint('file-cp', { level: ROLLBACK_LEVEL.FILE });
      await manager.createCheckpoint('stage-cp', { level: ROLLBACK_LEVEL.STAGE });

      const fileOnly = manager.listCheckpoints({ level: ROLLBACK_LEVEL.FILE });

      expect(fileOnly.length).toBe(1);
    });
  });

  describe('saveCheckpoint/loadCheckpoint', () => {
    it('should persist and load checkpoint', async () => {
      const checkpoint = await manager.createCheckpoint('persist-test');
      
      // Clear in-memory
      manager.checkpoints.clear();

      const loaded = await manager.loadCheckpoint(checkpoint.id);

      expect(loaded.id).toBe(checkpoint.id);
      expect(loaded.name).toBe('persist-test');
    });
  });

  describe('generateReport', () => {
    it('should generate markdown report', async () => {
      const checkpoint = await manager.createCheckpoint('report-test');
      const result = await manager.rollback(checkpoint.id, { confirmed: true });

      const report = manager.generateReport(result.id);

      expect(report).toContain('# Rollback Report');
      expect(report).toContain(result.id);
    });

    it('should throw for unknown rollback', () => {
      expect(() => manager.generateReport('unknown')).toThrow('Rollback not found');
    });
  });

  describe('deleteCheckpoint', () => {
    it('should delete checkpoint', async () => {
      const checkpoint = await manager.createCheckpoint('delete-cp');
      
      const deleted = await manager.deleteCheckpoint(checkpoint.id);

      expect(deleted).toBe(true);
      expect(manager.checkpoints.has(checkpoint.id)).toBe(false);
    });
  });

  describe('cleanOldCheckpoints', () => {
    it('should clean old checkpoints', async () => {
      // Create old checkpoint (manually set timestamp)
      const checkpoint = await manager.createCheckpoint('old-cp');
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60); // 60 days ago
      checkpoint.timestamp = oldDate.toISOString();
      manager.checkpoints.set(checkpoint.id, checkpoint);

      const deleted = await manager.cleanOldCheckpoints(30);

      expect(deleted).toBe(1);
    });
  });

  describe('createRollbackManager', () => {
    it('should create instance', () => {
      const m = createRollbackManager();
      expect(m).toBeInstanceOf(RollbackManager);
    });
  });
});
