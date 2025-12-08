/**
 * Tests for Multi-Platform Support
 */

const {
  Platform,
  PlatformConfig,
  PlatformDetector,
  PlatformAdapter,
  SkillConverter,
  MemorySynchronizer,
  UniversalInitializer,
  PlatformManager,
  createPlatformManager
} = require('../../src/integrations/platforms');

describe('Multi-Platform Support', () => {
  describe('Platform Constants', () => {
    it('should have 13 platforms defined', () => {
      expect(Object.keys(Platform).length).toBe(13);
    });

    it('should have config for each platform', () => {
      for (const platformId of Object.values(Platform)) {
        expect(PlatformConfig[platformId]).toBeDefined();
        expect(PlatformConfig[platformId].name).toBeDefined();
        expect(PlatformConfig[platformId].files).toBeDefined();
      }
    });
  });

  describe('PlatformDetector', () => {
    let detector;

    beforeEach(() => {
      detector = new PlatformDetector();
    });

    it('should detect Claude Code from CLAUDE.md', () => {
      const files = ['CLAUDE.md', 'package.json'];
      const platforms = detector.detect(files);
      expect(platforms).toContain(Platform.CLAUDE_CODE);
    });

    it('should detect GitHub Copilot from .github/copilot/', () => {
      const files = ['.github/copilot/instructions.md', 'src/index.js'];
      const platforms = detector.detect(files);
      expect(platforms).toContain(Platform.GITHUB_COPILOT);
    });

    it('should detect Cursor from .cursorrules', () => {
      const files = ['.cursorrules', 'src/app.ts'];
      const platforms = detector.detect(files);
      expect(platforms).toContain(Platform.CURSOR);
    });

    it('should detect Cursor from .cursor/rules/', () => {
      const files = ['.cursor/rules/root.mdc', 'src/app.ts'];
      const platforms = detector.detect(files);
      expect(platforms).toContain(Platform.CURSOR);
    });

    it('should detect Windsurf from .windsurfrules', () => {
      const files = ['.windsurfrules', 'index.html'];
      const platforms = detector.detect(files);
      expect(platforms).toContain(Platform.WINDSURF);
    });

    it('should detect Cline from .clinerules', () => {
      const files = ['.clinerules', 'main.py'];
      const platforms = detector.detect(files);
      expect(platforms).toContain(Platform.CLINE);
    });

    it('should detect multiple platforms', () => {
      const files = ['CLAUDE.md', '.cursorrules', 'AGENTS.md'];
      const platforms = detector.detect(files);
      expect(platforms.length).toBeGreaterThan(1);
    });

    it('should get primary platform', () => {
      const files = ['CLAUDE.md', '.cursorrules'];
      detector.detect(files);
      expect(detector.getPrimary()).toBe(Platform.CLAUDE_CODE);
    });

    it('should check if platform is detected', () => {
      const files = ['CLAUDE.md'];
      detector.detect(files);
      expect(detector.has(Platform.CLAUDE_CODE)).toBe(true);
      expect(detector.has(Platform.CURSOR)).toBe(false);
    });

    it('should get platform config', () => {
      const config = detector.getConfig(Platform.CLAUDE_CODE);
      expect(config.name).toBe('Claude Code');
      expect(config.supportsSkills).toBe(true);
    });

    it('should return generic for unknown platform', () => {
      const config = detector.getConfig('unknown-platform');
      expect(config.name).toBe('Generic (AGENTS.md)');
    });
  });

  describe('PlatformAdapter', () => {
    it('should create adapter with platform config', () => {
      const adapter = new PlatformAdapter(Platform.CLAUDE_CODE);
      expect(adapter.name).toBe('Claude Code');
      expect(adapter.primaryFile).toBe('CLAUDE.md');
    });

    it('should expose config properties', () => {
      const adapter = new PlatformAdapter(Platform.GITHUB_COPILOT);
      expect(adapter.configFiles).toContain('.github/copilot-instructions.md');
      expect(adapter.supportsSkills).toBe(true);
      expect(adapter.supportsMemory).toBe(true);
    });

    it('should adapt content to markdown', () => {
      const adapter = new PlatformAdapter(Platform.CLAUDE_CODE);
      const content = {
        title: 'Test Project',
        description: 'A test project',
        sections: [
          { title: 'Features', items: ['Feature 1', 'Feature 2'] }
        ]
      };
      
      const markdown = adapter.adaptContent(content);
      expect(markdown).toContain('# Test Project');
      expect(markdown).toContain('A test project');
      expect(markdown).toContain('## Features');
      expect(markdown).toContain('- Feature 1');
    });

    it('should adapt content to YAML', () => {
      const adapter = new PlatformAdapter(Platform.AIDER);
      const content = {
        title: 'Test',
        options: ['opt1', 'opt2']
      };
      
      const yaml = adapter.adaptContent(content);
      expect(yaml).toContain('# Test');
      expect(yaml).toContain('options:');
      expect(yaml).toContain('  - opt1');
    });

    it('should adapt content to JSON', () => {
      const adapter = new PlatformAdapter(Platform.CONTINUE);
      const content = {
        name: 'test',
        settings: { enabled: true }
      };
      
      const json = adapter.adaptContent(content);
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('test');
      expect(parsed.settings.enabled).toBe(true);
    });

    it('should generate AGENTS reference', () => {
      const adapter = new PlatformAdapter(Platform.CURSOR);
      const reference = adapter.generateAgentsReference();
      expect(reference).toContain('Cursor Configuration');
      expect(reference).toContain('MUSUBI SDD');
      expect(reference).toContain('steering/structure.md');
    });

    it('should handle sections with content', () => {
      const adapter = new PlatformAdapter(Platform.GENERIC);
      const content = {
        sections: [
          { title: 'Overview', content: 'This is the overview text.' }
        ]
      };
      
      const markdown = adapter.adaptContent(content);
      expect(markdown).toContain('## Overview');
      expect(markdown).toContain('This is the overview text.');
    });

    it('should handle rules', () => {
      const adapter = new PlatformAdapter(Platform.GENERIC);
      const content = {
        rules: ['Rule 1', 'Rule 2']
      };
      
      const markdown = adapter.adaptContent(content);
      expect(markdown).toContain('## Rules');
      expect(markdown).toContain('- Rule 1');
    });
  });

  describe('SkillConverter', () => {
    let converter;

    beforeEach(() => {
      converter = new SkillConverter();
    });

    it('should convert Claude skill to Copilot', () => {
      const skill = { name: 'test-skill', content: 'Test content' };
      const converted = converter.convert(skill, Platform.CLAUDE_CODE, Platform.GITHUB_COPILOT);
      
      expect(converted.format).toBe('copilot-instruction');
      expect(converted.file).toBe('.github/copilot/test-skill.md');
    });

    it('should convert Claude skill to Cursor', () => {
      const skill = { name: 'my-skill', content: 'Content' };
      const converted = converter.convert(skill, Platform.CLAUDE_CODE, Platform.CURSOR);
      
      expect(converted.format).toBe('cursor-rule');
      expect(converted.file).toBe('.cursor/rules/my-skill.mdc');
    });

    it('should convert Copilot skill to Claude', () => {
      const skill = { name: 'copilot-skill', content: 'Content' };
      const converted = converter.convert(skill, Platform.GITHUB_COPILOT, Platform.CLAUDE_CODE);
      
      expect(converted.format).toBe('claude-skill');
      expect(converted.file).toBe('steering/skills/copilot-skill.md');
    });

    it('should provide generic conversion for unsupported pairs', () => {
      const skill = { name: 'skill', content: 'Content' };
      const converted = converter.convert(skill, Platform.AIDER, Platform.WINDSURF);
      
      expect(converted.format).toBe('generic');
      expect(converted.originalPlatform).toBe(Platform.AIDER);
      expect(converted.targetPlatform).toBe(Platform.WINDSURF);
    });

    it('should check if conversion is supported', () => {
      expect(converter.canConvert(Platform.CLAUDE_CODE, Platform.GITHUB_COPILOT)).toBe(true);
      expect(converter.canConvert(Platform.AIDER, Platform.WINDSURF)).toBe(false);
    });

    it('should register custom converter', () => {
      converter.register(Platform.WINDSURF, Platform.CLINE, (skill) => ({
        ...skill,
        format: 'cline-rule'
      }));
      
      const skill = { name: 'test' };
      const converted = converter.convert(skill, Platform.WINDSURF, Platform.CLINE);
      expect(converted.format).toBe('cline-rule');
    });
  });

  describe('MemorySynchronizer', () => {
    let synchronizer;

    beforeEach(() => {
      synchronizer = new MemorySynchronizer();
    });

    it('should register source and target', () => {
      const memory = { title: 'Project', description: 'Test' };
      synchronizer.registerSource(Platform.CLAUDE_CODE, memory);
      
      const adapter = new PlatformAdapter(Platform.CURSOR);
      synchronizer.registerTarget(Platform.CURSOR, adapter);
      
      expect(synchronizer.sources.size).toBe(1);
      expect(synchronizer.targets.size).toBe(1);
    });

    it('should sync memory to targets', () => {
      const memory = { title: 'Project', description: 'Description' };
      synchronizer.registerSource(Platform.CLAUDE_CODE, memory);
      
      const cursorAdapter = new PlatformAdapter(Platform.CURSOR);
      synchronizer.registerTarget(Platform.CURSOR, cursorAdapter);
      
      const results = synchronizer.sync(Platform.CLAUDE_CODE);
      expect(results.has(Platform.CURSOR)).toBe(true);
      expect(results.get(Platform.CURSOR).content).toContain('# Project');
    });

    it('should skip source platform in sync', () => {
      const memory = { title: 'Test' };
      synchronizer.registerSource(Platform.CLAUDE_CODE, memory);
      
      const claudeAdapter = new PlatformAdapter(Platform.CLAUDE_CODE);
      synchronizer.registerTarget(Platform.CLAUDE_CODE, claudeAdapter);
      
      const results = synchronizer.sync(Platform.CLAUDE_CODE);
      expect(results.has(Platform.CLAUDE_CODE)).toBe(false);
    });

    it('should skip platforms without memory support', () => {
      const memory = { title: 'Test' };
      synchronizer.registerSource(Platform.CLAUDE_CODE, memory);
      
      // Windsurf doesn't support memory
      const windsurfAdapter = new PlatformAdapter(Platform.WINDSURF);
      synchronizer.registerTarget(Platform.WINDSURF, windsurfAdapter);
      
      const results = synchronizer.sync(Platform.CLAUDE_CODE);
      expect(results.has(Platform.WINDSURF)).toBe(false);
    });

    it('should throw for unregistered source', () => {
      expect(() => synchronizer.sync(Platform.CURSOR)).toThrow('Source platform');
    });

    it('should get sync plan', () => {
      synchronizer.registerSource(Platform.CLAUDE_CODE, {});
      synchronizer.registerTarget(Platform.CURSOR, new PlatformAdapter(Platform.CURSOR));
      synchronizer.registerTarget(Platform.GITHUB_COPILOT, new PlatformAdapter(Platform.GITHUB_COPILOT));
      
      const plan = synchronizer.getSyncPlan();
      expect(plan.length).toBe(2);
      expect(plan[0].from).toBe(Platform.CLAUDE_CODE);
    });
  });

  describe('UniversalInitializer', () => {
    let initializer;

    beforeEach(() => {
      initializer = new UniversalInitializer({
        projectName: 'test-project',
        description: 'A test project',
        platforms: [Platform.GENERIC]
      });
    });

    it('should generate AGENTS.md', () => {
      const files = initializer.generate();
      expect(files.has('AGENTS.md')).toBe(true);
      expect(files.get('AGENTS.md')).toContain('test-project');
      expect(files.get('AGENTS.md')).toContain('MUSUBI SDD');
    });

    it('should generate steering files', () => {
      const files = initializer.generate();
      expect(files.has('steering/structure.md')).toBe(true);
      expect(files.has('steering/tech.md')).toBe(true);
      expect(files.has('steering/product.md')).toBe(true);
      expect(files.has('steering/rules/constitution.md')).toBe(true);
    });

    it('should include project name in product.md', () => {
      const files = initializer.generate();
      expect(files.get('steering/product.md')).toContain('test-project');
    });

    it('should include 9 articles in constitution', () => {
      const files = initializer.generate();
      const constitution = files.get('steering/rules/constitution.md');
      expect(constitution).toContain('Article 1');
      expect(constitution).toContain('Article 9');
    });

    it('should generate Claude-specific files', () => {
      const claudeInit = new UniversalInitializer({
        projectName: 'claude-project',
        platforms: [Platform.CLAUDE_CODE]
      });
      
      const files = claudeInit.generate();
      expect(files.has('CLAUDE.md')).toBe(true);
    });

    it('should generate Copilot-specific files', () => {
      const copilotInit = new UniversalInitializer({
        projectName: 'copilot-project',
        platforms: [Platform.GITHUB_COPILOT]
      });
      
      const files = copilotInit.generate();
      expect(files.has('.github/copilot-instructions.md')).toBe(true);
    });

    it('should generate Cursor-specific files', () => {
      const cursorInit = new UniversalInitializer({
        projectName: 'cursor-project',
        platforms: [Platform.CURSOR]
      });
      
      const files = cursorInit.generate();
      expect(files.has('.cursorrules')).toBe(true);
    });

    it('should generate for multiple platforms', () => {
      const multiInit = new UniversalInitializer({
        projectName: 'multi-project',
        platforms: [Platform.CLAUDE_CODE, Platform.CURSOR, Platform.WINDSURF]
      });
      
      const files = multiInit.generate();
      expect(files.has('CLAUDE.md')).toBe(true);
      expect(files.has('.cursorrules')).toBe(true);
      expect(files.has('.windsurfrules')).toBe(true);
    });
  });

  describe('PlatformManager', () => {
    let manager;

    beforeEach(() => {
      manager = new PlatformManager({ projectRoot: '/test/project' });
    });

    it('should initialize with files', () => {
      const files = ['CLAUDE.md', '.cursorrules', 'package.json'];
      const platforms = manager.initialize(files);
      
      expect(platforms).toContain(Platform.CLAUDE_CODE);
      expect(platforms).toContain(Platform.CURSOR);
    });

    it('should emit initialized event', (done) => {
      manager.on('initialized', (data) => {
        expect(data.platforms).toBeDefined();
        done();
      });
      
      manager.initialize(['CLAUDE.md']);
    });

    it('should get detected platforms', () => {
      manager.initialize(['CLAUDE.md']);
      expect(manager.getDetectedPlatforms()).toContain(Platform.CLAUDE_CODE);
    });

    it('should get adapter for platform', () => {
      manager.initialize(['CLAUDE.md']);
      const adapter = manager.getAdapter(Platform.CLAUDE_CODE);
      expect(adapter.name).toBe('Claude Code');
    });

    it('should get adapter for undetected platform', () => {
      manager.initialize([]);
      const adapter = manager.getAdapter(Platform.CURSOR);
      expect(adapter.name).toBe('Cursor');
    });

    it('should convert skills between platforms', () => {
      const skill = { name: 'test', content: 'Content' };
      const converted = manager.convertSkill(skill, Platform.CLAUDE_CODE, Platform.GITHUB_COPILOT);
      expect(converted.format).toBe('copilot-instruction');
    });

    it('should sync steering across platforms', () => {
      manager.initialize(['CLAUDE.md', '.cursorrules']);
      
      const memory = { title: 'Project', description: 'Test' };
      const results = manager.syncSteering(Platform.CLAUDE_CODE, memory);
      
      expect(results.size).toBeGreaterThan(0);
    });

    it('should emit synced event', (done) => {
      manager.initialize(['CLAUDE.md', '.cursorrules']);
      
      manager.on('synced', (data) => {
        expect(data.source).toBe(Platform.CLAUDE_CODE);
        done();
      });
      
      manager.syncSteering(Platform.CLAUDE_CODE, { title: 'Test' });
    });

    it('should generate init files', () => {
      manager.initialize(['CLAUDE.md']);
      
      const files = manager.generateInitFiles({
        projectName: 'test',
        description: 'Test project'
      });
      
      expect(files.has('AGENTS.md')).toBe(true);
      expect(files.has('CLAUDE.md')).toBe(true);
    });

    it('should use generic platform when none detected', () => {
      manager.initialize([]);
      
      const files = manager.generateInitFiles({ projectName: 'empty' });
      expect(files.has('AGENTS.md')).toBe(true);
    });

    it('should get compatibility report', () => {
      manager.initialize(['CLAUDE.md']);
      
      const report = manager.getCompatibilityReport();
      expect(report.supported.length).toBe(13);
      expect(report.detected.length).toBe(1);
      expect(report.features.totalPlatforms).toBe(13);
    });

    it('should convert to JSON', () => {
      manager.initialize(['CLAUDE.md']);
      
      const json = manager.toJSON();
      expect(json.detectedPlatforms).toContain(Platform.CLAUDE_CODE);
      expect(json.projectRoot).toBe('/test/project');
    });
  });

  describe('createPlatformManager', () => {
    it('should create manager with defaults', () => {
      const manager = createPlatformManager();
      expect(manager).toBeInstanceOf(PlatformManager);
    });

    it('should accept options', () => {
      const manager = createPlatformManager({ projectRoot: '/custom/path' });
      expect(manager.projectRoot).toBe('/custom/path');
    });
  });
});
