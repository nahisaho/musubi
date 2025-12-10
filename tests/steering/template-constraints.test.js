/**
 * Tests for Template Constraints Module
 */

const {
  Constraint,
  ChecklistItem,
  Checklist,
  UncertaintyParser,
  TemplateSection,
  TemplateDefinition,
  ConstraintType,
  UncertaintyMarker,
  Severity,
  createTemplateConstraintEngine
} = require('../../src/steering/template-constraints');

describe('Template Constraints', () => {
  describe('Constraint', () => {
    test('should create constraint with defaults', () => {
      const constraint = new Constraint({ name: 'test' });

      expect(constraint.name).toBe('test');
      expect(constraint.type).toBe(ConstraintType.REQUIRED);
      expect(constraint.severity).toBe(Severity.ERROR);
    });

    test('should validate with custom validator', () => {
      const constraint = new Constraint({
        name: 'min-length',
        validator: (value) => value.length >= 10 || 'Too short'
      });

      const valid = constraint.validate('this is long enough');
      expect(valid.valid).toBe(true);

      const invalid = constraint.validate('short');
      expect(invalid.valid).toBe(false);
      expect(invalid.message).toBe('Too short');
    });

    test('should handle validator errors', () => {
      const constraint = new Constraint({
        name: 'error-test',
        validator: () => { throw new Error('Test error'); }
      });

      const result = constraint.validate('test');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('ChecklistItem', () => {
    test('should create checklist item', () => {
      const item = new ChecklistItem('Test item');

      expect(item.text).toBe('Test item');
      expect(item.required).toBe(true);
      expect(item.checked).toBe(false);
    });

    test('should check and uncheck item', () => {
      const item = new ChecklistItem('Test');

      item.check();
      expect(item.checked).toBe(true);

      item.uncheck();
      expect(item.checked).toBe(false);
    });

    test('should validate required item', () => {
      const item = new ChecklistItem('Required item');

      expect(item.validate().valid).toBe(false);

      item.check();
      expect(item.validate().valid).toBe(true);
    });

    test('should validate optional item', () => {
      const item = new ChecklistItem('Optional item', { required: false });

      expect(item.validate().valid).toBe(true);
    });

    test('should respect conditions', () => {
      const item = new ChecklistItem('Conditional', {
        condition: (ctx) => ctx.showItem === true
      });

      expect(item.isApplicable({ showItem: false })).toBe(false);
      expect(item.isApplicable({ showItem: true })).toBe(true);
    });

    test('should check dependencies', () => {
      const item = new ChecklistItem('Dependent', {
        dependencies: ['first-item']
      });

      const context = {
        checklist: {
          'first-item': { checked: false }
        }
      };

      const result = item.validate(context);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('first-item');
    });
  });

  describe('Checklist', () => {
    let checklist;

    beforeEach(() => {
      checklist = new Checklist('Test Checklist');
    });

    test('should create checklist', () => {
      expect(checklist.name).toBe('Test Checklist');
      expect(checklist.items.size).toBe(0);
    });

    test('should add and get items', () => {
      checklist.addItem('item-1', 'First item');
      checklist.addItem('item-2', 'Second item');

      expect(checklist.items.size).toBe(2);
      expect(checklist.getItem('item-1').text).toBe('First item');
    });

    test('should check items by id', () => {
      checklist.addItem('item-1', 'First item');
      checklist.check('item-1');

      expect(checklist.getItem('item-1').checked).toBe(true);
    });

    test('should count checked items', () => {
      checklist.addItem('item-1', 'First item');
      checklist.addItem('item-2', 'Second item');
      checklist.addItem('item-3', 'Third item');

      checklist.check('item-1');
      checklist.check('item-3');

      expect(checklist.getCheckedCount()).toBe(2);
    });

    test('should validate minimum required', () => {
      const minChecklist = new Checklist('Min', { minRequired: 2 });
      minChecklist.addItem('1', 'One', { required: false });
      minChecklist.addItem('2', 'Two', { required: false });
      minChecklist.addItem('3', 'Three', { required: false });

      minChecklist.check('1');
      const result = minChecklist.validate();

      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain('At least 2');
    });

    test('should validate maximum allowed', () => {
      const maxChecklist = new Checklist('Max', { maxAllowed: 1 });
      maxChecklist.addItem('1', 'One', { required: false });
      maxChecklist.addItem('2', 'Two', { required: false });

      maxChecklist.check('1');
      maxChecklist.check('2');
      const result = maxChecklist.validate();

      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain('At most 1');
    });

    test('should generate markdown', () => {
      checklist.addItem('item-1', 'First item');
      checklist.addItem('item-2', 'Second item');
      checklist.check('item-1');

      const md = checklist.toMarkdown();

      expect(md).toContain('## Test Checklist');
      expect(md).toContain('[x] First item');
      expect(md).toContain('[ ] Second item');
    });

    test('should parse from markdown', () => {
      const md = `## Review Checklist

- [x] First item complete
- [ ] Second item pending
- [ ] Third item (optional)
`;

      const parsed = Checklist.fromMarkdown(md);

      expect(parsed.name).toBe('Review Checklist');
      expect(parsed.items.size).toBe(3);
      expect(parsed.getItem('first-item-complete').checked).toBe(true);
      expect(parsed.getItem('second-item-pending').checked).toBe(false);
    });
  });

  describe('UncertaintyParser', () => {
    let parser;

    beforeEach(() => {
      parser = new UncertaintyParser();
    });

    test('should parse unknown markers', () => {
      const content = 'The value is {?unknown value?} here';
      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('unknown');
      expect(result[0].value).toBe('unknown value');
    });

    test('should parse estimate markers', () => {
      const content = 'Takes {~2-3 hours~} to complete';
      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('estimate');
      expect(result[0].value).toBe('2-3 hours');
    });

    test('should parse placeholder markers', () => {
      const content = 'Replace {#PROJECT_NAME#} with actual name';
      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('placeholder');
      expect(result[0].value).toBe('PROJECT_NAME');
    });

    test('should parse todo markers', () => {
      const content = '{!TODO: Add description!}';
      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('todo');
    });

    test('should parse review markers', () => {
      const content = '{@Needs review: API design@}';
      const result = parser.parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('review');
    });

    test('should parse multiple markers', () => {
      const content = '{?unknown?} and {~estimate~} and {!todo!}';
      const result = parser.parse(content);

      expect(result).toHaveLength(3);
    });

    test('should detect unresolved content', () => {
      expect(parser.hasUnresolved('{?test?}')).toBe(true);
      expect(parser.hasUnresolved('no markers')).toBe(false);
    });

    test('should count unresolved', () => {
      const content = '{?a?} {~b~} {!c!}';
      expect(parser.getUnresolvedCount(content)).toBe(3);
    });

    test('should highlight uncertainties', () => {
      const content = 'Value: {?unknown?}';
      const highlighted = parser.highlight(content);

      expect(highlighted).toContain('**[UNKNOWN: unknown]**');
    });

    test('should resolve uncertainties', () => {
      const content = 'Name: {?name?}, Time: {~time~}';
      const resolved = parser.resolve(content, {
        name: 'MUSUBI',
        time: '1 hour'
      });

      expect(resolved).toContain('MUSUBI');
      expect(resolved).toContain('1 hour');
    });
  });

  describe('TemplateSection', () => {
    test('should create section with options', () => {
      const section = new TemplateSection('Overview', {
        required: true,
        minLength: 50
      });

      expect(section.name).toBe('Overview');
      expect(section.required).toBe(true);
      expect(section.minLength).toBe(50);
    });

    test('should validate required section', () => {
      const section = new TemplateSection('Required', { required: true });

      const result = section.validate('');
      expect(result.valid).toBe(false);
      expect(result.issues[0].constraint).toBe('required');
    });

    test('should validate minLength', () => {
      const section = new TemplateSection('Long', { minLength: 100 });

      const result = section.validate('short');
      expect(result.valid).toBe(true); // Warning only
      expect(result.issues[0].constraint).toBe('minLength');
    });

    test('should validate maxLength', () => {
      const section = new TemplateSection('Short', { maxLength: 10 });

      const result = section.validate('this is too long for the limit');
      expect(result.issues[0].constraint).toBe('maxLength');
    });

    test('should validate pattern', () => {
      const section = new TemplateSection('Version', {
        pattern: /^\d+\.\d+\.\d+$/
      });

      expect(section.validate('1.0.0').valid).toBe(true);
      expect(section.validate('invalid').valid).toBe(false);
    });

    test('should check dependencies', () => {
      const section = new TemplateSection('Details', {
        dependencies: ['Overview']
      });

      const result = section.validate('content', {
        sections: { Overview: null }
      });

      expect(result.issues.some(i => i.constraint === 'dependency')).toBe(true);
    });

    test('should run custom constraints', () => {
      const section = new TemplateSection('Custom');
      section.addConstraint(new Constraint({
        name: 'no-foo',
        validator: (v) => !v.includes('foo') || 'Contains foo'
      }));

      const result = section.validate('has foo in it');
      expect(result.issues.some(i => i.constraint === 'no-foo')).toBe(true);
    });
  });

  describe('TemplateDefinition', () => {
    let template;

    beforeEach(() => {
      template = new TemplateDefinition('Test Template', {
        version: '1.0.0',
        description: 'A test template'
      });
    });

    test('should create template', () => {
      expect(template.name).toBe('Test Template');
      expect(template.version).toBe('1.0.0');
    });

    test('should add sections', () => {
      template.addSection('Overview', { required: true });
      template.addSection('Details', { required: false });

      expect(template.sections.size).toBe(2);
      expect(template.getSection('Overview').required).toBe(true);
    });

    test('should add checklists', () => {
      const checklist = template.addChecklist('Review');
      checklist.addItem('item-1', 'First check');

      expect(template.checklists.size).toBe(1);
      expect(template.getChecklist('Review')).toBeDefined();
    });

    test('should validate document', () => {
      template.addSection('Title', { required: true });
      template.addSection('Body', { required: true });

      const doc = {
        sections: {
          Title: 'My Title',
          Body: 'My content here'
        }
      };

      const result = template.validate(doc);
      expect(result.valid).toBe(true);
    });

    test('should fail validation on missing sections', () => {
      template.addSection('Required', { required: true });

      const result = template.validate({ sections: {} });
      expect(result.valid).toBe(false);
    });

    test('should validate checklists', () => {
      const checklist = template.addChecklist('Tasks');
      checklist.addItem('task-1', 'Complete task');

      const doc = {
        sections: {},
        checklists: {
          Tasks: { 'task-1': false }
        }
      };

      const result = template.validate(doc);
      expect(result.valid).toBe(false);
      expect(result.checklists[0].issues.length).toBeGreaterThan(0);
    });

    test('should run global constraints', () => {
      template.addGlobalConstraint(new Constraint({
        name: 'has-version',
        validator: (doc) => doc.version != null || 'Version required'
      }));

      const result = template.validate({ sections: {} });
      expect(result.global[0].valid).toBe(false);
    });
  });

  describe('TemplateConstraintEngine', () => {
    let engine;

    beforeEach(() => {
      engine = createTemplateConstraintEngine();
    });

    test('should create engine with steering templates', () => {
      expect(engine.templates.has('Structure')).toBe(true);
      expect(engine.templates.has('Tech')).toBe(true);
      expect(engine.templates.has('Product')).toBe(true);
    });

    test('should register custom templates', () => {
      const custom = new TemplateDefinition('Custom');
      engine.registerTemplate(custom);

      expect(engine.getTemplate('Custom')).toBe(custom);
    });

    test('should parse document', () => {
      const content = `# Doc

## Overview
This is the overview section.

## Features
- [x] Feature 1
- [ ] Feature 2
`;

      const doc = engine.parseDocument(content);

      expect(doc.sections['Overview']).toContain('overview section');
      expect(doc.sections['Features']).toBeDefined();
      expect(doc.checklists['Features']['feature-1']).toBe(true);
      expect(doc.checklists['Features']['feature-2']).toBe(false);
    });

    test('should parse uncertainties', () => {
      const content = 'Value is {?unknown?} and {~estimate~}';
      const doc = engine.parseDocument(content);

      expect(doc.uncertainties).toHaveLength(2);
    });

    test('should validate against template', () => {
      const result = engine.validate('Structure', {
        sections: {
          Overview: 'This is a detailed overview of the project structure and architecture.',
          Directories: '- src/\n- tests/',
          Architecture: 'Clean architecture pattern'
        },
        checklists: {
          'Review Checklist': {
            'dirs-documented': true,
            'architecture-clear': true,
            'dependencies-listed': true
          }
        }
      });

      expect(result.valid).toBe(true);
    });

    test('should fail validation on missing template', () => {
      const result = engine.validate('NonExistent', {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('should enforce strict mode', () => {
      const strictEngine = createTemplateConstraintEngine({ strict: true });

      const doc = {
        sections: {
          Overview: 'Overview with {?unknown?} value',
          Directories: 'dirs',
          Architecture: 'arch'
        },
        uncertainties: [{ type: 'unknown', value: 'unknown' }]
      };

      const result = strictEngine.validate('Structure', doc);
      expect(result.valid).toBe(false);
      expect(result.uncertainties).toBeDefined();
    });

    test('should generate template document', () => {
      const content = engine.generate('Structure', {
        sections: {
          Overview: 'My project overview'
        }
      });

      expect(content).toContain('# Structure');
      expect(content).toContain('## Overview');
      expect(content).toContain('My project overview');
      expect(content).toContain('{!TODO:'); // Required unfilled section
    });

    test('should emit events on validation', (done) => {
      engine.on('validated', (event) => {
        expect(event.template).toBe('Structure');
        done();
      });

      engine.validate('Structure', { sections: {} });
    });

    test('should emit events on template registration', (done) => {
      engine.on('template:registered', (name) => {
        expect(name).toBe('NewTemplate');
        done();
      });

      engine.registerTemplate(new TemplateDefinition('NewTemplate'));
    });
  });

  describe('Constants', () => {
    test('should export ConstraintType', () => {
      expect(ConstraintType.REQUIRED).toBe('required');
      expect(ConstraintType.OPTIONAL).toBe('optional');
      expect(ConstraintType.CONDITIONAL).toBe('conditional');
      expect(ConstraintType.CHOICE).toBe('choice');
    });

    test('should export UncertaintyMarker', () => {
      expect(UncertaintyMarker.UNKNOWN).toBe('?');
      expect(UncertaintyMarker.ESTIMATE).toBe('~');
      expect(UncertaintyMarker.PLACEHOLDER).toBe('#');
      expect(UncertaintyMarker.TODO).toBe('!');
      expect(UncertaintyMarker.REVIEW).toBe('@');
    });

    test('should export Severity', () => {
      expect(Severity.ERROR).toBe('error');
      expect(Severity.WARNING).toBe('warning');
      expect(Severity.INFO).toBe('info');
      expect(Severity.HINT).toBe('hint');
    });
  });
});
