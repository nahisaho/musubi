/**
 * MUSUBI Design Document Generator
 *
 * Generates technical design documents with C4 model and ADR
 * Complies with Article V (Traceability) and steering context
 *
 * C4 Model Levels:
 * 1. Context: System in its environment
 * 2. Container: High-level technology choices
 * 3. Component: Components within containers
 * 4. Code: Class/component implementation details
 *
 * ADR Format:
 * - Title: Decision name
 * - Status: proposed|accepted|rejected|deprecated
 * - Context: Problem/situation
 * - Decision: What we decided
 * - Consequences: Positive and negative outcomes
 * - Alternatives: Other options considered
 */

const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');

class DesignGenerator {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.templatePath = path.join(__dirname, '../../src/templates/shared/documents/design.md');
  }

  /**
   * Initialize design document for a feature
   * @param {string} feature - Feature name
   * @param {object} options - Options (output, author, project, requirements)
   * @returns {Promise<object>} Result with path
   */
  async init(feature, options = {}) {
    const outputDir = path.join(this.rootDir, options.output || 'docs/design');
    await fs.ensureDir(outputDir);

    const fileName = `${this.slugify(feature)}.md`;
    const filePath = path.join(outputDir, fileName);

    // Check if file exists
    if (await fs.pathExists(filePath)) {
      throw new Error(`Design file already exists: ${filePath}`);
    }

    // Load template
    const template = await fs.readFile(this.templatePath, 'utf-8');

    // Get project name from package.json
    let projectName = options.project;
    if (!projectName) {
      try {
        const pkg = await fs.readJSON(path.join(this.rootDir, 'package.json'));
        projectName = pkg.name || 'Project';
      } catch {
        projectName = 'Project';
      }
    }

    // Get author from git config or options
    let author = options.author;
    if (!author) {
      try {
        const { execSync } = require('child_process');
        author = execSync('git config user.name', { encoding: 'utf-8' }).trim();
      } catch {
        author = 'Author';
      }
    }

    // Replace template variables
    const content = template
      .replace(/\{\{FEATURE_NAME\}\}/g, feature)
      .replace(/\{\{PROJECT_NAME\}\}/g, projectName)
      .replace(/\{\{DATE\}\}/g, new Date().toISOString().split('T')[0])
      .replace(/\{\{AUTHOR\}\}/g, author)
      .replace(/\{\{SYSTEM\}\}/g, projectName);

    await fs.writeFile(filePath, content, 'utf-8');

    return { path: filePath };
  }

  /**
   * Find all design files in the project
   * @returns {Promise<string[]>} List of design file paths
   */
  async findDesignFiles() {
    const patterns = ['docs/design/**/*.md', 'docs/design/*.md', 'design/**/*.md', 'design/*.md'];

    const files = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { cwd: this.rootDir, absolute: true });
      files.push(...matches);
    }

    return [...new Set(files)];
  }

  /**
   * Add C4 diagram to design file
   * @param {string} filePath - Design file path
   * @param {object} diagram - Diagram data
   * @returns {Promise<object>} Result with level and template
   */
  async addC4Diagram(filePath, diagram) {
    const content = await fs.readFile(filePath, 'utf-8');

    // Generate C4 diagram template
    const template = this.generateC4Template(diagram);

    // Find insertion point based on level
    const insertionPoint = this.findC4InsertionPoint(content, diagram.level);

    const newContent =
      content.slice(0, insertionPoint) + template + '\n' + content.slice(insertionPoint);

    await fs.writeFile(filePath, newContent, 'utf-8');

    return {
      level: diagram.level,
      title: diagram.title,
      template,
    };
  }

  /**
   * Generate C4 diagram template
   * @param {object} diagram - Diagram data
   * @returns {string} Mermaid or PlantUML template
   */
  generateC4Template(diagram) {
    const { level, title, description, format } = diagram;

    if (format === 'plantuml') {
      return this.generatePlantUMLTemplate(level, title, description);
    }

    // Default: Mermaid
    return this.generateMermaidTemplate(level, title, description);
  }

  /**
   * Generate Mermaid C4 template
   * @param {string} level - C4 level
   * @param {string} title - Diagram title
   * @param {string} description - Diagram description
   * @returns {string} Mermaid template
   */
  generateMermaidTemplate(level, title, description) {
    const templates = {
      context: `### C4 Context: ${title}

**${description}**

\`\`\`mermaid
C4Context
  title ${title}

  Person(user, "User", "End user of the system")
  System(system, "System Name", "System description")
  System_Ext(external, "External System", "External service")

  Rel(user, system, "Uses", "HTTPS")
  Rel(system, external, "Calls", "API")
\`\`\`

**Key Elements**:
- **Users**: [List users/personas]
- **System**: [System boundary]
- **External Systems**: [External dependencies]
`,
      container: `### C4 Container: ${title}

**${description}**

\`\`\`mermaid
C4Container
  title ${title}

  Person(user, "User")
  
  Container_Boundary(c1, "System Name") {
    Container(web, "Web Application", "React", "User interface")
    Container(api, "API", "Node.js", "Business logic")
    ContainerDb(db, "Database", "PostgreSQL", "Data storage")
  }

  Rel(user, web, "Uses", "HTTPS")
  Rel(web, api, "Calls", "REST/JSON")
  Rel(api, db, "Reads/Writes", "SQL")
\`\`\`

**Containers**:
- **Frontend**: [Technology and purpose]
- **Backend**: [Technology and purpose]
- **Database**: [Technology and purpose]
`,
      component: `### C4 Component: ${title}

**${description}**

\`\`\`mermaid
C4Component
  title ${title}

  Container_Boundary(api, "API Container") {
    Component(controller, "Controller", "Express", "Handles requests")
    Component(service, "Service", "TypeScript", "Business logic")
    Component(repository, "Repository", "TypeORM", "Data access")
  }
  
  ContainerDb(db, "Database")

  Rel(controller, service, "Uses")
  Rel(service, repository, "Uses")
  Rel(repository, db, "Queries")
\`\`\`

**Components**:
- **Controller**: [Responsibility]
- **Service**: [Responsibility]
- **Repository**: [Responsibility]
`,
      code: `### C4 Code: ${title}

**${description}**

\`\`\`mermaid
classDiagram
  class Controller {
    +handleRequest()
    +validateInput()
  }
  
  class Service {
    +executeBusinessLogic()
    +processData()
  }
  
  class Repository {
    +findById()
    +save()
    +delete()
  }

  Controller --> Service
  Service --> Repository
\`\`\`

**Classes**:
- **Controller**: [Purpose and key methods]
- **Service**: [Purpose and key methods]
- **Repository**: [Purpose and key methods]
`,
    };

    return templates[level] || templates.context;
  }

  /**
   * Generate PlantUML C4 template
   * @param {string} level - C4 level
   * @param {string} title - Diagram title
   * @param {string} description - Diagram description
   * @returns {string} PlantUML template
   */
  generatePlantUMLTemplate(level, title, description) {
    const templates = {
      context: `### C4 Context: ${title}

**${description}**

\`\`\`plantuml
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml

LAYOUT_WITH_LEGEND()

title ${title}

Person(user, "User", "End user")
System(system, "System Name", "System description")
System_Ext(external, "External System", "External service")

Rel(user, system, "Uses", "HTTPS")
Rel(system, external, "Calls", "API")

@enduml
\`\`\`
`,
      container: `### C4 Container: ${title}

**${description}**

\`\`\`plantuml
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

LAYOUT_WITH_LEGEND()

title ${title}

Person(user, "User")

System_Boundary(c1, "System Name") {
  Container(web, "Web App", "React", "User interface")
  Container(api, "API", "Node.js", "Business logic")
  ContainerDb(db, "Database", "PostgreSQL", "Data storage")
}

Rel(user, web, "Uses", "HTTPS")
Rel(web, api, "Calls", "REST/JSON")
Rel(api, db, "Reads/Writes", "SQL")

@enduml
\`\`\`
`,
      component: `### C4 Component: ${title}

**${description}**

\`\`\`plantuml
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml

LAYOUT_WITH_LEGEND()

title ${title}

Container_Boundary(api, "API Container") {
  Component(controller, "Controller", "Express", "Handles requests")
  Component(service, "Service", "TypeScript", "Business logic")
  Component(repository, "Repository", "TypeORM", "Data access")
}

ContainerDb(db, "Database")

Rel(controller, service, "Uses")
Rel(service, repository, "Uses")
Rel(repository, db, "Queries")

@enduml
\`\`\`
`,
      code: `### C4 Code: ${title}

**${description}**

\`\`\`plantuml
@startuml
title ${title}

class Controller {
  +handleRequest()
  +validateInput()
}

class Service {
  +executeBusinessLogic()
  +processData()
}

class Repository {
  +findById()
  +save()
  +delete()
}

Controller --> Service
Service --> Repository

@enduml
\`\`\`
`,
    };

    return templates[level] || templates.context;
  }

  /**
   * Get C4 section name
   * @param {string} level - C4 level
   * @returns {string} Section name
   */
  getC4SectionName(level) {
    const names = {
      context: 'C4 Model: Context Diagram',
      container: 'C4 Model: Container Diagram',
      component: 'C4 Model: Component Diagram',
      code: 'C4 Model: Code Diagram',
    };
    return names[level] || 'Architecture Design';
  }

  /**
   * Find C4 insertion point in document
   * @param {string} content - Document content
   * @param {string} _level - C4 level
   * @returns {number} Insertion index
   */
  findC4InsertionPoint(content, _level) {
    // Find Architecture Design section
    const archMatch = content.match(/## Architecture Design/);
    if (!archMatch) {
      throw new Error('Architecture Design section not found');
    }

    // Find next section after Architecture Design
    const afterArch = content.slice(archMatch.index + archMatch[0].length);
    const nextSectionMatch = afterArch.match(/\n## [^#]/);

    if (nextSectionMatch) {
      return archMatch.index + archMatch[0].length + nextSectionMatch.index;
    }

    // If no next section, append at end
    return content.length;
  }

  /**
   * Add Architecture Decision Record
   * @param {string} filePath - Design file path
   * @param {object} adr - ADR data
   * @returns {Promise<object>} Result with ADR number
   */
  async addADR(filePath, adr) {
    const content = await fs.readFile(filePath, 'utf-8');

    // Generate ADR number
    const number = this.generateADRNumber(content);

    // Format ADR section
    const section = this.formatADRSection(number, adr);

    // Find insertion point (Architecture Decisions section)
    const insertionPoint = this.findADRInsertionPoint(content);
    const newContent =
      content.slice(0, insertionPoint) + section + '\n' + content.slice(insertionPoint);

    await fs.writeFile(filePath, newContent, 'utf-8');

    return {
      number,
      title: adr.title,
      status: adr.status,
    };
  }

  /**
   * Generate ADR number
   * @param {string} content - Document content
   * @returns {string} ADR number (ADR-001, ADR-002, etc.)
   */
  generateADRNumber(content) {
    const regex = /### ADR-(\d+):/g;

    let maxNum = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }

    const nextNum = (maxNum + 1).toString().padStart(3, '0');
    return `ADR-${nextNum}`;
  }

  /**
   * Format ADR section
   * @param {string} number - ADR number
   * @param {object} adr - ADR data
   * @returns {string} Formatted ADR section
   */
  formatADRSection(number, adr) {
    const date = new Date().toISOString().split('T')[0];

    let section = `### ${number}: ${adr.title}\n\n`;
    section += `**Status**: ${adr.status}\n`;
    section += `**Date**: ${date}\n\n`;
    section += `**Context**:\n\n${adr.context}\n\n`;
    section += `**Decision**:\n\n${adr.decision}\n\n`;
    section += `**Consequences**:\n\n${adr.consequences}\n\n`;

    if (adr.alternatives && adr.alternatives.length > 0) {
      section += '**Alternatives Considered**:\n\n';
      adr.alternatives.forEach(alt => {
        section += `- ${alt}\n`;
      });
      section += '\n';
    }

    return section;
  }

  /**
   * Find ADR insertion point in document
   * @param {string} content - Document content
   * @returns {number} Insertion index
   */
  findADRInsertionPoint(content) {
    // Find Architecture Decisions section
    const adrMatch = content.match(/## Architecture Decisions/);
    if (!adrMatch) {
      // If section doesn't exist, add it before next major section
      const nextMatch = content.match(/\n## [^#]/);
      if (nextMatch) {
        return nextMatch.index;
      }
      return content.length;
    }

    // Find next section after Architecture Decisions
    const afterADR = content.slice(adrMatch.index + adrMatch[0].length);
    const nextSectionMatch = afterADR.match(/\n## [^#]/);

    if (nextSectionMatch) {
      return adrMatch.index + adrMatch[0].length + nextSectionMatch.index;
    }

    return content.length;
  }

  /**
   * Validate design documents
   * @param {string} [filePath] - Specific file path
   * @returns {Promise<object>} Validation results
   */
  async validate(filePath = null) {
    const files = filePath ? [filePath] : await this.findDesignFiles();
    const violations = [];
    const details = [];

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const errors = this.validateDesignDocument(content);

      if (errors.length > 0) {
        violations.push(`${path.basename(file)}: ${errors.join(', ')}`);
        details.push({
          file: path.basename(file),
          valid: false,
          message: errors.join(', '),
        });
      } else {
        details.push({
          file: path.basename(file),
          valid: true,
          message: 'Design document complete',
        });
      }
    }

    return {
      passed: violations.length === 0,
      total: files.length,
      valid: files.length - violations.length,
      invalid: violations.length,
      violations,
      details,
    };
  }

  /**
   * Validate single design document
   * @param {string} content - Document content
   * @returns {string[]} List of errors
   */
  validateDesignDocument(content) {
    const errors = [];

    // Check for required sections
    if (!content.includes('## Architecture Design')) {
      errors.push('Missing Architecture Design section');
    }

    if (!content.includes('## Steering Context')) {
      errors.push('Missing Steering Context section');
    }

    // Check for C4 diagrams (at least one level)
    const hasC4 =
      content.includes('C4Context') ||
      content.includes('C4Container') ||
      content.includes('C4Component') ||
      content.includes('C4 Model');

    if (!hasC4) {
      errors.push('Missing C4 model diagrams');
    }

    return errors;
  }

  /**
   * Generate traceability matrix
   * @param {string} [_filePath] - Specific file path
   * @returns {Promise<object[]>} Traceability matrix
   */
  async generateTraceabilityMatrix(_filePath = null) {
    const matrix = [];

    // Find requirement files
    const reqFiles = await glob('docs/requirements/**/*.md', {
      cwd: this.rootDir,
      absolute: true,
    });

    for (const reqFile of reqFiles) {
      const content = await fs.readFile(reqFile, 'utf-8');
      const requirements = this.parseRequirements(content);

      for (const req of requirements) {
        matrix.push({
          requirement: req.id,
          design: false,
          components: 0,
          traced: false,
        });
      }
    }

    return matrix;
  }

  /**
   * Parse requirements from content
   * @param {string} content - File content
   * @returns {object[]} List of requirements
   */
  parseRequirements(content) {
    const requirements = [];
    const reqRegex = /### (REQ-[A-Z]+-\d+):/g;

    let match;
    while ((match = reqRegex.exec(content)) !== null) {
      requirements.push({ id: match[1] });
    }

    return requirements;
  }

  /**
   * Convert string to slug
   * @param {string} str - Input string
   * @returns {string} Slug
   */
  slugify(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

module.exports = DesignGenerator;
