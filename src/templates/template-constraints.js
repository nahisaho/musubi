/**
 * Template Constraints Engine
 * LLM制約テンプレート構文と不確実性マーカー
 * 
 * @module templates/template-constraints
 */

const EventEmitter = require('events');

/**
 * Constraint types
 */
const CONSTRAINT_TYPE = {
  REQUIRED: 'required',
  OPTIONAL: 'optional',
  FORBIDDEN: 'forbidden',
  CONDITIONAL: 'conditional',
  PATTERN: 'pattern',
  RANGE: 'range',
  ENUM: 'enum'
};

/**
 * Uncertainty levels
 */
const UNCERTAINTY = {
  CERTAIN: 'certain',       // 100% confidence
  HIGH: 'high',             // 80-99%
  MEDIUM: 'medium',         // 50-79%
  LOW: 'low',               // 20-49%
  UNCERTAIN: 'uncertain'    // <20%
};

/**
 * Marker types for structured thinking
 */
const MARKER_TYPE = {
  ASSUMPTION: 'assumption',
  DECISION: 'decision',
  RISK: 'risk',
  TODO: 'todo',
  QUESTION: 'question',
  VERIFIED: 'verified',
  UNCERTAIN: 'uncertain'
};

/**
 * Default constraint templates
 */
const DEFAULT_TEMPLATES = {
  'requirements': {
    name: 'Requirements Template',
    sections: [
      { name: 'overview', required: true, minLength: 50 },
      { name: 'functional', required: true, format: 'ears' },
      { name: 'non-functional', required: false },
      { name: 'constraints', required: false },
      { name: 'assumptions', required: true }
    ],
    markers: [MARKER_TYPE.ASSUMPTION, MARKER_TYPE.RISK]
  },
  'design': {
    name: 'Design Template',
    sections: [
      { name: 'architecture', required: true },
      { name: 'components', required: true, format: 'c4' },
      { name: 'decisions', required: true, format: 'adr' },
      { name: 'interfaces', required: false },
      { name: 'data-model', required: false }
    ],
    markers: [MARKER_TYPE.DECISION, MARKER_TYPE.ASSUMPTION]
  },
  'implementation': {
    name: 'Implementation Template',
    sections: [
      { name: 'approach', required: true },
      { name: 'tasks', required: true, format: 'checklist' },
      { name: 'dependencies', required: false },
      { name: 'testing', required: true }
    ],
    markers: [MARKER_TYPE.TODO, MARKER_TYPE.RISK]
  }
};

/**
 * Template Constraints Engine
 */
class TemplateConstraints extends EventEmitter {
  /**
   * @param {Object} options
   * @param {Object} options.templates - Custom templates
   * @param {boolean} options.strict - Strict mode
   * @param {boolean} options.trackUncertainty - Track uncertainty markers
   */
  constructor(options = {}) {
    super();
    
    this.templates = {
      ...DEFAULT_TEMPLATES,
      ...(options.templates || {})
    };
    
    this.strict = options.strict ?? false;
    this.trackUncertainty = options.trackUncertainty ?? true;
    this.customConstraints = new Map();
    this.validationHistory = [];
  }

