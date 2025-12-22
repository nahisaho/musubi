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
- [musubi-workflow CLI](../bin/musubi-workflow.js)
- [Workflow Modes](../steering/rules/workflow-modes.yml)
- [Constitution Levels](../steering/rules/constitution-levels.yml)
