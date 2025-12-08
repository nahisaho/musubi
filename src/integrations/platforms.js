/**
 * Multi-Platform Support Module
 * 
 * Provides universal support for 13+ AI coding assistants:
 * - Claude Code (CLAUDE.md)
 * - GitHub Copilot (.github/copilot/)
 * - Cursor (.cursor/rules/, .cursorrules)
 * - Windsurf (.windsurfrules)
 * - Cline (.clinerules)
 * - OpenCode, Amp, Kilo Code, RooCode (AGENTS.md convention)
 */

const path = require('path');
const { EventEmitter } = require('events');

/**
 * Supported AI coding assistant platforms
 */
const Platform = {
  CLAUDE_CODE: 'claude-code',
  GITHUB_COPILOT: 'github-copilot',
  CURSOR: 'cursor',
  WINDSURF: 'windsurf',
  CLINE: 'cline',
  OPENCODE: 'opencode',
  AMP: 'amp',
  KILO_CODE: 'kilo-code',
  ROO_CODE: 'roo-code',
  CODEX: 'codex',
  AIDER: 'aider',
  CONTINUE: 'continue',
  GENERIC: 'generic'
};

/**
 * Platform configuration file patterns
 */
const PlatformConfig = {
  [Platform.CLAUDE_CODE]: {
    name: 'Claude Code',
    files: ['CLAUDE.md'],
    directories: [],
    format: 'markdown',
    supportsSkills: true,
    supportsMemory: true
  },
  [Platform.GITHUB_COPILOT]: {
    name: 'GitHub Copilot',
    files: ['.github/copilot-instructions.md'],
    directories: ['.github/copilot/'],
    format: 'markdown',
    supportsSkills: true,
    supportsMemory: true
  },
  [Platform.CURSOR]: {
    name: 'Cursor',
    files: ['.cursorrules', '.cursor/rules/root.mdc'],
    directories: ['.cursor/rules/'],
    format: 'markdown',
    supportsSkills: true,
    supportsMemory: true
  },
  [Platform.WINDSURF]: {
    name: 'Windsurf',
    files: ['.windsurfrules'],
    directories: ['.windsurf/workflows/'],
    format: 'markdown',
    supportsSkills: true,
    supportsMemory: false
  },
  [Platform.CLINE]: {
    name: 'Cline',
    files: ['.clinerules'],
    directories: ['.cline/'],
    format: 'markdown',
    supportsSkills: true,
    supportsMemory: true
  },
  [Platform.OPENCODE]: {
    name: 'OpenCode',
    files: ['AGENTS.md'],
    directories: [],
    format: 'markdown',
    supportsSkills: true,
    supportsMemory: false
  },
  [Platform.AMP]: {
    name: 'Amp',
    files: ['AGENTS.md'],
    directories: [],
    format: 'markdown',
    supportsSkills: true,
    supportsMemory: false
  },
  [Platform.KILO_CODE]: {
    name: 'Kilo Code',
    files: ['AGENTS.md'],
    directories: [],
    format: 'markdown',
    supportsSkills: true,
    supportsMemory: false
  },
  [Platform.ROO_CODE]: {
    name: 'Roo Code',
    files: ['AGENTS.md', '.roo/'],
    directories: ['.roo/'],
    format: 'markdown',
    supportsSkills: true,
    supportsMemory: true
  },
  [Platform.CODEX]: {
    name: 'Codex CLI',
    files: ['AGENTS.md'],
    directories: [],
    format: 'markdown',
    supportsSkills: true,
    supportsMemory: false
  },
  [Platform.AIDER]: {
    name: 'Aider',
    files: ['.aider.conf.yml', 'CONVENTIONS.md'],
    directories: [],
    format: 'yaml',
    supportsSkills: false,
    supportsMemory: false
  },
  [Platform.CONTINUE]: {
    name: 'Continue',
    files: ['.continue/config.json'],
    directories: ['.continue/'],
    format: 'json',
    supportsSkills: true,
    supportsMemory: false
  },
  [Platform.GENERIC]: {
    name: 'Generic (AGENTS.md)',
    files: ['AGENTS.md'],
    directories: ['steering/'],
    format: 'markdown',
    supportsSkills: true,
    supportsMemory: true
  }
};

/**
 * Platform detector - detects which platforms are configured
 */
