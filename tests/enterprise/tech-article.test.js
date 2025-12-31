/**
 * Tech Article Generator Tests
 * 
 * Requirement: IMP-6.2-006-02
 */

const { 
  TechArticleGenerator, 
  createTechArticleGenerator,
  PLATFORM,
  ARTICLE_TYPE
} = require('../../src/enterprise/tech-article');
const fs = require('fs').promises;
const path = require('path');

describe('TechArticleGenerator', () => {
  let generator;
  const testDir = 'test-tech-article-temp';

  beforeEach(async () => {
    generator = new TechArticleGenerator({ outputDir: testDir });
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('constructor', () => {
    it('should create generator with default config', () => {
      const g = new TechArticleGenerator();
      expect(g.config.defaultPlatform).toBe(PLATFORM.GENERIC);
      expect(g.config.includeTableOfContents).toBe(true);
    });

    it('should load templates for all platforms', () => {
      const g = new TechArticleGenerator();
      expect(g.templates[PLATFORM.QIITA]).toBeDefined();
      expect(g.templates[PLATFORM.ZENN]).toBeDefined();
      expect(g.templates[PLATFORM.MEDIUM]).toBeDefined();
      expect(g.templates[PLATFORM.DEVTO]).toBeDefined();
    });
  });

  describe('PLATFORM', () => {
    it('should define all platforms', () => {
      expect(PLATFORM.QIITA).toBe('qiita');
      expect(PLATFORM.ZENN).toBe('zenn');
      expect(PLATFORM.MEDIUM).toBe('medium');
      expect(PLATFORM.DEVTO).toBe('devto');
      expect(PLATFORM.GENERIC).toBe('generic');
    });
  });

  describe('ARTICLE_TYPE', () => {
    it('should define all article types', () => {
      expect(ARTICLE_TYPE.TUTORIAL).toBe('tutorial');
      expect(ARTICLE_TYPE.DEEP_DIVE).toBe('deep-dive');
      expect(ARTICLE_TYPE.ANNOUNCEMENT).toBe('announcement');
    });
  });

  describe('generate', () => {
    it('should generate article with basic content', async () => {
      const content = {
        title: 'Test Article',
        introduction: 'This is a test article.',
        sections: [
          { title: 'Section 1', content: 'Content 1' }
        ],
        conclusion: 'In conclusion...'
      };

      const result = await generator.generate(content);

      expect(result.article).toContain('Test Article');
      expect(result.article).toContain('Section 1');
      expect(result.filePath).toBeDefined();
    });

    it('should generate for specific platform', async () => {
      const content = {
        title: 'Qiita Article',
        tags: ['javascript', 'react']
      };

      const result = await generator.generate(content, { platform: PLATFORM.QIITA });

      expect(result.platform).toBe(PLATFORM.QIITA);
      expect(result.article).toContain('tags:');
    });

    it('should include code examples', async () => {
      const content = {
        title: 'Code Article',
        sections: [{
          title: 'Code Example',
          codeExamples: [{
            language: 'javascript',
            code: 'const x = 1;',
            description: 'A simple variable'
          }]
        }]
      };

      const result = await generator.generate(content);

      expect(result.article).toContain('```javascript');
      expect(result.article).toContain('const x = 1;');
    });

    it('should include table of contents', async () => {
      const content = {
        title: 'TOC Article',
        sections: [
          { title: 'First Section' },
          { title: 'Second Section' }
        ]
      };

      const result = await generator.generate(content);

      expect(result.article).toContain('## 目次');
      expect(result.article).toContain('First Section');
    });

    it('should include benchmarks', async () => {
      const content = {
        title: 'Benchmark Article',
        benchmarks: {
          'Execution Time': '100ms',
          'Memory': '50MB'
        }
      };

      const result = await generator.generate(content);

      expect(result.article).toContain('ベンチマーク結果');
      expect(result.article).toContain('100ms');
    });
  });

  describe('generateFromExperiment', () => {
    it('should generate article from experiment report', async () => {
      const experimentReport = {
        metadata: { title: 'Test Experiment' },
        summary: { total: 10, passed: 9, failed: 1, passRate: '90%' },
        metrics: { performance: { avgDuration: '50ms' } },
        observations: ['Test observation']
      };

      const result = await generator.generateFromExperiment(experimentReport);

      expect(result.article).toContain('実験レポート');
      expect(result.article).toContain('90%');
    });
  });

  describe('platform templates', () => {
    it('should generate Qiita front matter', () => {
      const template = generator.templates[PLATFORM.QIITA];
      const frontMatter = template.frontMatter({
        title: 'Test',
        tags: ['js', 'react']
      });

      expect(frontMatter).toContain('title: "Test"');
      expect(frontMatter).toContain('tags:');
    });

    it('should generate Zenn front matter', () => {
      const template = generator.templates[PLATFORM.ZENN];
      const frontMatter = template.frontMatter({
        title: 'Test',
        tags: ['js'],
        emoji: '🚀'
      });

      expect(frontMatter).toContain('emoji: "🚀"');
      expect(frontMatter).toContain('type: "tech"');
    });

    it('should generate Dev.to front matter', () => {
      const template = generator.templates[PLATFORM.DEVTO];
      const frontMatter = template.frontMatter({
        title: 'Test',
        tags: ['js', 'react', 'node', 'test', 'extra'],
        description: 'Test description'
      });

      expect(frontMatter).toContain('published: true');
      // Dev.to limits to 4 tags
      expect(frontMatter).not.toContain('extra');
    });
  });

  describe('slugify', () => {
    it('should convert to URL-friendly slug', () => {
      expect(generator.slugify('Hello World')).toBe('hello-world');
      expect(generator.slugify('Test: Article!')).toBe('test-article');
      expect(generator.slugify('  Spaces  ')).toBe('spaces');
    });

    it('should limit length', () => {
      const longTitle = 'A'.repeat(100);
      expect(generator.slugify(longTitle).length).toBeLessThanOrEqual(50);
    });
  });

  describe('countWords', () => {
    it('should count English words', () => {
      expect(generator.countWords('Hello world test')).toBe(3);
    });

    it('should count Japanese characters', () => {
      expect(generator.countWords('テスト記事')).toBe(5);
    });

    it('should count mixed content', () => {
      const mixed = 'Hello テスト world';
      expect(generator.countWords(mixed)).toBeGreaterThan(4);
    });
  });

  describe('estimateReadingTime', () => {
    it('should estimate reading time', () => {
      const shortText = 'Hello world';
      const longText = 'word '.repeat(1000);

      expect(generator.estimateReadingTime(shortText)).toContain('約');
      expect(generator.estimateReadingTime(longText)).toContain('分');
    });
  });

  describe('registerTemplate', () => {
    it('should register custom template', () => {
      generator.registerTemplate('custom', {
        frontMatter: () => '---\ncustom: true\n---',
        codeBlock: (lang, code) => `<code>${code}</code>`,
        note: (text) => `<note>${text}</note>`,
        link: (text, url) => `<a href="${url}">${text}</a>`
      });

      expect(generator.templates['custom']).toBeDefined();
    });
  });

  describe('createTechArticleGenerator', () => {
    it('should create instance', () => {
      const g = createTechArticleGenerator();
      expect(g).toBeInstanceOf(TechArticleGenerator);
    });
  });
});
