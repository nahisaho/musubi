/**
 * Tests for Complex Workflow Examples
 * Sprint 3.5: Advanced Workflows
 */

const {
  featureDevelopmentWorkflow,
  cicdPipelineWorkflow,
  codeReviewWorkflow,
  incidentResponseWorkflow,
  dataPipelineWorkflow,
  createWorkflowFromTemplate,
  StepType,
  RecoveryStrategy
} = require('../../src/orchestration/workflow-examples');

describe('Feature Development Workflow', () => {
  test('should have correct metadata', () => {
    expect(featureDevelopmentWorkflow.id).toBe('feature-development');
    expect(featureDevelopmentWorkflow.name).toBe('Feature Development Workflow');
    expect(featureDevelopmentWorkflow.version).toBe('1.0.0');
  });

  test('should have required inputs', () => {
    const requiredInputs = featureDevelopmentWorkflow.inputs.filter(i => i.required);
    expect(requiredInputs.map(i => i.name)).toContain('feature_name');
    expect(requiredInputs.map(i => i.name)).toContain('description');
  });

  test('should have all stages defined', () => {
    const stepIds = featureDevelopmentWorkflow.steps.map(s => s.id);
    
    expect(stepIds).toContain('gather-requirements');
    expect(stepIds).toContain('create-design');
    expect(stepIds).toContain('design-review');
    expect(stepIds).toContain('create-tasks');
    expect(stepIds).toContain('implement-tasks');
    expect(stepIds).toContain('validate-implementation');
    expect(stepIds).toContain('generate-docs');
  });

  test('should have checkpoints', () => {
    const checkpoints = featureDevelopmentWorkflow.steps.filter(
      s => s.type === StepType.CHECKPOINT
    );
    
    expect(checkpoints.length).toBeGreaterThan(0);
    expect(checkpoints.map(c => c.name)).toContain('requirements-complete');
    expect(checkpoints.map(c => c.name)).toContain('design-approved');
  });

  test('should have human review step', () => {
    const reviewStep = featureDevelopmentWorkflow.steps.find(
      s => s.type === StepType.HUMAN_REVIEW
    );
    
    expect(reviewStep).toBeDefined();
    expect(reviewStep.options).toContain('approve');
  });

  test('should have error handling configured', () => {
    expect(featureDevelopmentWorkflow.errorHandling).toBeDefined();
    expect(featureDevelopmentWorkflow.errorHandling.strategy).toBe(RecoveryStrategy.ROLLBACK);
  });

  test('should validate successfully', () => {
    const validation = featureDevelopmentWorkflow.validate();
    expect(validation.valid).toBe(true);
  });
});

describe('CI/CD Pipeline Workflow', () => {
  test('should have correct metadata', () => {
    expect(cicdPipelineWorkflow.id).toBe('cicd-pipeline');
    expect(cicdPipelineWorkflow.name).toBe('CI/CD Pipeline Workflow');
    expect(cicdPipelineWorkflow.version).toBe('2.0.0');
  });

  test('should have pre-flight checks', () => {
    const preflightStep = cicdPipelineWorkflow.steps.find(s => s.id === 'preflight-checks');
    
    expect(preflightStep).toBeDefined();
    expect(preflightStep.type).toBe(StepType.PARALLEL);
  });

  test('should have build step with retry', () => {
    const buildStep = cicdPipelineWorkflow.steps.find(s => s.id === 'build');
    
    expect(buildStep).toBeDefined();
    expect(buildStep.retry).toBeDefined();
    expect(buildStep.retry.maxRetries).toBe(2);
  });

  test('should have test stages', () => {
    const stepIds = cicdPipelineWorkflow.steps.map(s => s.id);
    
    expect(stepIds).toContain('unit-tests');
    expect(stepIds).toContain('integration-tests');
    expect(stepIds).toContain('e2e-tests');
  });

  test('should have deployment decision with conditions', () => {
    const deploymentDecision = cicdPipelineWorkflow.steps.find(
      s => s.id === 'deployment-decision'
    );
    
    expect(deploymentDecision).toBeDefined();
    expect(deploymentDecision.type).toBe(StepType.CONDITION);
    expect(deploymentDecision.condition.$and).toBeDefined();
  });

  test('should have 1 hour timeout', () => {
    expect(cicdPipelineWorkflow.timeout).toBe(3600000);
  });

  test('should validate successfully', () => {
    const validation = cicdPipelineWorkflow.validate();
    expect(validation.valid).toBe(true);
  });
});

