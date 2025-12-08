/**
 * MUSUBI SDD - Example Projects & Launch
 * Sprint 6.4: Example Projects Generator & Launch Preparation
 */

const { EventEmitter } = require('events');

// ============================================================================
// Project Types
// ============================================================================

const ProjectType = {
  WEB_APP: 'web-app',
  API_SERVER: 'api-server',
  CLI_TOOL: 'cli-tool',
  LIBRARY: 'library',
  MICROSERVICE: 'microservice',
  FULLSTACK: 'fullstack',
  MOBILE: 'mobile',
  DESKTOP: 'desktop'
};

const FrameworkPreset = {
  REACT: 'react',
  VUE: 'vue',
  ANGULAR: 'angular',
  NEXTJS: 'nextjs',
  EXPRESS: 'express',
  FASTIFY: 'fastify',
  NESTJS: 'nestjs',
  ELECTRON: 'electron',
  REACT_NATIVE: 'react-native'
};

// ============================================================================
// Example Project Template
// ============================================================================

class ProjectTemplate {
  constructor(options = {}) {
    this.id = options.id || 'project';
    this.name = options.name || 'Example Project';
    this.description = options.description || '';
    this.type = options.type || ProjectType.WEB_APP;
    this.framework = options.framework || null;
    this.files = new Map();
    this.dependencies = {};
    this.devDependencies = {};
    this.scripts = {};
  }

  addFile(path, content) {
    this.files.set(path, content);
    return this;
  }

  addDependency(name, version) {
    this.dependencies[name] = version;
    return this;
  }

  addDevDependency(name, version) {
    this.devDependencies[name] = version;
    return this;
  }

  addScript(name, command) {
    this.scripts[name] = command;
    return this;
  }

  generatePackageJson() {
    return {
      name: this.id,
      version: '1.0.0',
      description: this.description,
      main: 'src/index.js',
      scripts: {
        start: 'node src/index.js',
        test: 'jest',
        lint: 'eslint src',
        validate: 'npx musubi validate',
        ...this.scripts
      },
      dependencies: {
        'musubi-sdd': '^3.0.0',
        ...this.dependencies
      },
      devDependencies: {
        jest: '^29.0.0',
        eslint: '^8.0.0',
        ...this.devDependencies
      }
    };
  }

  generateAgentsMd() {
    return `# ${this.name}

${this.description}

## Initialized with MUSUBI SDD

This project uses **MUSUBI** (Ultimate Specification Driven Development).

### Prompts

- \`#sdd-steering\` - Generate/update project memory
- \`#sdd-requirements <feature>\` - Create EARS requirements
- \`#sdd-design <feature>\` - Generate C4 + ADR design
- \`#sdd-tasks <feature>\` - Break down into tasks
- \`#sdd-implement <feature>\` - Execute implementation
- \`#sdd-validate <feature>\` - Validate constitutional compliance

### Project Memory

- \`steering/structure.md\` - Architecture patterns
- \`steering/tech.md\` - Technology stack
- \`steering/product.md\` - Product context
- \`steering/rules/constitution.md\` - 9 Constitutional Articles

---

**Project Type**: ${this.type}
${this.framework ? `**Framework**: ${this.framework}` : ''}
`;
  }

  generateStructureMd() {
    return `# Architecture Structure

## Overview

${this.name} follows a clean architecture pattern with clear separation of concerns.

## Components

### Core
The core business logic layer.

### Infrastructure
External service integrations and data persistence.

### Presentation
User interface and API endpoints.

## Patterns

- Dependency Injection
- Repository Pattern
- Event-Driven Architecture
`;
  }

  generateTechMd() {
    const techs = ['Node.js', 'JavaScript/TypeScript'];
    if (this.framework) {
      techs.push(this.framework);
    }

    return `# Technology Stack

## Languages

- JavaScript/TypeScript

## Runtime

- Node.js 20+

## Framework

${this.framework ? `- ${this.framework}` : '- Vanilla Node.js'}

## Testing

- Jest
- Supertest (API testing)

## Code Quality

- ESLint
- Prettier
- MUSUBI Validation
`;
  }

  generateProductMd() {
    return `# Product Context

## Project: ${this.name}

${this.description}

## Goals

1. Demonstrate MUSUBI SDD workflow
2. Provide reusable patterns
3. Show best practices

## Target Users

- Developers learning MUSUBI
- Teams adopting SDD methodology

## Success Metrics

- Clean architecture compliance
- Test coverage > 80%
- Constitution compliance score: A
`;
  }

