/**
 * MUSUBI SDD - Documentation Generator
 * Sprint 6.3: Documentation Site Generation
 */

const { EventEmitter } = require('events');

// ============================================================================
// Documentation Types
// ============================================================================

const DocType = {
  GUIDE: 'guide',
  API: 'api',
  TUTORIAL: 'tutorial',
  REFERENCE: 'reference',
  FAQ: 'faq',
  CHANGELOG: 'changelog',
  ARCHITECTURE: 'architecture'
};

const DocFormat = {
  MARKDOWN: 'markdown',
  HTML: 'html',
  PDF: 'pdf',
  DOCX: 'docx'
};

// ============================================================================
// Template Engine
// ============================================================================

class TemplateEngine {
  constructor() {
    this.templates = new Map();
    this.helpers = new Map();
    this.registerDefaults();
  }

  registerDefaults() {
    // Default helpers
    this.helpers.set('date', () => new Date().toISOString().split('T')[0]);
    this.helpers.set('year', () => new Date().getFullYear());
    this.helpers.set('uppercase', (str) => str.toUpperCase());
    this.helpers.set('lowercase', (str) => str.toLowerCase());
    this.helpers.set('capitalize', (str) => str.charAt(0).toUpperCase() + str.slice(1));
    this.helpers.set('kebabCase', (str) => str.toLowerCase().replace(/\s+/g, '-'));
    this.helpers.set('list', (items) => items.map(i => `- ${i}`).join('\n'));
    this.helpers.set('numberedList', (items) => items.map((i, idx) => `${idx + 1}. ${i}`).join('\n'));
    this.helpers.set('codeBlock', (code, lang = '') => `\`\`\`${lang}\n${code}\n\`\`\``);
  }

  register(name, template) {
    this.templates.set(name, template);
  }

  registerHelper(name, fn) {
    this.helpers.set(name, fn);
  }

  render(template, context = {}) {
    let result = template;

    // Loops FIRST: {{#each items}}...{{/each}}
    result = result.replace(/\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, key, content) => {
      const items = this.resolveValue(key.trim(), context);
      if (!Array.isArray(items)) return '';
      return items.map(item => {
        let itemContent = content;
        // Replace {{this}} with the item
        itemContent = itemContent.replace(/\{\{this\}\}/g, typeof item === 'object' ? JSON.stringify(item) : item);
        // Replace {{this.prop}} with item properties
        itemContent = itemContent.replace(/\{\{this\.([^}]+)\}\}/g, (_, prop) => item[prop.trim()] || '');
        return itemContent;
      }).join('');
    });

    // Conditionals: {{#if condition}}...{{/if}}
    result = result.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, condition, content) => {
      const value = this.resolveValue(condition.trim(), context);
      return value ? content : '';
    });

    // Apply helpers: {{helper arg}}
    for (const [name, fn] of this.helpers) {
      const regex = new RegExp(`\\{\\{${name}\\s+([^}]+)\\}\\}`, 'g');
      result = result.replace(regex, (_, arg) => {
        try {
          const value = this.resolveValue(arg.trim(), context);
          return fn(value);
        } catch {
          return '';
        }
      });

      // No-arg helpers: {{helper}}
      const noArgRegex = new RegExp(`\\{\\{${name}\\}\\}`, 'g');
      result = result.replace(noArgRegex, () => fn());
    }

    // Apply variables LAST: {{variable}}
    result = result.replace(/\{\{([^#/][^}]*)\}\}/g, (_, key) => {
      return this.resolveValue(key.trim(), context) || '';
    });

    return result;
  }

  resolveValue(key, context) {
    const parts = key.split('.');
    let value = context;
    for (const part of parts) {
      if (value == null) return undefined;
      value = value[part];
    }
    return value;
  }

  getTemplate(name) {
    return this.templates.get(name);
  }
}

// ============================================================================
// Documentation Section
// ============================================================================

class DocSection {
  constructor(options = {}) {
    this.id = options.id || 'section';
    this.title = options.title || 'Section';
    this.content = options.content || '';
    this.subsections = options.subsections || [];
    this.order = options.order || 0;
    this.type = options.type || DocType.GUIDE;
    this.metadata = options.metadata || {};
  }

  addSubsection(section) {
    this.subsections.push(section);
    return this;
  }

  toMarkdown(level = 2) {
    const heading = '#'.repeat(level);
    let md = `${heading} ${this.title}\n\n`;
    
    if (this.content) {
      md += `${this.content}\n\n`;
    }

    for (const sub of this.subsections) {
      md += sub.toMarkdown(level + 1);
    }

    return md;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      subsections: this.subsections.map(s => s.toJSON()),
      type: this.type,
      metadata: this.metadata
    };
  }
}

