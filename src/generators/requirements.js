/**
 * MUSUBI Requirements Generator
 * 
 * Generates EARS (Easy Approach to Requirements Syntax) formatted requirements
 * Complies with Article IV of MUSUBI Constitution
 * 
 * EARS Patterns:
 * 1. Ubiquitous: The [system] SHALL [requirement]
 * 2. Event-Driven: WHEN [event], THEN [system] SHALL [response]
 * 3. State-Driven: WHILE [state], [system] SHALL [response]
 * 4. Unwanted Behavior: IF [error], THEN [system] SHALL [response]
 * 5. Optional Feature: WHERE [feature], [system] SHALL [response]
 */

const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');

class RequirementsGenerator {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.templatePath = path.join(__dirname, '../src/templates/shared/documents/requirements.md');
  }

  /**
   * Initialize requirements document for a feature
   * @param {string} feature - Feature name
   * @param {object} options - Options (output, author, project)
   * @returns {Promise<object>} Result with path
   */
  async init(feature, options = {}) {
    const outputDir = path.join(this.rootDir, options.output || 'docs/requirements');
    await fs.ensureDir(outputDir);

    const fileName = `${this.slugify(feature)}.md`;
    const filePath = path.join(outputDir, fileName);

    // Check if file exists
    if (await fs.pathExists(filePath)) {
      throw new Error(`Requirements file already exists: ${filePath}`);
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
      .replace(/\{\{COMPONENT\}\}/g, this.slugify(feature).toUpperCase());

    await fs.writeFile(filePath, content, 'utf-8');

    return { path: filePath };
  }

  /**
   * Find all requirements files in the project
   * @returns {Promise<string[]>} List of requirements file paths
   */
  async findRequirementsFiles() {
    const patterns = [
      'docs/requirements/**/*.md',
      'docs/requirements/*.md',
      'requirements/**/*.md',
      'requirements/*.md'
    ];

    const files = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { cwd: this.rootDir, absolute: true });
      files.push(...matches);
    }

    return [...new Set(files)];
  }

  /**
   * Add requirement to file
   * @param {string} filePath - Requirements file path
   * @param {object} requirement - Requirement data
   * @returns {Promise<object>} Result with ID and statement
   */
  async addRequirement(filePath, requirement) {
    // Read existing file
    const content = await fs.readFile(filePath, 'utf-8');

    // Generate requirement ID
    const id = this.generateRequirementId(content, requirement.component);

    // Generate EARS statement
    const statement = this.generateEARSStatement(requirement);

    // Format requirement section
    const section = this.formatRequirementSection(id, requirement.title, statement, requirement.criteria);

    // Find insertion point (end of Functional Requirements section)
    const insertionPoint = this.findInsertionPoint(content);
    const newContent = content.slice(0, insertionPoint) + section + '\n' + content.slice(insertionPoint);

    await fs.writeFile(filePath, newContent, 'utf-8');

    return { id, statement };
  }

  /**
   * Generate unique requirement ID
   * @param {string} content - File content
   * @param {string} component - Component name
   * @returns {string} Requirement ID (REQ-XXX-NNN)
   */
  generateRequirementId(content, component = 'FEATURE') {
    const prefix = `REQ-${component.toUpperCase()}-`;
    const regex = new RegExp(`${this.escapeRegex(prefix)}(\\d+)`, 'g');
    
    let maxNum = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }

    const nextNum = (maxNum + 1).toString().padStart(3, '0');
    return `${prefix}${nextNum}`;
  }

  /**
   * Generate EARS statement based on pattern
   * @param {object} data - Requirement data
   * @returns {string} EARS statement
   */
  generateEARSStatement(data) {
    const { pattern, system, statement, response } = data;

    switch (pattern) {
    case 'ubiquitous':
      return `The ${system} SHALL ${response}.`;

    case 'event':
      return `WHEN ${statement}, THEN the ${system} SHALL ${response}.`;

    case 'state':
      return `WHILE ${statement}, the ${system} SHALL ${response}.`;

    case 'unwanted':
      return `IF ${statement}, THEN the ${system} SHALL ${response}.`;

    case 'optional':
      return `WHERE ${statement}, the ${system} SHALL ${response}.`;

    default:
      throw new Error(`Unknown EARS pattern: ${pattern}`);
    }
  }

  /**
   * Format requirement section
   * @param {string} id - Requirement ID
   * @param {string} title - Title
   * @param {string} statement - EARS statement
   * @param {string[]} criteria - Acceptance criteria
   * @returns {string} Formatted section
   */
  formatRequirementSection(id, title, statement, criteria = []) {
    let section = `### ${id}: ${title}\n\n`;
    section += `${statement}\n\n`;

    if (criteria.length > 0) {
      section += '**Acceptance Criteria:**\n';
      criteria.forEach(criterion => {
        section += `- ${criterion}\n`;
      });
      section += '\n';
    }

    return section;
  }

  /**
   * Find insertion point in document
   * @param {string} content - Document content
   * @returns {number} Insertion index
   */
  findInsertionPoint(content) {
    // Find end of Functional Requirements section
    const functionalMatch = content.match(/## Functional Requirements/);
    if (!functionalMatch) {
      throw new Error('Functional Requirements section not found');
    }

    // Find next section header
    const afterFunctional = content.slice(functionalMatch.index + functionalMatch[0].length);
    const nextSectionMatch = afterFunctional.match(/\n## [^#]/);

    if (nextSectionMatch) {
      return functionalMatch.index + functionalMatch[0].length + nextSectionMatch.index;
    }

    // If no next section, append at end
    return content.length;
  }

  /**
   * List all requirements in file(s)
   * @param {string} [filePath] - Specific file path
   * @returns {Promise<object[]>} List of requirements
   */
  async listRequirements(filePath = null) {
    const files = filePath ? [filePath] : await this.findRequirementsFiles();
    const requirements = [];

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const reqs = this.parseRequirements(content);
      requirements.push(...reqs);
    }

    return requirements;
  }

  /**
   * Parse requirements from content
   * @param {string} content - File content
   * @returns {object[]} List of requirements
   */
  parseRequirements(content) {
    const requirements = [];
    const reqRegex = /### (REQ-[A-Z]+-\d+): (.+?)\n\n(.+?)(?=\n###|\n##|$)/gs;

    let match;
    while ((match = reqRegex.exec(content)) !== null) {
      const [, id, title, body] = match;
      const pattern = this.detectEARSPattern(body);

      requirements.push({
        id,
        title,
        statement: body.trim(),
        pattern
      });
    }

    return requirements;
  }

  /**
   * Detect EARS pattern in statement
   * @param {string} statement - EARS statement
   * @returns {string} Pattern type
   */
  detectEARSPattern(statement) {
    if (statement.startsWith('WHEN')) return 'event';
    if (statement.startsWith('WHILE')) return 'state';
    if (statement.startsWith('IF')) return 'unwanted';
    if (statement.startsWith('WHERE')) return 'optional';
    if (statement.match(/^The .+ SHALL/)) return 'ubiquitous';
    return 'unknown';
  }

  /**
   * Validate requirements against EARS format
   * @param {string} [filePath] - Specific file path
   * @returns {Promise<object>} Validation results
   */
  async validate(filePath = null) {
    const requirements = await this.listRequirements(filePath);
    const violations = [];
    const details = [];

    for (const req of requirements) {
      const errors = this.validateEARSFormat(req);
      
      if (errors.length > 0) {
        violations.push(`${req.id}: ${errors.join(', ')}`);
        details.push({
          id: req.id,
          valid: false,
          message: errors.join(', ')
        });
      } else {
        details.push({
          id: req.id,
          valid: true,
          message: 'Valid EARS format'
        });
      }
    }

    return {
      passed: violations.length === 0,
      total: requirements.length,
      valid: requirements.length - violations.length,
      invalid: violations.length,
      violations,
      details
    };
  }

  /**
   * Validate single requirement EARS format
   * @param {object} requirement - Requirement object
   * @returns {string[]} List of errors
   */
  validateEARSFormat(requirement) {
    const errors = [];
    const { statement, pattern } = requirement;

    // Check if pattern is recognized
    if (pattern === 'unknown') {
      errors.push('Unknown EARS pattern');
      return errors;
    }

    // Check for SHALL keyword
    if (!statement.includes('SHALL')) {
      errors.push('Missing SHALL keyword');
    }

    // Pattern-specific validation
    switch (pattern) {
    case 'event':
      if (!statement.startsWith('WHEN') || !statement.includes('THEN')) {
        errors.push('Event-driven pattern must use WHEN...THEN');
      }
      break;

    case 'state':
      if (!statement.startsWith('WHILE')) {
        errors.push('State-driven pattern must start with WHILE');
      }
      break;

    case 'unwanted':
      if (!statement.startsWith('IF') || !statement.includes('THEN')) {
        errors.push('Unwanted behavior pattern must use IF...THEN');
      }
      break;

    case 'optional':
      if (!statement.startsWith('WHERE')) {
        errors.push('Optional feature pattern must start with WHERE');
      }
      break;

    case 'ubiquitous':
      if (!statement.match(/^The .+ SHALL/)) {
        errors.push('Ubiquitous pattern must use "The [system] SHALL"');
      }
      break;
    }

    return errors;
  }

  /**
   * Generate traceability matrix
   * @param {string} [filePath] - Specific file path
   * @returns {Promise<object[]>} Traceability matrix
   */
  async generateTraceabilityMatrix(filePath = null) {
    const requirements = await this.listRequirements(filePath);
    const matrix = [];

    for (const req of requirements) {
      // TODO: Scan design docs, code, and tests for traceability
      matrix.push({
        id: req.id,
        title: req.title,
        design: false,
        code: false,
        tests: false,
        complete: false
      });
    }

    return matrix;
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

  /**
   * Escape regex special characters
   * @param {string} str - Input string
   * @returns {string} Escaped string
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

module.exports = RequirementsGenerator;
