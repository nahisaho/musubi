/**
 * Tech Article Generator
 *
 * Generates publication-ready technical articles for various platforms.
 *
 * Requirement: IMP-6.2-006-02
 *
 * @module enterprise/tech-article
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Supported platforms
 */
const PLATFORM = {
  QIITA: 'qiita',
  ZENN: 'zenn',
  MEDIUM: 'medium',
  DEVTO: 'devto',
  GENERIC: 'generic',
};

/**
 * Article type enum
 */
const ARTICLE_TYPE = {
  TUTORIAL: 'tutorial',
  DEEP_DIVE: 'deep-dive',
  ANNOUNCEMENT: 'announcement',
  COMPARISON: 'comparison',
  HOW_TO: 'how-to',
  CASE_STUDY: 'case-study',
};

/**
 * Tech Article Generator
 */
class TechArticleGenerator {
  /**
   * Create a new TechArticleGenerator
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = {
      outputDir: config.outputDir || 'docs/articles',
      defaultPlatform: config.defaultPlatform || PLATFORM.GENERIC,
      defaultLanguage: config.defaultLanguage || 'ja',
      includeTableOfContents: config.includeTableOfContents !== false,
      includeFrontMatter: config.includeFrontMatter !== false,
      ...config,
    };

    this.templates = this.loadTemplates();
  }

  /**
   * Load platform templates
   * @returns {Object} Templates by platform
   */
  loadTemplates() {
    return {
      [PLATFORM.QIITA]: {
        frontMatter: meta => `---
title: "${meta.title}"
tags: [${meta.tags.map(t => `"${t}"`).join(', ')}]
private: false
---`,
        codeBlock: (lang, code) => `\`\`\`${lang}\n${code}\n\`\`\``,
        note: (text, type = 'info') => `:::note ${type}\n${text}\n:::`,
        link: (text, url) => `[${text}](${url})`,
      },
      [PLATFORM.ZENN]: {
        frontMatter: meta => `---
title: "${meta.title}"
emoji: "${meta.emoji || '📝'}"
type: "${meta.articleType || 'tech'}"
topics: [${meta.tags.map(t => `"${t}"`).join(', ')}]
published: true
---`,
        codeBlock: (lang, code, filename) =>
          filename
            ? `\`\`\`${lang}:${filename}\n${code}\n\`\`\``
            : `\`\`\`${lang}\n${code}\n\`\`\``,
        note: (text, type = 'info') => `:::message ${type === 'warn' ? 'alert' : ''}\n${text}\n:::`,
        link: (text, url) => `[${text}](${url})`,
      },
      [PLATFORM.MEDIUM]: {
        frontMatter: () => '', // Medium doesn't use front matter
        codeBlock: (lang, code) => `\`\`\`${lang}\n${code}\n\`\`\``,
        note: text => `> **Note:** ${text}`,
        link: (text, url) => `[${text}](${url})`,
      },
      [PLATFORM.DEVTO]: {
        frontMatter: meta => `---
title: "${meta.title}"
published: true
description: "${meta.description || ''}"
tags: ${meta.tags.slice(0, 4).join(', ')}
cover_image: ${meta.coverImage || ''}
---`,
        codeBlock: (lang, code) => `\`\`\`${lang}\n${code}\n\`\`\``,
        note: (text, type = 'info') =>
          `{% ${type === 'warn' ? 'warning' : type} %}\n${text}\n{% end${type === 'warn' ? 'warning' : type} %}`,
        link: (text, url) => `[${text}](${url})`,
      },
      [PLATFORM.GENERIC]: {
        frontMatter: meta => `---
title: "${meta.title}"
date: "${meta.date || new Date().toISOString()}"
author: "${meta.author || 'MUSUBI SDD'}"
tags: [${meta.tags.map(t => `"${t}"`).join(', ')}]
---`,
        codeBlock: (lang, code) => `\`\`\`${lang}\n${code}\n\`\`\``,
        note: text => `> **Note:** ${text}`,
        link: (text, url) => `[${text}](${url})`,
      },
    };
  }