  generateConstitutionMd() {
    return `# Constitution

## 9 Constitutional Articles

### Article 1: Single Source of Truth
All specifications are maintained in steering files.

### Article 2: Separation of Concerns
Clear boundaries between layers and modules.

### Article 3: Explicit Dependencies
All dependencies documented and justified.

### Article 4: Test-First Validation
Specifications validated before implementation.

### Article 5: Incremental Delivery
Features delivered in small, validated increments.

### Article 6: Traceability
All changes traced to requirements.

### Article 7: Automation First
Automate validation and verification.

### Article 8: Documentation as Code
Documentation generated from specifications.

### Article 9: Continuous Improvement
Regular retrospectives and refinement.
`;
  }

  build() {
    // Add standard MUSUBI files
    this.addFile('AGENTS.md', this.generateAgentsMd());
    this.addFile('steering/structure.md', this.generateStructureMd());
    this.addFile('steering/tech.md', this.generateTechMd());
    this.addFile('steering/product.md', this.generateProductMd());
    this.addFile('steering/rules/constitution.md', this.generateConstitutionMd());
    this.addFile('package.json', JSON.stringify(this.generatePackageJson(), null, 2));

    return this.files;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      framework: this.framework,
      files: Array.from(this.files.keys()),
      dependencies: this.dependencies,
      devDependencies: this.devDependencies
    };
  }
}

// ============================================================================
// Example Project Catalog
// ============================================================================

class ProjectCatalog {
  constructor() {
    this.templates = new Map();
    this.registerDefaults();
  }

  registerDefaults() {
    // Basic API Example
    this.register(new ProjectTemplate({
      id: 'musubi-api-example',
      name: 'MUSUBI API Example',
      description: 'A REST API example using MUSUBI SDD',
      type: ProjectType.API_SERVER,
      framework: FrameworkPreset.EXPRESS
    }).addDependency('express', '^4.18.0')
      .addScript('dev', 'nodemon src/index.js'));

    // CLI Tool Example
    this.register(new ProjectTemplate({
      id: 'musubi-cli-example',
      name: 'MUSUBI CLI Example',
      description: 'A CLI tool example using MUSUBI SDD',
      type: ProjectType.CLI_TOOL
    }).addDependency('commander', '^11.0.0')
      .addDependency('chalk', '^5.0.0'));

    // Library Example
    this.register(new ProjectTemplate({
      id: 'musubi-lib-example',
      name: 'MUSUBI Library Example',
      description: 'A reusable library example using MUSUBI SDD',
      type: ProjectType.LIBRARY
    }).addScript('build', 'npm run lint && npm test'));

    // Full-Stack Example
    this.register(new ProjectTemplate({
      id: 'musubi-fullstack-example',
      name: 'MUSUBI Full-Stack Example',
      description: 'A full-stack application using MUSUBI SDD',
      type: ProjectType.FULLSTACK,
      framework: FrameworkPreset.NEXTJS
    }).addDependency('next', '^14.0.0')
      .addDependency('react', '^18.0.0')
      .addScript('dev', 'next dev')
      .addScript('build', 'next build'));

    // Microservice Example
    this.register(new ProjectTemplate({
      id: 'musubi-microservice-example',
      name: 'MUSUBI Microservice Example',
      description: 'A microservice example using MUSUBI SDD',
      type: ProjectType.MICROSERVICE,
      framework: FrameworkPreset.FASTIFY
    }).addDependency('fastify', '^4.0.0')
      .addScript('dev', 'nodemon src/index.js'));
  }

  register(template) {
    this.templates.set(template.id, template);
    return this;
  }

  get(id) {
    return this.templates.get(id);
  }

  list() {
    return Array.from(this.templates.values()).map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      type: t.type,
      framework: t.framework
    }));
  }

  byType(type) {
    return Array.from(this.templates.values())
      .filter(t => t.type === type);
  }

  byFramework(framework) {
    return Array.from(this.templates.values())
      .filter(t => t.framework === framework);
  }
}

// ============================================================================
// Launch Checklist
// ============================================================================

const LaunchCategory = {
  CODE_QUALITY: 'code-quality',
  DOCUMENTATION: 'documentation',
  TESTING: 'testing',
  CI_CD: 'ci-cd',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  ACCESSIBILITY: 'accessibility',
  COMPLIANCE: 'compliance'
};

class LaunchChecklist {
  constructor(options = {}) {
    this.projectName = options.projectName || 'Project';
    this.items = [];
    this.registerDefaults();
  }

