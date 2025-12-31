/**
 * Dashboard CLI
 * 
 * Command-line interface for dashboard operations.
 * 
 * Requirement: IMP-6.2-003-05
 * Design: Section 4.5
 */

const { WorkflowDashboard } = require('../dashboard/workflow-dashboard');
const { TransitionRecorder } = require('../dashboard/transition-recorder');
const { SprintPlanner, PRIORITY } = require('../dashboard/sprint-planner');
const { SprintReporter } = require('../dashboard/sprint-reporter');
const { TraceabilityExtractor } = require('../traceability/extractor');
const { GapDetector } = require('../traceability/gap-detector');
const { MatrixStorage } = require('../traceability/matrix-storage');

/**
 * DashboardCLI
 * 
 * Provides CLI commands for dashboard operations.
 */
class DashboardCLI {
  /**
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = config;
    this.dashboard = new WorkflowDashboard(config.dashboardConfig);
    this.recorder = new TransitionRecorder(config.recorderConfig);
    this.planner = new SprintPlanner(config.plannerConfig);
    this.reporter = new SprintReporter(config.reporterConfig);
    this.extractor = new TraceabilityExtractor(config.extractorConfig);
    this.gapDetector = new GapDetector(config.gapDetectorConfig);
    this.matrixStorage = new MatrixStorage(config.matrixConfig);
  }

  /**
   * Execute CLI command
   * @param {string} command - Command name
   * @param {Array} args - Command arguments
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Command result
   */
  async execute(command, args = [], options = {}) {
    const commands = {
      // Workflow commands
      'workflow:create': () => this.createWorkflow(args[0], options),
      'workflow:status': () => this.getWorkflowStatus(args[0]),
      'workflow:advance': () => this.advanceWorkflow(args[0], options),
      'workflow:list': () => this.listWorkflows(),
      
      // Sprint commands
      'sprint:create': () => this.createSprint(options),
      'sprint:start': () => this.startSprint(args[0]),
      'sprint:complete': () => this.completeSprint(args[0]),
      'sprint:status': () => this.getSprintStatus(args[0]),
      'sprint:add-task': () => this.addSprintTask(args[0], options),
      'sprint:report': () => this.generateSprintReport(args[0]),
      
      // Traceability commands
      'trace:scan': () => this.scanTraceability(args[0], options),
      'trace:gaps': () => this.detectGaps(args[0]),
      'trace:matrix': () => this.showMatrix(args[0]),
      'trace:save': () => this.saveMatrix(args[0], options),
      
      // Summary commands
      'summary': () => this.getSummary(args[0]),
      'help': () => this.showHelp()
    };

    const handler = commands[command];
    if (!handler) {
      throw new Error(`Unknown command: ${command}. Use 'help' to see available commands.`);
    }

    return await handler();
  }

  /**
   * Create a new workflow
   * @param {string} featureId - Feature ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Created workflow
   */
  async createWorkflow(featureId, options = {}) {
    if (!featureId) {
      throw new Error('Feature ID is required');
    }

    const workflow = await this.dashboard.createWorkflow(featureId, {
      title: options.name || featureId,
      description: options.description || ''
    });

    return {
      success: true,
      message: `Workflow created: ${workflow.featureId}`,
      workflow
    };
  }

  /**
   * Get workflow status
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<Object>} Workflow status
   */
  async getWorkflowStatus(workflowId) {
    if (!workflowId) {
      throw new Error('Workflow ID is required');
    }

    const workflow = await this.dashboard.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const summary = await this.dashboard.getSummary(workflowId);

    return {
      success: true,
      workflow,
      summary
    };
  }

  /**
   * Advance workflow to next stage
   * @param {string} workflowId - Workflow ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Updated workflow
   */
  async advanceWorkflow(workflowId, options = {}) {
    if (!workflowId) {
      throw new Error('Workflow ID is required');
    }

    const workflow = await this.dashboard.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const nextStage = options.toStage || this.getNextStage(workflow.currentStage);

    // Record transition
    await this.recorder.recordTransition(workflowId, {
      fromStage: workflow.currentStage,
      toStage: nextStage,
      reviewer: options.reviewer,
      status: 'approved'
    });

    // Complete current stage
    await this.dashboard.updateStage(
      workflowId,
      workflow.currentStage,
      'completed'
    );

    // Start next stage
    const updated = await this.dashboard.updateStage(
      workflowId,
      nextStage,
      'in-progress'
    );

    return {
      success: true,
      message: `Workflow advanced to ${updated.currentStage}`,
      workflow: updated
    };
  }

