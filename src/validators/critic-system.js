/**
 * MUSUBI Critic System
 * 
 * SDDステージの品質評価システム
 * 
 * @module src/validators/critic-system
 * @see REQ-P0-B005
 * @inspired-by OpenHands openhands/critic/
 */

const fs = require('fs');
const path = require('path');

/**
 * 評価グレード
 */
const Grade = {
  A: 'A',   // 0.8+
  B: 'B',   // 0.5-0.79
  C: 'C',   // 0.3-0.49
  F: 'F',   // < 0.3
};

/**
 * ステージタイプ
 */
const StageType = {
  REQUIREMENTS: 'requirements',
  DESIGN: 'design',
  IMPLEMENTATION: 'implementation',
  TEST: 'test',
  VALIDATION: 'validation',
};

/**
 * 評価結果
 */
class CriticResult {
  /**
   * @param {number} score - スコア (0.0 - 1.0)
   * @param {string} message - 評価メッセージ
   * @param {Object} details - 詳細情報
   */
  constructor(score, message, details = {}) {
    this.score = Math.max(0, Math.min(1, score));
    this.message = message;
    this.details = details;
    this.timestamp = new Date();
  }

  /**
   * 成功判定
   * @returns {boolean}
   */
  get success() {
    return this.score >= 0.5;
  }

  /**
   * グレードを取得
   * @returns {string}
   */
  get grade() {
    if (this.score >= 0.8) return Grade.A;
    if (this.score >= 0.5) return Grade.B;
    if (this.score >= 0.3) return Grade.C;
    return Grade.F;
  }

  /**
   * パーセンテージを取得
   * @returns {number}
   */
  get percentage() {
    return Math.round(this.score * 100);
  }

  toJSON() {
    return {
      score: this.score,
      grade: this.grade,
      percentage: this.percentage,
      success: this.success,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
    };
  }

  /**
   * Markdown形式でレポート生成
   * @returns {string}
   */
  toMarkdown() {
    let md = `## Evaluation Result\n\n`;
    md += `- **Score**: ${this.percentage}%\n`;
    md += `- **Grade**: ${this.grade}\n`;
    md += `- **Status**: ${this.success ? '✅ Pass' : '❌ Fail'}\n\n`;
    md += `### Summary\n\n${this.message}\n\n`;
    
    if (Object.keys(this.details).length > 0) {
      md += `### Details\n\n`;
      md += `| Criterion | Score | Status |\n`;
      md += `|-----------|-------|--------|\n`;
      for (const [key, value] of Object.entries(this.details)) {
        const score = typeof value === 'number' ? value : (value.score || 0);
        const pct = Math.round(score * 100);
        const status = score >= 0.5 ? '✅' : '❌';
        md += `| ${key} | ${pct}% | ${status} |\n`;
      }
    }

    return md;
  }
}

/**
 * 基底クリティック
 */
