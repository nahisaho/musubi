/**
 * Error Recovery Handler Tests
 * 
 * Requirement: IMP-6.2-008-01
 */

const { 
  ErrorRecoveryHandler, 
  createErrorRecoveryHandler,
  ERROR_CATEGORY,
  RECOVERY_ACTION
} = require('../../src/enterprise/error-recovery');
const fs = require('fs').promises;

describe('ErrorRecoveryHandler', () => {
  let handler;
  const testDir = 'test-error-recovery-temp';

  beforeEach(async () => {
    handler = new ErrorRecoveryHandler({ storageDir: testDir });
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('constructor', () => {
    it('should create handler with default config', () => {
      const h = new ErrorRecoveryHandler();
      expect(h.config.maxHistorySize).toBe(100);
      expect(h.config.enableAutoAnalysis).toBe(true);
    });

    it('should load recovery patterns', () => {
      expect(handler.recoveryPatterns[ERROR_CATEGORY.TEST_FAILURE]).toBeDefined();
      expect(handler.recoveryPatterns[ERROR_CATEGORY.BUILD_ERROR]).toBeDefined();
    });
  });

  describe('ERROR_CATEGORY', () => {
    it('should define all categories', () => {
      expect(ERROR_CATEGORY.TEST_FAILURE).toBe('test-failure');
      expect(ERROR_CATEGORY.VALIDATION_ERROR).toBe('validation-error');
      expect(ERROR_CATEGORY.BUILD_ERROR).toBe('build-error');
      expect(ERROR_CATEGORY.LINT_ERROR).toBe('lint-error');
      expect(ERROR_CATEGORY.TYPE_ERROR).toBe('type-error');
      expect(ERROR_CATEGORY.DEPENDENCY_ERROR).toBe('dependency-error');
    });
  });

  describe('RECOVERY_ACTION', () => {
    it('should define all actions', () => {
      expect(RECOVERY_ACTION.FIX_CODE).toBe('fix-code');
      expect(RECOVERY_ACTION.UPDATE_TEST).toBe('update-test');
      expect(RECOVERY_ACTION.INSTALL_DEPS).toBe('install-deps');
      expect(RECOVERY_ACTION.ROLLBACK).toBe('rollback');
      expect(RECOVERY_ACTION.MANUAL_REVIEW).toBe('manual-review');
    });
  });

  describe('analyze', () => {
    it('should analyze Error object', () => {
      const error = new Error('expect(received).toEqual(expected)');
      
      const analysis = handler.analyze(error, { stage: 'test' });

      expect(analysis.id).toBeDefined();
      expect(analysis.category).toBe(ERROR_CATEGORY.TEST_FAILURE);
      expect(analysis.rootCause.action).toBe(RECOVERY_ACTION.FIX_CODE);
    });

    it('should analyze plain object', () => {
      const error = { message: 'Cannot find module xyz', name: 'ModuleNotFoundError' };
      
      const analysis = handler.analyze(error);

      expect(analysis.error.message).toContain('Cannot find module');
    });

    it('should include remediation steps', () => {
      const error = new Error('timeout');
      
      const analysis = handler.analyze(error, { stage: 'test' });

      expect(analysis.remediation.steps.length).toBeGreaterThan(0);
    });

    it('should record in history', () => {
      const error = new Error('Test error');
      
      handler.analyze(error);

      expect(handler.errorHistory.length).toBe(1);
    });
  });

  describe('categorizeError', () => {
    it('should categorize by context stage', () => {
      const error = { message: 'some error', name: 'Error' };
      
      expect(handler.categorizeError(error, { stage: 'test' })).toBe(ERROR_CATEGORY.TEST_FAILURE);
      expect(handler.categorizeError(error, { stage: 'build' })).toBe(ERROR_CATEGORY.BUILD_ERROR);
      expect(handler.categorizeError(error, { stage: 'lint' })).toBe(ERROR_CATEGORY.LINT_ERROR);
    });

    it('should categorize by message content', () => {
      expect(handler.categorizeError({ message: 'assert failed', name: 'Error' }, {})).toBe(ERROR_CATEGORY.TEST_FAILURE);
      expect(handler.categorizeError({ message: 'type mismatch', name: 'Error' }, {})).toBe(ERROR_CATEGORY.TYPE_ERROR);
      expect(handler.categorizeError({ message: 'npm error', name: 'Error' }, {})).toBe(ERROR_CATEGORY.DEPENDENCY_ERROR);
    });
  });

  describe('identifyRootCause', () => {
    it('should match pattern and return cause', () => {
      const error = { message: 'expect(received).toEqual(expected)' };
      
      const result = handler.identifyRootCause(error, ERROR_CATEGORY.TEST_FAILURE);

      expect(result.matched).toBe(true);
      expect(result.cause).toBe('Assertion mismatch');
    });

    it('should return default when no pattern matches', () => {
      const error = { message: 'unknown weird error xyz123' };
      
      const result = handler.identifyRootCause(error, ERROR_CATEGORY.TEST_FAILURE);

      expect(result.matched).toBe(false);
    });
  });

  describe('generateRemediation', () => {
    it('should generate steps for FIX_CODE', () => {
      const rootCause = { cause: 'Test', action: RECOVERY_ACTION.FIX_CODE };
      
      const remediation = handler.generateRemediation(ERROR_CATEGORY.TEST_FAILURE, rootCause, {});

      expect(remediation.steps.some(s => s.includes('Locate the error'))).toBe(true);
      expect(remediation.commands).toContain('npm test');
    });

    it('should generate steps for INSTALL_DEPS', () => {
      const rootCause = { cause: 'Missing', action: RECOVERY_ACTION.INSTALL_DEPS };
      
      const remediation = handler.generateRemediation(ERROR_CATEGORY.DEPENDENCY_ERROR, rootCause, {});

      expect(remediation.commands).toContain('npm install');
    });

    it('should include estimated time', () => {
      const rootCause = { action: RECOVERY_ACTION.FIX_CODE };
      
      const remediation = handler.generateRemediation(ERROR_CATEGORY.TEST_FAILURE, rootCause, {});

      expect(remediation.estimatedTime).toBeDefined();
    });
  });

  describe('getHistory', () => {
    it('should return all history', () => {
      handler.analyze(new Error('Error 1'));
      handler.analyze(new Error('Error 2'));

      const history = handler.getHistory();

      expect(history.length).toBe(2);
    });

    it('should filter by category', () => {
      handler.analyze(new Error('test'), { stage: 'test' });
      handler.analyze(new Error('build'), { stage: 'build' });

      const history = handler.getHistory({ category: ERROR_CATEGORY.TEST_FAILURE });

      expect(history.length).toBe(1);
    });

    it('should limit results', () => {
      handler.analyze(new Error('Error 1'));
      handler.analyze(new Error('Error 2'));
      handler.analyze(new Error('Error 3'));

      const history = handler.getHistory({ limit: 2 });

      expect(history.length).toBe(2);
    });
  });

  describe('saveAnalysis', () => {
    it('should save to file', async () => {
      const analysis = handler.analyze(new Error('Test'));
      
      const filePath = await handler.saveAnalysis(analysis);

      expect(filePath).toContain(analysis.id);
      const content = await fs.readFile(filePath, 'utf-8');
      expect(JSON.parse(content).id).toBe(analysis.id);
    });
  });

  describe('loadAnalysis', () => {
    it('should load from file', async () => {
      const analysis = handler.analyze(new Error('Test'));
      await handler.saveAnalysis(analysis);

      const loaded = await handler.loadAnalysis(analysis.id);

      expect(loaded.id).toBe(analysis.id);
    });

    it('should return null for non-existent', async () => {
      const loaded = await handler.loadAnalysis('non-existent-id');
      expect(loaded).toBeNull();
    });
  });

  describe('generateReport', () => {
    it('should generate markdown report', () => {
      const analysis = handler.analyze(new Error('Test error'), { stage: 'test' });
      
      const report = handler.generateReport(analysis);

      expect(report).toContain('# Error Recovery Report');
      expect(report).toContain('Test error');
      expect(report).toContain('Remediation');
    });
  });

  describe('determinePriority', () => {
    it('should return critical for blocking', () => {
      expect(handler.determinePriority(ERROR_CATEGORY.TEST_FAILURE, { blocking: true }))
        .toBe('critical');
    });

    it('should return high for build/test errors', () => {
      expect(handler.determinePriority(ERROR_CATEGORY.BUILD_ERROR, {})).toBe('high');
      expect(handler.determinePriority(ERROR_CATEGORY.TEST_FAILURE, {})).toBe('high');
    });

    it('should return medium for lint/type errors', () => {
      expect(handler.determinePriority(ERROR_CATEGORY.LINT_ERROR, {})).toBe('medium');
      expect(handler.determinePriority(ERROR_CATEGORY.TYPE_ERROR, {})).toBe('medium');
    });
  });

  describe('createErrorRecoveryHandler', () => {
    it('should create instance', () => {
      const h = createErrorRecoveryHandler();
      expect(h).toBeInstanceOf(ErrorRecoveryHandler);
    });
  });
});
