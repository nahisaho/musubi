/**
 * Template Constraints Module
 * 
 * LLM-constraining syntax for steering templates with:
 * - Uncertainty markers ({?...?}, {~...~})
 * - Required checklists ([x] items)
 * - Validation constraints (type, range, format)
 * - Section requirements and dependencies
 */

const EventEmitter = require('events');

// Constraint Types
const ConstraintType = {
  REQUIRED: 'required',
  OPTIONAL: 'optional',
  CONDITIONAL: 'conditional',
  CHOICE: 'choice',
  RANGE: 'range',
  PATTERN: 'pattern',
  CUSTOM: 'custom'
};

// Uncertainty Marker Types
const UncertaintyMarker = {
  UNKNOWN: '?',      // {?...?} - value unknown
  ESTIMATE: '~',     // {~...~} - estimated value
  PLACEHOLDER: '#',  // {#...#} - placeholder
  TODO: '!',         // {!...!} - needs action
  REVIEW: '@'        // {@...@} - needs review
};

// Validation Severity
const Severity = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  HINT: 'hint'
};

/**
 * Constraint Definition
 */
class Constraint {
  constructor(options = {}) {
    this.name = options.name || 'unnamed';
    this.type = options.type || ConstraintType.REQUIRED;
    this.severity = options.severity || Severity.ERROR;
    this.message = options.message || 'Constraint violation';
    this.validator = options.validator || (() => true);
    this.metadata = options.metadata || {};
  }

  validate(value, context = {}) {
    try {
      const result = this.validator(value, context);
      return {
        valid: result === true,
        constraint: this.name,
        type: this.type,
        severity: this.severity,
        message: result === true ? null : (typeof result === 'string' ? result : this.message),
        value
      };
    } catch (error) {
      return {
        valid: false,
        constraint: this.name,
        type: this.type,
        severity: this.severity,
        message: error.message,
        value,
        error
      };
    }
  }
}

/**
 * Checklist Item
 */
class ChecklistItem {
  constructor(text, options = {}) {
    this.text = text;
    this.required = options.required !== false;
    this.checked = options.checked || false;
    this.condition = options.condition || null;
    this.order = options.order || 0;
    this.dependencies = options.dependencies || [];
  }

  isApplicable(context = {}) {
    if (!this.condition) return true;
    return this.condition(context);
  }

  check() {
    this.checked = true;
    return this;
  }

  uncheck() {
    this.checked = false;
    return this;
  }

  validate(context = {}) {
    if (!this.isApplicable(context)) {
      return { valid: true, skipped: true };
    }

    // Check dependencies
    for (const dep of this.dependencies) {
      if (context.checklist && !context.checklist[dep]?.checked) {
        return {
          valid: false,
          message: `Dependency "${dep}" must be completed first`
        };
      }
    }

    return {
      valid: !this.required || this.checked,
      message: this.required && !this.checked 
        ? `Required item not checked: ${this.text}` 
        : null
    };
  }
}

/**
 * Checklist
 */
class Checklist {
  constructor(name, options = {}) {
    this.name = name;
    this.items = new Map();
    this.required = options.required !== false;
    this.minRequired = options.minRequired || null;
    this.maxAllowed = options.maxAllowed || null;
    this.ordered = options.ordered || false;
  }

  addItem(id, text, options = {}) {
    const item = new ChecklistItem(text, {
      ...options,
      order: this.items.size
    });
    this.items.set(id, item);
    return item;
  }

  removeItem(id) {
    return this.items.delete(id);
  }

  getItem(id) {
    return this.items.get(id);
  }

  check(id) {
    const item = this.items.get(id);
    if (item) item.check();
    return this;
  }

  uncheck(id) {
    const item = this.items.get(id);
    if (item) item.uncheck();
    return this;
  }

  getCheckedCount() {
    return [...this.items.values()].filter(item => item.checked).length;
  }

  getRequiredCount() {
    return [...this.items.values()].filter(item => item.required).length;
  }

  validate(context = {}) {
    const issues = [];
    const itemContext = { ...context, checklist: Object.fromEntries(this.items) };

    // Validate each item
    for (const [id, item] of this.items) {
      const result = item.validate(itemContext);
      if (!result.valid && !result.skipped) {
        issues.push({
          item: id,
          message: result.message
        });
      }
    }

    // Validate minimum required
    if (this.minRequired !== null) {
      const checked = this.getCheckedCount();
      if (checked < this.minRequired) {
        issues.push({
          message: `At least ${this.minRequired} items must be checked (current: ${checked})`
        });
      }
    }

    // Validate maximum allowed
    if (this.maxAllowed !== null) {
      const checked = this.getCheckedCount();
      if (checked > this.maxAllowed) {
        issues.push({
          message: `At most ${this.maxAllowed} items can be checked (current: ${checked})`
        });
      }
    }

    return {
      valid: issues.length === 0,
      checklist: this.name,
      checked: this.getCheckedCount(),
      total: this.items.size,
      issues
    };
  }