// ============================================================================
// Documentation Page
// ============================================================================

class DocPage {
  constructor(options = {}) {
    this.id = options.id || 'page';
    this.title = options.title || 'Page';
    this.description = options.description || '';
    this.sections = options.sections || [];
    this.frontMatter = options.frontMatter || {};
    this.type = options.type || DocType.GUIDE;
    this.path = options.path || '';
    this.order = options.order || 0;
  }

  addSection(section) {
    this.sections.push(section);
    return this;
  }

  toMarkdown() {
    let md = '';

    // Front matter
    if (Object.keys(this.frontMatter).length > 0) {
      md += '---\n';
      for (const [key, value] of Object.entries(this.frontMatter)) {
        if (Array.isArray(value)) {
          md += `${key}:\n${value.map(v => `  - ${v}`).join('\n')}\n`;
        } else {
          md += `${key}: ${value}\n`;
        }
      }
      md += '---\n\n';
    }

    // Title and description
    md += `# ${this.title}\n\n`;
    if (this.description) {
      md += `${this.description}\n\n`;
    }

    // Sections
    for (const section of this.sections) {
      md += section.toMarkdown();
    }

    return md;
  }

  toHTML() {
    const markdown = this.toMarkdown();
    return this.markdownToHTML(markdown);
  }

  markdownToHTML(md) {
    let html = md;

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Paragraphs
    html = html.replace(/\n\n([^<\n][^\n]+)\n/g, '\n\n<p>$1</p>\n');

    return html;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      sections: this.sections.map(s => s.toJSON()),
      path: this.path,
      type: this.type
    };
  }
}

// ============================================================================
// Documentation Site
// ============================================================================

class DocSite {
  constructor(options = {}) {
    this.title = options.title || 'Documentation';
    this.description = options.description || '';
    this.version = options.version || '1.0.0';
    this.baseUrl = options.baseUrl || '/';
    this.pages = new Map();
    this.navigation = [];
    this.theme = options.theme || 'default';
    this.metadata = options.metadata || {};
  }

  addPage(page) {
    this.pages.set(page.id, page);
    return this;
  }

  getPage(id) {
    return this.pages.get(id);
  }

  setNavigation(nav) {
    this.navigation = nav;
    return this;
  }

  generateNavigation() {
    const nav = [];
    const pagesByType = new Map();

    for (const page of this.pages.values()) {
      if (!pagesByType.has(page.type)) {
        pagesByType.set(page.type, []);
      }
      pagesByType.get(page.type).push(page);
    }

    for (const [type, pages] of pagesByType) {
      nav.push({
        title: type.charAt(0).toUpperCase() + type.slice(1),
        items: pages.sort((a, b) => a.order - b.order).map(p => ({
          title: p.title,
          path: p.path || `/${p.id}`
        }))
      });
    }

    this.navigation = nav;
    return nav;
  }

  build(format = DocFormat.MARKDOWN) {
    const output = new Map();

    for (const [id, page] of this.pages) {
      const path = page.path || `${id}.md`;
      
      switch (format) {
        case DocFormat.HTML:
          output.set(path.replace('.md', '.html'), page.toHTML());
          break;
        case DocFormat.MARKDOWN:
        default:
          output.set(path, page.toMarkdown());
      }
    }

    // Generate index/sidebar
    output.set('_sidebar.md', this.generateSidebar());
    output.set('index.md', this.generateIndex());

    return output;
  }

  generateSidebar() {
    let sidebar = `# ${this.title}\n\n`;

    for (const group of this.navigation) {
      sidebar += `## ${group.title}\n\n`;
      for (const item of group.items) {
        sidebar += `- [${item.title}](${item.path})\n`;
      }
      sidebar += '\n';
    }

    return sidebar;
  }

