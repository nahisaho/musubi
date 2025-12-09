/**
 * Template Constraints Engine Tests
 */

const {
  TemplateConstraints,
  ThinkingChecklist,
  createTemplateConstraints,
  createThinkingChecklist,
  CONSTRAINT_TYPE,
  UNCERTAINTY,
  MARKER_TYPE,
  DEFAULT_TEMPLATES
} = require('../../src/templates/template-constraints');

describe('TemplateConstraints', () => {
  describe('constructor', () => {
    test('should create with default options', () => {
      const tc = new TemplateConstraints();
      expect(tc.templates).toBeDefined();
      expect(tc.strict).toBe(false);
      expect(tc.trackUncertainty).toBe(true);
    });

    test('should accept custom options', () => {
      const tc = new TemplateConstraints({
        strict: true,
        trackUncertainty: false
      });
      expect(tc.strict).toBe(true);
      expect(tc.trackUncertainty).toBe(false);
    });

    test('should merge custom templates', () => {
      const tc = new TemplateConstraints({
        templates: {
          custom: { name: 'Custom', sections: [] }
        }
      });
      expect(tc.templates.custom).toBeDefined();
      expect(tc.templates.requirements).toBeDefined();
    });
  });

  describe('validate()', () => {
    let tc;

    beforeEach(() => {
      tc = new TemplateConstraints();
    });

    test('should return error for unknown template', () => {
      const result = tc.validate('content', 'unknown');
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe('unknown_template');
    });

    test('should validate content against template', () => {
      const content = `
# Overview
This is the overview section with enough content to pass validation.

# Functional Requirements
When user clicks, the system shall respond.

# Assumptions
[ASSUMPTION]: User has internet access
      `;

      const result = tc.validate(content, 'requirements');
      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.markers.length).toBeGreaterThan(0);
    });

    test('should detect missing required sections', () => {
      const content = '# Random Section\nSome content';
      const result = tc.validate(content, 'requirements');
      expect(result.errors.some(e => e.type === 'missing_section')).toBe(true);
    });

    test('should emit validated event', () => {
      const handler = jest.fn();
      tc.on('validated', handler);

      tc.validate('# Overview\nContent', 'requirements');
      expect(handler).toHaveBeenCalled();
    });

    test('should track validation history', () => {
      tc.validate('content', 'requirements');
      expect(tc.validationHistory.length).toBe(1);
    });
  });

  describe('extractSections()', () => {
    let tc;

    beforeEach(() => {
      tc = new TemplateConstraints();
    });

    test('should extract markdown sections', () => {
      const content = `
# First Section
Content 1

## Second Section
Content 2

### Third Section
Content 3
      `;

      const sections = tc.extractSections(content);
      expect(sections.length).toBe(3);
      expect(sections[0].name).toBe('First Section');
      expect(sections[0].level).toBe(1);
      expect(sections[1].level).toBe(2);
    });

    test('should return empty array for no sections', () => {
      const sections = tc.extractSections('Just plain text');
      expect(sections).toEqual([]);
    });
  });

  describe('extractMarkers()', () => {
    let tc;

    beforeEach(() => {
      tc = new TemplateConstraints();
    });

    test('should extract all marker types', () => {
      const content = `
[ASSUMPTION]: User has account
[DECISION]: Use REST API
[RISK]: Performance issues
[TODO]: Implement caching
[QUESTION]: Should we use GraphQL?
[VERIFIED]: Security audit passed
[UNCERTAIN: 30%]: May need refactoring
      `;

      const markers = tc.extractMarkers(content);
      expect(markers.length).toBe(7);
      expect(markers.find(m => m.type === 'assumption')).toBeDefined();
      expect(markers.find(m => m.type === 'decision')).toBeDefined();
      expect(markers.find(m => m.type === 'risk')).toBeDefined();
    });

    test('should parse uncertainty percentage', () => {
      const content = '[UNCERTAIN: 75%]: Might change later';
      const markers = tc.extractMarkers(content);
      expect(markers[0].confidence).toBe(75);
    });

    test('should default uncertainty to 50%', () => {
      const content = '[UNCERTAIN]: Might change';
      const markers = tc.extractMarkers(content);
      expect(markers[0].confidence).toBe(50);
    });
  });

  describe('validateFormat()', () => {
    let tc;

    beforeEach(() => {
      tc = new TemplateConstraints();
    });

    test('should validate EARS format', () => {
      expect(tc.validateFormat('When user logs in, the system shall display dashboard', 'ears')).toBe(true);
      expect(tc.validateFormat('Random text', 'ears')).toBe(false);
    });

    test('should validate C4 format', () => {
      expect(tc.validateFormat('The System Context shows external systems', 'c4')).toBe(true);
      expect(tc.validateFormat('Random text', 'c4')).toBe(false);
    });

    test('should validate ADR format', () => {
      expect(tc.validateFormat('Status: Accepted', 'adr')).toBe(true);
      expect(tc.validateFormat('Random text', 'adr')).toBe(false);
    });

    test('should validate checklist format', () => {
      expect(tc.validateFormat('- [ ] Task 1', 'checklist')).toBe(true);
      expect(tc.validateFormat('* Item', 'checklist')).toBe(true);
    });

    test('should return true for unknown format', () => {
      expect(tc.validateFormat('anything', 'unknown')).toBe(true);
    });
  });

  describe('addTemplate()', () => {
    let tc;

    beforeEach(() => {
      tc = new TemplateConstraints();
    });

    test('should add a template', () => {
      tc.addTemplate('custom', {
        name: 'Custom Template',
        sections: [{ name: 'main', required: true }]
      });
      expect(tc.templates.custom).toBeDefined();
    });

    test('should emit template-added event', () => {
      const handler = jest.fn();
      tc.on('template-added', handler);

      tc.addTemplate('custom', {
        name: 'Custom',
        sections: []
      });

      expect(handler).toHaveBeenCalled();
    });

    test('should throw on invalid template', () => {
      expect(() => tc.addTemplate('invalid', {})).toThrow('Template must have name and sections');
    });
  });

  describe('removeTemplate()', () => {
    test('should remove a template', () => {
      const tc = new TemplateConstraints();
      tc.addTemplate('custom', { name: 'Custom', sections: [] });
      expect(tc.removeTemplate('custom')).toBe(true);
      expect(tc.templates.custom).toBeUndefined();
    });

    test('should return false for unknown template', () => {
      const tc = new TemplateConstraints();
      expect(tc.removeTemplate('unknown')).toBe(false);
    });
  });

  describe('addConstraint()', () => {
    let tc;

    beforeEach(() => {
      tc = new TemplateConstraints();
    });

    test('should add a custom constraint', () => {
      tc.addConstraint('noTodos', {
        validate: (content) => ({
          valid: !content.includes('TODO'),
          message: 'No TODOs allowed'
        })
      });
      expect(tc.customConstraints.has('noTodos')).toBe(true);
    });

    test('should throw on invalid constraint', () => {
      expect(() => tc.addConstraint('bad', {})).toThrow('Constraint must have a validate function');
    });

    test('should apply custom constraint during validation', () => {
      tc.addConstraint('noTodos', {
        severity: 'error',
        validate: (content) => ({
          valid: !content.includes('TODO'),
          message: 'No TODOs allowed'
        })
      });

      const result = tc.validate('# Overview\nTODO: fix this', 'requirements');
      expect(result.errors.some(e => e.name === 'noTodos')).toBe(true);
    });
  });

  describe('getHistory()', () => {
    let tc;

    beforeEach(() => {
      tc = new TemplateConstraints();
      tc.validate('# Overview\nContent', 'requirements');
      tc.validate('# Architecture\nContent', 'design');
    });

    test('should return all history', () => {
      expect(tc.getHistory().length).toBe(2);
    });

    test('should filter by templateId', () => {
      const history = tc.getHistory({ templateId: 'requirements' });
      expect(history.length).toBe(1);
    });

    test('should filter by valid', () => {
      const history = tc.getHistory({ valid: false });
      expect(history.every(h => !h.valid)).toBe(true);
    });
  });

  describe('getStats()', () => {
    test('should return statistics', () => {
      const tc = new TemplateConstraints();
      tc.validate('# Overview\nContent', 'requirements');

      const stats = tc.getStats();
      expect(stats.total).toBe(1);
      expect(stats.templateCount).toBeGreaterThan(0);
    });

    test('should calculate by template', () => {
      const tc = new TemplateConstraints();
      tc.validate('content', 'requirements');
      tc.validate('content', 'design');

      const stats = tc.getStats();
      expect(stats.byTemplate.requirements).toBeDefined();
      expect(stats.byTemplate.design).toBeDefined();
    });
  });

  describe('listTemplates()', () => {
    test('should list all templates', () => {
      const tc = new TemplateConstraints();
      const list = tc.listTemplates();

      expect(list.length).toBeGreaterThan(0);
      expect(list[0].id).toBeDefined();
      expect(list[0].name).toBeDefined();
      expect(list[0].sections).toBeDefined();
    });
  });

  describe('clearHistory()', () => {
    test('should clear validation history', () => {
      const tc = new TemplateConstraints();
      tc.validate('content', 'requirements');
      tc.clearHistory();
      expect(tc.validationHistory.length).toBe(0);
    });
  });
});