class BaseCritic {
  /**
   * @param {Object} options
   */
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.weights = options.weights || {};
  }

  /**
   * 評価を実行
   * @param {Object} context - 評価コンテキスト
   * @returns {CriticResult}
   */
  evaluate(_context = {}) {
    throw new Error('Must implement evaluate()');
  }

  /**
   * 重み付けスコアを計算
   * @param {Object} scores - 各項目のスコア
   * @returns {number}
   */
  calculateWeightedScore(scores) {
    const entries = Object.entries(scores);
    if (entries.length === 0) return 0;

    let totalWeight = 0;
    let weightedSum = 0;

    for (const [key, value] of entries) {
      const score = typeof value === 'number' ? value : (value.score || 0);
      const weight = this.weights[key] || 1;
      weightedSum += score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * ファイルが存在するかチェック
   * @param {string} relativePath 
   * @returns {boolean}
   */
  fileExists(relativePath) {
    return fs.existsSync(path.join(this.projectRoot, relativePath));
  }

  /**
   * ファイル内容を読み込み
   * @param {string} relativePath 
   * @returns {string|null}
   */
  readFile(relativePath) {
    const filePath = path.join(this.projectRoot, relativePath);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
  }
}

/**
 * 要件クリティック
 */
class RequirementsCritic extends BaseCritic {
  constructor(options = {}) {
    super(options);
    this.weights = {
      earsCompliance: 2,
      completeness: 1.5,
      testability: 1,
      traceability: 1,
      ...options.weights,
    };
  }

  evaluate(context = {}) {
    const scores = {
      earsCompliance: this.checkEarsFormat(context),
      completeness: this.checkCompleteness(context),
      testability: this.checkTestability(context),
      traceability: this.checkTraceability(context),
    };

    const totalScore = this.calculateWeightedScore(scores);
    
    return new CriticResult(
      totalScore,
      this._generateMessage(totalScore, scores),
      scores
    );
  }

  /**
   * EARS形式準拠チェック
   */
  checkEarsFormat(context) {
    const content = context.content || this.readFile('docs/requirements/srs/srs-musubi-v3.0.0.ja.md') || '';
    
    // EARS キーワードパターン
    const earsPatterns = [
      /\b(When|If|While|Where)\b.*\b(shall|should|must)\b/gi,
      /\bThe system shall\b/gi,
      /\bshall be able to\b/gi,
    ];

    const reqPattern = /REQ-[A-Z0-9]+-\d+/g;
    const requirements = content.match(reqPattern) || [];
    
    if (requirements.length === 0) return 0;

    // EARS パターンの出現をカウント
    let earsCount = 0;
    earsPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      earsCount += matches.length;
    });

    // 要件数に対するEARS準拠率
    return Math.min(1, earsCount / requirements.length);
  }

  /**
   * 完全性チェック
   */
  checkCompleteness(context) {
    const content = context.content || this.readFile('docs/requirements/srs/srs-musubi-v3.0.0.ja.md') || '';
    
    const requiredSections = [
      /## 機能要件|## Functional Requirements/i,
      /## 非機能要件|## Non-Functional Requirements/i,
      /## 制約|## Constraints/i,
    ];

    const presentSections = requiredSections.filter(pattern => pattern.test(content));
    return presentSections.length / requiredSections.length;
  }

  /**
   * テスト可能性チェック
   */
  checkTestability(context) {
    const content = context.content || this.readFile('docs/requirements/srs/srs-musubi-v3.0.0.ja.md') || '';
    
    // 数値目標や測定可能な基準があるかチェック
    const measurablePatterns = [
      /\d+%/g,                          // パーセンテージ
      /\d+\s*(秒|ms|ミリ秒|seconds?)/gi,  // 時間
      /\d+\s*(回|times?)/gi,            // 回数
      /less than|greater than|at least|最大|最小/gi,
    ];

    let measurableCount = 0;
    measurablePatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      measurableCount += matches.length;
    });

    // 測定可能な基準が10個以上あれば満点
    return Math.min(1, measurableCount / 10);
  }

  /**
   * トレーサビリティチェック
   */
  checkTraceability(context) {
    const content = context.content || '';
    
    // 要件IDへの参照をチェック
    const reqPattern = /REQ-[A-Z0-9]+-\d+/g;
    const requirements = content.match(reqPattern) || [];
    
    // 重複を除去してユニークな要件数をカウント
    const uniqueReqs = [...new Set(requirements)];
    
    // 5つ以上のユニーク要件があれば良好
    return Math.min(1, uniqueReqs.length / 5);
  }

  _generateMessage(score, scores) {
    if (score >= 0.8) {
      return '要件定義は高品質です。EARS形式に準拠し、テスト可能な基準が明確です。';
    } else if (score >= 0.5) {
      return '要件定義は基本的な品質基準を満たしています。いくつかの改善点があります。';
    } else {
      const issues = [];
      if (scores.earsCompliance < 0.5) issues.push('EARS形式への準拠');
      if (scores.completeness < 0.5) issues.push('必須セクションの追加');
      if (scores.testability < 0.5) issues.push('測定可能な基準の追加');
      return `要件定義には改善が必要です: ${issues.join(', ')}`;
    }
  }
}

/**
 * 設計クリティック
 */
class DesignCritic extends BaseCritic {
  constructor(options = {}) {
    super(options);
    this.weights = {
      c4Compliance: 2,
      adrPresence: 1.5,
      reqCoverage: 1,
      ...options.weights,
    };
  }

  evaluate(context = {}) {
    const scores = {
      c4Compliance: this.checkC4Format(context),
      adrPresence: this.checkAdrPresence(context),
      reqCoverage: this.checkRequirementCoverage(context),
    };

    const totalScore = this.calculateWeightedScore(scores);
    
    return new CriticResult(
      totalScore,
      this._generateMessage(totalScore, scores),
      scores
    );
  }

