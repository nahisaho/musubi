/**
 * WorkflowDashboard Implementation
 * 
 * Manages workflow state and progress visualization.
 * 
 * Requirement: IMP-6.2-003-01
 * Design: Section 4.1
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Valid workflow stages
 */
const WORKFLOW_STAGES = [
  'steering',
  'requirements',
  'design',
  'implementation',
  'validation'
];

/**
 * Stage statuses
 */
const STAGE_STATUS = {
  NOT_STARTED: 'not-started',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  BLOCKED: 'blocked'
};

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  storageDir: 'storage/workflows'
};

/**
 * WorkflowDashboard
 * 
 * Manages workflow state and progress for features.
 */
class WorkflowDashboard {
  /**
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.workflows = new Map();
  }

  /**
   * Create a new workflow
   * @param {string} featureId - Feature ID
   * @param {Object} options - Workflow options
   * @returns {Promise<Object>} Created workflow state
   */
  async createWorkflow(featureId, options = {}) {
    const stages = {};
    
    for (const stage of WORKFLOW_STAGES) {
      stages[stage] = {
        status: STAGE_STATUS.NOT_STARTED,
        startedAt: null,
        completedAt: null,
        artifacts: []
      };
    }

    // Set first stage as in-progress
    stages['steering'].status = STAGE_STATUS.IN_PROGRESS;
    stages['steering'].startedAt = new Date().toISOString();

    const workflow = {
      featureId,
      title: options.title || featureId,
      description: options.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStage: 'steering',
      stages,
      blockers: [],
      metadata: options.metadata || {}
    };

    this.workflows.set(featureId, workflow);
    await this.saveWorkflow(workflow);

    return workflow;
  }

  /**
   * Get workflow by feature ID
   * @param {string} featureId - Feature ID
   * @returns {Promise<Object|null>} Workflow state
   */
  async getWorkflow(featureId) {
    if (this.workflows.has(featureId)) {
      return this.workflows.get(featureId);
    }

    return await this.loadWorkflow(featureId);
  }

  /**
   * Update stage status
   * @param {string} featureId - Feature ID
   * @param {string} stage - Stage name
   * @param {string} status - New status
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Updated workflow
   */
  async updateStage(featureId, stage, status, options = {}) {
    const workflow = await this.getWorkflow(featureId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${featureId}`);
    }

    if (!WORKFLOW_STAGES.includes(stage)) {
      throw new Error(`Invalid stage: ${stage}`);
    }

    const stageData = workflow.stages[stage];
    stageData.status = status;

    if (status === STAGE_STATUS.IN_PROGRESS && !stageData.startedAt) {
      stageData.startedAt = new Date().toISOString();
    }

    if (status === STAGE_STATUS.COMPLETED) {
      stageData.completedAt = new Date().toISOString();
    }

    if (options.artifacts) {
      stageData.artifacts.push(...options.artifacts);
    }

    workflow.currentStage = this.calculateCurrentStage(workflow);
    workflow.updatedAt = new Date().toISOString();

    await this.saveWorkflow(workflow);

    return workflow;
  }

  /**
   * Add blocker to workflow
   * @param {string} featureId - Feature ID
   * @param {Object} blocker - Blocker information
   * @returns {Promise<Object>} Updated workflow
   */
  async addBlocker(featureId, blocker) {
    const workflow = await this.getWorkflow(featureId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${featureId}`);
    }

    const blockerEntry = {
      id: `BLK-${Date.now()}`,
      stage: blocker.stage,
      description: blocker.description,
      severity: blocker.severity || 'medium',
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      resolution: null
    };

    workflow.blockers.push(blockerEntry);

    // Mark stage as blocked
    if (blocker.stage && workflow.stages[blocker.stage]) {
      workflow.stages[blocker.stage].status = STAGE_STATUS.BLOCKED;
    }

    workflow.updatedAt = new Date().toISOString();
    await this.saveWorkflow(workflow);

