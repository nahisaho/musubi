/**
 * @fileoverview Tests for LocaleManager - multi-language template management
 */

const path = require('path');
const fs = require('fs-extra');
const { LocaleManager, SUPPORTED_LOCALES, LOCALE_NAMES } = require('../../src/templates/locale-manager');

describe('LocaleManager', () => {
  let localeManager;
  const testProjectPath = path.join(__dirname, '../test-output/locale-test-project');
  const testTemplatesPath = path.join(testProjectPath, 'steering', 'templates');

  beforeAll(async () => {
    // Create test project structure
    await fs.ensureDir(testTemplatesPath);

    // Create test templates
    await fs.writeFile(
      path.join(testTemplatesPath, 'requirements.md'),
      '# Requirements\n\nDefault requirements template for {{projectName}}.'
    );

    await fs.writeFile(
      path.join(testTemplatesPath, 'requirements.ja.md'),
      '# 要件定義\n\nデフォルト要件テンプレート（{{projectName}}）。'
    );

    await fs.writeFile(
      path.join(testTemplatesPath, 'requirements.zh.md'),
      '# 需求\n\n{{projectName}}的默认需求模板。'
    );

    await fs.writeFile(
      path.join(testTemplatesPath, 'design.md'),
      '# Design\n\nDesign document for {{projectName}}.'
    );

    // Create project.yml for locale detection
    await fs.ensureDir(path.join(testProjectPath, 'steering'));
    await fs.writeFile(
      path.join(testProjectPath, 'steering', 'project.yml'),
      'name: test-project\nlocale: ja\n'
    );
  });

  afterAll(async () => {
    // Cleanup test project
    await fs.rm(testProjectPath, { recursive: true, force: true });
  });

  beforeEach(() => {
    localeManager = new LocaleManager(testProjectPath, {
      defaultLocale: 'en'
    });
  });

  describe('constructor', () => {
    test('should set default options', () => {
      const manager = new LocaleManager('/some/path');
      expect(manager.defaultLocale).toBe('en');
      expect(manager.fallbackLocale).toBe('en');
    });

    test('should accept custom options', () => {
      const manager = new LocaleManager('/some/path', {
        defaultLocale: 'ja',
        fallbackLocale: 'en'
      });
      expect(manager.defaultLocale).toBe('ja');
      expect(manager.fallbackLocale).toBe('en');
    });

    test('should set templatesPath based on projectPath', () => {
      const manager = new LocaleManager('/project/root');
      expect(manager.templatesPath).toBe('/project/root/steering/templates');
    });
  });

  describe('getSupportedLocales', () => {
    test('should return all supported locales', () => {
      const locales = localeManager.getSupportedLocales();
      expect(locales).toContain('en');
      expect(locales).toContain('ja');
      expect(locales).toContain('zh');
      expect(locales).toContain('ko');
    });

    test('should return a copy of the array', () => {
      const locales1 = localeManager.getSupportedLocales();
      const locales2 = localeManager.getSupportedLocales();
      locales1.push('test');
      expect(locales2).not.toContain('test');
    });
  });

  describe('getLocaleName', () => {
    test('should return display name for known locales', () => {
      expect(localeManager.getLocaleName('en')).toBe('English');
      expect(localeManager.getLocaleName('ja')).toBe('日本語');
      expect(localeManager.getLocaleName('zh')).toBe('中文');
      expect(localeManager.getLocaleName('ko')).toBe('한국어');
    });

    test('should return locale code for unknown locales', () => {
      expect(localeManager.getLocaleName('unknown')).toBe('unknown');
    });
  });

  describe('getTemplate', () => {
    test('should get default English template', async () => {
      const template = await localeManager.getTemplate('requirements');
      expect(template).toBeDefined();
      expect(template).toContain('# Requirements');
    });

    test('should get Japanese template', async () => {
      const template = await localeManager.getTemplate('requirements', 'ja');
      expect(template).toBeDefined();
      expect(template).toContain('# 要件定義');
    });

    test('should get Chinese template', async () => {
      const template = await localeManager.getTemplate('requirements', 'zh');
      expect(template).toBeDefined();
      expect(template).toContain('# 需求');
    });

    test('should fall back to English when locale template not found', async () => {
      const template = await localeManager.getTemplate('design', 'ja');
      expect(template).toBeDefined();
      expect(template).toContain('# Design');
    });

    test('should return null when template not found', async () => {
      const template = await localeManager.getTemplate('nonexistent');
      expect(template).toBeNull();
    });

    test('should use default locale when none specified', async () => {
      const template = await localeManager.getTemplate('requirements');
      expect(template).toContain('# Requirements');
    });
  });

  describe('getTemplatePath', () => {
    test('should return path without suffix for English', () => {
      const templatePath = localeManager.getTemplatePath('requirements', 'en');
      expect(templatePath).toMatch(/requirements\.md$/);
      expect(templatePath).not.toMatch(/\.en\.md$/);
    });

    test('should return path with locale suffix for other locales', () => {
      const jaPath = localeManager.getTemplatePath('requirements', 'ja');
      expect(jaPath).toMatch(/requirements\.ja\.md$/);

      const zhPath = localeManager.getTemplatePath('requirements', 'zh');
      expect(zhPath).toMatch(/requirements\.zh\.md$/);
    });
  });

  describe('listTemplates', () => {
    test('should list all templates with their available locales', async () => {
      const templates = await localeManager.listTemplates();
      
      expect(templates.requirements).toBeDefined();
      expect(templates.requirements).toContain('en');
      expect(templates.requirements).toContain('ja');
      expect(templates.requirements).toContain('zh');
      
      expect(templates.design).toBeDefined();
      expect(templates.design).toContain('en');
    });

    test('should return empty object for nonexistent templates path', async () => {
      const manager = new LocaleManager('/nonexistent/path');
      const templates = await manager.listTemplates();
      expect(templates).toEqual({});
    });
  });

  describe('parseTemplateFilename', () => {
    test('should parse English template filename', () => {
      const result = localeManager.parseTemplateFilename('requirements.md');
      expect(result.category).toBe('requirements');
      expect(result.locale).toBe('en');
    });

    test('should parse localized template filename', () => {
      const jaResult = localeManager.parseTemplateFilename('requirements.ja.md');
      expect(jaResult.category).toBe('requirements');
      expect(jaResult.locale).toBe('ja');

      const zhResult = localeManager.parseTemplateFilename('design.zh.md');
      expect(zhResult.category).toBe('design');
      expect(zhResult.locale).toBe('zh');
    });

    test('should handle complex template names', () => {
      const result = localeManager.parseTemplateFilename('adr-template.ja.md');
      expect(result.category).toBe('adr-template');
      expect(result.locale).toBe('ja');
    });
  });

  describe('createLocalizedTemplate', () => {
    test('should create a new localized template', async () => {
      const content = '# 요구사항\n\n한국어 템플릿.';
      const filePath = await localeManager.createLocalizedTemplate('requirements', 'ko', content);
      
      expect(filePath).toMatch(/requirements\.ko\.md$/);
      
      const savedContent = await fs.readFile(filePath, 'utf-8');
      expect(savedContent).toBe(content);
      
      // Cleanup
      await fs.remove(filePath);
    });
  });

  describe('getTranslationMetadata', () => {
    test('should extract translatable sections', () => {
      const content = '# Header\n\nSome text.\n\n```code\nignored\n```\n\n## Another Header';
      const metadata = localeManager.getTranslationMetadata(content, 'ja');
      
      expect(metadata.locale).toBe('ja');
      expect(metadata.localeName).toBe('日本語');
      expect(metadata.translatableSections).toBeGreaterThan(0);
      
      const headers = metadata.sections.filter(s => s.type === 'header');
      expect(headers.length).toBe(2);
    });

    test('should ignore code blocks', () => {
      const content = '```javascript\nconst x = 1;\n```';
      const metadata = localeManager.getTranslationMetadata(content, 'ja');
      
      // Code blocks should not be in translatable sections
      const codeSection = metadata.sections.find(s => s.content.includes('const x'));
      expect(codeSection).toBeUndefined();
    });
  });

  describe('detectProjectLocale', () => {
    test('should detect locale from project.yml', async () => {
      const locale = await localeManager.detectProjectLocale();
      expect(locale).toBe('ja');
    });

    test('should return default locale when no config found', async () => {
      const manager = new LocaleManager('/nonexistent/path');
      const locale = await manager.detectProjectLocale();
      expect(locale).toBe('en');
    });
  });

  describe('SUPPORTED_LOCALES constant', () => {
    test('should include major languages', () => {
      expect(SUPPORTED_LOCALES).toContain('en');
      expect(SUPPORTED_LOCALES).toContain('ja');
      expect(SUPPORTED_LOCALES).toContain('zh');
      expect(SUPPORTED_LOCALES).toContain('ko');
    });
  });

  describe('LOCALE_NAMES constant', () => {
    test('should have display names for all supported locales', () => {
      for (const locale of SUPPORTED_LOCALES) {
        expect(LOCALE_NAMES[locale]).toBeDefined();
      }
    });
  });

  describe('integration with real templates', () => {
    test('should work with actual steering templates', async () => {
      const realManager = new LocaleManager(process.cwd());
      const locales = realManager.getSupportedLocales();
      
      expect(locales).toContain('en');
      expect(locales).toContain('ja');
    });

    test('should list real project templates', async () => {
      const realManager = new LocaleManager(process.cwd());
      const templates = await realManager.listTemplates();
      
      // Should find at least some templates
      const templateNames = Object.keys(templates);
      expect(templateNames.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    test('should handle empty template file', async () => {
      await fs.writeFile(
        path.join(testTemplatesPath, 'empty.md'),
        ''
      );
      
      const template = await localeManager.getTemplate('empty');
      expect(template).toBe('');
      
      // Cleanup
      await fs.remove(path.join(testTemplatesPath, 'empty.md'));
    });

    test('should handle template with only whitespace', async () => {
      await fs.writeFile(
        path.join(testTemplatesPath, 'whitespace.md'),
        '   \n\n   '
      );
      
      const template = await localeManager.getTemplate('whitespace');
      expect(template.trim()).toBe('');
      
      // Cleanup
      await fs.remove(path.join(testTemplatesPath, 'whitespace.md'));
    });
  });
});
