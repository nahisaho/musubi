/**
 * Tests for Steering Auto-Update Module
 */

const {
  ChangeDetector,
  SteeringUpdater,
  ProjectYmlSync,
  CustomSteeringRules,
  SteeringAutoUpdater,
  SteeringFileType,
  UpdateTrigger,
  createSteeringAutoUpdater
} = require('../../src/steering/auto-updater');

describe('Steering Auto-Update', () => {
  describe('ChangeDetector', () => {
    let detector;

    beforeEach(() => {
      detector = new ChangeDetector();
    });

    test('should detect structure-affecting changes', () => {
      const changedFiles = ['src/components/Button.js', 'src/utils/helpers.js'];
      const affected = detector.detectAffectedSteering(changedFiles);

      expect(affected).toContain('structure');
    });

    test('should detect tech-affecting changes', () => {
      const changedFiles = ['package.json'];
      const affected = detector.detectAffectedSteering(changedFiles);

      expect(affected).toContain('tech');
    });

    test('should detect product-affecting changes', () => {
      const changedFiles = ['README.md', 'docs/guide.md'];
      const affected = detector.detectAffectedSteering(changedFiles);

      expect(affected).toContain('product');
    });

    test('should detect multiple affected steering files', () => {
      const changedFiles = [
        'src/index.js',
        'package.json',
        'README.md'
      ];
      const affected = detector.detectAffectedSteering(changedFiles);

      expect(affected).toContain('structure');
      expect(affected).toContain('tech');
      expect(affected).toContain('product');
    });

    test('should analyze changes with file types', () => {
      const changes = [
        { type: 'add', path: 'src/new-file.js' },
        { type: 'modify', path: 'package.json' },
        { type: 'delete', path: 'src/old-file.js' }
      ];

      const analysis = detector.analyzeChanges(changes);

      expect(analysis.addedFiles).toContain('src/new-file.js');
      expect(analysis.modifiedFiles).toContain('package.json');
      expect(analysis.deletedFiles).toContain('src/old-file.js');
      expect(analysis.affectedSteering).toContain('structure');
      expect(analysis.affectedSteering).toContain('tech');
    });

    test('should use custom patterns', () => {
      const customDetector = new ChangeDetector({
        patterns: {
          custom: [/^custom\//]
        }
      });

      const affected = customDetector.detectAffectedSteering(['custom/file.js']);
      expect(affected).toContain('custom');
    });
  });

  describe('SteeringUpdater', () => {
    let updater;

    beforeEach(() => {
      updater = new SteeringUpdater({ dryRun: true });
    });

    test('should generate structure updates for new directories', () => {
      const analysis = {
        addedFiles: ['src/components/Button.js', 'lib/utils.js'],
        modifiedFiles: [],
        deletedFiles: []
      };

      const updates = updater.generateStructureUpdate(analysis);

      expect(updates.length).toBeGreaterThan(0);
      expect(updates[0].section).toBe('directories');
      expect(updates[0].action).toBe('add');
    });

    test('should generate structure updates for removed directories', () => {
      const analysis = {
        addedFiles: [],
        modifiedFiles: [],
        deletedFiles: ['old-dir/file.js']
      };

      const updates = updater.generateStructureUpdate(analysis);

      expect(updates.length).toBeGreaterThan(0);
      expect(updates[0].action).toBe('review');
    });

    test('should generate tech updates from package.json', () => {
      const analysis = { addedFiles: [], modifiedFiles: [], deletedFiles: [] };
      const packageJson = {
        dependencies: {
          'react': '^18.0.0',
          'express': '^4.0.0'
        },
        devDependencies: {
          'jest': '^29.0.0',
          'typescript': '^5.0.0'
        }
      };

      const updates = updater.generateTechUpdate(analysis, packageJson);

      expect(updates.length).toBeGreaterThan(0);
      
      const frameworkUpdate = updates.find(u => u.section === 'frameworks');
      expect(frameworkUpdate).toBeDefined();
      expect(frameworkUpdate.content).toContain('React');
      expect(frameworkUpdate.content).toContain('Express');
      expect(frameworkUpdate.content).toContain('Jest');
      expect(frameworkUpdate.content).toContain('TypeScript');
    });

    test('should generate product updates from README', () => {
      const analysis = { addedFiles: [], modifiedFiles: [], deletedFiles: [] };
      const readme = `# My Project

This is a description of my project.
`;

      const updates = updater.generateProductUpdate(analysis, readme);

      expect(updates.length).toBeGreaterThan(0);
      
      const nameUpdate = updates.find(u => u.section === 'name');
      expect(nameUpdate).toBeDefined();
      expect(nameUpdate.content).toBe('My Project');

      const descUpdate = updates.find(u => u.section === 'description');
      expect(descUpdate).toBeDefined();
      expect(descUpdate.content).toContain('description of my project');
    });

    test('should apply updates in dry-run mode', () => {
      const updates = [
        { section: 'directories', action: 'add', content: ['- `src/`'] }
      ];

      const results = updater.applyUpdates('steering/structure.md', updates);

      expect(results).toHaveLength(1);
      expect(results[0].applied).toBe(false); // dry-run mode
    });
  });

  describe('ProjectYmlSync', () => {
    let sync;

    beforeEach(() => {
      sync = new ProjectYmlSync();
    });

    test('should parse project.yml content', () => {
      const content = `
name: my-project
version: 1.0.0
description: A test project

tech_stack:
  - Node.js
  - TypeScript

features:
  - Feature A
  - Feature B
`;

      const data = sync.parse(content);

      expect(data.name).toBe('my-project');
      expect(data.version).toBe('1.0.0');
      expect(data.tech_stack).toContain('Node.js');
      expect(data.tech_stack).toContain('TypeScript');
      expect(data.features).toContain('Feature A');
    });

    test('should generate project.yml content', () => {
      const data = {
        name: 'test-project',
        version: '2.0.0',
        description: 'Test description',
        tech_stack: ['React', 'Node.js'],
        features: ['Auth', 'Dashboard']
      };

      const content = sync.generate(data);

      expect(content).toContain('name: test-project');
      expect(content).toContain('version: 2.0.0');
      expect(content).toContain('- React');
      expect(content).toContain('- Dashboard');
    });

    test('should sync with package.json', () => {
      const projectData = {
        name: 'old-name',
        version: '1.0.0',
        tech_stack: ['Node.js']
      };

      const packageJson = {
        name: 'new-name',
        version: '2.0.0',
        dependencies: {
          'react': '^18.0.0',
          'prisma': '^5.0.0'
        },
        devDependencies: {
          'typescript': '^5.0.0'
        }
      };

      const updated = sync.syncWithPackageJson(projectData, packageJson);

      expect(updated.name).toBe('new-name');
      expect(updated.version).toBe('2.0.0');
      expect(updated.tech_stack).toContain('Node.js');
      expect(updated.tech_stack).toContain('React');
      expect(updated.tech_stack).toContain('Prisma');
      expect(updated.tech_stack).toContain('TypeScript');
    });
  });

  describe('CustomSteeringRules', () => {
    let rules;

    beforeEach(() => {
      rules = new CustomSteeringRules();
    });

    test('should load rules from markdown content', () => {
      const content = `
## Rule: No Large Files
Pattern: \`\\.large$\`
Action: error
Message: Large files should not be committed

## Rule: Review Config Changes
Pattern: \`\\.config\\.\`
Action: warn
Message: Config changes need review
`;

      const loaded = rules.loadRules(content);

      expect(loaded).toHaveLength(2);
      expect(loaded[0].name).toBe('No Large Files');
      expect(loaded[0].pattern).toBe('\\.large$');
      expect(loaded[0].action).toBe('error');
      expect(loaded[1].name).toBe('Review Config Changes');
    });

    test('should register custom rules', () => {
      rules.registerRule({
        name: 'test-rule',
        pattern: '\\.test\\.js$',
        action: 'warn',
        message: 'Test file changed'
      });

      expect(rules.rules.has('test-rule')).toBe(true);
    });

    test('should apply rules to changes', () => {
      rules.registerRule({
        name: 'config-rule',
        pattern: '\\.config\\.js$',
        action: 'warn',
        message: 'Config changed'
      });

      const changes = [
        { path: 'webpack.config.js', type: 'modify' },
        { path: 'src/index.js', type: 'modify' }
      ];

      const results = rules.applyRules(changes);

      expect(results).toHaveLength(1);
      expect(results[0].rule).toBe('config-rule');
      expect(results[0].file).toBe('webpack.config.js');
    });
  });

  describe('SteeringAutoUpdater', () => {
    let autoUpdater;

    beforeEach(() => {
      autoUpdater = createSteeringAutoUpdater({
        dryRun: true
      });
    });

    test('should create auto-updater with defaults', () => {
      expect(autoUpdater.steeringDir).toBe('steering');
      expect(autoUpdater.dryRun).toBe(true);
    });

    test('should analyze project changes', () => {
      const changes = [
        { type: 'add', path: 'src/new-component.js' },
        { type: 'modify', path: 'package.json' }
      ];

      const context = {
        packageJson: {
          dependencies: { 'react': '^18.0.0' },
          devDependencies: { 'jest': '^29.0.0' }
        }
      };

      const result = autoUpdater.analyze(changes, context);

      expect(result.analysis.addedFiles).toContain('src/new-component.js');
      expect(result.suggestions.structure.length).toBeGreaterThan(0);
      expect(result.suggestions.tech.length).toBeGreaterThan(0);
    });

    test('should apply updates', () => {
      const suggestions = {
        structure: [
          { section: 'directories', action: 'add', content: ['- `src/`'] }
        ],
        tech: [
          { section: 'frameworks', action: 'update', content: ['React'] }
        ],
        product: [],
        custom: []
      };

      const results = autoUpdater.applyUpdates(suggestions);

      expect(results.applied.length).toBeGreaterThan(0);
      expect(results.errors).toHaveLength(0);
    });

    test('should emit events on updates', (done) => {
      autoUpdater.on('updated', (event) => {
        expect(event.type).toBeDefined();
        done();
      });

      autoUpdater.applyUpdates({
        structure: [{ section: 'test', action: 'add', content: [] }]
      });
    });

    test('should sync project.yml with package.json', () => {
      const projectData = {
        name: 'old',
        version: '1.0.0',
        tech_stack: []
      };

      const packageJson = {
        name: 'new',
        version: '2.0.0',
        dependencies: { 'express': '^4.0.0' }
      };

      const updated = autoUpdater.syncProjectYml(projectData, packageJson);

      expect(updated.name).toBe('new');
      expect(updated.version).toBe('2.0.0');
      expect(updated.tech_stack).toContain('Express');
    });

    test('should register custom rules', () => {
      autoUpdater.registerCustomRule({
        name: 'api-change',
        pattern: 'api/',
        action: 'warn',
        message: 'API changed'
      });

      const changes = [{ type: 'modify', path: 'api/routes.js' }];
      const result = autoUpdater.analyze(changes);

      expect(result.suggestions.custom.length).toBeGreaterThan(0);
    });

    test('should track update history', () => {
      autoUpdater.applyUpdates({
        structure: [{ section: 'test', action: 'add', content: [] }]
      });

      const history = autoUpdater.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].timestamp).toBeDefined();
    });

    test('should validate steering consistency', () => {
      const steeringFiles = ['structure.md', 'tech.md'];
      const result = autoUpdater.validateConsistency(steeringFiles);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.file === 'product.md')).toBe(true);
    });

    test('should validate complete steering', () => {
      const steeringFiles = ['structure.md', 'tech.md', 'product.md'];
      const result = autoUpdater.validateConsistency(steeringFiles);

      expect(result.valid).toBe(true);
    });
  });

  describe('Constants', () => {
    test('should export SteeringFileType', () => {
      expect(SteeringFileType.STRUCTURE).toBe('structure');
      expect(SteeringFileType.TECH).toBe('tech');
      expect(SteeringFileType.PRODUCT).toBe('product');
      expect(SteeringFileType.RULES).toBe('rules');
      expect(SteeringFileType.CUSTOM).toBe('custom');
    });

    test('should export UpdateTrigger', () => {
      expect(UpdateTrigger.FILE_ADDED).toBe('file-added');
      expect(UpdateTrigger.FILE_MODIFIED).toBe('file-modified');
      expect(UpdateTrigger.DEPENDENCY_ADDED).toBe('dependency-added');
      expect(UpdateTrigger.MANUAL).toBe('manual');
    });
  });
});
