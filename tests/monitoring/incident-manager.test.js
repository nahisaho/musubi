/**
 * Tests for Incident Manager
 * @trace REQ-P5-002
 * @requirement REQ-P5-002 Incident Management
 */

const {
  Incident,
  Runbook,
  RunbookExecution,
  PostMortem,
  IncidentManager,
  IncidentSeverity,
  IncidentStatus,
  StepStatus,
  createIncidentManager
} = require('../../src/monitoring/incident-manager');

describe('Incident Manager', () => {
  describe('Incident', () => {
    let incident;

    beforeEach(() => {
      incident = new Incident({
        title: 'API latency spike',
        description: 'P99 latency increased to 5s',
        severity: IncidentSeverity.SEV2,
        affectedServices: ['api-gateway', 'user-service']
      });
    });

    test('should create incident with default values', () => {
      expect(incident.title).toBe('API latency spike');
      expect(incident.severity).toBe(IncidentSeverity.SEV2);
      expect(incident.status).toBe(IncidentStatus.DETECTED);
      expect(incident.affectedServices).toContain('api-gateway');
      expect(incident.id).toMatch(/^INC-/);
      expect(incident.timeline).toHaveLength(1);
    });

    test('should acknowledge incident', () => {
      incident.acknowledge('alice');

      expect(incident.status).toBe(IncidentStatus.TRIAGING);
      expect(incident.acknowledgedAt).toBeDefined();
      expect(incident.assignee).toBe('alice');
      expect(incident.responders).toContain('alice');
    });

    test('should not allow double acknowledgment', () => {
      incident.acknowledge('alice');

      expect(() => {
        incident.acknowledge('bob');
      }).toThrow('already acknowledged');
    });

    test('should add responders', () => {
      incident.addResponder('alice', 'engineer');
      incident.addResponder('bob', 'sre');

      expect(incident.responders).toContain('alice');
      expect(incident.responders).toContain('bob');
    });

    test('should not duplicate responders', () => {
      incident.addResponder('alice');
      incident.addResponder('alice');

      expect(incident.responders.filter(r => r === 'alice')).toHaveLength(1);
    });

    test('should set incident commander', () => {
      incident.setCommander('bob');

      expect(incident.commander).toBe('bob');
      expect(incident.responders).toContain('bob');
    });

    test('should update status', () => {
      incident.acknowledge('alice');
      incident.updateStatus(IncidentStatus.INVESTIGATING, 'Starting investigation', 'alice');

      expect(incident.status).toBe(IncidentStatus.INVESTIGATING);
      expect(incident.timeline.some(e => e.action === 'status_change')).toBe(true);
    });

    test('should update severity', () => {
      incident.updateSeverity(IncidentSeverity.SEV1, 'Impact is larger than expected', 'alice');

      expect(incident.severity).toBe(IncidentSeverity.SEV1);
    });

    test('should add updates to timeline', () => {
      incident.addUpdate('Identified potential cause in database queries', 'alice');

      const lastEntry = incident.timeline[incident.timeline.length - 1];
      expect(lastEntry.action).toBe('update');
      expect(lastEntry.description).toContain('database queries');
    });

    test('should set root cause', () => {
      incident.setRootCause('Database connection pool exhausted', 'alice');

      expect(incident.rootCause).toBe('Database connection pool exhausted');
      expect(incident.status).toBe(IncidentStatus.IDENTIFIED);
    });

    test('should set resolution', () => {
      incident.setResolution('Increased connection pool size to 100', 'alice');

      expect(incident.resolution).toContain('connection pool size');
      expect(incident.status).toBe(IncidentStatus.RESOLVED);
      expect(incident.resolvedAt).toBeDefined();
    });

    test('should calculate metrics', () => {
      incident.acknowledge('alice');
      incident.setResolution('Fixed', 'alice');

      const metrics = incident.getMetrics();

      expect(metrics.timeToAcknowledge).toBeGreaterThanOrEqual(0);
      expect(metrics.timeToResolve).toBeGreaterThanOrEqual(0);
      expect(metrics.isOpen).toBe(true); // Not closed yet
    });

    test('should serialize to JSON', () => {
      const json = incident.toJSON();

      expect(json.id).toBe(incident.id);
      expect(json.title).toBe('API latency spike');
      expect(json.severity).toBe(IncidentSeverity.SEV2);
      expect(json.metrics).toBeDefined();
    });
  });

  describe('Runbook', () => {
    let runbook;

    beforeEach(() => {
      runbook = new Runbook({
        name: 'Database Failover',
        description: 'Procedure for database failover',
        category: 'database',
        estimatedDuration: '30 minutes',
        steps: [
          { title: 'Notify team', description: 'Send alert to database team' },
          { title: 'Check replica status', command: 'mysql -e "SHOW SLAVE STATUS"' },
          { title: 'Promote replica', command: 'mysql -e "STOP SLAVE; RESET SLAVE ALL"', requiresConfirmation: true },
          { title: 'Update DNS', command: 'aws route53 change-resource-record-sets ...' },
          { title: 'Verify connections', command: 'curl -f http://app/health' }
        ]
      });
    });

    test('should create runbook with steps', () => {
      expect(runbook.name).toBe('Database Failover');
      expect(runbook.category).toBe('database');
      expect(runbook.steps).toHaveLength(5);
      expect(runbook.steps[0].order).toBe(1);
      expect(runbook.steps[2].requiresConfirmation).toBe(true);
    });

    test('should serialize to JSON', () => {
      const json = runbook.toJSON();

      expect(json.name).toBe('Database Failover');
      expect(json.steps).toHaveLength(5);
      expect(json.estimatedDuration).toBe('30 minutes');
    });
  });

  describe('RunbookExecution', () => {
    let runbook;
    let execution;

    beforeEach(() => {
      runbook = new Runbook({
        name: 'Simple Runbook',
        steps: [
          { title: 'Step 1' },
          { title: 'Step 2' },
          { title: 'Step 3' }
        ]
      });
      execution = new RunbookExecution(runbook);
    });

    test('should create execution context', () => {
      expect(execution.runbook).toBe(runbook);
      expect(execution.status).toBe('running');
      expect(execution.stepResults).toHaveLength(3);
      expect(execution.currentStepIndex).toBe(0);
    });

    test('should track step progress', () => {
      const step = execution.getCurrentStep();
      execution.startStep(step.id);

      const result = execution.stepResults[0];
      expect(result.status).toBe(StepStatus.IN_PROGRESS);
      expect(result.startedAt).toBeDefined();
    });

    test('should complete step', () => {
      const step = execution.getCurrentStep();
      execution.startStep(step.id);
      execution.completeStep(step.id, 'Success');

      expect(execution.stepResults[0].status).toBe(StepStatus.COMPLETED);
      expect(execution.currentStepIndex).toBe(1);
    });

    test('should complete execution after all steps', () => {
      for (const step of runbook.steps) {
        execution.startStep(step.id);
        execution.completeStep(step.id);
      }

      expect(execution.status).toBe('completed');
      expect(execution.completedAt).toBeDefined();
    });

    test('should fail step and abort', () => {
      const step = execution.getCurrentStep();
      execution.startStep(step.id);
      execution.failStep(step.id, 'Command failed');

      expect(execution.stepResults[0].status).toBe(StepStatus.FAILED);
      expect(execution.status).toBe('failed'); // Default onFailure is abort
    });

    test('should skip step', () => {
      const step = execution.getCurrentStep();
      execution.skipStep(step.id, 'Not applicable');

      expect(execution.stepResults[0].status).toBe(StepStatus.SKIPPED);
      expect(execution.currentStepIndex).toBe(1);
    });

    test('should get progress', () => {
      execution.completeStep(runbook.steps[0].id);
      execution.completeStep(runbook.steps[1].id);

      const progress = execution.getProgress();

      expect(progress.total).toBe(3);
      expect(progress.completed).toBe(2);
      expect(progress.percentage).toBe(67);
    });

    test('should serialize to JSON', () => {
      const json = execution.toJSON();

      expect(json.runbookName).toBe('Simple Runbook');
      expect(json.status).toBe('running');
      expect(json.progress).toBeDefined();
    });
  });

  describe('PostMortem', () => {
    let incident;
    let postMortem;

    beforeEach(() => {
      incident = new Incident({
        title: 'Database Outage',
        severity: IncidentSeverity.SEV1,
        affectedServices: ['database', 'api'],
        customerImpact: { affected: 1000, percentage: 50 }
      });
      incident.acknowledge('alice');
      incident.setRootCause('Disk full');
      incident.setResolution('Added disk space');
      incident.addResponder('bob');

      postMortem = new PostMortem(incident);
    });

    test('should create post-mortem from incident', () => {
      expect(postMortem.incidentId).toBe(incident.id);
      expect(postMortem.summary.severity).toBe(IncidentSeverity.SEV1);
      expect(postMortem.rootCause).toBe('Disk full');
      expect(postMortem.resolution).toBe('Added disk space');
    });

    test('should add action items', () => {
      postMortem.addActionItem({
        title: 'Add disk monitoring',
        owner: 'charlie',
        priority: 'high',
        dueDate: '2024-01-15'
      });

      expect(postMortem.actionItems).toHaveLength(1);
      expect(postMortem.actionItems[0].priority).toBe('high');
    });

    test('should add lessons learned', () => {
      postMortem.addLessonLearned('Need better disk monitoring');
      postMortem.addLessonLearned('Runbook was outdated');

      expect(postMortem.lessonsLearned).toHaveLength(2);
    });

    test('should add what went well/poorly', () => {
      postMortem.addWhatWentWell('Quick response time');
      postMortem.addWhatWentPoorly('No alerts for disk space');

      expect(postMortem.whatWentWell).toContain('Quick response time');
      expect(postMortem.whatWentPoorly).toContain('No alerts for disk space');
    });

    test('should generate markdown', () => {
      postMortem.addActionItem({
        title: 'Add monitoring',
        owner: 'alice',
        priority: 'high'
      });
      postMortem.addLessonLearned('Better monitoring needed');

      const md = postMortem.toMarkdown();

      expect(md).toContain('# Post-Mortem: Database Outage');
      expect(md).toContain('**Severity:** sev1');
      expect(md).toContain('## Root Cause');
      expect(md).toContain('Disk full');
      expect(md).toContain('## Action Items');
      expect(md).toContain('Add monitoring');
    });

    test('should serialize to JSON', () => {
      const json = postMortem.toJSON();

      expect(json.incidentId).toBe(incident.id);
      expect(json.summary).toBeDefined();
      expect(json.timeline).toBeDefined();
    });
  });

  describe('IncidentManager', () => {
    let manager;

    beforeEach(() => {
      manager = createIncidentManager({
        primaryOncall: 'alice'
      });
    });

    test('should create incident manager', () => {
      expect(manager).toBeInstanceOf(IncidentManager);
      expect(manager.getOncall().primary).toBe('alice');
    });

    test('should create and get incident', () => {
      const incident = manager.createIncident({
        title: 'Test incident',
        severity: IncidentSeverity.SEV3
      });

      expect(incident.title).toBe('Test incident');
      expect(manager.getIncident(incident.id)).toBe(incident);
    });

    test('should list incidents with filters', () => {
      manager.createIncident({ title: 'SEV1', severity: IncidentSeverity.SEV1 });
      manager.createIncident({ title: 'SEV2', severity: IncidentSeverity.SEV2 });
      manager.createIncident({ title: 'SEV3', severity: IncidentSeverity.SEV3 });

      const all = manager.listIncidents();
      expect(all).toHaveLength(3);

      const sev1Only = manager.listIncidents({ severity: IncidentSeverity.SEV1 });
      expect(sev1Only).toHaveLength(1);
      expect(sev1Only[0].title).toBe('SEV1');
    });

    test('should list open incidents', () => {
      const _inc1 = manager.createIncident({ title: 'Open' });
      const inc2 = manager.createIncident({ title: 'Resolved' });
      inc2.acknowledge('alice');
      inc2.setResolution('Fixed');

      const open = manager.listIncidents({ open: true });
      expect(open).toHaveLength(1);
      expect(open[0].title).toBe('Open');
    });

    test('should acknowledge incident', () => {
      const incident = manager.createIncident({ title: 'Test' });
      manager.acknowledgeIncident(incident.id, 'bob');

      expect(incident.status).toBe(IncidentStatus.TRIAGING);
      expect(incident.assignee).toBe('bob');
    });

    test('should update incident status', () => {
      const incident = manager.createIncident({ title: 'Test' });
      incident.acknowledge('alice');
      
      manager.updateIncidentStatus(incident.id, IncidentStatus.INVESTIGATING, 'Looking into it', 'alice');

      expect(incident.status).toBe(IncidentStatus.INVESTIGATING);
    });

    test('should resolve incident', () => {
      const incident = manager.createIncident({ title: 'Test' });
      manager.resolveIncident(incident.id, 'Fixed the issue');

      expect(incident.status).toBe(IncidentStatus.RESOLVED);
      expect(incident.resolution).toBe('Fixed the issue');
    });

    test('should emit events', (done) => {
      manager.on('incidentCreated', (incident) => {
        expect(incident.title).toBe('Event test');
        done();
      });

      manager.createIncident({ title: 'Event test' });
    });

    test('should notify on-call on incident creation', (done) => {
      manager.on('notify', ({ type, recipient }) => {
        expect(type).toBe('incident');
        expect(recipient).toBe('alice');
        done();
      });

      manager.createIncident({ title: 'Notify test' });
    });

    test('should register and get runbook', () => {
      const runbook = manager.registerRunbook({
        name: 'Test Runbook',
        steps: [{ title: 'Step 1' }]
      });

      expect(manager.getRunbook(runbook.id)).toBe(runbook);
    });

    test('should list runbooks', () => {
      manager.registerRunbook({ id: 'rb-1', name: 'DB Runbook', category: 'database' });
      manager.registerRunbook({ id: 'rb-2', name: 'API Runbook', category: 'api' });

      const all = manager.listRunbooks();
      expect(all).toHaveLength(2);

      const dbOnly = manager.listRunbooks({ category: 'database' });
      expect(dbOnly).toHaveLength(1);
    });

    test('should execute runbook', () => {
      const runbook = manager.registerRunbook({
        name: 'Test Runbook',
        steps: [{ title: 'Step 1' }]
      });

      const execution = manager.executeRunbook(runbook.id);

      expect(execution).toBeInstanceOf(RunbookExecution);
      expect(execution.status).toBe('running');
      expect(manager.getExecution(execution.id)).toBe(execution);
    });

    test('should execute runbook for incident', () => {
      const runbook = manager.registerRunbook({
        name: 'Test Runbook',
        steps: [{ title: 'Step 1' }]
      });
      const incident = manager.createIncident({ title: 'Test' });

      const execution = manager.executeRunbook(runbook.id, incident);

      expect(execution.incident).toBe(incident);
      expect(incident.timeline.some(e => e.description.includes('Runbook'))).toBe(true);
    });

    test('should create post-mortem', () => {
      const incident = manager.createIncident({ title: 'Test' });
      incident.acknowledge('alice');
      incident.setResolution('Fixed');

      const pm = manager.createPostMortem(incident.id);

      expect(pm).toBeInstanceOf(PostMortem);
      expect(pm.incidentId).toBe(incident.id);
      expect(incident.postMortem).toBe(pm.id);
      expect(manager.getPostMortem(pm.id)).toBe(pm);
    });

    test('should set on-call', () => {
      manager.setOncall('bob', 'charlie');

      const oncall = manager.getOncall();
      expect(oncall.primary).toBe('bob');
      expect(oncall.secondary).toBe('charlie');
    });

    test('should get statistics', () => {
      const inc1 = manager.createIncident({ title: 'Inc1', severity: IncidentSeverity.SEV1 });
      const _inc2 = manager.createIncident({ title: 'Inc2', severity: IncidentSeverity.SEV2 });
      inc1.acknowledge('alice');
      inc1.setResolution('Fixed');

      const stats = manager.getStatistics();

      expect(stats.total).toBe(2);
      expect(stats.open).toBe(1);
      expect(stats.bySeverity[IncidentSeverity.SEV1]).toBe(1);
      expect(stats.bySeverity[IncidentSeverity.SEV2]).toBe(1);
      expect(stats.mttr).toBeDefined();
      expect(stats.mtta).toBeDefined();
    });

    test('should throw when incident not found', () => {
      expect(() => {
        manager.acknowledgeIncident('non-existent', 'alice');
      }).toThrow('Incident not found');

      expect(() => {
        manager.resolveIncident('non-existent', 'Fixed');
      }).toThrow('Incident not found');

      expect(() => {
        manager.createPostMortem('non-existent');
      }).toThrow('Incident not found');
    });

    test('should throw when runbook not found', () => {
      expect(() => {
        manager.executeRunbook('non-existent');
      }).toThrow('Runbook not found');
    });
  });

  describe('Constants', () => {
    test('should export IncidentSeverity constants', () => {
      expect(IncidentSeverity.SEV1).toBe('sev1');
      expect(IncidentSeverity.SEV2).toBe('sev2');
      expect(IncidentSeverity.SEV3).toBe('sev3');
      expect(IncidentSeverity.SEV4).toBe('sev4');
      expect(IncidentSeverity.SEV5).toBe('sev5');
    });

    test('should export IncidentStatus constants', () => {
      expect(IncidentStatus.DETECTED).toBe('detected');
      expect(IncidentStatus.TRIAGING).toBe('triaging');
      expect(IncidentStatus.INVESTIGATING).toBe('investigating');
      expect(IncidentStatus.IDENTIFIED).toBe('identified');
      expect(IncidentStatus.MITIGATING).toBe('mitigating');
      expect(IncidentStatus.MONITORING).toBe('monitoring');
      expect(IncidentStatus.RESOLVED).toBe('resolved');
      expect(IncidentStatus.CLOSED).toBe('closed');
    });

    test('should export StepStatus constants', () => {
      expect(StepStatus.PENDING).toBe('pending');
      expect(StepStatus.IN_PROGRESS).toBe('in-progress');
      expect(StepStatus.COMPLETED).toBe('completed');
      expect(StepStatus.FAILED).toBe('failed');
      expect(StepStatus.SKIPPED).toBe('skipped');
    });
  });
});
