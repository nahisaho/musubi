/**
 * Tests for Example Projects & Launch
 */

const {
  ProjectType,
  FrameworkPreset,
  LaunchCategory,
  ProjectTemplate,
  ProjectCatalog,
  LaunchChecklist,
  ReleaseManager,
  createProjectTemplate,
  createProjectCatalog,
  createLaunchChecklist,
  createReleaseManager
} = require('../../src/integrations/examples');

describe('Example Projects & Launch', () => {
  describe('ProjectType Constants', () => {
    it('should have 8 project types', () => {
      expect(Object.keys(ProjectType).length).toBe(8);
    });

    it('should include common types', () => {
      expect(ProjectType.WEB_APP).toBe('web-app');
      expect(ProjectType.API_SERVER).toBe('api-server');
      expect(ProjectType.CLI_TOOL).toBe('cli-tool');
    });
  });

  describe('FrameworkPreset Constants', () => {
    it('should have 9 framework presets', () => {
      expect(Object.keys(FrameworkPreset).length).toBe(9);
    });

    it('should include popular frameworks', () => {
      expect(FrameworkPreset.REACT).toBe('react');
      expect(FrameworkPreset.EXPRESS).toBe('express');
      expect(FrameworkPreset.NEXTJS).toBe('nextjs');
    });
  });

  describe('LaunchCategory Constants', () => {
    it('should have 8 categories', () => {
      expect(Object.keys(LaunchCategory).length).toBe(8);
    });
  });

  describe('ProjectTemplate', () => {
    let template;

    beforeEach(() => {
      template = new ProjectTemplate({
        id: 'test-project',
        name: 'Test Project',
        description: 'A test project',
        type: ProjectType.API_SERVER,
        framework: FrameworkPreset.EXPRESS
      });
    });

    it('should create template with options', () => {
      expect(template.id).toBe('test-project');
      expect(template.name).toBe('Test Project');
      expect(template.type).toBe(ProjectType.API_SERVER);
    });

    it('should add files', () => {
      template.addFile('src/index.js', 'console.log("hello")');
      expect(template.files.has('src/index.js')).toBe(true);
    });

    it('should add dependencies', () => {
      template.addDependency('express', '^4.18.0');
      expect(template.dependencies.express).toBe('^4.18.0');
    });

    it('should add dev dependencies', () => {
      template.addDevDependency('nodemon', '^3.0.0');
      expect(template.devDependencies.nodemon).toBe('^3.0.0');
    });

    it('should add scripts', () => {
      template.addScript('dev', 'nodemon src/index.js');
      expect(template.scripts.dev).toBe('nodemon src/index.js');
    });

    it('should generate package.json', () => {
      template.addDependency('express', '^4.18.0');
      const pkg = template.generatePackageJson();
      
      expect(pkg.name).toBe('test-project');
      expect(pkg.dependencies['musubi-sdd']).toBeDefined();
      expect(pkg.dependencies.express).toBe('^4.18.0');
    });

    it('should generate AGENTS.md', () => {
      const agents = template.generateAgentsMd();
      expect(agents).toContain('# Test Project');
      expect(agents).toContain('MUSUBI SDD');
      expect(agents).toContain('#sdd-steering');
    });

    it('should generate structure.md', () => {
      const structure = template.generateStructureMd();
      expect(structure).toContain('# Architecture Structure');
      expect(structure).toContain('## Components');
    });

    it('should generate tech.md', () => {
      const tech = template.generateTechMd();
      expect(tech).toContain('# Technology Stack');
      expect(tech).toContain('Node.js');
    });

    it('should generate product.md', () => {
      const product = template.generateProductMd();
      expect(product).toContain('# Product Context');
      expect(product).toContain('Test Project');
    });

    it('should generate constitution.md', () => {
      const constitution = template.generateConstitutionMd();
      expect(constitution).toContain('# Constitution');
      expect(constitution).toContain('Article 1');
      expect(constitution).toContain('Article 9');
    });

    it('should build all files', () => {
      const files = template.build();
      expect(files.has('AGENTS.md')).toBe(true);
      expect(files.has('steering/structure.md')).toBe(true);
      expect(files.has('steering/tech.md')).toBe(true);
      expect(files.has('steering/product.md')).toBe(true);
      expect(files.has('steering/rules/constitution.md')).toBe(true);
      expect(files.has('package.json')).toBe(true);
    });

    it('should convert to JSON', () => {
      template.build();
      const json = template.toJSON();
      expect(json.id).toBe('test-project');
      expect(json.files.length).toBeGreaterThan(0);
    });
  });

  describe('ProjectCatalog', () => {
    let catalog;

    beforeEach(() => {
      catalog = new ProjectCatalog();
    });

    it('should have default templates', () => {
      const list = catalog.list();
      expect(list.length).toBeGreaterThan(0);
    });

    it('should include API example', () => {
      const template = catalog.get('musubi-api-example');
      expect(template).toBeDefined();
      expect(template.type).toBe(ProjectType.API_SERVER);
    });

    it('should include CLI example', () => {
      const template = catalog.get('musubi-cli-example');
      expect(template).toBeDefined();
      expect(template.type).toBe(ProjectType.CLI_TOOL);
    });

    it('should include library example', () => {
      const template = catalog.get('musubi-lib-example');
      expect(template).toBeDefined();
      expect(template.type).toBe(ProjectType.LIBRARY);
    });

    it('should include fullstack example', () => {
      const template = catalog.get('musubi-fullstack-example');
      expect(template).toBeDefined();
      expect(template.framework).toBe(FrameworkPreset.NEXTJS);
    });

    it('should register custom template', () => {
      const custom = new ProjectTemplate({ id: 'custom', name: 'Custom' });
      catalog.register(custom);
      expect(catalog.get('custom')).toBeDefined();
    });

    it('should filter by type', () => {
      const apis = catalog.byType(ProjectType.API_SERVER);
      expect(apis.length).toBeGreaterThan(0);
      expect(apis.every(t => t.type === ProjectType.API_SERVER)).toBe(true);
    });

    it('should filter by framework', () => {
      const nextjs = catalog.byFramework(FrameworkPreset.NEXTJS);
      expect(nextjs.length).toBeGreaterThan(0);
      expect(nextjs.every(t => t.framework === FrameworkPreset.NEXTJS)).toBe(true);
    });
  });

  describe('LaunchChecklist', () => {
    let checklist;

    beforeEach(() => {
      checklist = new LaunchChecklist({ projectName: 'Test Project' });
    });

    it('should have default items', () => {
      expect(checklist.items.length).toBeGreaterThan(0);
    });

    it('should add custom item', () => {
      const initialCount = checklist.items.length;
      checklist.addItem({
        id: 'custom',
        category: LaunchCategory.CODE_QUALITY,
        title: 'Custom check',
        required: false
      });
      expect(checklist.items.length).toBe(initialCount + 1);
    });

    it('should check item', () => {
      checklist.check('lint-pass');
      const item = checklist.items.find(i => i.id === 'lint-pass');
      expect(item.checked).toBe(true);
    });

    it('should uncheck item', () => {
      checklist.check('lint-pass');
      checklist.uncheck('lint-pass');
      const item = checklist.items.find(i => i.id === 'lint-pass');
      expect(item.checked).toBe(false);
    });

    it('should get status', () => {
      const status = checklist.getStatus();
      expect(status.total).toBeGreaterThan(0);
      expect(status.checked).toBe(0);
      expect(status.percentage).toBe(0);
      expect(status.readyToLaunch).toBe(false);
    });

    it('should update status when items checked', () => {
      // Check all required items
      for (const item of checklist.items) {
        if (item.required) {
          checklist.check(item.id);
        }
      }
      const status = checklist.getStatus();
      expect(status.readyToLaunch).toBe(true);
    });

    it('should get items by category', () => {
      const codeQuality = checklist.getByCategory(LaunchCategory.CODE_QUALITY);
      expect(codeQuality.length).toBeGreaterThan(0);
    });

    it('should get unchecked items', () => {
      const unchecked = checklist.getUnchecked();
      expect(unchecked.length).toBe(checklist.items.length);
    });

    it('should get unchecked required items', () => {
      const uncheckedRequired = checklist.getUncheckedRequired();
      expect(uncheckedRequired.length).toBeGreaterThan(0);
      expect(uncheckedRequired.every(i => i.required)).toBe(true);
    });

    it('should generate markdown', () => {
      checklist.check('lint-pass');
      const md = checklist.toMarkdown();
      expect(md).toContain('# Launch Checklist');
      expect(md).toContain('[x]');
      expect(md).toContain('[ ]');
    });

    it('should convert to JSON', () => {
      const json = checklist.toJSON();
      expect(json.projectName).toBe('Test Project');
      expect(json.status).toBeDefined();
      expect(json.items.length).toBeGreaterThan(0);
    });
  });

  describe('ReleaseManager', () => {
    let manager;

    beforeEach(() => {
      manager = new ReleaseManager({
        version: '1.0.0',
        projectName: 'Test Project'
      });
    });

    it('should initialize with version', () => {
      expect(manager.version).toBe('1.0.0');
    });

    it('should bump patch version', () => {
      const newVersion = manager.bumpVersion('patch');
      expect(newVersion).toBe('1.0.1');
    });

    it('should bump minor version', () => {
      const newVersion = manager.bumpVersion('minor');
      expect(newVersion).toBe('1.1.0');
    });

    it('should bump major version', () => {
      const newVersion = manager.bumpVersion('major');
      expect(newVersion).toBe('2.0.0');
    });

    it('should emit versionBumped event', (done) => {
      manager.on('versionBumped', (data) => {
        expect(data.version).toBe('1.0.1');
        expect(data.type).toBe('patch');
        done();
      });
      manager.bumpVersion('patch');
    });

    it('should generate changelog', () => {
      const releases = [
        {
          version: '1.0.0',
          date: '2024-01-01',
          features: ['Initial release'],
          changes: ['Updated docs'],
          fixes: ['Bug fix'],
          deprecated: ['Old API'],
          removed: ['Legacy code'],
          security: ['Security patch']
        }
      ];

      const changelog = manager.generateChangelog(releases);
      expect(changelog).toContain('# Changelog');
      expect(changelog).toContain('[1.0.0]');
      expect(changelog).toContain('### Added');
      expect(changelog).toContain('### Changed');
      expect(changelog).toContain('### Fixed');
      expect(changelog).toContain('### Deprecated');
      expect(changelog).toContain('### Removed');
      expect(changelog).toContain('### Security');
    });

    it('should generate release notes', () => {
      const release = {
        version: '1.0.0',
        date: '2024-01-01',
        highlights: ['Major feature'],
        features: ['New feature'],
        breaking: ['API change'],
        migration: 'Update your imports'
      };

      const notes = manager.generateReleaseNotes(release);
      expect(notes).toContain('# Release 1.0.0');
      expect(notes).toContain('## Highlights');
      expect(notes).toContain('## New Features');
      expect(notes).toContain('## ⚠️ Breaking Changes');
      expect(notes).toContain('## Migration Guide');
    });

    it('should get checklist', () => {
      const checklist = manager.getChecklist();
      expect(checklist).toBeInstanceOf(LaunchChecklist);
    });

    it('should get catalog', () => {
      const catalog = manager.getCatalog();
      expect(catalog).toBeInstanceOf(ProjectCatalog);
    });

    it('should create project from template', () => {
      const files = manager.createProject('musubi-api-example');
      expect(files.has('AGENTS.md')).toBe(true);
      expect(files.has('package.json')).toBe(true);
    });

    it('should emit projectCreated event', (done) => {
      manager.on('projectCreated', (data) => {
        expect(data.template).toBe('musubi-api-example');
        expect(data.files.length).toBeGreaterThan(0);
        done();
      });
      manager.createProject('musubi-api-example');
    });

    it('should throw for unknown template', () => {
      expect(() => manager.createProject('unknown')).toThrow('Template not found');
    });

    it('should validate release', () => {
      const result = manager.validateRelease();
      expect(result.valid).toBe(false);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it('should validate release when ready', () => {
      // Check all required items
      for (const item of manager.checklist.items) {
        if (item.required) {
          manager.checklist.check(item.id);
        }
      }
      const result = manager.validateRelease();
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Ready for release!');
    });

    it('should convert to JSON', () => {
      const json = manager.toJSON();
      expect(json.version).toBe('1.0.0');
      expect(json.checklist).toBeDefined();
      expect(json.templates.length).toBeGreaterThan(0);
    });
  });

  describe('Factory Functions', () => {
    it('should create project template', () => {
      const template = createProjectTemplate({ name: 'Test' });
      expect(template).toBeInstanceOf(ProjectTemplate);
    });

    it('should create project catalog', () => {
      const catalog = createProjectCatalog();
      expect(catalog).toBeInstanceOf(ProjectCatalog);
    });

    it('should create launch checklist', () => {
      const checklist = createLaunchChecklist();
      expect(checklist).toBeInstanceOf(LaunchChecklist);
    });

    it('should create release manager', () => {
      const manager = createReleaseManager();
      expect(manager).toBeInstanceOf(ReleaseManager);
    });
  });
});