  generateIndex() {
    let index = `# ${this.title}\n\n`;
    
    if (this.description) {
      index += `${this.description}\n\n`;
    }

    index += `Version: ${this.version}\n\n`;
    index += '## Contents\n\n';

    for (const group of this.navigation) {
      index += `### ${group.title}\n\n`;
      for (const item of group.items) {
        index += `- [${item.title}](${item.path})\n`;
      }
      index += '\n';
    }

    return index;
  }

  toJSON() {
    return {
      title: this.title,
      description: this.description,
      version: this.version,
      baseUrl: this.baseUrl,
      pages: Array.from(this.pages.values()).map(p => p.toJSON()),
      navigation: this.navigation,
      theme: this.theme
    };
  }
}

// ============================================================================
// Documentation Generator
// ============================================================================

class DocGenerator extends EventEmitter {
  constructor(options = {}) {
    super();
    this.projectRoot = options.projectRoot || process.cwd();
    this.templateEngine = new TemplateEngine();
    this.site = null;
  }

  createSite(options = {}) {
    this.site = new DocSite(options);
    this.emit('siteCreated', { site: this.site });
    return this.site;
  }

  generateFromSteering(steering) {
    const pages = [];

    // Product documentation
    if (steering.product) {
      const productPage = new DocPage({
        id: 'product',
        title: 'Product Overview',
        description: steering.product.description || '',
        type: DocType.GUIDE,
        path: '/product'
      });

      if (steering.product.features) {
        productPage.addSection(new DocSection({
          id: 'features',
          title: 'Features',
          content: steering.product.features.map(f => `- ${f}`).join('\n')
        }));
      }

      pages.push(productPage);
    }

    // Architecture documentation
    if (steering.structure) {
      const archPage = new DocPage({
        id: 'architecture',
        title: 'Architecture',
        description: steering.structure.description || '',
        type: DocType.ARCHITECTURE,
        path: '/architecture'
      });

      if (steering.structure.components) {
        for (const [name, component] of Object.entries(steering.structure.components)) {
          archPage.addSection(new DocSection({
            id: name,
            title: name,
            content: component.description || ''
          }));
        }
      }

      pages.push(archPage);
    }

    // Technology documentation
    if (steering.tech) {
      const techPage = new DocPage({
        id: 'technology',
        title: 'Technology Stack',
        type: DocType.REFERENCE,
        path: '/technology'
      });

      if (steering.tech.languages) {
        techPage.addSection(new DocSection({
          id: 'languages',
          title: 'Languages',
          content: steering.tech.languages.map(l => `- ${l}`).join('\n')
        }));
      }

      if (steering.tech.frameworks) {
        techPage.addSection(new DocSection({
          id: 'frameworks',
          title: 'Frameworks',
          content: steering.tech.frameworks.map(f => `- ${f}`).join('\n')
        }));
      }

      pages.push(techPage);
    }

    // Rules/Constitution
    if (steering.rules) {
      const rulesPage = new DocPage({
        id: 'rules',
        title: 'Project Rules',
        type: DocType.REFERENCE,
        path: '/rules'
      });

      if (steering.rules.constitution) {
        rulesPage.addSection(new DocSection({
          id: 'constitution',
          title: 'Constitution',
          content: steering.rules.constitution
        }));
      }

      pages.push(rulesPage);
    }

    this.emit('generatedFromSteering', { pages });
    return pages;
  }

  generateAPI(modules) {
    const apiPages = [];

    for (const mod of modules) {
      const page = new DocPage({
        id: `api-${mod.name}`,
        title: mod.name,
        description: mod.description || '',
        type: DocType.API,
        path: `/api/${mod.name}`
      });

      if (mod.exports) {
        for (const exp of mod.exports) {
          const section = new DocSection({
            id: exp.name,
            title: exp.name,
            content: this.formatAPIEntry(exp)
          });
          page.addSection(section);
        }
      }

      apiPages.push(page);
    }

    this.emit('generatedAPI', { pages: apiPages });
    return apiPages;
  }

