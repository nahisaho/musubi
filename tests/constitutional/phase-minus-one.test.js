/**
 * Phase -1 Gate Tests
 *
 * Tests for Phase -1 Gate trigger and review process.
 *
 * Requirement: IMP-6.2-005-02
 */

const { PhaseMinusOneGate, GATE_STATUS } = require('../../src/constitutional/phase-minus-one');
const fs = require('fs').promises;
const path = require('path');

describe('PhaseMinusOneGate', () => {
  let gate;
  const testDir = 'test-phase-minus-one-temp';
  const storageDir = `${testDir}/storage/phase-minus-one`;

  beforeEach(async () => {
    gate = new PhaseMinusOneGate({
      storageDir,
      requiredReviewers: ['architect'],
      optionalReviewers: ['pm'],
    });
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      /* ignore cleanup errors */
    }
  });

  describe('constructor', () => {
    it('should create gate with default config', () => {
      const g = new PhaseMinusOneGate();
      expect(g.config).toBeDefined();
      expect(g.config.requiredReviewers).toContain('system-architect');
    });

    it('should merge custom config', () => {
      const g = new PhaseMinusOneGate({
        requiredReviewers: ['custom-reviewer'],
      });
      expect(g.config.requiredReviewers).toContain('custom-reviewer');
    });
  });

  describe('GATE_STATUS', () => {
    it('should define all statuses', () => {
      expect(GATE_STATUS.PENDING).toBe('pending');
      expect(GATE_STATUS.APPROVED).toBe('approved');
      expect(GATE_STATUS.REJECTED).toBe('rejected');
      expect(GATE_STATUS.WAIVED).toBe('waived');
    });
  });

  describe('trigger', () => {
    it('should create new gate', async () => {
      const result = await gate.trigger({
        featureId: 'FEAT-001',
        triggeredBy: 'test',
      });

      expect(result.id).toMatch(/^GATE-/);
      expect(result.featureId).toBe('FEAT-001');
      expect(result.status).toBe(GATE_STATUS.PENDING);
    });

    it('should set timestamp', async () => {
      const result = await gate.trigger({
        featureId: 'FEAT-002',
      });

      expect(result.triggeredAt).toBeDefined();
    });

    it('should include violations', async () => {
      const violations = [{ article: 'VII', message: 'File too long' }];

      const result = await gate.trigger({
        featureId: 'FEAT-003',
        violations,
      });

      expect(result.violations.length).toBe(1);
    });

    it('should set reviewers from config', async () => {
      const result = await gate.trigger({
        featureId: 'FEAT-004',
      });

      expect(result.requiredReviewers).toContain('architect');
      expect(result.optionalReviewers).toContain('pm');
    });

    it('should generate notifications when autoNotify is true', async () => {
      const result = await gate.trigger({
        featureId: 'FEAT-005',
      });

      expect(result.notifications).toBeDefined();
      expect(result.notifications.length).toBeGreaterThan(0);
    });

    it('should save gate to storage', async () => {
      const result = await gate.trigger({
        featureId: 'FEAT-006',
      });

      const saved = await gate.loadGate(result.id);
      expect(saved).toBeDefined();
      expect(saved.featureId).toBe('FEAT-006');
    });
  });

  describe('analyzeAndTrigger', () => {
    it('should not trigger for compliant files', async () => {
      const filePath = path.join(testDir, 'compliant.js');
      await fs.writeFile(filePath, '/** Requirement: R */ const x = 1;', 'utf-8');

      const result = await gate.analyzeAndTrigger([filePath], {
        featureId: 'FEAT-007',
      });

      expect(result.triggered).toBe(false);
      expect(result.gate).toBeNull();
    });

    it('should trigger for Article VII violation', async () => {
      const filePath = path.join(testDir, 'long-file.js');
      const longContent = Array(600).fill('// line').join('\n');
      await fs.writeFile(filePath, longContent, 'utf-8');

      const result = await gate.analyzeAndTrigger([filePath], {
        featureId: 'FEAT-008',
      });

      expect(result.triggered).toBe(true);
      expect(result.gate).toBeDefined();
    });

    it('should include check results', async () => {
      const filePath = path.join(testDir, 'test-file.js');
      await fs.writeFile(filePath, '/** Requirement: R */ const x = 1;', 'utf-8');

      const result = await gate.analyzeAndTrigger([filePath]);

      expect(result.checkResults).toBeDefined();
      expect(result.blockDecision).toBeDefined();
    });
  });

  describe('submitReview', () => {
    let gateId;

    beforeEach(async () => {
      const result = await gate.trigger({ featureId: 'FEAT-REVIEW' });
      gateId = result.id;
    });

    it('should add review to gate', async () => {
      const updated = await gate.submitReview(gateId, {
        reviewer: 'architect',
        decision: 'approve',
        comments: 'Looks good',
      });

      expect(updated.reviews.length).toBe(1);
      expect(updated.reviews[0].decision).toBe('approve');
    });

    it('should approve when all required reviewers approve', async () => {
      const updated = await gate.submitReview(gateId, {
        reviewer: 'architect',
        decision: 'approve',
      });

      expect(updated.status).toBe(GATE_STATUS.APPROVED);
      expect(updated.resolvedAt).toBeDefined();
    });

    it('should reject when any reviewer rejects', async () => {
      const updated = await gate.submitReview(gateId, {
        reviewer: 'architect',
        decision: 'reject',
        comments: 'Needs refactoring',
      });

      expect(updated.status).toBe(GATE_STATUS.REJECTED);
    });

    it('should stay pending when required review missing', async () => {
      // Create gate with multiple required reviewers
      const g = new PhaseMinusOneGate({
        storageDir,
        requiredReviewers: ['reviewer1', 'reviewer2'],
      });
      const result = await g.trigger({ featureId: 'FEAT-MULTI' });

      const updated = await g.submitReview(result.id, {
        reviewer: 'reviewer1',
        decision: 'approve',
      });

      expect(updated.status).toBe(GATE_STATUS.PENDING);
    });

    it('should throw for non-existent gate', async () => {
      await expect(
        gate.submitReview('NON-EXISTENT', { reviewer: 'x', decision: 'approve' })
      ).rejects.toThrow('Gate not found');
    });
  });

  describe('waiveGate', () => {
    it('should waive gate with justification', async () => {
      const result = await gate.trigger({ featureId: 'FEAT-WAIVE' });

      const updated = await gate.waiveGate(result.id, {
        waivedBy: 'project-manager',
        justification: 'Critical deadline, will fix in next sprint',
      });

      expect(updated.status).toBe(GATE_STATUS.WAIVED);
      expect(updated.waiver.justification).toContain('deadline');
    });

    it('should set resolved timestamp', async () => {
      const result = await gate.trigger({ featureId: 'FEAT-WAIVE2' });

      const updated = await gate.waiveGate(result.id, {
        waivedBy: 'admin',
        justification: 'Test',
      });

      expect(updated.resolvedAt).toBeDefined();
    });

    it('should throw for non-existent gate', async () => {
      await expect(
        gate.waiveGate('NON-EXISTENT', { waivedBy: 'x', justification: 'y' })
      ).rejects.toThrow('Gate not found');
    });
  });

  describe('getGate', () => {
    it('should retrieve existing gate', async () => {
      const result = await gate.trigger({ featureId: 'FEAT-GET' });

      const retrieved = await gate.getGate(result.id);

      expect(retrieved.featureId).toBe('FEAT-GET');
    });

    it('should return null for non-existent gate', async () => {
      const retrieved = await gate.getGate('NON-EXISTENT');
      expect(retrieved).toBeNull();
    });
  });

  describe('listGates', () => {
    beforeEach(async () => {
      await gate.trigger({ featureId: 'FEAT-A' });
      const b = await gate.trigger({ featureId: 'FEAT-B' });
      await gate.submitReview(b.id, { reviewer: 'architect', decision: 'approve' });
      await gate.trigger({ featureId: 'FEAT-C' });
    });

    it('should list all gates', async () => {
      const gates = await gate.listGates();
      expect(gates.length).toBe(3);
    });

    it('should filter by status', async () => {
      const pending = await gate.listGates(GATE_STATUS.PENDING);
      const approved = await gate.listGates(GATE_STATUS.APPROVED);

      expect(pending.length).toBe(2);
      expect(approved.length).toBe(1);
    });
  });

  describe('getPendingForReviewer', () => {
    it('should return gates needing review', async () => {
      await gate.trigger({ featureId: 'FEAT-PEND-1' });
      await gate.trigger({ featureId: 'FEAT-PEND-2' });

      const pending = await gate.getPendingForReviewer('architect');

      expect(pending.length).toBe(2);
    });

    it('should exclude already reviewed gates', async () => {
      const result = await gate.trigger({ featureId: 'FEAT-REVIEWED' });
      await gate.submitReview(result.id, { reviewer: 'architect', decision: 'approve' });

      const pending = await gate.getPendingForReviewer('architect');

      expect(pending.length).toBe(0);
    });

    it('should return empty for unknown reviewer', async () => {
      await gate.trigger({ featureId: 'FEAT-UNKNOWN' });

      const pending = await gate.getPendingForReviewer('unknown-person');

      expect(pending.length).toBe(0);
    });
  });

  describe('generateNotifications', () => {
    it('should create notifications for all reviewers', async () => {
      const result = await gate.trigger({ featureId: 'FEAT-NOTIF' });

      const notifications = result.notifications;

      expect(notifications.length).toBe(2); // 1 required + 1 optional
    });

    it('should include gate ID in notification', async () => {
      const result = await gate.trigger({ featureId: 'FEAT-NOTIF2' });

      const notification = result.notifications[0];

      expect(notification.gateId).toBe(result.id);
    });

    it('should differentiate required vs optional', async () => {
      const result = await gate.trigger({ featureId: 'FEAT-NOTIF3' });

      const required = result.notifications.filter(n => n.type === 'required-review');
      const optional = result.notifications.filter(n => n.type === 'optional-review');

      expect(required.length).toBe(1);
      expect(optional.length).toBe(1);
    });
  });

  describe('generateReport', () => {
    it('should generate markdown report', async () => {
      const result = await gate.trigger({
        featureId: 'FEAT-REPORT',
        violations: [{ article: 'VII', message: 'Too long', severity: 'warning' }],
      });

      const report = await gate.generateReport(result.id);

      expect(report).toContain('Phase -1 Gate Report');
      expect(report).toContain(result.id);
    });

    it('should include violations section', async () => {
      const result = await gate.trigger({
        featureId: 'FEAT-REPORT2',
        violations: [
          {
            article: 'VII',
            articleName: 'Simplicity',
            message: 'File exceeds 500 lines',
            severity: 'warning',
            filePath: 'test.js',
            suggestion: 'Split the file',
          },
        ],
      });

      const report = await gate.generateReport(result.id);

      expect(report).toContain('Violations');
      expect(report).toContain('Article VII');
    });

    it('should include review status', async () => {
      const result = await gate.trigger({ featureId: 'FEAT-REPORT3' });
      await gate.submitReview(result.id, {
        reviewer: 'architect',
        decision: 'approve',
      });

      const report = await gate.generateReport(result.id);

      expect(report).toContain('Reviews');
      expect(report).toContain('approve');
    });

    it('should include waiver info when waived', async () => {
      const result = await gate.trigger({ featureId: 'FEAT-REPORT4' });
      await gate.waiveGate(result.id, {
        waivedBy: 'pm',
        justification: 'Urgent release',
      });

      const report = await gate.generateReport(result.id);

      expect(report).toContain('Waiver');
      expect(report).toContain('Urgent release');
    });

    it('should throw for non-existent gate', async () => {
      await expect(gate.generateReport('NON-EXISTENT')).rejects.toThrow('Gate not found');
    });
  });

  describe('getStatusEmoji', () => {
    it('should return correct emojis', () => {
      expect(gate.getStatusEmoji(GATE_STATUS.PENDING)).toBe('⏳');
      expect(gate.getStatusEmoji(GATE_STATUS.APPROVED)).toBe('✅');
      expect(gate.getStatusEmoji(GATE_STATUS.REJECTED)).toBe('❌');
      expect(gate.getStatusEmoji(GATE_STATUS.WAIVED)).toBe('⚠️');
      expect(gate.getStatusEmoji('unknown')).toBe('❓');
    });
  });
});