  toMarkdown() {
    const lines = [`## ${this.name}`, ''];
    
    for (const [, item] of this.items) {
      const checkbox = item.checked ? '[x]' : '[ ]';
      const required = item.required ? '' : ' (optional)';
      lines.push(`- ${checkbox} ${item.text}${required}`);
    }

    return lines.join('\n');
  }

  static fromMarkdown(content) {
    const lines = content.split('\n');
    let name = 'Checklist';
    const checklist = new Checklist(name);
    
    for (const line of lines) {
      // Parse header
      const headerMatch = line.match(/^##\s+(.+)$/);
      if (headerMatch) {
        name = headerMatch[1];
        checklist.name = name;
        continue;
      }

      // Parse checklist item
      const itemMatch = line.match(/^-\s+\[([ xX])\]\s+(.+?)(\s+\(optional\))?$/);
      if (itemMatch) {
        const checked = itemMatch[1].toLowerCase() === 'x';
        const text = itemMatch[2];
        const required = !itemMatch[3];
        const id = text.toLowerCase().replace(/\s+/g, '-').slice(0, 50);
        
        checklist.addItem(id, text, { checked, required });
      }
    }

    return checklist;
  }
}

/**
 * Uncertainty Parser
 */
class UncertaintyParser {
  constructor() {
    this.markers = new Map([
      ['?', { name: 'unknown', pattern: /\{\?(.+?)\?\}/g }],
      ['~', { name: 'estimate', pattern: /\{~(.+?)~\}/g }],
      ['#', { name: 'placeholder', pattern: /\{#(.+?)#\}/g }],
      ['!', { name: 'todo', pattern: /\{!(.+?)!\}/g }],
      ['@', { name: 'review', pattern: /\{@(.+?)@\}/g }]
    ]);
  }

  parse(content) {
    const uncertainties = [];

    for (const [marker, config] of this.markers) {
      const regex = new RegExp(config.pattern.source, 'g');
      let match;

      while ((match = regex.exec(content)) !== null) {
        uncertainties.push({
          type: config.name,
          marker,
          value: match[1],
          original: match[0],
          index: match.index
        });
      }
    }

    return uncertainties.sort((a, b) => a.index - b.index);
  }

  resolve(content, resolutions) {
    let resolved = content;

    for (const [key, value] of Object.entries(resolutions)) {
      // Try each marker type
      for (const [marker] of this.markers) {
        const patterns = [
          new RegExp(`\\{\\${marker}${this.escapeRegex(key)}\\${marker}\\}`, 'g'),
          new RegExp(`\\{\\${marker}[^${marker}]*${this.escapeRegex(key)}[^${marker}]*\\${marker}\\}`, 'g')
        ];

        for (const pattern of patterns) {
          resolved = resolved.replace(pattern, value);
        }
      }
    }

    return resolved;
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  hasUnresolved(content) {
    for (const [, config] of this.markers) {
      if (config.pattern.test(content)) {
        return true;
      }
      // Reset regex lastIndex
      config.pattern.lastIndex = 0;
    }
    return false;
  }

  getUnresolvedCount(content) {
    return this.parse(content).length;
  }

  highlight(content) {
    let highlighted = content;

    for (const [marker, config] of this.markers) {
      const regex = new RegExp(config.pattern.source, 'g');
      highlighted = highlighted.replace(regex, `**[${config.name.toUpperCase()}: $1]**`);
    }

    return highlighted;
  }
}

/**
 * Template Section
 */
class TemplateSection {
  constructor(name, options = {}) {
    this.name = name;
    this.required = options.required !== false;
    this.constraints = [];
    this.dependencies = options.dependencies || [];
    this.format = options.format || null;
    this.minLength = options.minLength || null;
    this.maxLength = options.maxLength || null;
    this.pattern = options.pattern || null;
  }

  addConstraint(constraint) {
    this.constraints.push(constraint);
    return this;
  }

  validate(content, context = {}) {
    const issues = [];

    // Check required
    if (this.required && (!content || content.trim() === '')) {
      issues.push({
        constraint: 'required',
        severity: Severity.ERROR,
        message: `Section "${this.name}" is required`
      });
      return { valid: false, section: this.name, issues };
    }

    // Check dependencies
    for (const dep of this.dependencies) {
      if (context.sections && !context.sections[dep]) {
        issues.push({
          constraint: 'dependency',
          severity: Severity.ERROR,
          message: `Section "${this.name}" requires "${dep}" to be defined`
        });
      }
    }

    // Check length constraints
    if (content) {
      if (this.minLength && content.length < this.minLength) {
        issues.push({
          constraint: 'minLength',
          severity: Severity.WARNING,
          message: `Section "${this.name}" should be at least ${this.minLength} characters`
        });
      }

      if (this.maxLength && content.length > this.maxLength) {
        issues.push({
          constraint: 'maxLength',
          severity: Severity.WARNING,
          message: `Section "${this.name}" should be at most ${this.maxLength} characters`
        });
      }

      // Check pattern
      if (this.pattern && !this.pattern.test(content)) {
        issues.push({
          constraint: 'pattern',
          severity: Severity.ERROR,
          message: `Section "${this.name}" does not match required pattern`
        });
      }
    }

    // Run custom constraints
    for (const constraint of this.constraints) {
      const result = constraint.validate(content, context);
      if (!result.valid) {
        issues.push({
          constraint: constraint.name,
          severity: result.severity,
          message: result.message
        });
      }
    }

    return {
      valid: !issues.some(i => i.severity === Severity.ERROR),
      section: this.name,
      issues
    };
  }
}

/**
 * Template Definition
 */
class TemplateDefinition {
  constructor(name, options = {}) {
    this.name = name;
    this.version = options.version || '1.0.0';
    this.description = options.description || '';
    this.sections = new Map();
    this.checklists = new Map();
    this.globalConstraints = [];
  }

  addSection(name, options = {}) {
    const section = new TemplateSection(name, options);
    this.sections.set(name, section);
    return section;
  }

  getSection(name) {
    return this.sections.get(name);
  }

  addChecklist(name, options = {}) {
    const checklist = new Checklist(name, options);
    this.checklists.set(name, checklist);
    return checklist;
  }

  getChecklist(name) {
    return this.checklists.get(name);
  }

  addGlobalConstraint(constraint) {
    this.globalConstraints.push(constraint);
    return this;
  }

  validate(document, context = {}) {
    const results = {
      valid: true,
      template: this.name,
      sections: [],
      checklists: [],
      global: []
    };

    const sectionContext = {
      ...context,
      sections: document.sections || {}
    };

    // Validate sections
    for (const [name, section] of this.sections) {
      const content = document.sections?.[name] || '';
      const result = section.validate(content, sectionContext);
      results.sections.push(result);
      
      if (!result.valid) {
        results.valid = false;
      }
    }

    // Validate checklists
    for (const [name, checklist] of this.checklists) {
      const items = document.checklists?.[name] || {};
      
      // Apply checked state from document
      for (const [id, checked] of Object.entries(items)) {
        if (checked) checklist.check(id);
        else checklist.uncheck(id);
      }

      const result = checklist.validate(context);
      results.checklists.push(result);

      if (!result.valid) {
        results.valid = false;
      }
    }

    // Run global constraints
    for (const constraint of this.globalConstraints) {
      const result = constraint.validate(document, sectionContext);
      results.global.push(result);

      if (!result.valid && result.severity === Severity.ERROR) {
        results.valid = false;
      }
    }

    return results;
  }
}

/**
 * Template Constraint Engine
 */
class TemplateConstraintEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.templates = new Map();
    this.uncertaintyParser = new UncertaintyParser();
    this.strictMode = options.strict || false;
  }

  registerTemplate(template) {
    this.templates.set(template.name, template);
    this.emit('template:registered', template.name);
    return this;
  }

  getTemplate(name) {
    return this.templates.get(name);
  }

  /**
   * Parse a document and extract sections/checklists
   */
  parseDocument(content) {
    const doc = {
      sections: {},
      checklists: {},
      uncertainties: []
    };

    // Parse sections (## headers)
    const sectionPattern = /^##\s+(.+)$/gm;
    let currentSection = null;
    let currentContent = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const sectionMatch = line.match(/^##\s+(.+)$/);
      
      if (sectionMatch) {
        // Save previous section
        if (currentSection) {
          doc.sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = sectionMatch[1];
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      doc.sections[currentSection] = currentContent.join('\n').trim();
    }

    // Parse checklists from sections
    for (const [name, sectionContent] of Object.entries(doc.sections)) {
      const checklistItems = {};
      const itemPattern = /^-\s+\[([ xX])\]\s+(.+)$/gm;
      let match;

      while ((match = itemPattern.exec(sectionContent)) !== null) {
        const checked = match[1].toLowerCase() === 'x';
        const text = match[2].replace(/\s+\(optional\)$/, '');
        const id = text.toLowerCase().replace(/\s+/g, '-').slice(0, 50);
        checklistItems[id] = checked;
      }

      if (Object.keys(checklistItems).length > 0) {
        doc.checklists[name] = checklistItems;
      }
    }

    // Parse uncertainties
    doc.uncertainties = this.uncertaintyParser.parse(content);

    return doc;
  }

  /**
   * Validate a document against a template
   */
  validate(templateName, content) {
    const template = this.templates.get(templateName);
    if (!template) {
      return {
        valid: false,
        error: `Template "${templateName}" not found`
      };
    }

    const document = typeof content === 'string' 
      ? this.parseDocument(content)
      : content;

    const results = template.validate(document);

    // Check for unresolved uncertainties in strict mode
    if (this.strictMode && document.uncertainties.length > 0) {
      results.valid = false;
      results.uncertainties = document.uncertainties.map(u => ({
        type: u.type,
        value: u.value,
        message: `Unresolved ${u.type}: ${u.value}`
      }));
    }

    this.emit('validated', {
      template: templateName,
      results
    });

    return results;
  }

  /**
   * Generate a template document
   */
  generate(templateName, data = {}) {
    const template = this.templates.get(templateName);
    if (!template) {
      return { error: `Template "${templateName}" not found` };
    }

    const lines = [`# ${template.name}`, ''];

    if (template.description) {
      lines.push(template.description, '');
    }

    // Generate sections
    for (const [name, section] of template.sections) {
      lines.push(`## ${name}`, '');

      const content = data.sections?.[name];
      if (content) {
        lines.push(content);
      } else if (section.required) {
        lines.push(`{!TODO: Add ${name}!}`);
      } else {
        lines.push(`{?Optional: ${name}?}`);
      }

      lines.push('');
    }

    // Generate checklists
    for (const [name, checklist] of template.checklists) {
      if (!template.sections.has(name)) {
        lines.push(`## ${name}`, '');
        lines.push(checklist.toMarkdown().split('\n').slice(2).join('\n'));
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Create common steering templates
   */
  createSteeringTemplates() {
    // Structure template
    const structure = new TemplateDefinition('Structure', {
      description: 'Project structure and architecture'
    });

    structure.addSection('Overview', { required: true, minLength: 50 });
    structure.addSection('Directories', { required: true });
    structure.addSection('Key Files', { required: false });
    structure.addSection('Architecture', { required: true });

    const structureChecklist = structure.addChecklist('Review Checklist');
    structureChecklist.addItem('dirs-documented', 'All directories documented');
    structureChecklist.addItem('architecture-clear', 'Architecture is clearly explained');
    structureChecklist.addItem('dependencies-listed', 'Key dependencies are listed');

    this.registerTemplate(structure);

    // Tech template
    const tech = new TemplateDefinition('Tech', {
      description: 'Technology stack and tools'
    });

    tech.addSection('Languages', { required: true });
    tech.addSection('Frameworks', { required: true });
    tech.addSection('Tools', { required: false });
    tech.addSection('Dependencies', { required: true });

    const techChecklist = tech.addChecklist('Tech Checklist');
    techChecklist.addItem('versions-specified', 'Versions are specified');
    techChecklist.addItem('rationale-provided', 'Technology choices are justified');

    this.registerTemplate(tech);

    // Product template
    const product = new TemplateDefinition('Product', {
      description: 'Product context and goals'
    });

    product.addSection('Vision', { required: true, minLength: 100 });
    product.addSection('Goals', { required: true });
    product.addSection('Features', { required: true });
    product.addSection('Users', { required: true });
    product.addSection('Success Criteria', { required: false });

    const productChecklist = product.addChecklist('Product Checklist');
    productChecklist.addItem('vision-clear', 'Vision is clearly stated');
    productChecklist.addItem('goals-measurable', 'Goals are measurable');
    productChecklist.addItem('users-identified', 'Target users are identified');

    this.registerTemplate(product);

    return this;
  }
}

/**
 * Factory function
 */
function createTemplateConstraintEngine(options = {}) {
  const engine = new TemplateConstraintEngine(options);
  
  if (options.includeSteeringTemplates !== false) {
    engine.createSteeringTemplates();
  }

  return engine;
}

module.exports = {
  // Constants
  ConstraintType,
  UncertaintyMarker,
  Severity,
  
  // Classes
  Constraint,
  ChecklistItem,
  Checklist,
  UncertaintyParser,
  TemplateSection,
  TemplateDefinition,
  TemplateConstraintEngine,
  
  // Factory
  createTemplateConstraintEngine
};
