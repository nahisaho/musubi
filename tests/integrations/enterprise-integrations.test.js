/**
 * Enterprise Integrations Tests
 *
 * Phase 6 P1: JIRA, Azure DevOps, GitLab, Slack/Teams, SSO
 */

'use strict';

const {
  IntegrationStatus,
  IntegrationType,
  SSOProvider,
  BaseIntegration,
  JIRAIntegration,
  AzureDevOpsIntegration,
  GitLabIntegration,
  SlackIntegration,
  TeamsIntegration,
  SSOIntegration,
  IntegrationManager,
  defaultIntegrationManager,
} = require('../../src/integrations/enterprise-integrations');

describe('Enterprise Integrations Module', () => {
  // ============================================================
  // Constants Tests
  // ============================================================
  describe('IntegrationStatus', () => {
    it('should define all statuses', () => {
      expect(IntegrationStatus.CONNECTED).toBe('connected');
      expect(IntegrationStatus.DISCONNECTED).toBe('disconnected');
      expect(IntegrationStatus.ERROR).toBe('error');
      expect(IntegrationStatus.PENDING).toBe('pending');
    });
  });

  describe('IntegrationType', () => {
    it('should define all types', () => {
      expect(IntegrationType.JIRA).toBe('jira');
      expect(IntegrationType.AZURE_DEVOPS).toBe('azure-devops');
      expect(IntegrationType.GITLAB).toBe('gitlab');
      expect(IntegrationType.SLACK).toBe('slack');
      expect(IntegrationType.TEAMS).toBe('teams');
      expect(IntegrationType.SSO).toBe('sso');
    });
  });

  describe('SSOProvider', () => {
    it('should define all providers', () => {
      expect(SSOProvider.SAML).toBe('saml');
      expect(SSOProvider.OIDC).toBe('oidc');
      expect(SSOProvider.AZURE_AD).toBe('azure-ad');
      expect(SSOProvider.OKTA).toBe('okta');
      expect(SSOProvider.AUTH0).toBe('auth0');
    });
  });

  // ============================================================
  // BaseIntegration Tests
  // ============================================================
  describe('BaseIntegration', () => {
    it('should create with defaults', () => {
      const integration = new BaseIntegration('test');

      expect(integration.type).toBe('test');
      expect(integration.status).toBe(IntegrationStatus.DISCONNECTED);
    });

    it('should connect and disconnect', async () => {
      const integration = new BaseIntegration('test');

      await integration.connect();
      expect(integration.status).toBe(IntegrationStatus.CONNECTED);

      await integration.disconnect();
      expect(integration.status).toBe(IntegrationStatus.DISCONNECTED);
    });

    it('should test connection', async () => {
      const integration = new BaseIntegration('test');

      let result = await integration.testConnection();
      expect(result.success).toBe(false);

      await integration.connect();
      result = await integration.testConnection();
      expect(result.success).toBe(true);
    });

    it('should get status', () => {
      const integration = new BaseIntegration('test', { name: 'My Test' });
      const status = integration.getStatus();

      expect(status.type).toBe('test');
      expect(status.name).toBe('My Test');
      expect(status.status).toBe(IntegrationStatus.DISCONNECTED);
    });
  });

  // ============================================================
  // JIRA Integration Tests
  // ============================================================
  describe('JIRAIntegration', () => {
    let jira;

    beforeEach(async () => {
      jira = new JIRAIntegration({
        baseUrl: 'https://company.atlassian.net',
        projectKey: 'PROJ',
        config: { apiToken: 'test-token' },
      });
      await jira.connect();
    });

    it('should fail to connect without credentials', async () => {
      const badJira = new JIRAIntegration();
      const result = await badJira.connect();

      expect(result.success).toBe(false);
      expect(badJira.status).toBe(IntegrationStatus.ERROR);
    });

    it('should create issue', async () => {
      const issue = await jira.createIssue({
        summary: 'Test Issue',
        description: 'Test description',
        type: 'Bug',
        priority: 'High',
      });

      expect(issue.key).toBe('PROJ-1');
      expect(issue.summary).toBe('Test Issue');
      expect(issue.type).toBe('Bug');
      expect(issue.status).toBe('Open');
    });

    it('should get issue', async () => {
      const created = await jira.createIssue({ summary: 'Test' });
      const retrieved = await jira.getIssue(created.key);

      expect(retrieved).toEqual(created);
    });

    it('should return null for unknown issue', async () => {
      const result = await jira.getIssue('PROJ-999');
      expect(result).toBeNull();
    });

    it('should update issue', async () => {
      const created = await jira.createIssue({ summary: 'Original' });
      const updated = await jira.updateIssue(created.key, {
        summary: 'Updated',
        status: 'In Progress',
      });

      expect(updated.summary).toBe('Updated');
      expect(updated.status).toBe('In Progress');
    });

    it('should throw updating unknown issue', async () => {
      await expect(jira.updateIssue('PROJ-999', {})).rejects.toThrow('not found');
    });

    it('should search issues', async () => {
      await jira.createIssue({ summary: 'Bug 1', type: 'Bug' });
      await jira.createIssue({ summary: 'Task 1', type: 'Task' });
      await jira.createIssue({ summary: 'Bug 2', type: 'Bug' });

      const bugs = await jira.searchIssues({ type: 'Bug' });

      expect(bugs.length).toBe(2);
    });

    it('should sync requirements', async () => {
      const requirements = [
        { id: 'REQ-001', title: 'User login', description: 'Users can login' },
        { id: 'REQ-002', title: 'User logout', description: 'Users can logout' },
      ];

      const result = await jira.syncRequirements(requirements);

      expect(result.synced).toBe(2);
      expect(result.issues[0].type).toBe('Story');
    });

    it('should throw when not connected', async () => {
      await jira.disconnect();
      await expect(jira.createIssue({ summary: 'Test' })).rejects.toThrow('Not connected');
    });
  });

  // ============================================================
  // Azure DevOps Integration Tests
  // ============================================================
  describe('AzureDevOpsIntegration', () => {
    let azdo;

    beforeEach(async () => {
      azdo = new AzureDevOpsIntegration({
        organization: 'myorg',
        project: 'myproject',
        config: { pat: 'test-pat' },
      });
      await azdo.connect();
    });

    it('should fail to connect without credentials', async () => {
      const badAzdo = new AzureDevOpsIntegration();
      const result = await badAzdo.connect();

      expect(result.success).toBe(false);
    });

    it('should create work item', async () => {
      const item = await azdo.createWorkItem({
        title: 'New Feature',
        type: 'User Story',
      });

      expect(item.id).toBe(1);
      expect(item.title).toBe('New Feature');
      expect(item.state).toBe('New');
    });

    it('should get work item', async () => {
      const created = await azdo.createWorkItem({ title: 'Test' });
      const retrieved = await azdo.getWorkItem(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should query work items', async () => {
      await azdo.createWorkItem({ title: 'Item 1', type: 'Bug' });
      await azdo.createWorkItem({ title: 'Item 2', type: 'Task' });

      const bugs = await azdo.queryWorkItems({ type: 'Bug' });

      expect(bugs.length).toBe(1);
    });

    it('should trigger pipeline', async () => {
      const run = await azdo.triggerPipeline(123, { branch: 'main' });

      expect(run.pipelineId).toBe(123);
      expect(run.status).toBe('running');
    });

    it('should get pipeline run', async () => {
      const run = await azdo.triggerPipeline(123);
      const retrieved = await azdo.getPipelineRun(run.id);

      expect(retrieved).toEqual(run);
    });
  });

  // ============================================================
  // GitLab Integration Tests
  // ============================================================
  describe('GitLabIntegration', () => {
    let gitlab;

    beforeEach(async () => {
      gitlab = new GitLabIntegration({
        projectId: '12345',
        config: { accessToken: 'test-token' },
      });
      await gitlab.connect();
    });

    it('should fail to connect without credentials', async () => {
      const badGitlab = new GitLabIntegration();
      const result = await badGitlab.connect();

      expect(result.success).toBe(false);
    });

    it('should create issue', async () => {
      const issue = await gitlab.createIssue({
        title: 'Bug Report',
        labels: ['bug', 'priority::high'],
      });

      expect(issue.iid).toBe(1);
      expect(issue.state).toBe('opened');
    });

    it('should get issue', async () => {
      const created = await gitlab.createIssue({ title: 'Test' });
      const retrieved = await gitlab.getIssue(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should create merge request', async () => {
      const mr = await gitlab.createMergeRequest({
        title: 'Feature: Add login',
        sourceBranch: 'feature/login',
        targetBranch: 'main',
      });

      expect(mr.iid).toBe(1);
      expect(mr.sourceBranch).toBe('feature/login');
      expect(mr.state).toBe('opened');
    });

    it('should get merge request', async () => {
      const created = await gitlab.createMergeRequest({
        title: 'Test MR',
        sourceBranch: 'test',
      });
      const retrieved = await gitlab.getMergeRequest(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should trigger pipeline', async () => {
      const pipeline = await gitlab.triggerPipeline('main', { DEPLOY: 'true' });

      expect(pipeline.ref).toBe('main');
      expect(pipeline.status).toBe('pending');
    });

    it('should get pipeline', async () => {
      const created = await gitlab.triggerPipeline('main');
      const retrieved = await gitlab.getPipeline(created.id);

      expect(retrieved).toEqual(created);
    });
  });

  // ============================================================
  // Slack Integration Tests
  // ============================================================
  describe('SlackIntegration', () => {
    let slack;

    beforeEach(async () => {
      slack = new SlackIntegration({
        webhookUrl: 'https://hooks.slack.com/test',
        defaultChannel: '#dev',
      });
      await slack.connect();
    });

    it('should fail to connect without webhook', async () => {
      const badSlack = new SlackIntegration();
      const result = await badSlack.connect();

      expect(result.success).toBe(false);
    });

    it('should send message', async () => {
      const sent = await slack.sendMessage({
        text: 'Hello, team!',
        channel: '#general',
      });

      expect(sent.text).toBe('Hello, team!');
      expect(sent.channel).toBe('#general');
    });

    it('should use default channel', async () => {
      const sent = await slack.sendMessage({ text: 'Test' });

      expect(sent.channel).toBe('#dev');
    });

    it('should notify orchestration event', async () => {
      const sent = await slack.notifyOrchestrationEvent({
        type: 'completed',
        title: 'Build Successful',
        description: 'All tests passed',
      });

      expect(sent.blocks).toBeDefined();
      expect(sent.blocks[0].text.text).toContain('Build Successful');
    });

    it('should track sent messages', async () => {
      await slack.sendMessage({ text: 'Msg 1' });
      await slack.sendMessage({ text: 'Msg 2' });

      const messages = slack.getSentMessages();
      expect(messages.length).toBe(2);
    });
  });

  // ============================================================
  // Teams Integration Tests
  // ============================================================
  describe('TeamsIntegration', () => {
    let teams;

    beforeEach(async () => {
      teams = new TeamsIntegration({
        webhookUrl: 'https://outlook.office.com/webhook/test',
      });
      await teams.connect();
    });

    it('should fail to connect without webhook', async () => {
      const badTeams = new TeamsIntegration();
      const result = await badTeams.connect();

      expect(result.success).toBe(false);
    });

    it('should send message', async () => {
      const sent = await teams.sendMessage('Hello, team!');

      expect(sent.type).toBe('message');
      expect(sent.text).toBe('Hello, team!');
    });

    it('should send adaptive card', async () => {
      const sent = await teams.sendAdaptiveCard({
        body: [{ type: 'TextBlock', text: 'Hello' }],
      });

      expect(sent.type).toBe('AdaptiveCard');
      expect(sent.body[0].text).toBe('Hello');
    });

    it('should notify orchestration event', async () => {
      const sent = await teams.notifyOrchestrationEvent({
        type: 'failed',
        title: 'Build Failed',
        description: 'Tests failed',
      });

      expect(sent.body[0].text).toBe('Build Failed');
      expect(sent.body[0].color).toBe('attention');
    });

    it('should track sent messages', async () => {
      await teams.sendMessage('Msg 1');
      await teams.sendMessage('Msg 2');

      expect(teams.getSentMessages().length).toBe(2);
    });
  });

  // ============================================================
  // SSO Integration Tests
  // ============================================================
  describe('SSOIntegration', () => {
    let sso;

    beforeEach(async () => {
      sso = new SSOIntegration({
        provider: SSOProvider.OIDC,
        issuer: 'https://login.example.com',
        clientId: 'my-client-id',
      });
      await sso.connect();
    });

    it('should fail to connect without config', async () => {
      const badSSO = new SSOIntegration();
      const result = await badSSO.connect();

      expect(result.success).toBe(false);
    });

    it('should generate authorization URL', () => {
      const url = sso.getAuthorizationUrl('state123', 'https://app.com/callback');

      expect(url).toContain('https://login.example.com/authorize');
      expect(url).toContain('client_id=my-client-id');
      expect(url).toContain('state=state123');
      expect(url).toContain('redirect_uri=');
    });

    it('should throw when not configured', () => {
      const unconfigured = new SSOIntegration();
      expect(() => unconfigured.getAuthorizationUrl('state', 'uri')).toThrow('not configured');
    });

    it('should exchange code for tokens', async () => {
      const session = await sso.exchangeCode('auth-code-123', 'https://app.com/callback');

      expect(session.accessToken).toContain('at_auth-code-123');
      expect(session.refreshToken).toBeDefined();
      expect(session.idToken).toBeDefined();
    });

    it('should validate token', async () => {
      const session = await sso.exchangeCode('code', 'uri');
      const result = await sso.validateToken(session.accessToken);

      expect(result.valid).toBe(true);
      expect(result.claims.email).toBe('user@example.com');
    });

    it('should reject invalid token', async () => {
      const result = await sso.validateToken('invalid-token');

      expect(result.valid).toBe(false);
    });

    it('should logout', async () => {
      const session = await sso.exchangeCode('code', 'uri');
      const result = await sso.logout(session.id);

      expect(result.success).toBe(true);
    });
  });

  // ============================================================
  // Integration Manager Tests
  // ============================================================
  describe('IntegrationManager', () => {
    let manager;

    beforeEach(() => {
      manager = new IntegrationManager();
    });

    it('should register integration', () => {
      const jira = new JIRAIntegration({ id: 'jira-1' });
      manager.register(jira);

      expect(manager.get('jira-1')).toBe(jira);
    });

    it('should get by type', () => {
      manager.register(new SlackIntegration({ id: 'slack-1', webhookUrl: 'test' }));
      manager.register(new TeamsIntegration({ id: 'teams-1', webhookUrl: 'test' }));
      manager.register(new SlackIntegration({ id: 'slack-2', webhookUrl: 'test' }));

      const slacks = manager.getByType(IntegrationType.SLACK);

      expect(slacks.length).toBe(2);
    });

    it('should list all integrations', () => {
      manager.register(new JIRAIntegration({ id: 'jira-1' }));
      manager.register(new SlackIntegration({ id: 'slack-1' }));

      const list = manager.list();

      expect(list.length).toBe(2);
      expect(list[0].id).toBeDefined();
    });

    it('should connect all', async () => {
      manager.register(new SlackIntegration({ id: 'slack', webhookUrl: 'test' }));
      manager.register(new TeamsIntegration({ id: 'teams', webhookUrl: 'test' }));

      const results = await manager.connectAll();

      expect(results.length).toBe(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should disconnect all', async () => {
      const slack = new SlackIntegration({ id: 'slack', webhookUrl: 'test' });
      await slack.connect();
      manager.register(slack);

      const results = await manager.disconnectAll();

      expect(results.every(r => r.success)).toBe(true);
      expect(slack.status).toBe(IntegrationStatus.DISCONNECTED);
    });

    it('should get stats', () => {
      manager.register(new JIRAIntegration({ id: 'jira' }));
      manager.register(new SlackIntegration({ id: 'slack', webhookUrl: 'test' }));

      const stats = manager.getStats();

      expect(stats.total).toBe(2);
      expect(stats.disconnected).toBe(2);
      expect(stats.byType[IntegrationType.JIRA]).toBe(1);
    });

    it('should remove integration', () => {
      manager.register(new JIRAIntegration({ id: 'jira-1' }));

      const removed = manager.remove('jira-1');

      expect(removed).toBe(true);
      expect(manager.get('jira-1')).toBeUndefined();
    });
  });

  // ============================================================
  // Default Instance Tests
  // ============================================================
  describe('Default Instance', () => {
    it('should export defaultIntegrationManager', () => {
      expect(defaultIntegrationManager).toBeInstanceOf(IntegrationManager);
    });
  });
});
