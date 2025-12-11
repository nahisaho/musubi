/**
 * Enterprise Integrations Module
 *
 * Phase 6 P1: JIRA, Azure DevOps, GitLab, Slack/Teams, SSO
 *
 * @module integrations/enterprise
 */

'use strict';

// ============================================================
// Integration Status
// ============================================================

const IntegrationStatus = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  PENDING: 'pending',
};

const IntegrationType = {
  JIRA: 'jira',
  AZURE_DEVOPS: 'azure-devops',
  GITLAB: 'gitlab',
  SLACK: 'slack',
  TEAMS: 'teams',
  SSO: 'sso',
};

// ============================================================
// Base Integration
// ============================================================

/**
 * Base class for all integrations
 */
class BaseIntegration {
  constructor(type, options = {}) {
    this.type = type;
    this.id = options.id || `${type}_${Date.now()}`;
    this.name = options.name || type;
    this.status = IntegrationStatus.DISCONNECTED;
    this.config = options.config || {};
    this.lastSync = null;
    this.error = null;
  }

  /**
   * Connect to the integration
   */
  async connect() {
    this.status = IntegrationStatus.CONNECTED;
    this.error = null;
    return { success: true };
  }

  /**
   * Disconnect from the integration
   */
  async disconnect() {
    this.status = IntegrationStatus.DISCONNECTED;
    return { success: true };
  }

  /**
   * Test the connection
   */
  async testConnection() {
    return { success: this.status === IntegrationStatus.CONNECTED };
  }

  /**
   * Get integration status
   */
  getStatus() {
    return {
      type: this.type,
      id: this.id,
      name: this.name,
      status: this.status,
      lastSync: this.lastSync,
      error: this.error,
    };
  }

  /**
   * Mark as synced
   */
  _markSynced() {
    this.lastSync = new Date().toISOString();
  }
}

// ============================================================
// JIRA Integration
// ============================================================

/**
 * JIRA Integration for issue sync and automation
 */
class JIRAIntegration extends BaseIntegration {
  constructor(options = {}) {
    super(IntegrationType.JIRA, options);
    this.baseUrl = options.baseUrl || '';
    this.projectKey = options.projectKey || '';
    this.issues = new Map();
  }

  /**
   * Connect to JIRA
   */
  async connect() {
    if (!this.baseUrl || !this.config.apiToken) {
      this.status = IntegrationStatus.ERROR;
      this.error = 'Missing baseUrl or apiToken';
      return { success: false, error: this.error };
    }

    this.status = IntegrationStatus.CONNECTED;
    this.error = null;
    return { success: true };
  }

