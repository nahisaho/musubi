const fs = require('fs-extra');
const path = require('path');

const PLATFORMS = [
  'claude-code',
  'github-copilot',
  'cursor',
  'gemini-cli',
  'windsurf',
  'codex',
  'qwen-code',
];

describe('Platform Initialization Tests', () => {
  // テストはテンプレートファイルの存在を確認
  // 実際の初期化は対話的なため、ファイル構造の検証のみ

  const TEMPLATE_DIR = path.join(__dirname, '..', 'src', 'templates', 'agents');

  PLATFORMS.forEach(platform => {
    test(`should have ${platform} template directory`, () => {
      const templatePath = path.join(TEMPLATE_DIR, platform);
      expect(fs.existsSync(templatePath)).toBe(true);
    });

    test(`should have ${platform} AGENTS.md or equivalent`, () => {
      const templatePath = path.join(TEMPLATE_DIR, platform);
      const possibleFiles = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'QWEN.md'];

      const hasAgentFile = possibleFiles.some(file => fs.existsSync(path.join(templatePath, file)));

      expect(hasAgentFile).toBe(true);
    });

    test(`should have ${platform} commands directory`, () => {
      const commandsPath = path.join(TEMPLATE_DIR, platform, 'commands');
      expect(fs.existsSync(commandsPath)).toBe(true);
    });

    test(`should have ${platform} required SDD commands`, () => {
      const commandsPath = path.join(TEMPLATE_DIR, platform, 'commands');
      const extension = platform === 'gemini-cli' ? '.toml' : '.md';
      const requiredCommands = [
        `sdd-steering${extension}`,
        `sdd-requirements${extension}`,
        `sdd-design${extension}`,
        `sdd-tasks${extension}`,
        `sdd-implement${extension}`,
      ];

      requiredCommands.forEach(cmd => {
        expect(fs.existsSync(path.join(commandsPath, cmd))).toBe(true);
      });
    });
  });

  // Claude Code専用: Skillsディレクトリのテスト
  test('should have claude-code skills directory with 25 skills', () => {
    const skillsPath = path.join(TEMPLATE_DIR, 'claude-code', 'skills');
    expect(fs.existsSync(skillsPath)).toBe(true);

    const skills = fs.readdirSync(skillsPath);
    expect(skills.length).toBeGreaterThanOrEqual(25);

    // コアスキルの存在確認
    const coreSkills = ['orchestrator', 'steering', 'requirements-analyst', 'system-architect'];
    coreSkills.forEach(skill => {
      const skillPath = path.join(skillsPath, skill, 'SKILL.md');
      expect(fs.existsSync(skillPath)).toBe(true);
    });
  });

  // 共有テンプレートのテスト
  test('should have shared steering templates', () => {
    const sharedPath = path.join(__dirname, '..', 'src', 'templates', 'shared', 'steering');
    expect(fs.existsSync(sharedPath)).toBe(true);

    const requiredFiles = ['structure.md', 'tech.md', 'product.md'];
    requiredFiles.forEach(file => {
      expect(fs.existsSync(path.join(sharedPath, file))).toBe(true);
    });
  });

  test('should have shared constitution template', () => {
    const constitutionPath = path.join(
      __dirname,
      '..',
      'src',
      'templates',
      'shared',
      'constitution',
      'constitution.md'
    );
    expect(fs.existsSync(constitutionPath)).toBe(true);
  });
});