  /**
   * List all workflows
   * @returns {Promise<Object>} Workflow list
   */
  async listWorkflows() {
    const workflows = await this.dashboard.listWorkflows();
    const workflowSummaries = [];

    for (const w of workflows) {
      const completion = await this.dashboard.calculateCompletion(w.featureId);
      workflowSummaries.push({
        id: w.featureId,
        name: w.title,
        currentStage: w.currentStage,
        status: w.status || 'active',
        completion
      });
    }

    return {
      success: true,
      count: workflows.length,
      workflows: workflowSummaries
    };
  }

  /**
   * Create a new sprint
   * @param {Object} options - Sprint options
   * @returns {Promise<Object>} Created sprint
   */
  async createSprint(options = {}) {
    const sprint = await this.planner.createSprint({
      sprintId: options.id,
      name: options.name,
      featureId: options.featureId,
      goal: options.goal,
      velocity: options.velocity ? parseInt(options.velocity) : undefined
    });

    return {
      success: true,
      message: `Sprint created: ${sprint.id}`,
      sprint
    };
  }

  /**
   * Start a sprint
   * @param {string} sprintId - Sprint ID
   * @returns {Promise<Object>} Started sprint
   */
  async startSprint(sprintId) {
    if (!sprintId) {
      throw new Error('Sprint ID is required');
    }

    const sprint = await this.planner.startSprint(sprintId);

    return {
      success: true,
      message: `Sprint started: ${sprint.id}`,
      sprint
    };
  }

  /**
   * Complete a sprint
   * @param {string} sprintId - Sprint ID
   * @returns {Promise<Object>} Completed sprint
   */
  async completeSprint(sprintId) {
    if (!sprintId) {
      throw new Error('Sprint ID is required');
    }

    const sprint = await this.planner.completeSprint(sprintId);

    return {
      success: true,
      message: `Sprint completed: ${sprint.id}`,
      sprint
    };
  }

  /**
   * Get sprint status
   * @param {string} sprintId - Sprint ID
   * @returns {Promise<Object>} Sprint status
   */
  async getSprintStatus(sprintId) {
    if (!sprintId) {
      throw new Error('Sprint ID is required');
    }

    const sprint = await this.planner.getSprint(sprintId);
    if (!sprint) {
      throw new Error(`Sprint not found: ${sprintId}`);
    }

    const metrics = await this.planner.getMetrics(sprintId);

    return {
      success: true,
      sprint,
      metrics
    };
  }

  /**
   * Add task to sprint
   * @param {string} sprintId - Sprint ID
   * @param {Object} options - Task options
   * @returns {Promise<Object>} Updated sprint
   */
  async addSprintTask(sprintId, options = {}) {
    if (!sprintId) {
      throw new Error('Sprint ID is required');
    }

    if (!options.title) {
      throw new Error('Task title is required');
    }

    const sprint = await this.planner.addTasks(sprintId, [{
      id: options.taskId,
      title: options.title,
      description: options.description,
      requirementId: options.requirementId,
      storyPoints: options.points ? parseInt(options.points) : 1,
      priority: options.priority || PRIORITY.MEDIUM
    }]);

    return {
      success: true,
      message: 'Task added to sprint',
      sprint
    };
  }

  /**
   * Generate sprint report
   * @param {string} sprintId - Sprint ID
   * @returns {Promise<Object>} Sprint report
   */
  async generateSprintReport(sprintId) {
    if (!sprintId) {
      throw new Error('Sprint ID is required');
    }

    const sprint = await this.planner.getSprint(sprintId);
    if (!sprint) {
      throw new Error(`Sprint not found: ${sprintId}`);
    }

    const markdown = await this.reporter.generateMarkdownReport(sprint);

    return {
      success: true,
      message: 'Report generated',
      report: markdown
    };
  }

  /**
   * Scan for traceability
   * @param {string} directory - Directory to scan
   * @param {Object} options - Scan options
   * @returns {Promise<Object>} Scan results
   */
  async scanTraceability(directory = '.', options = {}) {
    const artifacts = await this.extractor.scanDirectory(directory, {
      extensions: options.extensions ? options.extensions.split(',') : undefined
    });

    return {
      success: true,
      directory,
      artifacts: artifacts.length,
      requirements: new Set(artifacts.map(a => a.requirementId)).size,
      results: artifacts
    };
  }