  /**
   * Create an issue
   */
  async createIssue(issue) {
    if (this.status !== IntegrationStatus.CONNECTED) {
      throw new Error('Not connected to JIRA');
    }

    const id = `${this.projectKey}-${this.issues.size + 1}`;
    const created = {
      id,
      key: id,
      summary: issue.summary,
      description: issue.description || '',
      type: issue.type || 'Task',
      status: 'Open',
      priority: issue.priority || 'Medium',
      assignee: issue.assignee || null,
      labels: issue.labels || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.issues.set(id, created);
    this._markSynced();
    return created;
  }

  /**
   * Get an issue by ID
   */
  async getIssue(issueId) {
    if (this.status !== IntegrationStatus.CONNECTED) {
      throw new Error('Not connected to JIRA');
    }

    return this.issues.get(issueId) || null;
  }

  /**
   * Update an issue
   */
  async updateIssue(issueId, updates) {
    if (this.status !== IntegrationStatus.CONNECTED) {
      throw new Error('Not connected to JIRA');
    }

    const issue = this.issues.get(issueId);
    if (!issue) {
      throw new Error(`Issue ${issueId} not found`);
    }

    const updated = {
      ...issue,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.issues.set(issueId, updated);
    this._markSynced();
    return updated;
  }

  /**
   * Search issues
   */
  async searchIssues(query = {}) {
    if (this.status !== IntegrationStatus.CONNECTED) {
      throw new Error('Not connected to JIRA');
    }

    let results = Array.from(this.issues.values());

    if (query.status) {
      results = results.filter(i => i.status === query.status);
    }
    if (query.type) {
      results = results.filter(i => i.type === query.type);
    }
    if (query.assignee) {
      results = results.filter(i => i.assignee === query.assignee);
    }
    if (query.label) {
      results = results.filter(i => i.labels.includes(query.label));
    }

    return results;
  }

  /**
   * Sync requirements to JIRA issues
   */
  async syncRequirements(requirements) {
    if (this.status !== IntegrationStatus.CONNECTED) {
      throw new Error('Not connected to JIRA');
    }

    const created = [];
    for (const req of requirements) {
      const issue = await this.createIssue({
        summary: req.title || req.id,
        description: req.description,
        type: 'Story',
        labels: ['requirement', `priority-${req.priority || 'medium'}`],
      });
      created.push(issue);
    }

    return { synced: created.length, issues: created };
  }
}

// ============================================================
// Azure DevOps Integration
// ============================================================

/**
 * Azure DevOps Integration for pipeline and work items
 */
class AzureDevOpsIntegration extends BaseIntegration {
  constructor(options = {}) {
    super(IntegrationType.AZURE_DEVOPS, options);
    this.organization = options.organization || '';
    this.project = options.project || '';
    this.workItems = new Map();
    this.pipelines = new Map();
  }

  /**
   * Connect to Azure DevOps
   */
  async connect() {
    if (!this.organization || !this.config.pat) {
      this.status = IntegrationStatus.ERROR;
      this.error = 'Missing organization or PAT';
      return { success: false, error: this.error };
    }

    this.status = IntegrationStatus.CONNECTED;
    this.error = null;
    return { success: true };
  }

  /**
   * Create work item
   */
  async createWorkItem(workItem) {
    if (this.status !== IntegrationStatus.CONNECTED) {
      throw new Error('Not connected to Azure DevOps');
    }

    const id = this.workItems.size + 1;
    const created = {
      id,
      title: workItem.title,
      description: workItem.description || '',
      type: workItem.type || 'Task',
      state: 'New',
      assignedTo: workItem.assignedTo || null,
      tags: workItem.tags || [],
      areaPath: workItem.areaPath || this.project,
      iterationPath: workItem.iterationPath || this.project,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.workItems.set(id, created);
    this._markSynced();
    return created;
  }

  /**
   * Get work item
   */
  async getWorkItem(id) {
    if (this.status !== IntegrationStatus.CONNECTED) {
      throw new Error('Not connected to Azure DevOps');
    }

    return this.workItems.get(id) || null;
  }

  /**
   * Query work items
   */
  async queryWorkItems(wiql) {
    if (this.status !== IntegrationStatus.CONNECTED) {
      throw new Error('Not connected to Azure DevOps');
    }

    // Simple state-based filtering for mock
    let results = Array.from(this.workItems.values());

    if (wiql.state) {
      results = results.filter(w => w.state === wiql.state);
    }
    if (wiql.type) {
      results = results.filter(w => w.type === wiql.type);
    }

    return results;
  }

  /**
   * Trigger pipeline
   */
  async triggerPipeline(pipelineId, parameters = {}) {
    if (this.status !== IntegrationStatus.CONNECTED) {
      throw new Error('Not connected to Azure DevOps');
    }

    const runId = Date.now();
    const run = {
      id: runId,
      pipelineId,
      status: 'running',
      parameters,
      startedAt: new Date().toISOString(),
    };

    this.pipelines.set(runId, run);
    this._markSynced();
    return run;
  }

  /**
   * Get pipeline run status
   */
  async getPipelineRun(runId) {
    return this.pipelines.get(runId) || null;
  }
}

// ============================================================
// GitLab Integration
// ============================================================

/**
 * GitLab Integration for CI/CD support
 */
class GitLabIntegration extends BaseIntegration {
  constructor(options = {}) {
    super(IntegrationType.GITLAB, options);
    this.baseUrl = options.baseUrl || 'https://gitlab.com';
    this.projectId = options.projectId || '';
    this.issues = new Map();
    this.mergeRequests = new Map();
    this.pipelines = new Map();
  }

  /**
   * Connect to GitLab
   */
  async connect() {
    if (!this.projectId || !this.config.accessToken) {
      this.status = IntegrationStatus.ERROR;
      this.error = 'Missing projectId or accessToken';
      return { success: false, error: this.error };
    }

    this.status = IntegrationStatus.CONNECTED;
    this.error = null;
    return { success: true };
  }

  /**
   * Create issue
   */
  async createIssue(issue) {
    if (this.status !== IntegrationStatus.CONNECTED) {
      throw new Error('Not connected to GitLab');
    }

    const id = this.issues.size + 1;
    const created = {
      id,
      iid: id,
      title: issue.title,
      description: issue.description || '',
      state: 'opened',
      labels: issue.labels || [],
      assignees: issue.assignees || [],
      milestone: issue.milestone || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.issues.set(id, created);
    this._markSynced();
    return created;
  }

  /**
   * Get issue
   */
  async getIssue(issueId) {
    if (this.status !== IntegrationStatus.CONNECTED) {
      throw new Error('Not connected to GitLab');
    }

    return this.issues.get(issueId) || null;
  }

  /**
   * Create merge request
   */
  async createMergeRequest(mr) {
    if (this.status !== IntegrationStatus.CONNECTED) {
      throw new Error('Not connected to GitLab');
    }

    const id = this.mergeRequests.size + 1;
    const created = {
      id,
      iid: id,
      title: mr.title,
      description: mr.description || '',
      sourceBranch: mr.sourceBranch,
      targetBranch: mr.targetBranch || 'main',
      state: 'opened',
      labels: mr.labels || [],
      assignees: mr.assignees || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.mergeRequests.set(id, created);
    this._markSynced();
    return created;
  }

  /**
   * Get merge request
   */
  async getMergeRequest(mrId) {
    if (this.status !== IntegrationStatus.CONNECTED) {
      throw new Error('Not connected to GitLab');
    }

    return this.mergeRequests.get(mrId) || null;
  }

  /**
   * Trigger pipeline
   */
  async triggerPipeline(ref, variables = {}) {
    if (this.status !== IntegrationStatus.CONNECTED) {
      throw new Error('Not connected to GitLab');
    }

    const id = this.pipelines.size + 1;
    const pipeline = {
      id,
      ref,
      status: 'pending',
      variables,
      createdAt: new Date().toISOString(),
    };

    this.pipelines.set(id, pipeline);
    this._markSynced();
    return pipeline;
  }

  /**
   * Get pipeline status
   */
  async getPipeline(pipelineId) {
    return this.pipelines.get(pipelineId) || null;
  }
}

// ============================================================
// Slack Integration
// ============================================================

/**
 * Slack Integration for notifications
 */
class SlackIntegration extends BaseIntegration {
  constructor(options = {}) {
    super(IntegrationType.SLACK, options);
    this.webhookUrl = options.webhookUrl || '';
    this.defaultChannel = options.defaultChannel || '#general';
    this.messages = [];
  }

  /**
   * Connect to Slack
   */
  async connect() {
    if (!this.webhookUrl && !this.config.botToken) {
      this.status = IntegrationStatus.ERROR;
      this.error = 'Missing webhookUrl or botToken';
      return { success: false, error: this.error };
    }

    this.status = IntegrationStatus.CONNECTED;
    this.error = null;
    return { success: true };
  }

  /**
   * Send message
   */
  async sendMessage(message) {
    if (this.status !== IntegrationStatus.CONNECTED) {
      throw new Error('Not connected to Slack');
    }

    const sent = {
      id: `msg_${Date.now()}`,
      channel: message.channel || this.defaultChannel,
      text: message.text,
      blocks: message.blocks || null,
      attachments: message.attachments || null,
      sentAt: new Date().toISOString(),
    };

    this.messages.push(sent);
    this._markSynced();
    return sent;
  }

  /**
   * Send notification for orchestration event
   */
  async notifyOrchestrationEvent(event) {
    const emoji = {
      started: ':rocket:',
      completed: ':white_check_mark:',
      failed: ':x:',
      warning: ':warning:',
    };

    return this.sendMessage({
      channel: event.channel || this.defaultChannel,
      text: `${emoji[event.type] || ':bell:'} *${event.title}*`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji[event.type] || ':bell:'} *${event.title}*\n${event.description || ''}`,
          },
        },
        ...(event.details
          ? [
              {
                type: 'context',
                elements: [{ type: 'mrkdwn', text: event.details }],
              },
            ]
          : []),
      ],
    });
  }

  /**
   * Get sent messages (for testing)
   */
  getSentMessages() {
    return this.messages;
  }
}

// ============================================================
// Microsoft Teams Integration
// ============================================================

/**
 * Microsoft Teams Integration for notifications
 */
class TeamsIntegration extends BaseIntegration {
  constructor(options = {}) {
    super(IntegrationType.TEAMS, options);
    this.webhookUrl = options.webhookUrl || '';
    this.messages = [];
  }

  /**
   * Connect to Teams
   */
  async connect() {
    if (!this.webhookUrl) {
      this.status = IntegrationStatus.ERROR;
      this.error = 'Missing webhookUrl';
      return { success: false, error: this.error };
    }

    this.status = IntegrationStatus.CONNECTED;
    this.error = null;
    return { success: true };
  }

  /**
   * Send adaptive card
   */
  async sendAdaptiveCard(card) {
    if (this.status !== IntegrationStatus.CONNECTED) {
      throw new Error('Not connected to Teams');
    }

    const sent = {
      id: `msg_${Date.now()}`,
      type: 'AdaptiveCard',
      body: card.body || [],
      actions: card.actions || [],
      sentAt: new Date().toISOString(),
    };

    this.messages.push(sent);
    this._markSynced();
    return sent;
  }

  /**
   * Send simple message
   */
  async sendMessage(text) {
    if (this.status !== IntegrationStatus.CONNECTED) {
      throw new Error('Not connected to Teams');
    }

    const sent = {
      id: `msg_${Date.now()}`,
      type: 'message',
      text,
      sentAt: new Date().toISOString(),
    };

    this.messages.push(sent);
    this._markSynced();
    return sent;
  }

  /**
   * Notify orchestration event
   */
  async notifyOrchestrationEvent(event) {
    const colors = {
      started: 'accent',
      completed: 'good',
      failed: 'attention',
      warning: 'warning',
    };

    return this.sendAdaptiveCard({
      body: [
        {
          type: 'TextBlock',
          text: event.title,
          weight: 'bolder',
          size: 'large',
          color: colors[event.type] || 'default',
        },
        {
          type: 'TextBlock',
          text: event.description || '',
          wrap: true,
        },
      ],
    });
  }

  /**
   * Get sent messages (for testing)
   */
  getSentMessages() {
    return this.messages;
  }
}

// ============================================================
// SSO Integration
// ============================================================

const SSOProvider = {
  SAML: 'saml',
  OIDC: 'oidc',
  AZURE_AD: 'azure-ad',
  OKTA: 'okta',
  AUTH0: 'auth0',
};

/**
 * SSO Integration for enterprise authentication
 */
class SSOIntegration extends BaseIntegration {
  constructor(options = {}) {
    super(IntegrationType.SSO, options);
    this.provider = options.provider || SSOProvider.OIDC;
    this.issuer = options.issuer || '';
    this.clientId = options.clientId || '';
    this.sessions = new Map();
  }

  /**
   * Connect/configure SSO
   */
  async connect() {
    if (!this.issuer || !this.clientId) {
      this.status = IntegrationStatus.ERROR;
      this.error = 'Missing issuer or clientId';
      return { success: false, error: this.error };
    }

    this.status = IntegrationStatus.CONNECTED;
    this.error = null;
    return { success: true };
  }

  /**
   * Generate authorization URL
   */
  getAuthorizationUrl(state, redirectUri) {
    if (this.status !== IntegrationStatus.CONNECTED) {
      throw new Error('SSO not configured');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      state,
      scope: 'openid profile email',
    });

    return `${this.issuer}/authorize?${params.toString()}`;
  }

  /**
   * Exchange code for tokens (mock)
   */
  async exchangeCode(code, _redirectUri) {
    if (this.status !== IntegrationStatus.CONNECTED) {
      throw new Error('SSO not configured');
    }

    // Mock token response
    const session = {
      id: `session_${Date.now()}`,
      accessToken: `at_${code}_${Date.now()}`,
      refreshToken: `rt_${code}_${Date.now()}`,
      idToken: `id_${code}_${Date.now()}`,
      expiresIn: 3600,
      tokenType: 'Bearer',
      createdAt: new Date().toISOString(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Validate token (mock)
   */
  async validateToken(token) {
    if (this.status !== IntegrationStatus.CONNECTED) {
      throw new Error('SSO not configured');
    }

    // Mock validation
    if (token.startsWith('at_') || token.startsWith('id_')) {
      return {
        valid: true,
        claims: {
          sub: 'user123',
          email: 'user@example.com',
          name: 'Test User',
          iss: this.issuer,
          aud: this.clientId,
        },
      };
    }

    return { valid: false, error: 'Invalid token' };
  }

  /**
   * Logout
   */
  async logout(sessionId) {
    this.sessions.delete(sessionId);
    return { success: true };
  }
}

// ============================================================
// Integration Manager
// ============================================================

/**
 * Central manager for all integrations
 */
class IntegrationManager {
  constructor() {
    this.integrations = new Map();
  }

  /**
   * Register an integration
   */
  register(integration) {
    this.integrations.set(integration.id, integration);
    return integration;
  }

  /**
   * Get integration by ID
   */
  get(id) {
    return this.integrations.get(id);
  }

  /**
   * Get all integrations of a type
   */
  getByType(type) {
    return Array.from(this.integrations.values()).filter(i => i.type === type);
  }

  /**
   * List all integrations
   */
  list() {
    return Array.from(this.integrations.values()).map(i => i.getStatus());
  }

  /**
   * Connect all integrations
   */
  async connectAll() {
    const results = [];
    for (const [id, integration] of this.integrations) {
      const result = await integration.connect();
      results.push({ id, ...result });
    }
    return results;
  }

  /**
   * Disconnect all integrations
   */
  async disconnectAll() {
    const results = [];
    for (const [id, integration] of this.integrations) {
      const result = await integration.disconnect();
      results.push({ id, ...result });
    }
    return results;
  }

  /**
   * Get overall status
   */
  getStats() {
    const all = this.list();
    return {
      total: all.length,
      connected: all.filter(i => i.status === IntegrationStatus.CONNECTED).length,
      disconnected: all.filter(i => i.status === IntegrationStatus.DISCONNECTED).length,
      error: all.filter(i => i.status === IntegrationStatus.ERROR).length,
      byType: Object.fromEntries(
        Object.values(IntegrationType).map(t => [t, all.filter(i => i.type === t).length])
      ),
    };
  }

  /**
   * Remove an integration
   */
  remove(id) {
    return this.integrations.delete(id);
  }
}

// ============================================================
// Default Instance
// ============================================================

const defaultIntegrationManager = new IntegrationManager();

// ============================================================
// Exports
// ============================================================

module.exports = {
  // Constants
  IntegrationStatus,
  IntegrationType,
  SSOProvider,

  // Classes
  BaseIntegration,
  JIRAIntegration,
  AzureDevOpsIntegration,
  GitLabIntegration,
  SlackIntegration,
  TeamsIntegration,
  SSOIntegration,
  IntegrationManager,

  // Default instance
  defaultIntegrationManager,
};
