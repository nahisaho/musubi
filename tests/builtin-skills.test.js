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
  registerBuiltInSkills,
  getBuiltInSkills,
} = require('../src/orchestration/builtin-skills');

const { SkillRegistry, SkillCategory } = require('../src/orchestration/skill-registry');
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

describe('Built-in Skills', () => {
  describe('getBuiltInSkills', () => {
    it('should return all 5 built-in skills', () => {
      const skills = getBuiltInSkills();
      expect(skills).toHaveLength(5);
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
  });

  describe('registerBuiltInSkills', () => {
    it('should register all skills to registry', () => {
      const registry = new SkillRegistry();
      const count = registerBuiltInSkills(registry);
      expect(count).toBe(5);
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