class PlatformDetector {
  constructor() {
    this.detectedPlatforms = [];
  }

  /**
   * Detect platforms from file list
   * @param {string[]} files - List of files in project
   * @returns {string[]} Detected platform IDs
   */
  detect(files) {
    this.detectedPlatforms = [];
    const fileSet = new Set(files.map(f => f.replace(/\\/g, '/')));

    for (const [platformId, config] of Object.entries(PlatformConfig)) {
      const hasFile = config.files.some(f => {
        if (f.endsWith('/')) {
          return [...fileSet].some(file => file.startsWith(f));
        }
        return fileSet.has(f);
      });

      const hasDir = config.directories.some(d => {
        return [...fileSet].some(file => file.startsWith(d));
      });

      if (hasFile || hasDir) {
        this.detectedPlatforms.push(platformId);
      }
    }

    return this.detectedPlatforms;
  }

  /**
   * Get primary platform (first detected)
   * @returns {string|null}
   */
  getPrimary() {
    return this.detectedPlatforms[0] || null;
  }

  /**
   * Check if specific platform is detected
   * @param {string} platformId
   * @returns {boolean}
   */
  has(platformId) {
    return this.detectedPlatforms.includes(platformId);
  }

  /**
   * Get platform config
   * @param {string} platformId
   * @returns {object}
   */
  getConfig(platformId) {
    return PlatformConfig[platformId] || PlatformConfig[Platform.GENERIC];
  }
}

/**
 * Platform adapter - adapts content for specific platforms
 */
class PlatformAdapter {
  constructor(platformId) {
    this.platformId = platformId;
    this.config = PlatformConfig[platformId] || PlatformConfig[Platform.GENERIC];
  }

  /**
   * Get platform name
   */
  get name() {
    return this.config.name;
  }

  /**
   * Get primary config file path
   */
  get primaryFile() {
    return this.config.files[0];
  }

  /**
   * Get all config files
   */
  get configFiles() {
    return this.config.files;
  }

  /**
   * Check if platform supports skills
   */
  get supportsSkills() {
    return this.config.supportsSkills;
  }

  /**
   * Check if platform supports memory/steering
   */
  get supportsMemory() {
    return this.config.supportsMemory;
  }

  /**
   * Adapt generic MUSUBI content for this platform
   * @param {object} content - Generic content object
   * @returns {string} Platform-specific formatted content
   */
  adaptContent(content) {
    switch (this.config.format) {
      case 'markdown':
        return this.toMarkdown(content);
      case 'yaml':
        return this.toYaml(content);
      case 'json':
        return this.toJson(content);
      default:
        return this.toMarkdown(content);
    }
  }

