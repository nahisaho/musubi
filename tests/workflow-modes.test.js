/**
 * Tests for Workflow Mode Manager
 *
 * @traceability
 * - Requirement: REQ-V08-001 (Lightweight Workflow Modes)
 * - Design: docs/plans/musubi-improvement-plan-v0.8.md
 */

const path = require('path');
const fs = require('fs-extra');
const {
  WorkflowModeManager,
  DEFAULT_MODES,
  AUTO_DETECTION_PATTERNS,
  MODE_TRANSITIONS,
} = require('../src/managers/workflow-mode-manager');

describe('WorkflowModeManager', () => {
  let manager;
  const testRoot = path.join(__dirname, '.test-workflow-modes');

  beforeEach(async () => {
    await fs.ensureDir(testRoot);
    manager = new WorkflowModeManager(testRoot);
  });

  afterEach(async () => {
    await fs.remove(testRoot);
  });

  describe('getModes', () => {
    it('should return default modes when no config file exists', async () => {
      const modes = await manager.getModes();
      expect(modes).toEqual(['small', 'medium', 'large']);
    });
  });

  describe('getMode', () => {
    it('should return small mode configuration', async () => {
      const mode = await manager.getMode('small');
      expect(mode).toBeDefined();
      expect(mode.stages).toEqual(['requirements', 'implement', 'validate']);
      expect(mode.coverageThreshold).toBe(60);
    });

    it('should return medium mode configuration', async () => {
      const mode = await manager.getMode('medium');
      expect(mode).toBeDefined();
      expect(mode.stages).toContain('design');
      expect(mode.stages).toContain('tasks');
      expect(mode.coverageThreshold).toBe(70);
    });

    it('should return large mode configuration', async () => {
      const mode = await manager.getMode('large');
      expect(mode).toBeDefined();
      expect(mode.stages).toContain('steering');
      expect(mode.stages).toContain('review');
      expect(mode.coverageThreshold).toBe(80);
      expect(mode.adrRequired).toBe(true);
    });

    it('should return null for unknown mode', async () => {
      const mode = await manager.getMode('unknown');
      expect(mode).toBeNull();
    });
  });

  describe('getStages', () => {
    it('should return stages for small mode', async () => {
      const stages = await manager.getStages('small');
      expect(stages).toEqual(['requirements', 'implement', 'validate']);
    });

    it('should return stages for medium mode', async () => {
      const stages = await manager.getStages('medium');
      expect(stages).toEqual(['requirements', 'design', 'tasks', 'implement', 'validate']);
    });

    it('should return stages for large mode', async () => {
      const stages = await manager.getStages('large');
      expect(stages.length).toBe(7);
      expect(stages[0]).toBe('steering');
      expect(stages[stages.length - 1]).toBe('review');
    });
  });

  describe('detectMode', () => {
    it('should detect small mode for fix: prefix', async () => {
      const mode = await manager.detectMode('fix: typo in readme');
      expect(mode).toBe('small');
    });

    it('should detect small mode for bugfix: prefix', async () => {
      const mode = await manager.detectMode('bugfix: memory leak');
      expect(mode).toBe('small');
    });

    it('should detect small mode for docs: prefix', async () => {
      const mode = await manager.detectMode('docs: update API docs');
      expect(mode).toBe('small');
    });

    it('should detect medium mode for feat: prefix', async () => {
      const mode = await manager.detectMode('feat: add new export option');
      expect(mode).toBe('medium');
    });

    it('should detect medium mode for refactor: prefix', async () => {
      const mode = await manager.detectMode('refactor: improve performance');
      expect(mode).toBe('medium');
    });

    it('should detect large mode for breaking: prefix', async () => {
      const mode = await manager.detectMode('breaking: change API interface');
      expect(mode).toBe('large');
    });

    it('should default to medium for unknown prefix', async () => {
      const mode = await manager.detectMode('something random');
      expect(mode).toBe('medium');
    });
  });

  describe('getValidTransitions', () => {
    it('should return valid transitions for small mode', async () => {
      const transitions = await manager.getValidTransitions('small', 'requirements');
      expect(transitions).toEqual(['implement']);
    });

    it('should return valid transitions for medium mode', async () => {
      const transitions = await manager.getValidTransitions('medium', 'requirements');
      expect(transitions).toEqual(['design']);
    });

    it('should return feedback loops for validate stage', async () => {
      const transitions = await manager.getValidTransitions('medium', 'validate');
      expect(transitions).toContain('implement');
      expect(transitions).toContain('requirements');
    });
  });

  describe('getCoverageThreshold', () => {
    it('should return 60% for small mode', async () => {
      const threshold = await manager.getCoverageThreshold('small');
      expect(threshold).toBe(60);
    });

    it('should return 70% for medium mode', async () => {
      const threshold = await manager.getCoverageThreshold('medium');
      expect(threshold).toBe(70);
    });

    it('should return 80% for large mode', async () => {
      const threshold = await manager.getCoverageThreshold('large');
      expect(threshold).toBe(80);
    });

    it('should return 80% as default for unknown mode', async () => {
      const threshold = await manager.getCoverageThreshold('unknown');
      expect(threshold).toBe(80);
    });
  });

  describe('isEarsRequired', () => {
    it('should return false for small mode (optional)', async () => {
      const required = await manager.isEarsRequired('small');
      expect(required).toBe(false);
    });

    it('should return true for medium mode', async () => {
      const required = await manager.isEarsRequired('medium');
      expect(required).toBe(true);
    });

    it('should return true for large mode', async () => {
      const required = await manager.isEarsRequired('large');
      expect(required).toBe(true);
    });
  });

  describe('isAdrRequired', () => {
    it('should return false for small mode', async () => {
      const required = await manager.isAdrRequired('small');
      expect(required).toBe(false);
    });

    it('should return false for medium mode', async () => {
      const required = await manager.isAdrRequired('medium');
      expect(required).toBe(false);
    });

    it('should return true for large mode', async () => {
      const required = await manager.isAdrRequired('large');
      expect(required).toBe(true);
    });
  });

  describe('getFirstStage and getLastStage', () => {
    it('should return first stage for each mode', async () => {
      expect(await manager.getFirstStage('small')).toBe('requirements');
      expect(await manager.getFirstStage('medium')).toBe('requirements');
      expect(await manager.getFirstStage('large')).toBe('steering');
    });

    it('should return last stage for each mode', async () => {
      expect(await manager.getLastStage('small')).toBe('validate');
      expect(await manager.getLastStage('medium')).toBe('validate');
      expect(await manager.getLastStage('large')).toBe('review');
    });
  });

  describe('compareModes', () => {
    it('should return comparison of all modes', async () => {
      const comparison = await manager.compareModes();

      expect(comparison).toHaveLength(3);
      expect(comparison.map(m => m.name)).toEqual(['small', 'medium', 'large']);

      // Check small mode
      const small = comparison.find(m => m.name === 'small');
      expect(small.stageCount).toBe(3);
      expect(small.coverageThreshold).toBe(60);

      // Check large mode
      const large = comparison.find(m => m.name === 'large');
      expect(large.stageCount).toBe(7);
      expect(large.adrRequired).toBe(true);
    });
  });

  describe('isValidStage', () => {
    it('should validate stages for small mode', async () => {
      expect(await manager.isValidStage('small', 'requirements')).toBe(true);
      expect(await manager.isValidStage('small', 'implement')).toBe(true);
      expect(await manager.isValidStage('small', 'design')).toBe(false);
      expect(await manager.isValidStage('small', 'steering')).toBe(false);
    });

    it('should validate stages for large mode', async () => {
      expect(await manager.isValidStage('large', 'steering')).toBe(true);
      expect(await manager.isValidStage('large', 'review')).toBe(true);
    });
  });
});

