/**
 * @fileoverview Multi-language Template Manager
 * @module templates/locale-manager
 * @description Manages localized templates for MUSUBI SDD
 */

'use strict';

const fs = require('fs-extra');
const path = require('path');

/**
 * Supported locales
 */
const SUPPORTED_LOCALES = ['en', 'ja', 'zh', 'ko', 'es', 'de', 'fr'];

/**
 * Template category to directory mapping
 */
const TEMPLATE_CATEGORIES = {
  requirements: 'requirements',
  design: 'design',
  tasks: 'tasks',
  adr: 'adr-template',
  research: 'research',
  'workflow-guide': 'workflow-guide',
};

/**
 * Locale display names
 */
const LOCALE_NAMES = {
  en: 'English',
  ja: '日本語',
  zh: '中文',
  ko: '한국어',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
};

/**
 * Multi-language Template Manager
 */
class LocaleManager {
  /**
   * Create a LocaleManager instance
   * @param {string} projectPath - Project root path
   * @param {Object} options - Configuration options
   */
  constructor(projectPath, options = {}) {
    this.projectPath = projectPath;
    this.templatesPath = path.join(projectPath, 'steering', 'templates');
    this.defaultLocale = options.defaultLocale || 'en';
    this.fallbackLocale = options.fallbackLocale || 'en';
  }

  /**
   * Get supported locales
   * @returns {string[]} Locale codes
   */
  getSupportedLocales() {
    return [...SUPPORTED_LOCALES];
  }

  /**
   * Get locale display name
   * @param {string} locale - Locale code
   * @returns {string} Display name
   */
  getLocaleName(locale) {
    return LOCALE_NAMES[locale] || locale;
  }

  /**
   * Get template for specific locale
   * @param {string} category - Template category
   * @param {string} locale - Locale code
   * @returns {Promise<string|null>} Template content or null
   */
  async getTemplate(category, locale = this.defaultLocale) {
    const baseName = TEMPLATE_CATEGORIES[category] || category;
    
    // Try exact locale match first
    let templatePath = this.getTemplatePath(baseName, locale);
    if (await fs.pathExists(templatePath)) {
      return fs.readFile(templatePath, 'utf-8');
    }

    // Try fallback locale
    if (locale !== this.fallbackLocale) {
      templatePath = this.getTemplatePath(baseName, this.fallbackLocale);
      if (await fs.pathExists(templatePath)) {
        return fs.readFile(templatePath, 'utf-8');
      }
    }

    // Try base template (no locale suffix)
    templatePath = path.join(this.templatesPath, `${baseName}.md`);
    if (await fs.pathExists(templatePath)) {
      return fs.readFile(templatePath, 'utf-8');
    }

    return null;
  }

  /**
   * Get template path for locale
   * @param {string} baseName - Template base name
   * @param {string} locale - Locale code
   * @returns {string} Template file path
   */
  getTemplatePath(baseName, locale) {
    if (locale === 'en') {
      return path.join(this.templatesPath, `${baseName}.md`);
    }
    return path.join(this.templatesPath, `${baseName}.${locale}.md`);
  }

  /**
   * List available templates
   * @returns {Promise<Object>} Map of category -> available locales
   */
  async listTemplates() {
    const result = {};
    
    if (!await fs.pathExists(this.templatesPath)) {
      return result;
    }

    const files = await fs.readdir(this.templatesPath);
    
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      
      const { category, locale } = this.parseTemplateFilename(file);
      if (!category) continue;
      
      if (!result[category]) {
        result[category] = [];
      }
      if (!result[category].includes(locale)) {
        result[category].push(locale);
      }
    }

    return result;
  }

  /**
   * Parse template filename to extract category and locale
   * @param {string} filename - Template filename
   * @returns {{category: string, locale: string}} Parsed info
   */
  parseTemplateFilename(filename) {
    const baseName = filename.replace('.md', '');
    
    // Check for locale suffix
    for (const locale of SUPPORTED_LOCALES) {
      if (baseName.endsWith(`.${locale}`)) {
        return {
          category: baseName.slice(0, -(locale.length + 1)),
          locale,
        };
      }
    }
    
    // No locale suffix means English
    return {
      category: baseName,
      locale: 'en',
    };
  }

  /**
   * Create template for new locale
   * @param {string} category - Template category
   * @param {string} locale - Target locale
   * @param {string} content - Translated content
   * @returns {Promise<string>} Created file path
   */
  async createLocalizedTemplate(category, locale, content) {
    const baseName = TEMPLATE_CATEGORIES[category] || category;
    const templatePath = this.getTemplatePath(baseName, locale);
    
    await fs.ensureDir(path.dirname(templatePath));
    await fs.writeFile(templatePath, content, 'utf-8');
    
    return templatePath;
  }

  /**
   * Get translation suggestions for a template
   * @param {string} content - Template content
   * @param {string} targetLocale - Target locale
   * @returns {Object} Translation metadata
   */
  getTranslationMetadata(content, targetLocale) {
    // Extract translatable sections
    const sections = [];
    const lines = content.split('\n');
    
    let inCodeBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      
      if (inCodeBlock) continue;
      
      // Headers
      if (line.startsWith('#')) {
        sections.push({
          type: 'header',
          line: i + 1,
          content: line,
          translate: true,
        });
      }
      
      // Paragraphs (non-empty, non-special lines)
      if (line.trim() && !line.startsWith('-') && !line.startsWith('*') && !line.startsWith('|')) {
        sections.push({
          type: 'text',
          line: i + 1,
          content: line,
          translate: true,
        });
      }
    }

    return {
      locale: targetLocale,
      localeName: LOCALE_NAMES[targetLocale] || targetLocale,
      totalLines: lines.length,
      translatableSections: sections.length,
      sections,
    };
  }

  /**
   * Detect locale from project configuration
   * @returns {Promise<string>} Detected locale
   */
  async detectProjectLocale() {
    // Check project.yml
    const projectPath = path.join(this.projectPath, 'steering', 'project.yml');
    if (await fs.pathExists(projectPath)) {
      const yaml = require('js-yaml');
      const content = await fs.readFile(projectPath, 'utf-8');
      const config = yaml.load(content);
      if (config?.locale) {
        return config.locale;
      }
    }

    // Check steering files for locale hints
    const structurePath = path.join(this.projectPath, 'steering', 'structure.md');
    if (await fs.pathExists(structurePath)) {
      const content = await fs.readFile(structurePath, 'utf-8');
      // Check for Japanese characters
      if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(content)) {
        return 'ja';
      }
      // Check for Chinese characters (without Japanese hiragana/katakana)
      if (/[\u4E00-\u9FFF]/.test(content) && !/[\u3040-\u309F\u30A0-\u30FF]/.test(content)) {
        return 'zh';
      }
      // Check for Korean
      if (/[\uAC00-\uD7AF]/.test(content)) {
        return 'ko';
      }
    }

    return this.defaultLocale;
  }
}

module.exports = {
  LocaleManager,
  SUPPORTED_LOCALES,
  LOCALE_NAMES,
  TEMPLATE_CATEGORIES,
};