  /**
   * Convert to markdown format
   */
  toMarkdown(content) {
    const lines = [];
    
    if (content.title) {
      lines.push(`# ${content.title}`);
      lines.push('');
    }

    if (content.description) {
      lines.push(content.description);
      lines.push('');
    }

    if (content.sections) {
      for (const section of content.sections) {
        lines.push(`## ${section.title}`);
        lines.push('');
        if (section.content) {
          lines.push(section.content);
          lines.push('');
        }
        if (section.items) {
          for (const item of section.items) {
            lines.push(`- ${item}`);
          }
          lines.push('');
        }
      }
    }

    if (content.rules) {
      lines.push('## Rules');
      lines.push('');
      for (const rule of content.rules) {
        lines.push(`- ${rule}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Convert to YAML format
   */
  toYaml(content) {
    const lines = [];
    
    if (content.title) {
      lines.push(`# ${content.title}`);
    }

    for (const [key, value] of Object.entries(content)) {
      if (key === 'title') continue;
      
      if (Array.isArray(value)) {
        lines.push(`${key}:`);
        for (const item of value) {
          if (typeof item === 'object') {
            lines.push(`  - ${JSON.stringify(item)}`);
          } else {
            lines.push(`  - ${item}`);
          }
        }
      } else if (typeof value === 'object') {
        lines.push(`${key}:`);
        for (const [k, v] of Object.entries(value)) {
          lines.push(`  ${k}: ${v}`);
        }
      } else {
        lines.push(`${key}: ${value}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Convert to JSON format
   */
  toJson(content) {
    return JSON.stringify(content, null, 2);
  }

  /**
   * Generate platform-specific AGENTS.md reference
   */
  generateAgentsReference() {
    const lines = [
      `# ${this.config.name} Configuration`,
      '',
      `This project uses MUSUBI SDD with ${this.config.name}.`,
      '',
      '## Steering Files',
      '',
      '- `steering/structure.md` - Architecture patterns',
      '- `steering/tech.md` - Technology stack',
      '- `steering/product.md` - Product context',
      '- `steering/rules/constitution.md` - 9 Constitutional Articles',
      '',
      '## Prompts',
      '',
      '- `#sdd-steering` - Generate/update project memory',
      '- `#sdd-requirements <feature>` - Create EARS requirements',
      '- `#sdd-design <feature>` - Generate C4 + ADR design',
      '- `#sdd-tasks <feature>` - Break down into tasks',
      '- `#sdd-implement <feature>` - Execute implementation',
      '- `#sdd-validate <feature>` - Validate constitutional compliance',
      ''
    ];

    return lines.join('\n');
  }
}

/**
 * Skill converter - converts skills between platform formats
 */
class SkillConverter {
  constructor() {
    this.converters = new Map();
    this.registerDefaultConverters();
  }

  /**
   * Register default converters
   */
  registerDefaultConverters() {
    // Claude to Copilot
    this.register(Platform.CLAUDE_CODE, Platform.GITHUB_COPILOT, (skill) => {
      return {
        ...skill,
        format: 'copilot-instruction',
        file: `.github/copilot/${skill.name}.md`
      };
    });

    // Claude to Cursor
    this.register(Platform.CLAUDE_CODE, Platform.CURSOR, (skill) => {
      return {
        ...skill,
        format: 'cursor-rule',
        file: `.cursor/rules/${skill.name}.mdc`
      };
    });

    // Copilot to Claude
    this.register(Platform.GITHUB_COPILOT, Platform.CLAUDE_CODE, (skill) => {
      return {
        ...skill,
        format: 'claude-skill',
        file: `steering/skills/${skill.name}.md`
      };
    });
  }

  /**
   * Register a converter
   * @param {string} from - Source platform
   * @param {string} to - Target platform
   * @param {Function} converter - Converter function
   */
  register(from, to, converter) {
    const key = `${from}:${to}`;
    this.converters.set(key, converter);
  }

  /**
   * Convert skill between platforms
   * @param {object} skill - Skill definition
   * @param {string} from - Source platform
   * @param {string} to - Target platform
   * @returns {object} Converted skill
   */
  convert(skill, from, to) {
    const key = `${from}:${to}`;
    const converter = this.converters.get(key);
    
    if (!converter) {
      // Generic conversion
      return {
        ...skill,
        format: 'generic',
        originalPlatform: from,
        targetPlatform: to
      };
    }

    return converter(skill);
  }

  /**
   * Check if conversion is supported
   */
  canConvert(from, to) {
    return this.converters.has(`${from}:${to}`);
  }
}

/**
 * Memory synchronizer - syncs steering files across platforms
 */
class MemorySynchronizer {
  constructor() {
    this.sources = new Map();
    this.targets = new Map();
  }

  /**
   * Register source platform memory
   * @param {string} platformId
   * @param {object} memory - Memory content
   */
  registerSource(platformId, memory) {
    this.sources.set(platformId, memory);
  }

  /**
   * Register target platform
   * @param {string} platformId
   * @param {PlatformAdapter} adapter
   */
  registerTarget(platformId, adapter) {
    this.targets.set(platformId, adapter);
  }

  /**
   * Sync memory from source to all targets
   * @param {string} sourceId - Source platform ID
   * @returns {Map<string, string>} Generated content per platform
   */
  sync(sourceId) {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Source platform ${sourceId} not registered`);
    }

    const results = new Map();

    for (const [targetId, adapter] of this.targets) {
      if (targetId === sourceId) continue;
      if (!adapter.supportsMemory) continue;

      const content = adapter.adaptContent(source);
      results.set(targetId, {
        file: adapter.primaryFile,
        content
      });
    }

    return results;
  }

  /**
   * Generate sync plan
   */
  getSyncPlan() {
    const plan = [];

    for (const [sourceId, source] of this.sources) {
      for (const [targetId, adapter] of this.targets) {
        if (sourceId === targetId) continue;
        if (!adapter.supportsMemory) continue;

        plan.push({
          from: sourceId,
          to: targetId,
          targetFile: adapter.primaryFile
        });
      }
    }

    return plan;
  }
}

/**
 * Universal project initializer
 */
class UniversalInitializer {
  constructor(options = {}) {
    this.platforms = options.platforms || [Platform.GENERIC];
    this.projectName = options.projectName || 'my-project';
    this.description = options.description || '';
  }

  /**
   * Generate initialization files for all platforms
   * @returns {Map<string, string>} Files to create
   */
  generate() {
    const files = new Map();

    // Always generate AGENTS.md as universal fallback
    files.set('AGENTS.md', this.generateAgentsMd());

    // Generate steering files
    files.set('steering/structure.md', this.generateStructure());
    files.set('steering/tech.md', this.generateTech());
    files.set('steering/product.md', this.generateProduct());
    files.set('steering/rules/constitution.md', this.generateConstitution());

    // Generate platform-specific files
    for (const platformId of this.platforms) {
      const adapter = new PlatformAdapter(platformId);
      const platformFiles = this.generatePlatformFiles(adapter);
      
      for (const [path, content] of platformFiles) {
        files.set(path, content);
      }
    }

    return files;
  }

  /**
   * Generate AGENTS.md
   */
  generateAgentsMd() {
    return `# ${this.projectName}

${this.description}

## Initialized with MUSUBI SDD

This project uses **MUSUBI** (Ultimate Specification Driven Development).

### Prompts

- \`#sdd-steering\` - Generate/update project memory
- \`#sdd-requirements <feature>\` - Create EARS requirements
- \`#sdd-design <feature>\` - Generate C4 + ADR design
- \`#sdd-tasks <feature>\` - Break down into tasks
- \`#sdd-implement <feature>\` - Execute implementation
- \`#sdd-validate <feature>\` - Validate constitutional compliance

### Project Memory

- \`steering/structure.md\` - Architecture patterns
- \`steering/tech.md\` - Technology stack
- \`steering/product.md\` - Product context
- \`steering/rules/constitution.md\` - 9 Constitutional Articles

### Learn More

- [MUSUBI Documentation](https://github.com/nahisaho/musubi)

---

**Agent**: AI Coding Assistant
**Initialized**: ${new Date().toISOString().split('T')[0]}
**MUSUBI Version**: 3.4.0
`;
  }

  /**
   * Generate structure.md
   */
  generateStructure() {
    return `# Architecture Overview

## Directory Structure

\`\`\`
${this.projectName}/
├── src/           # Source code
├── tests/         # Test files
├── docs/          # Documentation
└── steering/      # MUSUBI steering files
\`\`\`

## Key Patterns

- [To be defined based on project type]

## Component Overview

- [To be defined based on project scope]
`;
  }

  /**
   * Generate tech.md
   */
  generateTech() {
    return `# Technology Stack

## Languages

- [Primary language]

## Frameworks

- [Frameworks used]

## Dependencies

- [Key dependencies]

## Development Tools

- [Development tools]
`;
  }

  /**
   * Generate product.md
   */
  generateProduct() {
    return `# Product Context

## Product Name

${this.projectName}

## Description

${this.description || '[Product description]'}

## Target Users

- [Target user groups]

## Key Features

- [Key features]

## Success Metrics

- [Success metrics]
`;
  }

  /**
   * Generate constitution.md
   */
  generateConstitution() {
    return `# MUSUBI Constitution

## Article 1: Requirements First
All features SHALL begin with formal requirements specification.

## Article 2: Traceability
All artifacts SHALL maintain bidirectional traceability.

## Article 3: Constitutional Compliance
All work SHALL comply with the 9 constitutional articles.

## Article 4: Complexity Limits
Features SHALL not exceed complexity thresholds without decomposition.

## Article 5: Phase Gates
Phase transitions SHALL require explicit approval.

## Article 6: Documentation Currency
Documentation SHALL be updated with every change.

## Article 7: Test Coverage
All requirements SHALL have corresponding tests.

## Article 8: Review Required
All artifacts SHALL undergo review before completion.

## Article 9: Continuous Improvement
The constitution SHALL be reviewed and improved regularly.
`;
  }

  /**
   * Generate platform-specific files
   */
  generatePlatformFiles(adapter) {
    const files = new Map();

    switch (adapter.platformId) {
      case Platform.CLAUDE_CODE:
        files.set('CLAUDE.md', adapter.generateAgentsReference());
        break;
      
      case Platform.GITHUB_COPILOT:
        files.set('.github/copilot-instructions.md', adapter.generateAgentsReference());
        break;
      
      case Platform.CURSOR:
        files.set('.cursorrules', adapter.generateAgentsReference());
        break;
      
      case Platform.WINDSURF:
        files.set('.windsurfrules', adapter.generateAgentsReference());
        break;
      
      case Platform.CLINE:
        files.set('.clinerules', adapter.generateAgentsReference());
        break;
    }

    return files;
  }
}

/**
 * Platform manager - orchestrates multi-platform support
 */
class PlatformManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.detector = new PlatformDetector();
    this.converter = new SkillConverter();
    this.synchronizer = new MemorySynchronizer();
    this.adapters = new Map();
    this.projectRoot = options.projectRoot || process.cwd();
  }

  /**
   * Initialize platform manager with project files
   * @param {string[]} files - List of project files
   */
  initialize(files) {
    const platforms = this.detector.detect(files);
    
    for (const platformId of platforms) {
      const adapter = new PlatformAdapter(platformId);
      this.adapters.set(platformId, adapter);
    }

    this.emit('initialized', { platforms });
    return platforms;
  }

  /**
   * Get all detected platforms
   */
  getDetectedPlatforms() {
    return this.detector.detectedPlatforms;
  }

  /**
   * Get adapter for platform
   * @param {string} platformId
   * @returns {PlatformAdapter}
   */
  getAdapter(platformId) {
    return this.adapters.get(platformId) || new PlatformAdapter(platformId);
  }

  /**
   * Convert skill between platforms
   */
  convertSkill(skill, from, to) {
    return this.converter.convert(skill, from, to);
  }

  /**
   * Sync steering files across platforms
   * @param {string} sourceId
   * @param {object} memory
   * @returns {Map<string, object>}
   */
  syncSteering(sourceId, memory) {
    this.synchronizer.registerSource(sourceId, memory);
    
    for (const [platformId, adapter] of this.adapters) {
      this.synchronizer.registerTarget(platformId, adapter);
    }

    const results = this.synchronizer.sync(sourceId);
    this.emit('synced', { source: sourceId, targets: [...results.keys()] });
    
    return results;
  }

  /**
   * Generate initialization files for platforms
   * @param {object} options
   * @returns {Map<string, string>}
   */
  generateInitFiles(options = {}) {
    const initializer = new UniversalInitializer({
      ...options,
      platforms: this.detector.detectedPlatforms.length > 0 
        ? this.detector.detectedPlatforms 
        : [Platform.GENERIC]
    });

    return initializer.generate();
  }

  /**
   * Get platform compatibility report
   */
  getCompatibilityReport() {
    const report = {
      detected: [],
      supported: [],
      features: {}
    };

    for (const [platformId, config] of Object.entries(PlatformConfig)) {
      report.supported.push({
        id: platformId,
        name: config.name,
        supportsSkills: config.supportsSkills,
        supportsMemory: config.supportsMemory
      });
    }

    for (const platformId of this.detector.detectedPlatforms) {
      const config = PlatformConfig[platformId];
      report.detected.push({
        id: platformId,
        name: config.name
      });
    }

    report.features = {
      totalPlatforms: Object.keys(PlatformConfig).length,
      detectedCount: this.detector.detectedPlatforms.length,
      skillSupport: report.supported.filter(p => p.supportsSkills).length,
      memorySupport: report.supported.filter(p => p.supportsMemory).length
    };

    return report;
  }

  /**
   * Export to JSON
   */
  toJSON() {
    return {
      detectedPlatforms: this.detector.detectedPlatforms,
      adapters: [...this.adapters.keys()],
      projectRoot: this.projectRoot
    };
  }
}

/**
 * Factory function
 * @param {object} options
 * @returns {PlatformManager}
 */
function createPlatformManager(options = {}) {
  return new PlatformManager(options);
}

module.exports = {
  Platform,
  PlatformConfig,
  PlatformDetector,
  PlatformAdapter,
  SkillConverter,
  MemorySynchronizer,
  UniversalInitializer,
  PlatformManager,
  createPlatformManager
};