describe('Code Review Workflow', () => {
  test('should have correct metadata', () => {
    expect(codeReviewWorkflow.id).toBe('code-review');
    expect(codeReviewWorkflow.name).toBe('Automated Code Review Workflow');
  });

  test('should have required PR inputs', () => {
    const inputNames = codeReviewWorkflow.inputs.map(i => i.name);
    
    expect(inputNames).toContain('repo_owner');
    expect(inputNames).toContain('repo_name');
    expect(inputNames).toContain('pr_number');
  });

  test('should have parallel analysis steps', () => {
    const parallelAnalysis = codeReviewWorkflow.steps.find(
      s => s.id === 'parallel-analysis'
    );
    
    expect(parallelAnalysis).toBeDefined();
    expect(parallelAnalysis.type).toBe(StepType.PARALLEL);
    expect(parallelAnalysis.maxConcurrency).toBe(4);
  });

  test('should have multiple analysis types', () => {
    const parallelAnalysis = codeReviewWorkflow.steps.find(
      s => s.id === 'parallel-analysis'
    );
    const analysisIds = parallelAnalysis.steps.map(s => s.id);
    
    expect(analysisIds).toContain('code-quality');
    expect(analysisIds).toContain('security-review');
    expect(analysisIds).toContain('performance-review');
    expect(analysisIds).toContain('test-coverage-check');
  });

  test('should post line comments in loop', () => {
    const commentLoop = codeReviewWorkflow.steps.find(s => s.id === 'post-comments');
    
    expect(commentLoop).toBeDefined();
    expect(commentLoop.type).toBe(StepType.LOOP);
    expect(commentLoop.maxIterations).toBe(50);
  });

  test('should validate successfully', () => {
    const validation = codeReviewWorkflow.validate();
    expect(validation.valid).toBe(true);
  });
});

describe('Incident Response Workflow', () => {
  test('should have correct metadata', () => {
    expect(incidentResponseWorkflow.id).toBe('incident-response');
    expect(incidentResponseWorkflow.name).toBe('Incident Response Workflow');
  });

  test('should start with classification', () => {
    const firstStep = incidentResponseWorkflow.steps[0];
    
    expect(firstStep.id).toBe('classify-incident');
    expect(firstStep.skillId).toBe('incident-classifier');
  });

  test('should have severity-based routing', () => {
    const routingStep = incidentResponseWorkflow.steps.find(
      s => s.id === 'severity-routing'
    );
    
    expect(routingStep).toBeDefined();
    expect(routingStep.type).toBe(StepType.CONDITION);
    expect(routingStep.condition.$or).toBeDefined();
  });

  test('should handle critical/high severity differently', () => {
    const routingStep = incidentResponseWorkflow.steps.find(
      s => s.id === 'severity-routing'
    );
    
    expect(routingStep.thenSteps.length).toBeGreaterThan(0);
    expect(routingStep.elseSteps.length).toBeGreaterThan(0);
  });

  test('should have auto-remediation capability', () => {
    const autoRemediation = incidentResponseWorkflow.steps.find(
      s => s.id === 'attempt-auto-resolution'
    );
    
    expect(autoRemediation).toBeDefined();
    expect(autoRemediation.type).toBe(StepType.CONDITION);
  });

  test('should use manual recovery strategy', () => {
    expect(incidentResponseWorkflow.errorHandling.strategy).toBe(RecoveryStrategy.MANUAL);
  });

  test('should validate successfully', () => {
    const validation = incidentResponseWorkflow.validate();
    expect(validation.valid).toBe(true);
  });
});

describe('Data Pipeline Workflow', () => {
  test('should have correct metadata', () => {
    expect(dataPipelineWorkflow.id).toBe('data-pipeline');
    expect(dataPipelineWorkflow.name).toBe('Data Pipeline Workflow');
  });

  test('should have parallel extraction', () => {
    const extractStep = dataPipelineWorkflow.steps.find(s => s.id === 'extract-data');
    
    expect(extractStep).toBeDefined();
    expect(extractStep.type).toBe(StepType.PARALLEL);
    expect(extractStep.steps.length).toBe(2);
  });

  test('should have quality checks', () => {
    const qualityStep = dataPipelineWorkflow.steps.find(s => s.id === 'quality-checks');
    
    expect(qualityStep).toBeDefined();
    expect(qualityStep.type).toBe(StepType.PARALLEL);
  });

  test('should have quality gate', () => {
    const gateStep = dataPipelineWorkflow.steps.find(s => s.id === 'quality-gate');
    
    expect(gateStep).toBeDefined();
    expect(gateStep.type).toBe(StepType.CONDITION);
    expect(gateStep.condition.$and).toBeDefined();
  });

  test('should have fallback for quality failure', () => {
    const gateStep = dataPipelineWorkflow.steps.find(s => s.id === 'quality-gate');
    
    expect(gateStep.elseSteps.length).toBeGreaterThan(0);
    expect(gateStep.elseSteps.some(s => s.type === StepType.HUMAN_REVIEW)).toBe(true);
  });

  test('should have retry on extraction', () => {
    const extractStep = dataPipelineWorkflow.steps.find(s => s.id === 'extract-data');
    const sourceAExtract = extractStep.steps.find(s => s.id === 'extract-source-a');
    
    expect(sourceAExtract.retry).toBeDefined();
    expect(sourceAExtract.retry.maxRetries).toBe(3);
  });

  test('should have 2 hour timeout', () => {
    expect(dataPipelineWorkflow.timeout).toBe(7200000);
  });

  test('should validate successfully', () => {
    const validation = dataPipelineWorkflow.validate();
    expect(validation.valid).toBe(true);
  });
});