  /**
   * Generate article from template
   * @param {Object} content - Article content
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated article info
   */
  async generate(content, options = {}) {
    const platform = options.platform || this.config.defaultPlatform;
    const template = this.templates[platform] || this.templates[PLATFORM.GENERIC];

    const metadata = {
      title: content.title || 'Untitled Article',
      description: content.description || '',
      tags: content.tags || [],
      author: content.author || 'MUSUBI SDD',
      date: new Date().toISOString(),
      emoji: content.emoji || '📝',
      articleType: content.articleType || ARTICLE_TYPE.TUTORIAL,
      coverImage: content.coverImage || '',
    };

    const sections = [];

    // Front matter
    if (this.config.includeFrontMatter) {
      sections.push(template.frontMatter(metadata));
      sections.push('');
    }

    // Title (for platforms that don't include it in front matter)
    if (platform === PLATFORM.MEDIUM) {
      sections.push(`# ${metadata.title}`);
      sections.push('');
    }

    // Introduction
    if (content.introduction) {
      sections.push(content.introduction);
      sections.push('');
    }

    // Table of Contents
    if (this.config.includeTableOfContents && content.sections) {
      sections.push('## 目次');
      sections.push('');
      content.sections.forEach((section, idx) => {
        sections.push(`${idx + 1}. [${section.title}](#${this.slugify(section.title)})`);
      });
      sections.push('');
    }

    // Main sections
    if (content.sections) {
      for (const section of content.sections) {
        sections.push(`## ${section.title}`);
        sections.push('');

        if (section.content) {
          sections.push(section.content);
          sections.push('');
        }

        // Code examples
        if (section.codeExamples) {
          for (const example of section.codeExamples) {
            if (example.description) {
              sections.push(example.description);
              sections.push('');
            }
            sections.push(
              template.codeBlock(example.language || 'javascript', example.code, example.filename)
            );
            sections.push('');
          }
        }

        // Notes
        if (section.notes) {
          for (const note of section.notes) {
            sections.push(template.note(note.text, note.type));
            sections.push('');
          }
        }

        // Subsections
        if (section.subsections) {
          for (const sub of section.subsections) {
            sections.push(`### ${sub.title}`);
            sections.push('');
            if (sub.content) {
              sections.push(sub.content);
              sections.push('');
            }
          }
        }
      }
    }

    // Benchmarks
    if (content.benchmarks) {
      sections.push('## ベンチマーク結果');
      sections.push('');
      sections.push('| 項目 | 値 |');
      sections.push('|------|-----|');
      for (const [key, value] of Object.entries(content.benchmarks)) {
        sections.push(`| ${key} | ${value} |`);
      }
      sections.push('');
    }

    // Conclusion
    if (content.conclusion) {
      sections.push('## まとめ');
      sections.push('');
      sections.push(content.conclusion);
      sections.push('');
    }

    // References
    if (content.references && content.references.length > 0) {
      sections.push('## 参考文献');
      sections.push('');
      for (const ref of content.references) {
        sections.push(`- ${template.link(ref.title, ref.url)}`);
      }
      sections.push('');
    }

    // Footer
    if (content.footer) {
      sections.push('---');
      sections.push('');
      sections.push(content.footer);
    }

    const article = sections.join('\n');
    const filePath = await this.saveArticle(article, metadata, platform);

    return {
      article,
      metadata,
      filePath,
      platform,
      wordCount: this.countWords(article),
      readingTime: this.estimateReadingTime(article),
    };
  }

  /**
   * Generate article from experiment report
   * @param {Object} experimentReport - Experiment report data
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated article info
   */
  async generateFromExperiment(experimentReport, options = {}) {
    const content = {
      title: options.title || `実験レポート: ${experimentReport.metadata?.title || 'Unknown'}`,
      description: options.description || '実験結果と観察のレポート',
      tags: options.tags || ['experiment', 'test', 'report'],
      introduction: options.introduction || this.generateExperimentIntroduction(experimentReport),
      sections: this.generateExperimentSections(experimentReport),
      benchmarks: this.extractBenchmarks(experimentReport),
      conclusion: options.conclusion || this.generateExperimentConclusion(experimentReport),
      references: options.references || [],
    };

    return this.generate(content, options);
  }

  /**
   * Generate introduction from experiment
   * @param {Object} report - Experiment report
   * @returns {string} Introduction text
   */
  generateExperimentIntroduction(report) {
    const summary = report.summary || {};
    return (
      `本記事では、${report.metadata?.title || 'テスト'}の実験結果を報告します。` +
      `合計${summary.total || 0}件のテストを実行し、` +
      `${summary.passRate || '0%'}のパス率を達成しました。`
    );
  }

  /**
   * Generate sections from experiment
   * @param {Object} report - Experiment report
   * @returns {Array} Sections
   */
  generateExperimentSections(report) {
    const sections = [];

    // Summary section
    sections.push({
      title: '実験サマリー',
      content: `
| 指標 | 値 |
|------|-----|
| 総テスト数 | ${report.summary?.total || 0} |
| 成功 | ${report.summary?.passed || 0} |
| 失敗 | ${report.summary?.failed || 0} |
| スキップ | ${report.summary?.skipped || 0} |
| パス率 | ${report.summary?.passRate || '0%'} |
      `.trim(),
    });

    // Metrics section (if available)
    if (report.metrics && Object.keys(report.metrics).length > 0) {
      sections.push({
        title: 'メトリクス',
        content: this.formatMetricsSection(report.metrics),
      });
    }

    // Observations section
    if (report.observations && report.observations.length > 0) {
      sections.push({
        title: '観察結果',
        content: report.observations.map(o => `- ${o}`).join('\n'),
      });
    }

    return sections;
  }

