# Built-in Skills Usage Guide

This document describes how to use the Phase 1-4 built-in skills from the Orchestrator.

## Available Skills

| Skill ID | Category | Description |
|----------|----------|-------------|
| `release-manager` | release | Generate CHANGELOG, bump versions, manage releases |
| `workflow-mode-manager` | workflow | Manage small/medium/large workflow modes |
| `package-manager` | configuration | Manage monorepo packages and dependency graphs |
| `constitution-level-manager` | validation | Manage critical/advisory/flexible constitution levels |
| `project-config-manager` | configuration | Validate and migrate project.yml configuration |
| `requirements-reviewer` | validation | Review requirements using Fagan Inspection and PBR |
| `design-reviewer` | validation | Review design using ATAM, SOLID, design patterns, coupling/cohesion |

## CLI Usage

### List Available Skills

```bash
musubi-orchestrate list-skills
```

### Execute Skills via Auto Pattern

```bash
# Auto-select skill based on task
musubi-orchestrate auto "check workflow mode for this feature"

# Execute specific skill
musubi-orchestrate run sequential --skills workflow-mode-manager

# Review requirements document
musubi-orchestrate run sequential --skills requirements-reviewer
```

## Programmatic Usage

### Import Skills

```javascript
const {
  releaseSkill,
  workflowModeSkill,
  packageManagerSkill,
  constitutionLevelSkill,
  projectConfigSkill,
  requirementsReviewerSkill,
  designReviewerSkill,
  registerBuiltInSkills,
  getBuiltInSkills,
} = require('musubi-sdd/src/orchestration');
```

### Workflow Mode Manager

```javascript
// Get mode configuration
const result = await workflowModeSkill.execute({
  action: 'get',
  mode: 'small',
  projectPath: '/path/to/project',
});
console.log(result.stages); // ['requirements', 'implement', 'validate']

// Auto-detect mode from feature name
const detected = await workflowModeSkill.execute({
  action: 'detect',
  featureName: 'fix: small bug in parser',
});
console.log(detected.detectedMode); // 'small'

// Compare all modes
const comparison = await workflowModeSkill.execute({
  action: 'compare',
});
console.log(comparison.comparison);
```

### Package Manager

```javascript
// List packages in monorepo
const packages = await packageManagerSkill.execute({
  action: 'list',
  projectPath: '/path/to/project',
});
console.log(packages.packages);

// Generate dependency graph
const graph = await packageManagerSkill.execute({
  action: 'graph',
});
console.log(graph.mermaid); // Mermaid diagram

// Validate package configuration
const validation = await packageManagerSkill.execute({
  action: 'validate',
});
console.log(validation.validation);
```

### Constitution Level Manager

```javascript
// Get level summary
const summary = await constitutionLevelSkill.execute({
  action: 'summary',
});
console.log(summary.summary.critical); // Critical articles
console.log(summary.summary.advisory); // Advisory articles

// Check article level
const level = await constitutionLevelSkill.execute({
  action: 'level',
  articleId: 'CONST-001',
});
console.log(level.level); // 'critical'
console.log(level.isBlocking); // true

// Validate against constitution
const result = await constitutionLevelSkill.execute({
  action: 'validate',
  validation: {
    'CONST-001': true,
    'CONST-003': true,
    'CONST-005': false, // Failed traceability
  },
});
console.log(result.result.passed); // false
```

### Project Config Manager

```javascript
// Validate project.yml
const validation = await projectConfigSkill.execute({
  action: 'validate',
  projectPath: '/path/to/project',
});
console.log(validation.validation.valid);
console.log(validation.validation.errors);

// Migrate v1.0 to v2.0
const migration = await projectConfigSkill.execute({
  action: 'migrate',
  dryRun: true,
});
console.log(migration.migrated); // true if changes needed

// Show effective configuration
const config = await projectConfigSkill.execute({
  action: 'show',
});
console.log(config.report.effective);
```

### Release Manager

```javascript
// Generate changelog
const changelog = await releaseSkill.execute({
  projectPath: '/path/to/project',
});
console.log(changelog.changelog);
console.log(changelog.changes);
```

## Register with Custom Registry

```javascript
const { SkillRegistry } = require('musubi-sdd/src/orchestration');
const { registerBuiltInSkills } = require('musubi-sdd/src/orchestration');

const registry = new SkillRegistry();
const count = registerBuiltInSkills(registry);
console.log(`Registered ${count} built-in skills`);

// Query by category
const releaseSkills = registry.findByCategory('release');
const configSkills = registry.findByCategory('configuration');
```