  /**
   * Validate content against a template
   * @param {string} content - Content to validate
   * @param {string} templateId - Template identifier
   * @returns {Object} Validation result
   */
  validate(content, templateId) {
    const template = this.templates[templateId];
    if (!template) {
      return {
        valid: false,
        errors: [{ type: 'unknown_template', message: `Unknown template: ${templateId}` }],
        warnings: [],
        score: 0
      };
    }

    const errors = [];
    const warnings = [];
    const markers = this.extractMarkers(content);
    const sections = this.extractSections(content);

    // Validate required sections
    for (const section of template.sections) {
      const found = sections.find(s => 
        s.name.toLowerCase().includes(section.name.toLowerCase())
      );

      if (section.required && !found) {
        errors.push({
          type: 'missing_section',
          section: section.name,
          message: `Required section missing: ${section.name}`
        });
      } else if (found) {
        // Validate section content
        if (section.minLength && found.content.length < section.minLength) {
          warnings.push({
            type: 'short_section',
            section: section.name,
            message: `Section "${section.name}" is too short (${found.content.length} < ${section.minLength})`
          });
        }

        if (section.format) {
          const formatValid = this.validateFormat(found.content, section.format);
          if (!formatValid) {
            warnings.push({
              type: 'format_mismatch',
              section: section.name,
              format: section.format,
              message: `Section "${section.name}" doesn't match expected format: ${section.format}`
            });
          }
        }
      }
    }

    // Check for required markers
    if (template.markers && template.markers.length > 0) {
      for (const markerType of template.markers) {
        const hasMarker = markers.some(m => m.type === markerType);
        if (!hasMarker && this.trackUncertainty) {
          warnings.push({
            type: 'missing_marker',
            markerType,
            message: `Expected marker type not found: ${markerType}`
          });
        }
      }
    }

    // Apply custom constraints
    for (const [name, constraint] of this.customConstraints) {
      const result = constraint.validate(content, sections, markers);
      if (!result.valid) {
        if (constraint.severity === 'error') {
          errors.push({ type: 'custom_constraint', name, ...result });
        } else {
          warnings.push({ type: 'custom_constraint', name, ...result });
        }
      }
    }

    const score = this.calculateScore(template, errors, warnings);
    const valid = errors.length === 0 && (score >= 50 || !this.strict);

    const result = {
      valid,
      templateId,
      templateName: template.name,
      errors,
      warnings,
      markers,
      sections: sections.map(s => s.name),
      score,
      timestamp: new Date().toISOString()
    };

    this.validationHistory.push(result);
    this.emit('validated', result);

    return result;
  }

  /**
   * Extract sections from content
   * @param {string} content
   * @returns {Array}
   */
  extractSections(content) {
    const sections = [];
    const headerRegex = /^(#{1,3})\s+(.+?)$/gm;
    let match;
    const matches = [];

    while ((match = headerRegex.exec(content)) !== null) {
      matches.push({
        level: match[1].length,
        name: match[2].trim(),
        index: match.index
      });
    }

    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i < matches.length - 1 ? matches[i + 1].index : content.length;
      const sectionContent = content.slice(start, end).trim();

      sections.push({
        level: matches[i].level,
        name: matches[i].name,
        content: sectionContent,
        length: sectionContent.length
      });
    }

    return sections;
  }