describe('ThinkingChecklist', () => {
  describe('constructor', () => {
    test('should create with default items', () => {
      const checklist = new ThinkingChecklist();
      expect(checklist.items.length).toBeGreaterThan(0);
      expect(checklist.name).toBe('Thinking Checklist');
    });

    test('should accept custom items', () => {
      const checklist = new ThinkingChecklist({
        name: 'Custom',
        items: [{ id: 'custom', category: 'Test', text: 'Custom item' }]
      });
      expect(checklist.items.length).toBe(1);
      expect(checklist.name).toBe('Custom');
    });
  });

  describe('complete()', () => {
    let checklist;

    beforeEach(() => {
      checklist = new ThinkingChecklist();
    });

    test('should mark item as complete', () => {
      checklist.complete('understand');
      expect(checklist.completedItems.has('understand')).toBe(true);
    });

    test('should store note', () => {
      checklist.complete('understand', 'Yes, reviewed requirements');
      expect(checklist.notes.get('understand')).toBe('Yes, reviewed requirements');
    });

    test('should throw for unknown item', () => {
      expect(() => checklist.complete('unknown')).toThrow('Unknown item: unknown');
    });

    test('should emit event', () => {
      const handler = jest.fn();
      checklist.on('item-completed', handler);
      checklist.complete('understand');
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('uncomplete()', () => {
    test('should unmark item', () => {
      const checklist = new ThinkingChecklist();
      checklist.complete('understand', 'note');
      checklist.uncomplete('understand');
      expect(checklist.completedItems.has('understand')).toBe(false);
      expect(checklist.notes.has('understand')).toBe(false);
    });
  });

  describe('getProgress()', () => {
    let checklist;

    beforeEach(() => {
      checklist = new ThinkingChecklist();
    });

    test('should return progress info', () => {
      const progress = checklist.getProgress();
      expect(progress.total).toBeGreaterThan(0);
      expect(progress.completed).toBe(0);
      expect(progress.percentage).toBe(0);
      expect(progress.isComplete).toBe(false);
    });

    test('should update progress on completion', () => {
      checklist.complete('understand');
      checklist.complete('assumptions');

      const progress = checklist.getProgress();
      expect(progress.completed).toBe(2);
      expect(progress.percentage).toBeGreaterThan(0);
    });

    test('should track by category', () => {
      checklist.complete('understand');
      const progress = checklist.getProgress();
      expect(progress.byCategory.Analysis).toBeDefined();
      expect(progress.byCategory.Analysis.completed).toBeGreaterThan(0);
    });
  });

  describe('toMarkdown()', () => {
    test('should export as markdown', () => {
      const checklist = new ThinkingChecklist();
      checklist.complete('understand', 'Yes, clear requirements');

      const md = checklist.toMarkdown();
      expect(md).toContain('# Thinking Checklist');
      expect(md).toContain('[x]');
      expect(md).toContain('[ ]');
      expect(md).toContain('Note: Yes, clear requirements');
      expect(md).toContain('Progress:');
    });
  });

  describe('addItem()', () => {
    test('should add custom item', () => {
      const checklist = new ThinkingChecklist();
      const initialCount = checklist.items.length;

      checklist.addItem({ id: 'custom', text: 'Custom check' });
      expect(checklist.items.length).toBe(initialCount + 1);
    });

    test('should throw on invalid item', () => {
      const checklist = new ThinkingChecklist();
      expect(() => checklist.addItem({})).toThrow('Item must have id and text');
    });
  });

  describe('reset()', () => {
    test('should reset checklist', () => {
      const checklist = new ThinkingChecklist();
      checklist.complete('understand', 'note');
      checklist.reset();

      expect(checklist.completedItems.size).toBe(0);
      expect(checklist.notes.size).toBe(0);
    });

    test('should emit reset event', () => {
      const checklist = new ThinkingChecklist();
      const handler = jest.fn();
      checklist.on('reset', handler);
      checklist.reset();
      expect(handler).toHaveBeenCalled();
    });
  });
});

describe('createTemplateConstraints()', () => {
  test('should create instance', () => {
    const tc = createTemplateConstraints();
    expect(tc).toBeInstanceOf(TemplateConstraints);
  });

  test('should accept options', () => {
    const tc = createTemplateConstraints({ strict: true });
    expect(tc.strict).toBe(true);
  });
});

describe('createThinkingChecklist()', () => {
  test('should create instance', () => {
    const checklist = createThinkingChecklist();
    expect(checklist).toBeInstanceOf(ThinkingChecklist);
  });

  test('should accept options', () => {
    const checklist = createThinkingChecklist({ name: 'Custom' });
    expect(checklist.name).toBe('Custom');
  });
});

describe('Enums', () => {
  test('CONSTRAINT_TYPE should have all types', () => {
    expect(CONSTRAINT_TYPE.REQUIRED).toBe('required');
    expect(CONSTRAINT_TYPE.OPTIONAL).toBe('optional');
    expect(CONSTRAINT_TYPE.FORBIDDEN).toBe('forbidden');
    expect(CONSTRAINT_TYPE.CONDITIONAL).toBe('conditional');
    expect(CONSTRAINT_TYPE.PATTERN).toBe('pattern');
  });

  test('UNCERTAINTY should have all levels', () => {
    expect(UNCERTAINTY.CERTAIN).toBe('certain');
    expect(UNCERTAINTY.HIGH).toBe('high');
    expect(UNCERTAINTY.MEDIUM).toBe('medium');
    expect(UNCERTAINTY.LOW).toBe('low');
    expect(UNCERTAINTY.UNCERTAIN).toBe('uncertain');
  });

  test('MARKER_TYPE should have all types', () => {
    expect(MARKER_TYPE.ASSUMPTION).toBe('assumption');
    expect(MARKER_TYPE.DECISION).toBe('decision');
    expect(MARKER_TYPE.RISK).toBe('risk');
    expect(MARKER_TYPE.TODO).toBe('todo');
    expect(MARKER_TYPE.QUESTION).toBe('question');
  });
});

describe('DEFAULT_TEMPLATES', () => {
  test('should have requirements template', () => {
    expect(DEFAULT_TEMPLATES.requirements).toBeDefined();
    expect(DEFAULT_TEMPLATES.requirements.sections.length).toBeGreaterThan(0);
  });

  test('should have design template', () => {
    expect(DEFAULT_TEMPLATES.design).toBeDefined();
    expect(DEFAULT_TEMPLATES.design.sections.length).toBeGreaterThan(0);
  });

  test('should have implementation template', () => {
    expect(DEFAULT_TEMPLATES.implementation).toBeDefined();
    expect(DEFAULT_TEMPLATES.implementation.sections.length).toBeGreaterThan(0);
  });
});