## Requirements Reviewer Skill

The `requirements-reviewer` skill provides systematic requirements review using Fagan Inspection and Perspective-Based Reading (PBR) techniques.

### Review Methods

- **Fagan Inspection**: Formal 6-phase inspection process (Planning, Overview, Preparation, Inspection Meeting, Rework, Follow-up)
- **Perspective-Based Reading (PBR)**: Reviews from User, Developer, Tester, Architect, and Security perspectives
- **Combined**: Both methods applied for comprehensive coverage

### Usage Examples

```javascript
const { requirementsReviewerSkill } = require('musubi-sdd/src/orchestration');

// Full review using combined method
const result = await requirementsReviewerSkill.execute({
  action: 'review',
  documentPath: 'docs/requirements/srs/srs-project-v1.0.md',
  method: 'combined', // 'fagan', 'pbr', or 'combined'
  outputFormat: 'markdown',
  projectPath: process.cwd(),
});

console.log(result.defects);     // Array of found defects
console.log(result.metrics);     // Review metrics
console.log(result.qualityGate); // Quality gate pass/fail status
console.log(result.report);      // Markdown report (if outputFormat: 'markdown')

// Review from specific perspectives
const pbrResult = await requirementsReviewerSkill.execute({
  action: 'pbr',
  documentPath: 'docs/requirements/srs/srs-project-v1.0.md',
  perspectives: ['user', 'tester', 'security'],
});

// Get metrics only (quick analysis)
const metricsResult = await requirementsReviewerSkill.execute({
  action: 'metrics',
  documentPath: 'docs/requirements/srs/srs-project-v1.0.md',
});

console.log(metricsResult.metrics.earsCompliance);    // EARS format compliance %
console.log(metricsResult.metrics.testabilityScore);  // Testability score %

// Apply corrections based on user decisions
const correctionResult = await requirementsReviewerSkill.execute({
  action: 'correct',
  documentPath: 'docs/requirements/srs/srs-project-v1.0.md',
  corrections: [
    { defectId: 'DEF-001', action: 'accept' },
    { defectId: 'DEF-002', action: 'modify', newText: 'Custom fix...' },
    { defectId: 'DEF-003', action: 'reject', reason: 'Intentional' },
  ],
  createBackup: true,
  updateJapanese: true,
  outputFormat: 'markdown',
});

console.log(correctionResult.changesApplied);     // Applied corrections
console.log(correctionResult.rejectedFindings);   // Rejected with reasons
console.log(correctionResult.updatedQualityGate); // Updated quality gate
console.log(correctionResult.report);             // Correction report
```

### Correction Actions

| Action | Description |
|--------|-------------|
| `accept` | Apply the recommended fix |
| `modify` | Apply custom fix (provide `newText`) |
| `reject` | Skip fix (provide `reason`) |

### Defect Types

| Type | Description |
|------|-------------|
| `missing` | Required information absent |
| `incorrect` | Factually wrong information |
| `ambiguous` | Multiple interpretations possible |
| `conflicting` | Contradicts another requirement |
| `redundant` | Unnecessarily duplicated |
| `untestable` | Cannot be verified |

### Severity Levels

| Level | Description |
|-------|-------------|
| `critical` | Must fix before design |
| `major` | Should fix before design |
| `minor` | Should fix, can proceed |
| `suggestion` | Consider for improvement |

## Design Reviewer Skill

The `design-reviewer` skill provides systematic design document review using ATAM, SOLID principles, design patterns, coupling/cohesion analysis, error handling, and security review.

### Review Focus Areas

- **ATAM (Architecture Tradeoff Analysis Method)**: Quality attribute analysis
- **SOLID Principles**: SRP, OCP, LSP, ISP, DIP compliance
- **Design Patterns**: Pattern detection and usage evaluation
- **Coupling/Cohesion**: Module dependency and responsibility analysis
- **Error Handling**: Exception strategies, retry policies, circuit breakers
- **Security**: Authentication, authorization, encryption, input validation

### Usage Examples

