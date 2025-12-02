/**
 * Design Generator Tests
 * Tests C4 model and ADR generation
 */

const DesignGenerator = require('../../src/generators/design');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('DesignGenerator', () => {
  let generator;
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'musubi-test-'));
    generator = new DesignGenerator(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('generateMermaidTemplate', () => {
    test('should generate context diagram', () => {
      const template = generator.generateMermaidTemplate(
        'context',
        'System Context',
        'Shows system in environment'
      );
      expect(template).toContain('C4Context');
      expect(template).toContain('System Context');
      expect(template).toContain('Person(user');
    });

    test('should generate container diagram', () => {
      const template = generator.generateMermaidTemplate(
        'container',
        'Container View',
        'Shows containers'
      );
      expect(template).toContain('C4Container');
      expect(template).toContain('Container_Boundary');
      expect(template).toContain('Container(web');
    });

    test('should generate component diagram', () => {
      const template = generator.generateMermaidTemplate(
        'component',
        'Component View',
        'Shows components'
      );
      expect(template).toContain('C4Component');
      expect(template).toContain('Component(controller');
    });

    test('should generate code diagram', () => {
      const template = generator.generateMermaidTemplate('code', 'Code View', 'Shows classes');
      expect(template).toContain('classDiagram');
      expect(template).toContain('class Controller');
    });
  });

  describe('generatePlantUMLTemplate', () => {
    test('should generate PlantUML context diagram', () => {
      const template = generator.generatePlantUMLTemplate(
        'context',
        'System Context',
        'Shows system'
      );
      expect(template).toContain('@startuml');
      expect(template).toContain('C4_Context.puml');
      expect(template).toContain('Person(user');
    });

    test('should generate PlantUML container diagram', () => {
      const template = generator.generatePlantUMLTemplate(
        'container',
        'Container View',
        'Shows containers'
      );
      expect(template).toContain('C4_Container.puml');
      expect(template).toContain('System_Boundary');
    });
  });

  describe('generateADRNumber', () => {
    test('should generate ADR-001 for first ADR', () => {
      const content = '';
      const number = generator.generateADRNumber(content);
      expect(number).toBe('ADR-001');
    });

    test('should increment ADR numbers', () => {
      const content = `
### ADR-001: First Decision
### ADR-002: Second Decision
      `;
      const number = generator.generateADRNumber(content);
      expect(number).toBe('ADR-003');
    });

    test('should handle non-sequential ADR numbers', () => {
      const content = `
### ADR-001: First
### ADR-005: Fifth
      `;
      const number = generator.generateADRNumber(content);
      expect(number).toBe('ADR-006');
    });
  });

  describe('formatADRSection', () => {
    test('should format ADR without alternatives', () => {
      const adr = {
        title: 'Use PostgreSQL',
        status: 'accepted',
        context: 'Need relational database',
        decision: 'Use PostgreSQL',
        consequences: 'Good performance',
      };
      const section = generator.formatADRSection('ADR-001', adr);
      expect(section).toContain('### ADR-001: Use PostgreSQL');
      expect(section).toContain('**Status**: accepted');
      expect(section).toContain('**Context**:');
      expect(section).toContain('**Decision**:');
      expect(section).toContain('**Consequences**:');
    });

    test('should format ADR with alternatives', () => {
      const adr = {
        title: 'Use PostgreSQL',
        status: 'accepted',
        context: 'Need database',
        decision: 'Use PostgreSQL',
        consequences: 'Good',
        alternatives: ['MySQL', 'MongoDB'],
      };
      const section = generator.formatADRSection('ADR-001', adr);
      expect(section).toContain('**Alternatives Considered**:');
      expect(section).toContain('- MySQL');
      expect(section).toContain('- MongoDB');
    });
  });

  describe('validateDesignDocument', () => {
    test('should validate complete design document', () => {
      const content = `
## Steering Context
## Architecture Design
### C4 Model: Context Diagram
      `;
      const errors = generator.validateDesignDocument(content);
      expect(errors).toHaveLength(0);
    });

    test('should detect missing Architecture Design section', () => {
      const content = `
## Steering Context
      `;
      const errors = generator.validateDesignDocument(content);
      expect(errors).toContain('Missing Architecture Design section');
    });

    test('should detect missing Steering Context section', () => {
      const content = `
## Architecture Design
### C4 Model: Context
      `;
      const errors = generator.validateDesignDocument(content);
      expect(errors).toContain('Missing Steering Context section');
    });

    test('should detect missing C4 diagrams', () => {
      const content = `
## Steering Context
## Architecture Design
      `;
      const errors = generator.validateDesignDocument(content);
      expect(errors).toContain('Missing C4 model diagrams');
    });
  });

  describe('getC4SectionName', () => {
    test('should return correct section name for context', () => {
      expect(generator.getC4SectionName('context')).toBe('C4 Model: Context Diagram');
    });

    test('should return correct section name for container', () => {
      expect(generator.getC4SectionName('container')).toBe('C4 Model: Container Diagram');
    });

    test('should return correct section name for component', () => {
      expect(generator.getC4SectionName('component')).toBe('C4 Model: Component Diagram');
    });

    test('should return correct section name for code', () => {
      expect(generator.getC4SectionName('code')).toBe('C4 Model: Code Diagram');
    });
  });

  describe('slugify', () => {
    test('should convert to lowercase', () => {
      expect(generator.slugify('Feature Name')).toBe('feature-name');
    });

    test('should replace spaces with hyphens', () => {
      expect(generator.slugify('my feature name')).toBe('my-feature-name');
    });

    test('should remove special characters', () => {
      expect(generator.slugify('Feature@#$Name')).toBe('feature-name');
    });

    test('should trim leading/trailing hyphens', () => {
      expect(generator.slugify(' -feature- ')).toBe('feature');
    });
  });
});