  formatAPIEntry(entry) {
    let content = '';

    if (entry.description) {
      content += `${entry.description}\n\n`;
    }

    if (entry.signature) {
      content += `\`\`\`javascript\n${entry.signature}\n\`\`\`\n\n`;
    }

    if (entry.params) {
      content += '**Parameters:**\n\n';
      for (const param of entry.params) {
        content += `- \`${param.name}\` (${param.type}): ${param.description || ''}\n`;
      }
      content += '\n';
    }

    if (entry.returns) {
      content += `**Returns:** \`${entry.returns.type}\` - ${entry.returns.description || ''}\n\n`;
    }

    if (entry.example) {
      content += '**Example:**\n\n';
      content += `\`\`\`javascript\n${entry.example}\n\`\`\`\n\n`;
    }

    return content;
  }

  generateTutorial(tutorial) {
    const page = new DocPage({
      id: `tutorial-${tutorial.id}`,
      title: tutorial.title,
      description: tutorial.description || '',
      type: DocType.TUTORIAL,
      path: `/tutorials/${tutorial.id}`,
      frontMatter: {
        difficulty: tutorial.difficulty || 'beginner',
        duration: tutorial.duration || '10 minutes',
        tags: tutorial.tags || []
      }
    });

    if (tutorial.prerequisites) {
      page.addSection(new DocSection({
        id: 'prerequisites',
        title: 'Prerequisites',
        content: tutorial.prerequisites.map(p => `- ${p}`).join('\n')
      }));
    }

    if (tutorial.steps) {
      for (let i = 0; i < tutorial.steps.length; i++) {
        const step = tutorial.steps[i];
        page.addSection(new DocSection({
          id: `step-${i + 1}`,
          title: `Step ${i + 1}: ${step.title}`,
          content: step.content
        }));
      }
    }

    if (tutorial.nextSteps) {
      page.addSection(new DocSection({
        id: 'next-steps',
        title: 'Next Steps',
        content: tutorial.nextSteps.map(n => `- [${n.title}](${n.path})`).join('\n')
      }));
    }

    this.emit('generatedTutorial', { page });
    return page;
  }

  generateChangelog(releases) {
    const page = new DocPage({
      id: 'changelog',
      title: 'Changelog',
      description: 'All notable changes to this project.',
      type: DocType.CHANGELOG,
      path: '/changelog'
    });

    for (const release of releases) {
      const content = [];

      if (release.features && release.features.length > 0) {
        content.push('### Features\n');
        content.push(release.features.map(f => `- ${f}`).join('\n'));
      }

      if (release.fixes && release.fixes.length > 0) {
        content.push('\n### Bug Fixes\n');
        content.push(release.fixes.map(f => `- ${f}`).join('\n'));
      }

      if (release.breaking && release.breaking.length > 0) {
        content.push('\n### Breaking Changes\n');
        content.push(release.breaking.map(b => `- ⚠️ ${b}`).join('\n'));
      }

      page.addSection(new DocSection({
        id: `v${release.version}`,
        title: `[${release.version}] - ${release.date}`,
        content: content.join('\n')
      }));
    }

    return page;
  }

  generateFAQ(questions) {
    const page = new DocPage({
      id: 'faq',
      title: 'Frequently Asked Questions',
      description: 'Common questions and answers about this project.',
      type: DocType.FAQ,
      path: '/faq'
    });

    for (const q of questions) {
      page.addSection(new DocSection({
        id: q.id || q.question.substring(0, 20).toLowerCase().replace(/\s+/g, '-'),
        title: q.question,
        content: q.answer
      }));
    }

    return page;
  }

  build(site, options = {}) {
    const format = options.format || DocFormat.MARKDOWN;
    const output = site.build(format);
    
    this.emit('built', { 
      format, 
      files: Array.from(output.keys()),
      site
    });

    return output;
  }

  toJSON() {
    return {
      projectRoot: this.projectRoot,
      site: this.site ? this.site.toJSON() : null
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

function createDocGenerator(options = {}) {
  return new DocGenerator(options);
}

function createDocSite(options = {}) {
  return new DocSite(options);
}

function createDocPage(options = {}) {
  return new DocPage(options);
}

function createDocSection(options = {}) {
  return new DocSection(options);
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  // Constants
  DocType,
  DocFormat,
  
  // Classes
  TemplateEngine,
  DocSection,
  DocPage,
  DocSite,
  DocGenerator,
  
  // Factories
  createDocGenerator,
  createDocSite,
  createDocPage,
  createDocSection
};