    return workflow;
  }

  /**
   * Resolve blocker
   * @param {string} featureId - Feature ID
   * @param {string} blockerId - Blocker ID
   * @param {string} resolution - Resolution description
   * @returns {Promise<Object>} Updated workflow
   */
  async resolveBlocker(featureId, blockerId, resolution) {
    const workflow = await this.getWorkflow(featureId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${featureId}`);
    }

    const blocker = workflow.blockers.find(b => b.id === blockerId);
    if (!blocker) {
      throw new Error(`Blocker not found: ${blockerId}`);
    }

    blocker.resolvedAt = new Date().toISOString();
    blocker.resolution = resolution;

    // Check if stage can be unblocked
    const stageBlockers = workflow.blockers.filter(
      b => b.stage === blocker.stage && !b.resolvedAt
    );

    if (stageBlockers.length === 0 && workflow.stages[blocker.stage]) {
      workflow.stages[blocker.stage].status = STAGE_STATUS.IN_PROGRESS;
    }

    workflow.updatedAt = new Date().toISOString();
    await this.saveWorkflow(workflow);

    return workflow;
  }

  /**
   * Suggest next actions based on current state
   * @param {string} featureId - Feature ID
   * @returns {Promise<Array>} Suggested next actions
   */
  async suggestNextActions(featureId) {
    const workflow = await this.getWorkflow(featureId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${featureId}`);
    }

    const actions = [];
    const currentStage = workflow.currentStage;
    const stageData = workflow.stages[currentStage];

    // Check for blockers
    const unresolvedBlockers = workflow.blockers.filter(b => !b.resolvedAt);
    if (unresolvedBlockers.length > 0) {
      actions.push({
        type: 'resolve-blocker',
        priority: 'high',
        description: `${unresolvedBlockers.length}件のブロッカーを解決してください`,
        blockers: unresolvedBlockers
      });
    }

    // Stage-specific suggestions
    switch (currentStage) {
      case 'steering':
        actions.push({
          type: 'create-artifact',
          priority: 'medium',
          description: 'プロジェクトメモリファイルを作成してください',
          artifacts: ['structure.md', 'tech.md', 'product.md']
        });
        break;
      case 'requirements':
        actions.push({
          type: 'create-artifact',
          priority: 'medium',
          description: 'EARS形式の要件ドキュメントを作成してください',
          artifacts: ['requirements.md']
        });
        break;
      case 'design':
        actions.push({
          type: 'create-artifact',
          priority: 'medium',
          description: 'C4設計ドキュメントとADRを作成してください',
          artifacts: ['design.md', 'adr-*.md']
        });
        break;
      case 'implementation':
        actions.push({
          type: 'run-review',
          priority: 'medium',
          description: 'レビューゲートを実行して実装を検証してください'
        });
        break;
      case 'validation':
        actions.push({
          type: 'complete-validation',
          priority: 'medium',
          description: '全てのテストが通過していることを確認してください'
        });
        break;
    }

    return actions;
  }

  /**
   * Calculate overall completion percentage
   * @param {string} featureId - Feature ID
   * @returns {Promise<number>} Completion percentage
   */
  async calculateCompletion(featureId) {
    const workflow = await this.getWorkflow(featureId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${featureId}`);
    }

    const totalStages = WORKFLOW_STAGES.length;
    let completed = 0;

    for (const stage of WORKFLOW_STAGES) {
      if (workflow.stages[stage].status === STAGE_STATUS.COMPLETED) {
        completed++;
      }
    }

    return Math.round((completed / totalStages) * 100);
  }

  /**
   * Get workflow summary
   * @param {string} featureId - Feature ID
   * @returns {Promise<Object>} Workflow summary
   */
  async getSummary(featureId) {
    const workflow = await this.getWorkflow(featureId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${featureId}`);
    }

    const completion = await this.calculateCompletion(featureId);
    const unresolvedBlockers = workflow.blockers.filter(b => !b.resolvedAt);
    const actions = await this.suggestNextActions(featureId);

    return {
      featureId,
      title: workflow.title,
      currentStage: workflow.currentStage,
      completion,
      blockerCount: unresolvedBlockers.length,
      nextAction: actions[0] || null,
      stages: Object.entries(workflow.stages).map(([name, data]) => ({
        name,
        status: data.status,
        artifactCount: data.artifacts.length
      }))
    };
  }

  /**
   * Calculate current stage based on statuses
   * @param {Object} workflow - Workflow object
   * @returns {string} Current stage name
   */
  calculateCurrentStage(workflow) {
    for (const stage of WORKFLOW_STAGES) {
      const stageData = workflow.stages[stage];
      if (stageData.status !== STAGE_STATUS.COMPLETED) {
        return stage;
      }
    }
    return 'validation';
  }

  /**
   * Save workflow to storage
   * @param {Object} workflow - Workflow to save
   */
  async saveWorkflow(workflow) {
    await this.ensureStorageDir();
    
    const filePath = path.join(
      this.config.storageDir,
      `${workflow.featureId}.json`
    );

    await fs.writeFile(filePath, JSON.stringify(workflow, null, 2), 'utf-8');
    this.workflows.set(workflow.featureId, workflow);
  }

  /**
   * Load workflow from storage
   * @param {string} featureId - Feature ID
   * @returns {Promise<Object|null>} Workflow
   */
  async loadWorkflow(featureId) {
    try {
      const filePath = path.join(this.config.storageDir, `${featureId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      const workflow = JSON.parse(content);
      this.workflows.set(featureId, workflow);
      return workflow;
    } catch {
      return null;
    }
  }

  /**
   * List all workflows
   * @returns {Promise<Array>} List of workflows
   */
  async listWorkflows() {
    try {
      await this.ensureStorageDir();
      const files = await fs.readdir(this.config.storageDir);
      const workflows = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const featureId = file.replace('.json', '');
          const workflow = await this.getWorkflow(featureId);
          if (workflow) {
            workflows.push(workflow);
          }
        }
      }
      
      return workflows;
    } catch {
      return [];
    }
  }

  /**
   * Ensure storage directory exists
   */
  async ensureStorageDir() {
    try {
      await fs.access(this.config.storageDir);
    } catch {
      await fs.mkdir(this.config.storageDir, { recursive: true });
    }
  }
}

module.exports = { 
  WorkflowDashboard, 
  WORKFLOW_STAGES, 
  STAGE_STATUS 
};