describe('createWorkflowFromTemplate', () => {
  test('should create workflow from template', () => {
    const workflow = createWorkflowFromTemplate('feature-development');
    
    expect(workflow.id).toBe('feature-development');
    expect(workflow.name).toBe('Feature Development Workflow');
  });

  test('should allow customization of ID and name', () => {
    const workflow = createWorkflowFromTemplate('feature-development', {
      id: 'custom-feature-dev',
      name: 'Custom Feature Workflow'
    });
    
    expect(workflow.id).toBe('custom-feature-dev');
    expect(workflow.name).toBe('Custom Feature Workflow');
  });

  test('should allow custom description', () => {
    const workflow = createWorkflowFromTemplate('cicd-pipeline', {
      description: 'My custom pipeline'
    });
    
    expect(workflow.description).toBe('My custom pipeline');
  });

  test('should throw for unknown template', () => {
    expect(() => createWorkflowFromTemplate('unknown-template'))
      .toThrow('Unknown workflow template: unknown-template');
  });

  test('should create all available templates', () => {
    const templates = [
      'feature-development',
      'cicd-pipeline',
      'code-review',
      'incident-response',
      'data-pipeline'
    ];

    for (const template of templates) {
      const workflow = createWorkflowFromTemplate(template);
      expect(workflow).toBeDefined();
      expect(workflow.validate().valid).toBe(true);
    }
  });

  test('should preserve original workflow steps if not customized', () => {
    const original = featureDevelopmentWorkflow;
    const created = createWorkflowFromTemplate('feature-development');
    
    expect(created.steps.length).toBe(original.steps.length);
  });

  test('should allow custom steps', () => {
    const customSteps = [
      { id: 'custom-step', type: StepType.CHECKPOINT, name: 'custom' }
    ];
    
    const workflow = createWorkflowFromTemplate('feature-development', {
      steps: customSteps
    });
    
    expect(workflow.steps.length).toBe(1);
    expect(workflow.steps[0].id).toBe('custom-step');
  });
});

describe('Workflow Step Type Coverage', () => {
  const allWorkflows = [
    featureDevelopmentWorkflow,
    cicdPipelineWorkflow,
    codeReviewWorkflow,
    incidentResponseWorkflow,
    dataPipelineWorkflow
  ];

  function getAllStepTypes(steps) {
    const types = new Set();
    
    function collectTypes(stepList) {
      for (const step of stepList) {
        types.add(step.type);
        
        // Check nested steps
        if (step.thenSteps) collectTypes(step.thenSteps);
        if (step.elseSteps) collectTypes(step.elseSteps);
        if (step.steps) collectTypes(step.steps);
      }
    }
    
    collectTypes(steps);
    return types;
  }

  test('all step types are used across workflows', () => {
    const usedTypes = new Set();
    
    for (const workflow of allWorkflows) {
      const types = getAllStepTypes(workflow.steps);
      types.forEach(t => usedTypes.add(t));
    }
    
    expect(usedTypes.has(StepType.SKILL)).toBe(true);
    expect(usedTypes.has(StepType.TOOL)).toBe(true);
    expect(usedTypes.has(StepType.CONDITION)).toBe(true);
    expect(usedTypes.has(StepType.PARALLEL)).toBe(true);
    expect(usedTypes.has(StepType.LOOP)).toBe(true);
    expect(usedTypes.has(StepType.CHECKPOINT)).toBe(true);
    expect(usedTypes.has(StepType.HUMAN_REVIEW)).toBe(true);
  });
});

describe('Error Handling Coverage', () => {
  test('all workflows have error handling', () => {
    const workflows = [
      featureDevelopmentWorkflow,
      cicdPipelineWorkflow,
      codeReviewWorkflow,
      incidentResponseWorkflow,
      dataPipelineWorkflow
    ];

    for (const workflow of workflows) {
      expect(workflow.errorHandling).toBeDefined();
      expect(workflow.errorHandling.strategy).toBeDefined();
    }
  });

  test('different recovery strategies are used', () => {
    const strategies = new Set([
      featureDevelopmentWorkflow.errorHandling.strategy,
      cicdPipelineWorkflow.errorHandling.strategy,
      incidentResponseWorkflow.errorHandling.strategy,
      dataPipelineWorkflow.errorHandling.strategy
    ]);

    expect(strategies.size).toBeGreaterThan(1);
  });
});

describe('Input/Output Configuration', () => {
  test('all workflows have inputs defined', () => {
    const workflows = [
      featureDevelopmentWorkflow,
      cicdPipelineWorkflow,
      codeReviewWorkflow,
      incidentResponseWorkflow,
      dataPipelineWorkflow
    ];

    for (const workflow of workflows) {
      expect(workflow.inputs.length).toBeGreaterThan(0);
    }
  });

  test('all workflows have outputs defined', () => {
    const workflows = [
      featureDevelopmentWorkflow,
      cicdPipelineWorkflow,
      codeReviewWorkflow,
      incidentResponseWorkflow,
      dataPipelineWorkflow
    ];

    for (const workflow of workflows) {
      expect(workflow.outputs.length).toBeGreaterThan(0);
    }
  });
});