  /**
   * Format metrics section
   * @param {Object} metrics - Metrics object
   * @returns {string} Formatted content
   */
  formatMetricsSection(metrics) {
    const lines = [];

    if (metrics.performance) {
      lines.push('### パフォーマンス');
      lines.push('');
      lines.push('| 指標 | 値 |');
      lines.push('|------|-----|');
      for (const [key, value] of Object.entries(metrics.performance)) {
        lines.push(`| ${key} | ${value} |`);
      }
      lines.push('');
    }

    if (metrics.coverage) {
      lines.push('### カバレッジ');
      lines.push('');
      lines.push('| 種別 | 値 |');
      lines.push('|------|-----|');
      for (const [key, value] of Object.entries(metrics.coverage)) {
        lines.push(`| ${key} | ${value} |`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Extract benchmarks from report
   * @param {Object} report - Experiment report
   * @returns {Object} Benchmarks
   */
  extractBenchmarks(report) {
    const benchmarks = {};

    if (report.metrics?.performance) {
      Object.assign(benchmarks, report.metrics.performance);
    }

    if (report.summary?.duration) {
      benchmarks['Total Duration'] = `${report.summary.duration}ms`;
    }

    return Object.keys(benchmarks).length > 0 ? benchmarks : null;
  }

  /**
   * Generate conclusion from experiment
   * @param {Object} report - Experiment report
   * @returns {string} Conclusion text
   */
  generateExperimentConclusion(report) {
    const summary = report.summary || {};
    const passRate = parseFloat(summary.passRate) || 0;

    if (passRate >= 95) {
      return '実験は非常に成功裏に完了しました。すべての品質基準を満たしています。';
    } else if (passRate >= 80) {
      return '実験は概ね成功しましたが、いくつかの改善点が見つかりました。';
    } else if (passRate >= 50) {
      return '実験結果は混合的でした。重大な問題がいくつか検出されました。';
    } else {
      return '実験では多くの問題が検出されました。根本的な見直しが必要です。';
    }
  }

  /**
   * Save article to file
   * @param {string} content - Article content
   * @param {Object} metadata - Article metadata
   * @param {string} platform - Target platform
   * @returns {Promise<string>} File path
   */
  async saveArticle(content, metadata, platform) {
    await this.ensureOutputDir();

    const slug = this.slugify(metadata.title);
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${timestamp}-${slug}-${platform}.md`;
    const filePath = path.join(this.config.outputDir, fileName);

    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Ensure output directory exists
   * @returns {Promise<void>}
   */
  async ensureOutputDir() {
    await fs.mkdir(this.config.outputDir, { recursive: true });
  }

  /**
   * Convert string to slug
   * @param {string} text - Input text
   * @returns {string} Slug
   */
  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  /**
   * Count words in text
   * @param {string} text - Input text
   * @returns {number} Word count
   */
  countWords(text) {
    // Count Japanese characters + English words
    const japanese = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g) || []).length;
    const english = (text.match(/\b\w+\b/g) || []).length;
    return japanese + english;
  }

  /**
   * Estimate reading time
   * @param {string} text - Article text
   * @returns {string} Reading time estimate
   */
  estimateReadingTime(text) {
    const words = this.countWords(text);
    // Average reading speed: 400 characters/words per minute for Japanese
    const minutes = Math.ceil(words / 400);
    return `約${minutes}分`;
  }

  /**
   * Get platform template
   * @param {string} platform - Platform name
   * @returns {Object} Template
   */
  getTemplate(platform) {
    return this.templates[platform] || this.templates[PLATFORM.GENERIC];
  }

  /**
   * Register custom template
   * @param {string} platform - Platform name
   * @param {Object} template - Template object
   */
  registerTemplate(platform, template) {
    this.templates[platform] = template;
  }
}

/**
 * Create a new TechArticleGenerator instance
 * @param {Object} config - Configuration options
 * @returns {TechArticleGenerator}
 */
function createTechArticleGenerator(config = {}) {
  return new TechArticleGenerator(config);
}

module.exports = {
  TechArticleGenerator,
  createTechArticleGenerator,
  PLATFORM,
  ARTICLE_TYPE,
};