  /**
   * Detect traceability gaps
   * @param {string} directory - Directory to analyze
   * @returns {Promise<Object>} Gap detection results
   */
  async detectGaps(directory = '.') {
    // Scan artifacts
    const codeArtifacts = await this.extractor.scanDirectory(directory, {
      extensions: ['.js', '.ts']
    });
    
    const testArtifacts = await this.extractor.scanDirectory(directory, {
      extensions: ['.test.js', '.spec.js', '.test.ts', '.spec.ts']
    });

    // Build matrix in format expected by GapDetector
    const matrix = {};
    const allRequirements = new Set();

    for (const artifact of codeArtifacts) {
      allRequirements.add(artifact.requirementId);
      if (!matrix[artifact.requirementId]) {
        matrix[artifact.requirementId] = {
          requirementId: artifact.requirementId,
          code: [],
          tests: [],
          design: [],
          commits: []
        };
      }
      matrix[artifact.requirementId].code.push(artifact);
    }

    for (const artifact of testArtifacts) {
      allRequirements.add(artifact.requirementId);
      if (!matrix[artifact.requirementId]) {
        matrix[artifact.requirementId] = {
          requirementId: artifact.requirementId,
          code: [],
          tests: [],
          design: [],
          commits: []
        };
      }
      matrix[artifact.requirementId].tests.push(artifact);
    }

    // Detect gaps using getGapReport which calls detectGaps internally
    const links = Object.values(matrix);
    const report = this.gapDetector.getGapReport(links);

    return {
      success: true,
      requirements: allRequirements.size,
      gaps: report.gaps.length,
      report
    };
  }

  /**
   * Show traceability matrix
   * @param {string} matrixId - Matrix ID to load
   * @returns {Promise<Object>} Matrix data
   */
  async showMatrix(matrixId) {
    if (matrixId) {
      const matrix = await this.matrixStorage.load(matrixId);
      if (!matrix) {
        throw new Error(`Matrix not found: ${matrixId}`);
      }
      return {
        success: true,
        matrix
      };
    }

    const matrices = await this.matrixStorage.list();
    return {
      success: true,
      matrices
    };
  }

  /**
   * Save traceability matrix
   * @param {string} directory - Directory to scan
   * @param {Object} options - Save options
   * @returns {Promise<Object>} Save result
   */
  async saveMatrix(directory = '.', options = {}) {
    const codeArtifacts = await this.extractor.scanDirectory(directory);
    
    const entries = this.extractor.groupByRequirement(codeArtifacts);
    
    const featureId = options.id || `MATRIX-${Date.now()}`;
    const matrix = {
      name: options.name || 'Traceability Matrix',
      entries,
      createdAt: new Date().toISOString()
    };

    const filePath = await this.matrixStorage.save(featureId, matrix);

    return {
      success: true,
      message: `Matrix saved: ${featureId}`,
      path: filePath
    };
  }

  /**
   * Get overall summary
   * @param {string} featureId - Feature ID
   * @returns {Promise<Object>} Summary
   */
  async getSummary(featureId) {
    const workflows = await this.dashboard.listWorkflows();
    const filteredWorkflows = featureId 
      ? workflows.filter(w => w.featureId === featureId)
      : workflows;

    const summary = {
      workflows: {
        total: filteredWorkflows.length,
        active: filteredWorkflows.filter(w => w.status === 'active').length,
        completed: filteredWorkflows.filter(w => w.status === 'completed').length
      }
    };

    return {
      success: true,
      summary
    };
  }

  /**
   * Show help
   * @returns {Object} Help information
   */
  showHelp() {
    return {
      success: true,
      commands: {
        'workflow:create <featureId>': 'Create a new workflow',
        'workflow:status <workflowId>': 'Get workflow status',
        'workflow:advance <workflowId>': 'Advance workflow to next stage',
        'workflow:list': 'List all workflows',
        'sprint:create': 'Create a new sprint',
        'sprint:start <sprintId>': 'Start a sprint',
        'sprint:complete <sprintId>': 'Complete a sprint',
        'sprint:status <sprintId>': 'Get sprint status',
        'sprint:add-task <sprintId>': 'Add task to sprint',
        'sprint:report <sprintId>': 'Generate sprint report',
        'trace:scan [directory]': 'Scan for traceability',
        'trace:gaps [directory]': 'Detect traceability gaps',
        'trace:matrix [matrixId]': 'Show traceability matrix',
        'trace:save [directory]': 'Save traceability matrix',
        'summary [featureId]': 'Get overall summary',
        'help': 'Show this help'
      }
    };
  }

  /**
   * Get next stage in workflow
   * @param {string} currentStage - Current stage
   * @returns {string} Next stage
   */
  getNextStage(currentStage) {
    const stageOrder = ['steering', 'requirements', 'design', 'implementation', 'validation'];
    const currentIndex = stageOrder.indexOf(currentStage);
    if (currentIndex === -1 || currentIndex === stageOrder.length - 1) {
      return currentStage;
    }
    return stageOrder[currentIndex + 1];
  }
}

module.exports = { DashboardCLI };