  /**
   * Extract uncertainty and decision markers
   * @param {string} content
   * @returns {Array}
   */
  extractMarkers(content) {
    const markers = [];
    const markerPatterns = {
      [MARKER_TYPE.ASSUMPTION]: /\[ASSUMPTION\]:\s*(.+?)(?:\n|$)/gi,
      [MARKER_TYPE.DECISION]: /\[DECISION\]:\s*(.+?)(?:\n|$)/gi,
      [MARKER_TYPE.RISK]: /\[RISK\]:\s*(.+?)(?:\n|$)/gi,
      [MARKER_TYPE.TODO]: /\[TODO\]:\s*(.+?)(?:\n|$)/gi,
      [MARKER_TYPE.QUESTION]: /\[QUESTION\]:\s*(.+?)(?:\n|$)/gi,
      [MARKER_TYPE.VERIFIED]: /\[VERIFIED\]:\s*(.+?)(?:\n|$)/gi,
      [MARKER_TYPE.UNCERTAIN]: /\[UNCERTAIN(?:\s*:\s*(\d+)%)?\]:\s*(.+?)(?:\n|$)/gi
    };

    for (const [type, pattern] of Object.entries(markerPatterns)) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (type === MARKER_TYPE.UNCERTAIN) {
          markers.push({
            type,
            confidence: match[1] ? parseInt(match[1]) : 50,
            text: match[2].trim(),
            index: match.index
          });
        } else {
          markers.push({
            type,
            text: match[1].trim(),
            index: match.index
          });
        }
      }
    }

    return markers.sort((a, b) => a.index - b.index);
  }

  /**
   * Validate content format
   * @param {string} content
   * @param {string} format
   * @returns {boolean}
   */
  validateFormat(content, format) {
    const formatValidators = {
      ears: (c) => {
        // EARS format: When/While/If/Where patterns
        return /\b(when|while|if|where|shall|should|must)\b/i.test(c);
      },
      c4: (c) => {
        // C4 model references
        return /\b(system|container|component|context|boundary)\b/i.test(c);
      },
      adr: (c) => {
        // ADR format: Status, Context, Decision, Consequences
        return /\b(status|context|decision|consequences|accepted|proposed|deprecated)\b/i.test(c);
      },
      checklist: (c) => {
        // Checklist format
        return /^\s*[-*[\]]\s+/m.test(c);
      }
    };

    const validator = formatValidators[format];
    return validator ? validator(content) : true;
  }

  /**
   * Calculate validation score
   */
  calculateScore(template, errors, warnings) {
    let score = 100;
    const _totalSections = template.sections.length;
    const requiredSections = template.sections.filter(s => s.required).length;

    // Deduct for errors
    const missingSections = errors.filter(e => e.type === 'missing_section').length;
    score -= (missingSections / requiredSections) * 50;

    // Deduct for warnings
    score -= warnings.length * 5;

    // Deduct for other errors
    const otherErrors = errors.filter(e => e.type !== 'missing_section').length;
    score -= otherErrors * 10;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Add a template
   * @param {string} id
   * @param {Object} template
   */
  addTemplate(id, template) {
    if (!template.name || !template.sections) {
      throw new Error('Template must have name and sections');
    }
    this.templates[id] = template;
    this.emit('template-added', { id, template });
  }

  /**
   * Remove a template
   * @param {string} id
   * @returns {boolean}
   */
  removeTemplate(id) {
    if (this.templates[id]) {
      delete this.templates[id];
      return true;
    }
    return false;
  }

  /**
   * Add a custom constraint
   * @param {string} name
   * @param {Object} constraint
   */
  addConstraint(name, constraint) {
    if (!constraint.validate || typeof constraint.validate !== 'function') {
      throw new Error('Constraint must have a validate function');
    }
    this.customConstraints.set(name, {
      severity: 'warning',
      ...constraint
    });
  }

  /**
   * Remove a constraint
   * @param {string} name
   * @returns {boolean}
   */
  removeConstraint(name) {
    return this.customConstraints.delete(name);
  }

  /**
   * Get validation history
   * @param {Object} filter
   * @returns {Array}
   */
  getHistory(filter = {}) {
    let history = [...this.validationHistory];

    if (filter.templateId) {
      history = history.filter(h => h.templateId === filter.templateId);
    }

    if (filter.valid !== undefined) {
      history = history.filter(h => h.valid === filter.valid);
    }

    if (filter.minScore !== undefined) {
      history = history.filter(h => h.score >= filter.minScore);
    }

    return history;
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    const total = this.validationHistory.length;
    const valid = this.validationHistory.filter(h => h.valid).length;
    const avgScore = total > 0
      ? this.validationHistory.reduce((sum, h) => sum + h.score, 0) / total
      : 0;

    const byTemplate = {};
    for (const h of this.validationHistory) {
      if (!byTemplate[h.templateId]) {
        byTemplate[h.templateId] = { total: 0, valid: 0, totalScore: 0 };
      }
      byTemplate[h.templateId].total++;
      if (h.valid) byTemplate[h.templateId].valid++;
      byTemplate[h.templateId].totalScore += h.score;
    }

    for (const id in byTemplate) {
      byTemplate[id].avgScore = byTemplate[id].totalScore / byTemplate[id].total;
      delete byTemplate[id].totalScore;
    }

    return {
      total,
      valid,
      invalid: total - valid,
      validRate: total > 0 ? (valid / total) * 100 : 0,
      avgScore: Math.round(avgScore),
      byTemplate,
      templateCount: Object.keys(this.templates).length,
      constraintCount: this.customConstraints.size
    };
  }

  /**
   * List available templates
   * @returns {Array}
   */
  listTemplates() {
    return Object.entries(this.templates).map(([id, template]) => ({
      id,
      name: template.name,
      sections: template.sections.length,
      requiredSections: template.sections.filter(s => s.required).length,
      markers: template.markers || []
    }));
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.validationHistory = [];
    this.emit('history-cleared');
  }
}

/**
 * Structured Thinking Checklist
 */
class ThinkingChecklist extends EventEmitter {
  /**
   * @param {Object} options
   * @param {Array} options.items - Checklist items
   * @param {string} options.name - Checklist name
   */
  constructor(options = {}) {
    super();
    
    this.name = options.name || 'Thinking Checklist';
    this.items = options.items || this.getDefaultItems();
    this.completedItems = new Set();
    this.notes = new Map();
  }

