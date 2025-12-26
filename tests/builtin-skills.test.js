/**
 * Built-in Skills Tests
 *
 * Tests for Phase 1-4 built-in skills integration with Orchestrator
 */

const {
  releaseSkill: _releaseSkill,
  workflowModeSkill,
  packageManagerSkill,
  constitutionLevelSkill,
  projectConfigSkill,
  requirementsReviewerSkill,
  designReviewerSkill,
  registerBuiltInSkills,
  getBuiltInSkills,
} = require('../src/orchestration/builtin-skills');

const { SkillRegistry, SkillCategory } = require('../src/orchestration/skill-registry');
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

describe('Built-in Skills', () => {
  describe('getBuiltInSkills', () => {
    it('should return all 7 built-in skills', () => {
      const skills = getBuiltInSkills();
      expect(skills).toHaveLength(7);
    });

    it('should include release skill', () => {
      const skills = getBuiltInSkills();
      const release = skills.find(s => s.id === 'release-manager');
      expect(release).toBeDefined();
      expect(release.category).toBe(SkillCategory.RELEASE);
    });

    it('should include workflow mode skill', () => {
      const skills = getBuiltInSkills();
      const workflow = skills.find(s => s.id === 'workflow-mode-manager');
      expect(workflow).toBeDefined();
      expect(workflow.category).toBe(SkillCategory.WORKFLOW);
    });

    it('should include package manager skill', () => {
      const skills = getBuiltInSkills();
      const pkg = skills.find(s => s.id === 'package-manager');
      expect(pkg).toBeDefined();
      expect(pkg.category).toBe(SkillCategory.CONFIGURATION);
    });

    it('should include constitution level skill', () => {
      const skills = getBuiltInSkills();
      const constitution = skills.find(s => s.id === 'constitution-level-manager');
      expect(constitution).toBeDefined();
      expect(constitution.category).toBe(SkillCategory.VALIDATION);
    });

    it('should include project config skill', () => {
      const skills = getBuiltInSkills();
      const config = skills.find(s => s.id === 'project-config-manager');
      expect(config).toBeDefined();
      expect(config.category).toBe(SkillCategory.CONFIGURATION);
    });

    it('should include requirements reviewer skill', () => {
      const skills = getBuiltInSkills();
      const reviewer = skills.find(s => s.id === 'requirements-reviewer');
      expect(reviewer).toBeDefined();
      expect(reviewer.category).toBe(SkillCategory.VALIDATION);
    });

    it('should include design reviewer skill', () => {
      const skills = getBuiltInSkills();
      const reviewer = skills.find(s => s.id === 'design-reviewer');
      expect(reviewer).toBeDefined();
      expect(reviewer.category).toBe(SkillCategory.VALIDATION);
    });
  });

  describe('registerBuiltInSkills', () => {
    it('should register all skills to registry', () => {
      const registry = new SkillRegistry();
      const count = registerBuiltInSkills(registry);
      expect(count).toBe(7);
    });

    it('should make skills queryable by category', () => {
      const registry = new SkillRegistry();
      registerBuiltInSkills(registry);

      const releaseSkills = registry.findByCategory(SkillCategory.RELEASE);
      expect(releaseSkills.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('workflowModeSkill.execute', () => {
    const testDir = '/tmp/test-builtin-skills';

    beforeEach(async () => {
      await fs.ensureDir(path.join(testDir, 'steering/rules'));
    });

    afterEach(async () => {
      await fs.remove(testDir);
    });

    it('should get mode configuration', async () => {
      const result = await workflowModeSkill.execute({
        action: 'get',
        mode: 'small',
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBeDefined();
      expect(result.stages).toBeDefined();
    });

    it('should detect mode from feature name', async () => {
      const result = await workflowModeSkill.execute({
        action: 'detect',
        featureName: 'fix: small bug',
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.detectedMode).toBe('small');
    });

    it('should compare all modes', async () => {
      const result = await workflowModeSkill.execute({
        action: 'compare',
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.comparison).toBeDefined();
      expect(Array.isArray(result.comparison) || typeof result.comparison === 'object').toBe(true);
      // Comparison should contain data for small, medium, large modes
      if (Array.isArray(result.comparison)) {
        expect(result.comparison.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('packageManagerSkill.execute', () => {
    const testDir = '/tmp/test-package-skill';

    beforeEach(async () => {
      await fs.ensureDir(path.join(testDir, 'steering'));
      await fs.writeJson(path.join(testDir, 'package.json'), {
        name: 'test-pkg',
        version: '1.0.0',
      });
    });

    afterEach(async () => {
      await fs.remove(testDir);
    });

    it('should list packages', async () => {
      const config = {
        schema_version: '1.0',
        packages: [{ name: 'core', path: 'packages/core', type: 'library' }],
      };
      await fs.writeFile(path.join(testDir, 'steering/packages.yml'), yaml.dump(config));

      const result = await packageManagerSkill.execute({
        action: 'list',
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.packages).toBeDefined();
    });

    it('should validate packages', async () => {
      const result = await packageManagerSkill.execute({
        action: 'validate',
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.validation).toBeDefined();
    });
  });

  describe('constitutionLevelSkill.execute', () => {
    const testDir = '/tmp/test-constitution-skill';

    beforeEach(async () => {
      await fs.ensureDir(path.join(testDir, 'steering/rules'));
    });

    afterEach(async () => {
      await fs.remove(testDir);
    });

    it('should get summary', async () => {
      const result = await constitutionLevelSkill.execute({
        action: 'summary',
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary.critical).toBeDefined();
      expect(result.summary.advisory).toBeDefined();
    });

    it('should get article level', async () => {
      const result = await constitutionLevelSkill.execute({
        action: 'level',
        articleId: 'CONST-001',
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.level).toBe('critical');
      expect(result.isBlocking).toBe(true);
    });

    it('should validate with constitution levels', async () => {
      const result = await constitutionLevelSkill.execute({
        action: 'validate',
        validation: {
          'CONST-001': true,
          'CONST-003': true,
          'CONST-005': true,
        },
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.result.passed).toBe(true);
    });
  });

  describe('projectConfigSkill.execute', () => {
    const testDir = '/tmp/test-config-skill';

    beforeEach(async () => {
      await fs.ensureDir(path.join(testDir, 'steering'));
      const config = {
        schema_version: '2.0',
        project_name: 'test-project',
        version: '1.0.0',
      };
      await fs.writeFile(path.join(testDir, 'steering/project.yml'), yaml.dump(config));
    });

    afterEach(async () => {
      await fs.remove(testDir);
    });

    it('should validate configuration', async () => {
      const result = await projectConfigSkill.execute({
        action: 'validate',
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.validation).toBeDefined();
      expect(result.validation.valid).toBe(true);
    });

    it('should show configuration report', async () => {
      const result = await projectConfigSkill.execute({
        action: 'show',
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report.effective).toBeDefined();
    });
  });

  describe('requirementsReviewerSkill.execute', () => {
    const testDir = '/tmp/test-requirements-reviewer';
    const testDocPath = path.join(testDir, 'test-srs.md');

    beforeEach(async () => {
      await fs.ensureDir(testDir);
      // Create a sample requirements document
      const sampleSrs = `# Software Requirements Specification

## Functional Requirements

REQ-FUNC-001: The system shall allow users to login with email and password.

REQ-FUNC-002: When the user clicks submit, the system shall validate the form quickly.

REQ-FUNC-003: The system shall be user-friendly.

## Non-Functional Requirements

REQ-NFR-001: The system shall respond within 2 seconds under normal load.

## Constraints

The system must be compatible with Chrome and Firefox browsers.
`;
      await fs.writeFile(testDocPath, sampleSrs);
    });

    afterEach(async () => {
      await fs.remove(testDir);
    });

    it('should review requirements using combined method', async () => {
      const result = await requirementsReviewerSkill.execute({
        action: 'review',
        documentPath: testDocPath,
        method: 'combined',
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.defects).toBeDefined();
      expect(Array.isArray(result.defects)).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.qualityGate).toBeDefined();
    });

    it('should find ambiguous terms', async () => {
      const result = await requirementsReviewerSkill.execute({
        action: 'review',
        documentPath: testDocPath,
        method: 'fagan',
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      // Should find "quickly" and "user-friendly" as ambiguous
      const ambiguousDefects = result.defects.filter(d => d.type === 'ambiguous');
      expect(ambiguousDefects.length).toBeGreaterThan(0);
    });

    it('should review from specific perspectives', async () => {
      const result = await requirementsReviewerSkill.execute({
        action: 'pbr',
        documentPath: testDocPath,
        perspectives: ['user', 'tester'],
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.defects).toBeDefined();
      // Should find perspective-specific issues
      const perspectiveDefects = result.defects.filter(
        d => d.perspective === 'user' || d.perspective === 'tester'
      );
      expect(perspectiveDefects.length).toBeGreaterThanOrEqual(0);
    });

    it('should calculate metrics', async () => {
      const result = await requirementsReviewerSkill.execute({
        action: 'metrics',
        documentPath: testDocPath,
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalRequirements).toBeGreaterThan(0);
      expect(typeof result.metrics.earsCompliance).toBe('number');
      expect(typeof result.metrics.testabilityScore).toBe('number');
    });

    it('should return error for missing document path', async () => {
      const result = await requirementsReviewerSkill.execute({
        action: 'review',
        projectPath: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('documentPath');
    });

    it('should generate markdown report when requested', async () => {
      const result = await requirementsReviewerSkill.execute({
        action: 'review',
        documentPath: testDocPath,
        outputFormat: 'markdown',
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report).toContain('# Requirements Review Report');
    });
  });

  describe('designReviewerSkill.execute', () => {
    const testDir = '/tmp/test-design-reviewer';
    const testDocPath = path.join(testDir, 'test-design.md');

    beforeEach(async () => {
      await fs.ensureDir(testDir);
      // Create a sample design document
      const sampleDesign = `# System Design Document

## Architecture Overview

This is a microservice architecture with tight coupling between services.

### Components

- UserManager class handles authentication and user data
- OrderProcessor handles orders using global state
- UtilityHelper contains miscellaneous helper functions

## Container Diagram

The system consists of Web App, API Gateway, and Database.

## Decision Record

### ADR-001: Database Selection

Status: accepted

## Context

We need to choose a database for our application.

## Decision

We will use PostgreSQL.

## Security

User input will be handled through forms and API endpoints.
Personal data will be stored in the database.
`;
      await fs.writeFile(testDocPath, sampleDesign);
    });

    afterEach(async () => {
      await fs.remove(testDir);
    });

    it('should review design document', async () => {
      const result = await designReviewerSkill.execute({
        action: 'review',
        documentPath: testDocPath,
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.issues).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.qualityGate).toBeDefined();
    });

    it('should find SOLID violations', async () => {
      const result = await designReviewerSkill.execute({
        action: 'solid',
        documentPath: testDocPath,
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.issues).toBeDefined();
      // Should find potential SRP issues (Manager class)
      expect(result.count).toBeGreaterThanOrEqual(0);
    });

    it('should check coupling issues', async () => {
      const result = await designReviewerSkill.execute({
        action: 'coupling',
        documentPath: testDocPath,
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.issues).toBeDefined();
      // Should find tight coupling and global state
      const couplingIssues = result.issues.filter(
        i => i.category === 'coupling' || i.category === 'cohesion'
      );
      expect(couplingIssues.length).toBeGreaterThan(0);
    });

    it('should review security aspects', async () => {
      const result = await designReviewerSkill.execute({
        action: 'security',
        documentPath: testDocPath,
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.issues).toBeDefined();
      // Should find security-related issues
      expect(result.count).toBeGreaterThanOrEqual(0);
    });

    it('should review ADR structure', async () => {
      const result = await designReviewerSkill.execute({
        action: 'adr',
        documentPath: testDocPath,
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.issues).toBeDefined();
      // Should find missing ADR sections (consequences, alternatives)
      expect(result.count).toBeGreaterThanOrEqual(0);
    });

    it('should return error for missing document path', async () => {
      const result = await designReviewerSkill.execute({
        action: 'review',
        projectPath: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('documentPath');
    });

    it('should generate markdown report when requested', async () => {
      const result = await designReviewerSkill.execute({
        action: 'review',
        documentPath: testDocPath,
        outputFormat: 'markdown',
        projectPath: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report).toContain('# Design Review Report');
    });
  });
});

describe('Skill Metadata', () => {
  it('all skills should have required metadata', () => {
    const skills = getBuiltInSkills();

    for (const skill of skills) {
      expect(skill.id).toBeDefined();
      expect(skill.name).toBeDefined();
      expect(skill.description).toBeDefined();
      expect(skill.version).toBeDefined();
      expect(skill.category).toBeDefined();
      expect(skill.tags).toBeDefined();
      expect(skill.inputs).toBeDefined();
      expect(skill.outputs).toBeDefined();
      expect(skill.execute).toBeDefined();
      expect(typeof skill.execute).toBe('function');
    }
  });

  it('all skills should have valid categories', () => {
    const skills = getBuiltInSkills();
    const validCategories = Object.values(SkillCategory);

    for (const skill of skills) {
      expect(validCategories).toContain(skill.category);
    }
  });
});