  registerDefaults() {
    // Code Quality
    this.addItem({
      id: 'lint-pass',
      category: LaunchCategory.CODE_QUALITY,
      title: 'ESLint passes with no errors',
      command: 'npm run lint',
      required: true
    });

    this.addItem({
      id: 'no-console',
      category: LaunchCategory.CODE_QUALITY,
      title: 'No console.log statements in production code',
      required: false
    });

    // Documentation
    this.addItem({
      id: 'readme-complete',
      category: LaunchCategory.DOCUMENTATION,
      title: 'README.md is complete and up-to-date',
      required: true
    });

    this.addItem({
      id: 'agents-md',
      category: LaunchCategory.DOCUMENTATION,
      title: 'AGENTS.md exists and is configured',
      required: true
    });

    this.addItem({
      id: 'api-docs',
      category: LaunchCategory.DOCUMENTATION,
      title: 'API documentation is generated',
      required: false
    });

    // Testing
    this.addItem({
      id: 'tests-pass',
      category: LaunchCategory.TESTING,
      title: 'All tests pass',
      command: 'npm test',
      required: true
    });

    this.addItem({
      id: 'coverage-threshold',
      category: LaunchCategory.TESTING,
      title: 'Test coverage meets threshold (80%+)',
      required: true
    });

    // CI/CD
    this.addItem({
      id: 'ci-configured',
      category: LaunchCategory.CI_CD,
      title: 'CI pipeline is configured',
      required: true
    });

    this.addItem({
      id: 'auto-deploy',
      category: LaunchCategory.CI_CD,
      title: 'Automatic deployment is set up',
      required: false
    });

    // Security
    this.addItem({
      id: 'no-secrets',
      category: LaunchCategory.SECURITY,
      title: 'No secrets in source code',
      required: true
    });

    this.addItem({
      id: 'deps-audit',
      category: LaunchCategory.SECURITY,
      title: 'npm audit shows no critical vulnerabilities',
      command: 'npm audit',
      required: true
    });

    // Compliance
    this.addItem({
      id: 'musubi-validate',
      category: LaunchCategory.COMPLIANCE,
      title: 'MUSUBI validation passes',
      command: 'npx musubi validate',
      required: true
    });

    this.addItem({
      id: 'constitution-compliance',
      category: LaunchCategory.COMPLIANCE,
      title: 'Constitution compliance score is A or B',
      required: true
    });
  }

  addItem(item) {
    this.items.push({
      ...item,
      checked: false
    });
    return this;
  }

  check(id) {
    const item = this.items.find(i => i.id === id);
    if (item) {
      item.checked = true;
    }
    return this;
  }

  uncheck(id) {
    const item = this.items.find(i => i.id === id);
    if (item) {
      item.checked = false;
    }
    return this;
  }

  getStatus() {
    const total = this.items.length;
    const checked = this.items.filter(i => i.checked).length;
    const required = this.items.filter(i => i.required);
    const requiredChecked = required.filter(i => i.checked).length;

    return {
      total,
      checked,
      percentage: Math.round((checked / total) * 100),
      required: required.length,
      requiredChecked,
      readyToLaunch: requiredChecked === required.length
    };
  }

  getByCategory(category) {
    return this.items.filter(i => i.category === category);
  }

  getUnchecked() {
    return this.items.filter(i => !i.checked);
  }

  getUncheckedRequired() {
    return this.items.filter(i => i.required && !i.checked);
  }

  toMarkdown() {
    let md = `# Launch Checklist: ${this.projectName}\n\n`;
    
    const status = this.getStatus();
    md += `**Progress:** ${status.checked}/${status.total} (${status.percentage}%)\n`;
    md += `**Required:** ${status.requiredChecked}/${status.required}\n`;
    md += `**Ready to Launch:** ${status.readyToLaunch ? '✅ Yes' : '❌ No'}\n\n`;

    const categories = [...new Set(this.items.map(i => i.category))];
    
    for (const category of categories) {
      md += `## ${category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}\n\n`;
      
      for (const item of this.getByCategory(category)) {
        const checkbox = item.checked ? '[x]' : '[ ]';
        const required = item.required ? ' **(required)**' : '';
        md += `- ${checkbox} ${item.title}${required}\n`;
        if (item.command) {
          md += `  - Command: \`${item.command}\`\n`;
        }
      }
      md += '\n';
    }

    return md;
  }

  toJSON() {
    return {
      projectName: this.projectName,
      status: this.getStatus(),
      items: this.items
    };
  }
}

// ============================================================================
// Release Manager
// ============================================================================

class ReleaseManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.version = options.version || '1.0.0';
    this.projectRoot = options.projectRoot || process.cwd();
    this.checklist = new LaunchChecklist({ projectName: options.projectName });
    this.catalog = new ProjectCatalog();
  }

  bumpVersion(type = 'patch') {
    const [major, minor, patch] = this.version.split('.').map(Number);
    
    switch (type) {
      case 'major':
        this.version = `${major + 1}.0.0`;
        break;
      case 'minor':
        this.version = `${major}.${minor + 1}.0`;
        break;
      case 'patch':
      default:
        this.version = `${major}.${minor}.${patch + 1}`;
    }

    this.emit('versionBumped', { version: this.version, type });
    return this.version;
  }

  generateChangelog(releases) {
    let changelog = '# Changelog\n\n';
    changelog += 'All notable changes to this project will be documented in this file.\n\n';

    for (const release of releases) {
      changelog += `## [${release.version}] - ${release.date}\n\n`;

      if (release.features && release.features.length > 0) {
        changelog += '### Added\n\n';
        for (const feature of release.features) {
          changelog += `- ${feature}\n`;
        }
        changelog += '\n';
      }

      if (release.changes && release.changes.length > 0) {
        changelog += '### Changed\n\n';
        for (const change of release.changes) {
          changelog += `- ${change}\n`;
        }
        changelog += '\n';
      }

      if (release.fixes && release.fixes.length > 0) {
        changelog += '### Fixed\n\n';
        for (const fix of release.fixes) {
          changelog += `- ${fix}\n`;
        }
        changelog += '\n';
      }

      if (release.deprecated && release.deprecated.length > 0) {
        changelog += '### Deprecated\n\n';
        for (const dep of release.deprecated) {
          changelog += `- ${dep}\n`;
        }
        changelog += '\n';
      }

      if (release.removed && release.removed.length > 0) {
        changelog += '### Removed\n\n';
        for (const rem of release.removed) {
          changelog += `- ${rem}\n`;
        }
        changelog += '\n';
      }

      if (release.security && release.security.length > 0) {
        changelog += '### Security\n\n';
        for (const sec of release.security) {
          changelog += `- ${sec}\n`;
        }
        changelog += '\n';
      }
    }

    return changelog;
  }

  generateReleaseNotes(release) {
    let notes = `# Release ${release.version}\n\n`;
    notes += `**Release Date:** ${release.date}\n\n`;

    if (release.highlights) {
      notes += '## Highlights\n\n';
      for (const highlight of release.highlights) {
        notes += `- 🎉 ${highlight}\n`;
      }
      notes += '\n';
    }

    if (release.features && release.features.length > 0) {
      notes += '## New Features\n\n';
      for (const feature of release.features) {
        notes += `- ${feature}\n`;
      }
      notes += '\n';
    }

    if (release.breaking && release.breaking.length > 0) {
      notes += '## ⚠️ Breaking Changes\n\n';
      for (const breaking of release.breaking) {
        notes += `- ${breaking}\n`;
      }
      notes += '\n';
    }

    if (release.migration) {
      notes += '## Migration Guide\n\n';
      notes += release.migration + '\n\n';
    }

    return notes;
  }

  getChecklist() {
    return this.checklist;
  }

  getCatalog() {
    return this.catalog;
  }

  createProject(templateId) {
    const template = this.catalog.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const files = template.build();
    this.emit('projectCreated', { template: templateId, files: Array.from(files.keys()) });
    return files;
  }

  validateRelease() {
    const status = this.checklist.getStatus();
    const uncheckedRequired = this.checklist.getUncheckedRequired();

    return {
      valid: status.readyToLaunch,
      progress: status.percentage,
      blockers: uncheckedRequired.map(i => i.title),
      message: status.readyToLaunch 
        ? 'Ready for release!' 
        : `${uncheckedRequired.length} required items remaining`
    };
  }

  toJSON() {
    return {
      version: this.version,
      projectRoot: this.projectRoot,
      checklist: this.checklist.toJSON(),
      templates: this.catalog.list()
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

function createProjectTemplate(options = {}) {
  return new ProjectTemplate(options);
}

function createProjectCatalog() {
  return new ProjectCatalog();
}

function createLaunchChecklist(options = {}) {
  return new LaunchChecklist(options);
}

function createReleaseManager(options = {}) {
  return new ReleaseManager(options);
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  // Constants
  ProjectType,
  FrameworkPreset,
  LaunchCategory,
  
  // Classes
  ProjectTemplate,
  ProjectCatalog,
  LaunchChecklist,
  ReleaseManager,
  
  // Factories
  createProjectTemplate,
  createProjectCatalog,
  createLaunchChecklist,
  createReleaseManager
};