  /**
   * Get default checklist items
   */
  getDefaultItems() {
    return [
      { id: 'understand', category: 'Analysis', text: 'Do I fully understand the requirements?' },
      { id: 'assumptions', category: 'Analysis', text: 'What assumptions am I making?' },
      { id: 'constraints', category: 'Analysis', text: 'What constraints exist?' },
      { id: 'alternatives', category: 'Design', text: 'Have I considered alternatives?' },
      { id: 'tradeoffs', category: 'Design', text: 'What are the tradeoffs?' },
      { id: 'edge-cases', category: 'Design', text: 'Have I considered edge cases?' },
      { id: 'risks', category: 'Risk', text: 'What could go wrong?' },
      { id: 'dependencies', category: 'Risk', text: 'What are the dependencies?' },
      { id: 'testing', category: 'Quality', text: 'How will this be tested?' },
      { id: 'maintainability', category: 'Quality', text: 'Is this maintainable?' }
    ];
  }

  /**
   * Mark item as complete
   * @param {string} itemId
   * @param {string} note
   */
  complete(itemId, note = '') {
    if (!this.items.find(i => i.id === itemId)) {
      throw new Error(`Unknown item: ${itemId}`);
    }
    this.completedItems.add(itemId);
    if (note) {
      this.notes.set(itemId, note);
    }
    this.emit('item-completed', { itemId, note });
  }

  /**
   * Unmark item
   * @param {string} itemId
   */
  uncomplete(itemId) {
    this.completedItems.delete(itemId);
    this.notes.delete(itemId);
  }

  /**
   * Get progress
   * @returns {Object}
   */
  getProgress() {
    const total = this.items.length;
    const completed = this.completedItems.size;
    const remaining = this.items.filter(i => !this.completedItems.has(i.id));

    const byCategory = {};
    for (const item of this.items) {
      if (!byCategory[item.category]) {
        byCategory[item.category] = { total: 0, completed: 0 };
      }
      byCategory[item.category].total++;
      if (this.completedItems.has(item.id)) {
        byCategory[item.category].completed++;
      }
    }

    return {
      total,
      completed,
      remaining: remaining.map(i => i.id),
      percentage: Math.round((completed / total) * 100),
      byCategory,
      isComplete: completed === total
    };
  }

  /**
   * Export as markdown
   * @returns {string}
   */
  toMarkdown() {
    let md = `# ${this.name}\n\n`;

    const byCategory = {};
    for (const item of this.items) {
      if (!byCategory[item.category]) {
        byCategory[item.category] = [];
      }
      byCategory[item.category].push(item);
    }

    for (const [category, items] of Object.entries(byCategory)) {
      md += `## ${category}\n\n`;
      for (const item of items) {
        const checked = this.completedItems.has(item.id) ? 'x' : ' ';
        md += `- [${checked}] ${item.text}\n`;
        if (this.notes.has(item.id)) {
          md += `  - Note: ${this.notes.get(item.id)}\n`;
        }
      }
      md += '\n';
    }

    const progress = this.getProgress();
    md += `---\nProgress: ${progress.completed}/${progress.total} (${progress.percentage}%)\n`;

    return md;
  }

  /**
   * Add custom item
   * @param {Object} item
   */
  addItem(item) {
    if (!item.id || !item.text) {
      throw new Error('Item must have id and text');
    }
    this.items.push({
      category: 'Custom',
      ...item
    });
  }

  /**
   * Reset checklist
   */
  reset() {
    this.completedItems.clear();
    this.notes.clear();
    this.emit('reset');
  }
}

/**
 * Factory function
 */
function createTemplateConstraints(options = {}) {
  return new TemplateConstraints(options);
}

/**
 * Factory function for checklist
 */
function createThinkingChecklist(options = {}) {
  return new ThinkingChecklist(options);
}

module.exports = {
  TemplateConstraints,
  ThinkingChecklist,
  createTemplateConstraints,
  createThinkingChecklist,
  CONSTRAINT_TYPE,
  UNCERTAINTY,
  MARKER_TYPE,
  DEFAULT_TEMPLATES
};