  /**
   * C4モデル準拠チェック
   */
  checkC4Format(_context) {
    const designDir = path.join(this.projectRoot, 'docs/design');
    if (!fs.existsSync(designDir)) return 0;

    // C4レベルのキーワードをチェック
    const c4Keywords = ['Context', 'Container', 'Component', 'Code'];
    const files = fs.readdirSync(designDir).filter(f => f.endsWith('.md'));
    
    let c4Score = 0;
    for (const file of files) {
      const content = fs.readFileSync(path.join(designDir, file), 'utf-8');
      c4Keywords.forEach(keyword => {
        if (content.includes(keyword)) c4Score += 0.25;
      });
    }

    return Math.min(1, c4Score);
  }

  /**
   * ADR存在チェック
   */
  checkAdrPresence(_context) {
    const adrDir = path.join(this.projectRoot, 'docs/design/adr');
    if (!fs.existsSync(adrDir)) return 0;

    const adrFiles = fs.readdirSync(adrDir).filter(f => 
      f.startsWith('ADR-') && f.endsWith('.md')
    );

    // 3つ以上のADRがあれば満点
    return Math.min(1, adrFiles.length / 3);
  }

  /**
   * 要件カバレッジチェック
   */
  checkRequirementCoverage(_context) {
    const designDir = path.join(this.projectRoot, 'docs/design');
    if (!fs.existsSync(designDir)) return 0;

    const files = fs.readdirSync(designDir).filter(f => f.endsWith('.md'));
    let reqReferences = new Set();

    for (const file of files) {
      const content = fs.readFileSync(path.join(designDir, file), 'utf-8');
      const matches = content.match(/REQ-[A-Z0-9]+-\d+/g) || [];
      matches.forEach(m => reqReferences.add(m));
    }

    // 5つ以上の要件参照があれば満点
    return Math.min(1, reqReferences.size / 5);
  }

  _generateMessage(score, scores) {
    if (score >= 0.8) {
      return '設計ドキュメントは高品質です。C4モデルに準拠し、ADRが適切に作成されています。';
    } else if (score >= 0.5) {
      return '設計ドキュメントは基本的な品質を満たしています。';
    } else {
      const issues = [];
      if (scores.c4Compliance < 0.5) issues.push('C4モデルの適用');
      if (scores.adrPresence < 0.5) issues.push('ADRの作成');
      if (scores.reqCoverage < 0.5) issues.push('要件へのリンク');
      return `設計には改善が必要です: ${issues.join(', ')}`;
    }
  }
}

/**
 * 実装クリティック
 */
class ImplementationCritic extends BaseCritic {
  constructor(options = {}) {
    super(options);
    this.weights = {
      testCoverage: 2,
      codeQuality: 1.5,
      documentation: 1,
      ...options.weights,
    };
  }

  evaluate(context = {}) {
    const scores = {
      testCoverage: this.checkTestCoverage(context),
      codeQuality: this.checkCodeQuality(context),
      documentation: this.checkDocumentation(context),
    };

    const totalScore = this.calculateWeightedScore(scores);
    
    return new CriticResult(
      totalScore,
      this._generateMessage(totalScore, scores),
      scores
    );
  }

  /**
   * テストカバレッジチェック
   */
  checkTestCoverage(_context) {
    // coverage/lcov-report/index.html があればパース
    const coveragePath = path.join(this.projectRoot, 'coverage/coverage-summary.json');
    if (fs.existsSync(coveragePath)) {
      try {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
        const total = coverage.total;
        if (total && total.lines) {
          return total.lines.pct / 100;
        }
      } catch (e) {
        // パース失敗
      }
    }

    // テストファイルの存在をチェック
    const testsDir = path.join(this.projectRoot, 'tests');
    if (!fs.existsSync(testsDir)) return 0;

    const testFiles = this._countFiles(testsDir, /\.test\.js$/);
    const srcDir = path.join(this.projectRoot, 'src');
    const srcFiles = fs.existsSync(srcDir) ? this._countFiles(srcDir, /\.js$/) : 1;

    // テストファイル数とソースファイル数の比率
    return Math.min(1, testFiles / Math.max(1, srcFiles * 0.5));
  }