describe('DEFAULT_MODES', () => {
  it('should have three modes defined', () => {
    expect(Object.keys(DEFAULT_MODES)).toEqual(['small', 'medium', 'large']);
  });

  it('should have valid stages for each mode', () => {
    expect(DEFAULT_MODES.small.stages).toBeDefined();
    expect(DEFAULT_MODES.medium.stages).toBeDefined();
    expect(DEFAULT_MODES.large.stages).toBeDefined();
  });
});

describe('AUTO_DETECTION_PATTERNS', () => {
  it('should have patterns for all modes', () => {
    const modes = AUTO_DETECTION_PATTERNS.map(p => p.mode);
    expect(modes).toContain('small');
    expect(modes).toContain('medium');
    expect(modes).toContain('large');
  });
});

describe('MODE_TRANSITIONS', () => {
  it('should define transitions for all modes', () => {
    expect(MODE_TRANSITIONS.small).toBeDefined();
    expect(MODE_TRANSITIONS.medium).toBeDefined();
    expect(MODE_TRANSITIONS.large).toBeDefined();
  });

  it('should have valid transition chains', () => {
    // Small mode chain
    expect(MODE_TRANSITIONS.small.requirements).toContain('implement');
    expect(MODE_TRANSITIONS.small.implement).toContain('validate');

    // Medium mode chain
    expect(MODE_TRANSITIONS.medium.requirements).toContain('design');
    expect(MODE_TRANSITIONS.medium.design).toContain('tasks');
    expect(MODE_TRANSITIONS.medium.tasks).toContain('implement');
  });
});