```javascript
const { designReviewerSkill } = require('musubi-sdd/src/orchestration');

// Full design review
const result = await designReviewerSkill.execute({
  action: 'review',
  documentPath: 'docs/design/architecture.md',
  focus: ['solid', 'patterns', 'coupling-cohesion', 'security'],
  outputFormat: 'markdown',
  projectPath: process.cwd(),
});

console.log(result.issues);      // Array of design issues
console.log(result.metrics);     // Review metrics
console.log(result.qualityGate); // Quality gate pass/fail status
console.log(result.report);      // Markdown report

// SOLID principles review only
const solidResult = await designReviewerSkill.execute({
  action: 'solid',
  documentPath: 'docs/design/architecture.md',
});

console.log(solidResult.issues);
console.log(solidResult.severity);  // { critical, major, minor }

// Security-focused review
const securityResult = await designReviewerSkill.execute({
  action: 'security',
  documentPath: 'docs/design/architecture.md',
});

console.log(securityResult.issues);
console.log(securityResult.critical);  // Number of critical security issues

// ADR (Architecture Decision Record) review
const adrResult = await designReviewerSkill.execute({
  action: 'adr',
  documentPath: 'docs/adr/adr-001-database.md',
});

// C4 Model review
const c4Result = await designReviewerSkill.execute({
  action: 'c4',
  documentPath: 'docs/design/c4-diagrams.md',
});

// Apply corrections based on user decisions
const correctionResult = await designReviewerSkill.execute({
  action: 'correct',
  documentPath: 'docs/design/architecture.md',
  corrections: [
    { issueId: 'DES-001', action: 'accept' },
    { issueId: 'DES-002', action: 'modify', newDesign: 'Custom design...' },
    { issueId: 'DES-003', action: 'reject-with-adr', reason: 'Performance tradeoff' },
  ],
  createBackup: true,
  updateJapanese: true,
  generateADRs: true,
  outputFormat: 'markdown',
});

console.log(correctionResult.changesApplied);       // Applied corrections
console.log(correctionResult.rejectedFindings);     // Rejected with reasons
console.log(correctionResult.adrsCreated);          // ADRs created for rejections
console.log(correctionResult.updatedSolidCompliance); // Updated SOLID status
console.log(correctionResult.report);               // Correction report
```

### Correction Actions

| Action | Description |
|--------|-------------|
| `accept` | Apply the recommended fix |
| `modify` | Apply custom design (provide `newDesign`) |
| `reject` | Skip fix (provide `reason`) |
| `reject-with-adr` | Skip and create ADR documenting decision |

### Issue Categories

| Category | Description |
|----------|-------------|
| `solid` | SOLID principle violations |
| `pattern` | Design pattern issues |
| `coupling` | High coupling concerns |
| `cohesion` | Low cohesion concerns |
| `error-handling` | Error handling gaps |
| `security` | Security design issues |
| `c4-model` | C4 diagram completeness |
| `adr` | ADR structure issues |

### SOLID Principles Checked

| Principle | Checks For |
|-----------|------------|
| SRP (Single Responsibility) | Classes with multiple responsibilities |
| OCP (Open/Closed) | Type-based switching, need for polymorphism |
| LSP (Liskov Substitution) | Subclass compatibility issues |
| ISP (Interface Segregation) | Large "fat" interfaces |
| DIP (Dependency Inversion) | Direct dependencies on concrete classes |

### Severity Levels

| Level | Description |
|-------|-------------|
| `critical` | Must fix before implementation |
| `major` | Should fix before implementation |
| `minor` | Should fix, can proceed |
| `suggestion` | Consider for improvement |

## Integration with Workflows

```javascript
const { createOrchestrationEngine } = require('musubi-sdd/src/orchestration');

const engine = createOrchestrationEngine();

// Execute workflow with built-in skills
const result = await engine.execute('sequential', {
  skills: ['workflow-mode-manager', 'constitution-level-manager'],
  input: {
    action: 'summary',
  },
});
```

## Error Handling

All skills return a consistent response format:

```javascript
// Success
{
  success: true,
  // ... skill-specific data
}

// Error
{
  success: false,
  error: 'Error message'
}
```

## See Also

- [musubi-release CLI](../bin/musubi-release.js)
- [musubi-config CLI](../bin/musubi-config.js)
- [Requirements Reviewer SKILL.md](../../src/templates/agents/claude-code/skills/requirements-reviewer/SKILL.md)
- [Design Reviewer SKILL.md](../../src/templates/agents/claude-code/skills/design-reviewer/SKILL.md)
- [musubi-workflow CLI](../bin/musubi-workflow.js)
- [Workflow Modes](../steering/rules/workflow-modes.yml)
- [Constitution Levels](../steering/rules/constitution-levels.yml)
