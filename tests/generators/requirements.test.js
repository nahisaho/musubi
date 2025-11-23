/**
 * Requirements Generator Tests
 * Tests EARS pattern generation and validation
 */

const RequirementsGenerator = require('../../src/generators/requirements');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('RequirementsGenerator', () => {
  let generator;
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'musubi-test-'));
    generator = new RequirementsGenerator(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('generateRequirementId', () => {
    test('should generate REQ-XXX-001 for first requirement', () => {
      const content = '';
      const id = generator.generateRequirementId(content, 'FEATURE');
      expect(id).toBe('REQ-FEATURE-001');
    });

    test('should increment requirement IDs', () => {
      const content = `
### REQ-FEATURE-001: First requirement
### REQ-FEATURE-002: Second requirement
      `;
      const id = generator.generateRequirementId(content, 'FEATURE');
      expect(id).toBe('REQ-FEATURE-003');
    });

    test('should handle non-sequential IDs', () => {
      const content = `
### REQ-FEATURE-001: First
### REQ-FEATURE-005: Fifth
      `;
      const id = generator.generateRequirementId(content, 'FEATURE');
      expect(id).toBe('REQ-FEATURE-006');
    });
  });

  describe('generateEARSStatement', () => {
    test('should generate ubiquitous pattern', () => {
      const data = {
        pattern: 'ubiquitous',
        system: 'system',
        response: 'process user input'
      };
      const statement = generator.generateEARSStatement(data);
      expect(statement).toBe('The system SHALL process user input.');
    });

    test('should generate event-driven pattern', () => {
      const data = {
        pattern: 'event',
        system: 'system',
        statement: 'user clicks submit button',
        response: 'validate form data'
      };
      const statement = generator.generateEARSStatement(data);
      expect(statement).toBe('WHEN user clicks submit button, THEN the system SHALL validate form data.');
    });

    test('should generate state-driven pattern', () => {
      const data = {
        pattern: 'state',
        system: 'system',
        statement: 'offline mode is active',
        response: 'queue changes locally'
      };
      const statement = generator.generateEARSStatement(data);
      expect(statement).toBe('WHILE offline mode is active, the system SHALL queue changes locally.');
    });

    test('should generate unwanted behavior pattern', () => {
      const data = {
        pattern: 'unwanted',
        system: 'system',
        statement: 'network connection fails',
        response: 'display error message'
      };
      const statement = generator.generateEARSStatement(data);
      expect(statement).toBe('IF network connection fails, THEN the system SHALL display error message.');
    });

    test('should generate optional feature pattern', () => {
      const data = {
        pattern: 'optional',
        system: 'system',
        statement: 'dark mode is enabled',
        response: 'use dark color scheme'
      };
      const statement = generator.generateEARSStatement(data);
      expect(statement).toBe('WHERE dark mode is enabled, the system SHALL use dark color scheme.');
    });

    test('should throw error for unknown pattern', () => {
      const data = {
        pattern: 'invalid',
        system: 'system',
        response: 'do something'
      };
      expect(() => generator.generateEARSStatement(data)).toThrow('Unknown EARS pattern: invalid');
    });
  });

  describe('detectEARSPattern', () => {
    test('should detect event-driven pattern', () => {
      const statement = 'WHEN user clicks, THEN system SHALL respond.';
      expect(generator.detectEARSPattern(statement)).toBe('event');
    });

    test('should detect state-driven pattern', () => {
      const statement = 'WHILE condition is true, system SHALL act.';
      expect(generator.detectEARSPattern(statement)).toBe('state');
    });

    test('should detect unwanted behavior pattern', () => {
      const statement = 'IF error occurs, THEN system SHALL handle it.';
      expect(generator.detectEARSPattern(statement)).toBe('unwanted');
    });

    test('should detect optional feature pattern', () => {
      const statement = 'WHERE feature is enabled, system SHALL use it.';
      expect(generator.detectEARSPattern(statement)).toBe('optional');
    });

    test('should detect ubiquitous pattern', () => {
      const statement = 'The system SHALL validate inputs.';
      expect(generator.detectEARSPattern(statement)).toBe('ubiquitous');
    });

    test('should return unknown for invalid pattern', () => {
      const statement = 'This is not a valid EARS pattern.';
      expect(generator.detectEARSPattern(statement)).toBe('unknown');
    });
  });

  describe('validateEARSFormat', () => {
    test('should validate correct ubiquitous requirement', () => {
      const req = {
        id: 'REQ-TEST-001',
        statement: 'The system SHALL validate user input.',
        pattern: 'ubiquitous'
      };
      const errors = generator.validateEARSFormat(req);
      expect(errors).toHaveLength(0);
    });

    test('should detect missing SHALL keyword', () => {
      const req = {
        id: 'REQ-TEST-001',
        statement: 'The system will validate input.',
        pattern: 'ubiquitous'
      };
      const errors = generator.validateEARSFormat(req);
      expect(errors).toContain('Missing SHALL keyword');
    });

    test('should validate event-driven pattern structure', () => {
      const req = {
        id: 'REQ-TEST-001',
        statement: 'WHEN user clicks the submit button, THEN system SHALL respond with confirmation.',
        pattern: 'event'
      };
      const errors = generator.validateEARSFormat(req);
      expect(errors).toHaveLength(0);
    });

    test('should detect invalid event-driven pattern', () => {
      const req = {
        id: 'REQ-TEST-001',
        statement: 'User clicks and system SHALL respond.',
        pattern: 'event'
      };
      const errors = generator.validateEARSFormat(req);
      expect(errors.length).toBeGreaterThan(0);
    });

    test('should detect unknown pattern', () => {
      const req = {
        id: 'REQ-TEST-001',
        statement: 'Invalid statement.',
        pattern: 'unknown'
      };
      const errors = generator.validateEARSFormat(req);
      expect(errors).toContain('Unknown EARS pattern');
    });
  });

  describe('formatRequirementSection', () => {
    test('should format requirement without criteria', () => {
      const section = generator.formatRequirementSection(
        'REQ-TEST-001',
        'Test Requirement',
        'The system SHALL do something.',
        []
      );
      expect(section).toContain('### REQ-TEST-001: Test Requirement');
      expect(section).toContain('The system SHALL do something.');
    });

    test('should format requirement with criteria', () => {
      const section = generator.formatRequirementSection(
        'REQ-TEST-001',
        'Test Requirement',
        'The system SHALL do something.',
        ['Criterion 1', 'Criterion 2']
      );
      expect(section).toContain('**Acceptance Criteria:**');
      expect(section).toContain('- Criterion 1');
      expect(section).toContain('- Criterion 2');
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
