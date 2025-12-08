/**
 * Tests for Documentation Generator
 */

const {
  DocType,
  DocFormat,
  TemplateEngine,
  DocSection,
  DocPage,
  DocSite,
  DocGenerator,
  createDocGenerator,
  createDocSite,
  createDocPage,
  createDocSection
} = require('../../src/integrations/documentation');

describe('Documentation Generator', () => {
  describe('DocType Constants', () => {
    it('should have 7 doc types', () => {
      expect(Object.keys(DocType).length).toBe(7);
    });

    it('should include common types', () => {
      expect(DocType.GUIDE).toBe('guide');
      expect(DocType.API).toBe('api');
      expect(DocType.TUTORIAL).toBe('tutorial');
      expect(DocType.FAQ).toBe('faq');
    });
  });

  describe('DocFormat Constants', () => {
    it('should have 4 formats', () => {
      expect(Object.keys(DocFormat).length).toBe(4);
    });

    it('should include common formats', () => {
      expect(DocFormat.MARKDOWN).toBe('markdown');
      expect(DocFormat.HTML).toBe('html');
    });
  });

  describe('TemplateEngine', () => {
    let engine;

    beforeEach(() => {
      engine = new TemplateEngine();
    });

    it('should have default helpers', () => {
      expect(engine.helpers.size).toBeGreaterThan(0);
    });

    it('should render date helper', () => {
      const result = engine.render('Today: {{date}}');
      expect(result).toMatch(/Today: \d{4}-\d{2}-\d{2}/);
    });

    it('should render year helper', () => {
      const result = engine.render('(c) {{year}}');
      expect(result).toContain(new Date().getFullYear().toString());
    });

    it('should render uppercase helper', () => {
      const result = engine.render('{{uppercase title}}', { title: 'hello' });
      expect(result).toBe('HELLO');
    });

    it('should render lowercase helper', () => {
      const result = engine.render('{{lowercase title}}', { title: 'HELLO' });
      expect(result).toBe('hello');
    });

    it('should render capitalize helper', () => {
      const result = engine.render('{{capitalize name}}', { name: 'john' });
      expect(result).toBe('John');
    });

    it('should render kebabCase helper', () => {
      const result = engine.render('{{kebabCase title}}', { title: 'Hello World' });
      expect(result).toBe('hello-world');
    });

    it('should render list helper', () => {
      const result = engine.render('{{list items}}', { items: ['a', 'b', 'c'] });
      expect(result).toBe('- a\n- b\n- c');
    });

    it('should render variables', () => {
      const result = engine.render('Hello {{name}}!', { name: 'World' });
      expect(result).toBe('Hello World!');
    });

    it('should render nested variables', () => {
      const result = engine.render('{{user.name}}', { user: { name: 'John' } });
      expect(result).toBe('John');
    });

    it('should render conditionals', () => {
      const template = '{{#if show}}Visible{{/if}}';
      expect(engine.render(template, { show: true })).toBe('Visible');
      expect(engine.render(template, { show: false })).toBe('');
    });

    it('should render loops', () => {
      const template = '{{#each items}}{{this}} {{/each}}';
      const result = engine.render(template, { items: ['a', 'b', 'c'] });
      expect(result).toContain('a');
      expect(result).toContain('b');
      expect(result).toContain('c');
    });

    it('should render object loops', () => {
      const template = '{{#each users}}{{this.name}} {{/each}}';
      const result = engine.render(template, { users: [{ name: 'John' }, { name: 'Jane' }] });
      expect(result).toContain('John');
      expect(result).toContain('Jane');
    });

    it('should register custom template', () => {
      engine.register('greeting', 'Hello {{name}}!');
      expect(engine.getTemplate('greeting')).toBe('Hello {{name}}!');
    });

    it('should register custom helper', () => {
      engine.registerHelper('double', (val) => val * 2);
      const result = engine.render('{{double num}}', { num: 5 });
      expect(result).toBe('10');
    });
  });

  describe('DocSection', () => {
    it('should create section with defaults', () => {
      const section = new DocSection();
      expect(section.id).toBe('section');
      expect(section.title).toBe('Section');
    });

    it('should create section with options', () => {
      const section = new DocSection({
        id: 'intro',
        title: 'Introduction',
        content: 'This is the intro.'
      });
      expect(section.id).toBe('intro');
      expect(section.title).toBe('Introduction');
      expect(section.content).toBe('This is the intro.');
    });

    it('should add subsection', () => {
      const section = new DocSection({ title: 'Parent' });
      section.addSubsection(new DocSection({ title: 'Child' }));
      expect(section.subsections.length).toBe(1);
    });

    it('should convert to markdown', () => {
      const section = new DocSection({
        title: 'Features',
        content: '- Feature 1\n- Feature 2'
      });
      const md = section.toMarkdown();
      expect(md).toContain('## Features');
      expect(md).toContain('- Feature 1');
    });

    it('should include subsections in markdown', () => {
      const section = new DocSection({ title: 'Parent' });
      section.addSubsection(new DocSection({ title: 'Child', content: 'Child content' }));
      const md = section.toMarkdown();
      expect(md).toContain('### Child');
    });

    it('should convert to JSON', () => {
      const section = new DocSection({ id: 'test', title: 'Test' });
      const json = section.toJSON();
      expect(json.id).toBe('test');
      expect(json.title).toBe('Test');
    });
  });

  describe('DocPage', () => {
    it('should create page with defaults', () => {
      const page = new DocPage();
      expect(page.id).toBe('page');
      expect(page.title).toBe('Page');
    });

    it('should create page with options', () => {
      const page = new DocPage({
        id: 'getting-started',
        title: 'Getting Started',
        description: 'Learn how to get started.',
        type: DocType.TUTORIAL
      });
      expect(page.id).toBe('getting-started');
      expect(page.type).toBe(DocType.TUTORIAL);
    });

    it('should add section', () => {
      const page = new DocPage();
      page.addSection(new DocSection({ title: 'Section 1' }));
      expect(page.sections.length).toBe(1);
    });

    it('should convert to markdown with title', () => {
      const page = new DocPage({ title: 'My Page', description: 'Description' });
      const md = page.toMarkdown();
      expect(md).toContain('# My Page');
      expect(md).toContain('Description');
    });

    it('should include front matter', () => {
      const page = new DocPage({
        title: 'Test',
        frontMatter: { layout: 'default', tags: ['a', 'b'] }
      });
      const md = page.toMarkdown();
      expect(md).toContain('---');
      expect(md).toContain('layout: default');
      expect(md).toContain('- a');
    });

    it('should include sections in markdown', () => {
      const page = new DocPage({ title: 'Page' });
      page.addSection(new DocSection({ title: 'Section', content: 'Content' }));
      const md = page.toMarkdown();
      expect(md).toContain('## Section');
      expect(md).toContain('Content');
    });

    it('should convert to HTML', () => {
      const page = new DocPage({ title: 'Test Page' });
      page.addSection(new DocSection({ title: 'Section', content: '**Bold** text' }));
      const html = page.toHTML();
      expect(html).toContain('<h1>Test Page</h1>');
      expect(html).toContain('<h2>Section</h2>');
      expect(html).toContain('<strong>Bold</strong>');
    });

    it('should convert code blocks to HTML', () => {
      const page = new DocPage({ title: 'Code' });
      page.addSection(new DocSection({
        title: 'Example',
        content: '```javascript\nconst x = 1;\n```'
      }));
      const html = page.toHTML();
      expect(html).toContain('<pre><code');
      expect(html).toContain('const x = 1;');
    });

    it('should convert links to HTML', () => {
      const page = new DocPage({ title: 'Links' });
      page.addSection(new DocSection({
        title: 'Resources',
        content: '[MUSUBI](https://example.com)'
      }));
      const html = page.toHTML();
      expect(html).toContain('<a href="https://example.com">MUSUBI</a>');
    });

    it('should convert to JSON', () => {
      const page = new DocPage({ id: 'test', title: 'Test', path: '/test' });
      const json = page.toJSON();
      expect(json.id).toBe('test');
      expect(json.path).toBe('/test');
    });
  });

  describe('DocSite', () => {
    let site;

    beforeEach(() => {
      site = new DocSite({
        title: 'MUSUBI Docs',
        description: 'Documentation for MUSUBI SDD',
        version: '1.0.0'
      });
    });

    it('should create site with options', () => {
      expect(site.title).toBe('MUSUBI Docs');
      expect(site.version).toBe('1.0.0');
    });

    it('should add page', () => {
      const page = new DocPage({ id: 'intro', title: 'Introduction' });
      site.addPage(page);
      expect(site.pages.size).toBe(1);
    });

    it('should get page by id', () => {
      const page = new DocPage({ id: 'intro', title: 'Introduction' });
      site.addPage(page);
      expect(site.getPage('intro').title).toBe('Introduction');
    });

    it('should set navigation', () => {
      site.setNavigation([{ title: 'Guide', items: [] }]);
      expect(site.navigation.length).toBe(1);
    });

    it('should generate navigation from pages', () => {
      site.addPage(new DocPage({ id: 'guide1', title: 'Guide 1', type: DocType.GUIDE }));
      site.addPage(new DocPage({ id: 'api1', title: 'API 1', type: DocType.API }));
      
      const nav = site.generateNavigation();
      expect(nav.length).toBe(2);
    });

    it('should build markdown files', () => {
      site.addPage(new DocPage({ id: 'intro', title: 'Introduction', path: '/intro' }));
      site.generateNavigation();
      
      const output = site.build();
      expect(output.has('/intro')).toBe(true);
      expect(output.has('_sidebar.md')).toBe(true);
      expect(output.has('index.md')).toBe(true);
    });

    it('should build HTML files', () => {
      site.addPage(new DocPage({ id: 'intro', title: 'Introduction', path: '/intro.md' }));
      site.generateNavigation();
      
      const output = site.build(DocFormat.HTML);
      expect(output.has('/intro.html')).toBe(true);
    });

    it('should generate sidebar', () => {
      site.setNavigation([
        { title: 'Guides', items: [{ title: 'Intro', path: '/intro' }] }
      ]);
      
      const sidebar = site.generateSidebar();
      expect(sidebar).toContain('# MUSUBI Docs');
      expect(sidebar).toContain('## Guides');
      expect(sidebar).toContain('[Intro](/intro)');
    });

    it('should generate index', () => {
      site.setNavigation([
        { title: 'Guides', items: [{ title: 'Intro', path: '/intro' }] }
      ]);
      
      const index = site.generateIndex();
      expect(index).toContain('# MUSUBI Docs');
      expect(index).toContain('Version: 1.0.0');
    });

    it('should convert to JSON', () => {
      site.addPage(new DocPage({ id: 'test', title: 'Test' }));
      const json = site.toJSON();
      expect(json.title).toBe('MUSUBI Docs');
      expect(json.pages.length).toBe(1);
    });
  });

  describe('DocGenerator', () => {
    let generator;

    beforeEach(() => {
      generator = new DocGenerator({ projectRoot: '/test' });
    });

    it('should create site', () => {
      const site = generator.createSite({ title: 'Test Docs' });
      expect(site.title).toBe('Test Docs');
    });

    it('should emit siteCreated event', (done) => {
      generator.on('siteCreated', (data) => {
        expect(data.site).toBeDefined();
        done();
      });
      generator.createSite({ title: 'Test' });
    });

    it('should generate from steering', () => {
      const steering = {
        product: {
          description: 'A test product',
          features: ['Feature 1', 'Feature 2']
        },
        structure: {
          description: 'Architecture overview',
          components: {
            Core: { description: 'Core module' }
          }
        },
        tech: {
          languages: ['JavaScript'],
          frameworks: ['Node.js']
        },
        rules: {
          constitution: 'Project rules here'
        }
      };

      const pages = generator.generateFromSteering(steering);
      expect(pages.length).toBe(4);
      expect(pages.find(p => p.id === 'product')).toBeDefined();
      expect(pages.find(p => p.id === 'architecture')).toBeDefined();
    });

    it('should emit generatedFromSteering event', (done) => {
      generator.on('generatedFromSteering', (data) => {
        expect(data.pages).toBeDefined();
        done();
      });
      generator.generateFromSteering({ product: {} });
    });

    it('should generate API docs', () => {
      const modules = [{
        name: 'core',
        description: 'Core module',
        exports: [{
          name: 'init',
          description: 'Initialize the system',
          signature: 'function init(options)',
          params: [{ name: 'options', type: 'object', description: 'Configuration' }],
          returns: { type: 'void', description: '' }
        }]
      }];

      const pages = generator.generateAPI(modules);
      expect(pages.length).toBe(1);
      expect(pages[0].type).toBe(DocType.API);
    });

    it('should format API entry with example', () => {
      const entry = {
        name: 'test',
        description: 'Test function',
        example: 'test()'
      };
      const content = generator.formatAPIEntry(entry);
      expect(content).toContain('**Example:**');
      expect(content).toContain('test()');
    });

    it('should generate tutorial', () => {
      const tutorial = {
        id: 'getting-started',
        title: 'Getting Started',
        description: 'Learn the basics',
        difficulty: 'beginner',
        prerequisites: ['Node.js installed'],
        steps: [
          { title: 'Install', content: 'Run npm install' },
          { title: 'Configure', content: 'Create config file' }
        ],
        nextSteps: [{ title: 'Advanced', path: '/advanced' }]
      };

      const page = generator.generateTutorial(tutorial);
      expect(page.type).toBe(DocType.TUTORIAL);
      expect(page.sections.length).toBe(4); // prerequisites + 2 steps + next steps
    });

    it('should generate changelog', () => {
      const releases = [
        {
          version: '1.0.0',
          date: '2024-01-01',
          features: ['Initial release'],
          fixes: ['Bug fix'],
          breaking: ['Removed old API']
        }
      ];

      const page = generator.generateChangelog(releases);
      expect(page.type).toBe(DocType.CHANGELOG);
      expect(page.sections.length).toBe(1);
      
      const md = page.toMarkdown();
      expect(md).toContain('[1.0.0]');
      expect(md).toContain('Features');
      expect(md).toContain('Bug Fixes');
      expect(md).toContain('Breaking Changes');
    });

    it('should generate FAQ', () => {
      const questions = [
        { question: 'What is MUSUBI?', answer: 'A framework for SDD.' },
        { question: 'How do I install?', answer: 'Use npm install.' }
      ];

      const page = generator.generateFAQ(questions);
      expect(page.type).toBe(DocType.FAQ);
      expect(page.sections.length).toBe(2);
    });

    it('should build site', () => {
      const site = generator.createSite({ title: 'Test' });
      site.addPage(new DocPage({ id: 'intro', title: 'Intro' }));
      site.generateNavigation();

      const output = generator.build(site);
      expect(output.size).toBeGreaterThan(0);
    });

    it('should emit built event', (done) => {
      generator.on('built', (data) => {
        expect(data.files).toBeDefined();
        done();
      });

      const site = generator.createSite({ title: 'Test' });
      site.addPage(new DocPage({ id: 'intro', title: 'Intro' }));
      site.generateNavigation();
      generator.build(site);
    });

    it('should convert to JSON', () => {
      generator.createSite({ title: 'Test' });
      const json = generator.toJSON();
      expect(json.projectRoot).toBe('/test');
      expect(json.site).toBeDefined();
    });
  });

  describe('Factory Functions', () => {
    it('should create generator', () => {
      const generator = createDocGenerator();
      expect(generator).toBeInstanceOf(DocGenerator);
    });

    it('should create site', () => {
      const site = createDocSite({ title: 'Test' });
      expect(site).toBeInstanceOf(DocSite);
      expect(site.title).toBe('Test');
    });

    it('should create page', () => {
      const page = createDocPage({ title: 'Test' });
      expect(page).toBeInstanceOf(DocPage);
    });

    it('should create section', () => {
      const section = createDocSection({ title: 'Test' });
      expect(section).toBeInstanceOf(DocSection);
    });
  });
});