  /**
   * コード品質チェック
   */
  checkCodeQuality(_context) {
    let score = 0;

    // ESLint設定の存在
    if (this.fileExists('.eslintrc.js') || this.fileExists('.eslintrc.json')) {
      score += 0.3;
    }

    // Prettier設定の存在
    if (this.fileExists('.prettierrc') || this.fileExists('.prettierrc.json')) {
      score += 0.2;
    }

    // package.json に lint スクリプトがあるか
    const pkg = this.readFile('package.json');
    if (pkg) {
      try {
        const pkgJson = JSON.parse(pkg);
        if (pkgJson.scripts && pkgJson.scripts.lint) {
          score += 0.3;
        }
        if (pkgJson.scripts && pkgJson.scripts.format) {
          score += 0.2;
        }
      } catch (e) {
        // パース失敗
      }
    }

    return score;
  }

  /**
   * ドキュメントチェック
   */
  checkDocumentation(_context) {
    let score = 0;

    // README.md
    if (this.fileExists('README.md')) score += 0.4;

    // CONTRIBUTING.md
    if (this.fileExists('CONTRIBUTING.md')) score += 0.2;

    // steering/ ディレクトリ
    if (this.fileExists('steering/product.md')) score += 0.2;
    if (this.fileExists('steering/structure.md')) score += 0.2;

    return score;
  }

  _countFiles(dir, pattern) {
    let count = 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += this._countFiles(path.join(dir, entry.name), pattern);
      } else if (pattern.test(entry.name)) {
        count++;
      }
    }
    return count;
  }

  _generateMessage(score, scores) {
    if (score >= 0.8) {
      return '実装は高品質です。テストカバレッジが高く、コード品質ツールが設定されています。';
    } else if (score >= 0.5) {
      return '実装は基本的な品質を満たしています。';
    } else {
      const issues = [];
      if (scores.testCoverage < 0.5) issues.push('テストの追加');
      if (scores.codeQuality < 0.5) issues.push('リンター/フォーマッターの設定');
      if (scores.documentation < 0.5) issues.push('ドキュメントの充実');
      return `実装には改善が必要です: ${issues.join(', ')}`;
    }
  }
}

/**
 * クリティックシステム
 */
class CriticSystem {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.critics = {
      [StageType.REQUIREMENTS]: new RequirementsCritic({ projectRoot: this.projectRoot }),
      [StageType.DESIGN]: new DesignCritic({ projectRoot: this.projectRoot }),
      [StageType.IMPLEMENTATION]: new ImplementationCritic({ projectRoot: this.projectRoot }),
    };
  }

  /**
   * 特定ステージを評価
   * @param {string} stage 
   * @param {Object} context 
   * @returns {CriticResult}
   */
  evaluate(stage, context = {}) {
    const critic = this.critics[stage];
    if (!critic) {
      throw new Error(`Unknown stage: ${stage}`);
    }
    return critic.evaluate(context);
  }

  /**
   * 全ステージを評価
   * @param {Object} context 
   * @returns {Object}
   */
  evaluateAll(context = {}) {
    const results = {};
    let totalScore = 0;
    let count = 0;

    for (const [stage, critic] of Object.entries(this.critics)) {
      results[stage] = critic.evaluate(context);
      totalScore += results[stage].score;
      count++;
    }

    return {
      stages: results,
      overall: new CriticResult(
        count > 0 ? totalScore / count : 0,
        this._generateOverallMessage(results),
        { stageCount: count }
      ),
    };
  }

  /**
   * レポートを生成
   * @param {Object} results 
   * @returns {string}
   */
  generateReport(results) {
    let md = `# MUSUBI Quality Report\n\n`;
    md += `Generated: ${new Date().toISOString()}\n\n`;
    
    if (results.overall) {
      md += `## Overall Score\n\n`;
      md += `- **Score**: ${results.overall.percentage}%\n`;
      md += `- **Grade**: ${results.overall.grade}\n\n`;
    }

    md += `## Stage Results\n\n`;
    for (const [stage, result] of Object.entries(results.stages || results)) {
      md += `### ${stage}\n\n`;
      md += result.toMarkdown();
      md += '\n';
    }

    return md;
  }

  _generateOverallMessage(results) {
    const avgScore = Object.values(results).reduce((sum, r) => sum + r.score, 0) / Object.keys(results).length;
    if (avgScore >= 0.8) {
      return 'プロジェクトは全体的に高品質です。';
    } else if (avgScore >= 0.5) {
      return 'プロジェクトは基本的な品質を満たしています。';
    } else {
      return 'プロジェクトには全体的な改善が必要です。';
    }
  }
}

module.exports = {
  CriticSystem,
  CriticResult,
  BaseCritic,
  RequirementsCritic,
  DesignCritic,
  ImplementationCritic,
  Grade,
  StageType,
};
