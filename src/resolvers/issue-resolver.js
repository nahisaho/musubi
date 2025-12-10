/**
 * MUSUBI Issue Resolver
 * 
 * GitHub Issue を分析し、自動的に解決策を提案・実装
 * 
 * @module src/resolvers/issue-resolver
 * @see REQ-P0-B006
 * @inspired-by OpenHands openhands/resolver/
 */

const fs = require('fs');
const path = require('path');

// GitHub クライアント（オプショナル依存）
let GitHubClient;
try {
  GitHubClient = require('../integrations/github-client').GitHubClient;
} catch (e) {
  GitHubClient = null;
}

/**
 * Issue タイプ
 */
const IssueType = {
  BUG: 'bug',
  FEATURE: 'feature',
  DOCUMENTATION: 'documentation',
  REFACTOR: 'refactor',
  TEST: 'test',
  UNKNOWN: 'unknown',
};

/**
 * 解決ステータス
 */
const ResolverStatus = {
  PENDING: 'pending',
  ANALYZING: 'analyzing',
  IMPLEMENTING: 'implementing',
  TESTING: 'testing',
  COMPLETE: 'complete',
  FAILED: 'failed',
};

/**
 * Issue 情報
 */
class IssueInfo {
  constructor(options = {}) {
    this.number = options.number;
    this.title = options.title || '';
    this.body = options.body || '';
    this.labels = options.labels || [];
    this.author = options.author || '';
    this.url = options.url || '';
    this.createdAt = options.createdAt || new Date();
    this.comments = options.comments || [];
  }

  /**
   * Issue タイプを推定
   * @returns {string}
   */
  get type() {
    const labelNames = this.labels.map(l => 
      typeof l === 'string' ? l.toLowerCase() : (l.name || '').toLowerCase()
    );
    
    if (labelNames.some(l => l.includes('bug') || l.includes('fix'))) {
      return IssueType.BUG;
    }
    if (labelNames.some(l => l.includes('feature') || l.includes('enhancement'))) {
      return IssueType.FEATURE;
    }
    if (labelNames.some(l => l.includes('doc'))) {
      return IssueType.DOCUMENTATION;
    }
    if (labelNames.some(l => l.includes('refactor'))) {
      return IssueType.REFACTOR;
    }
    if (labelNames.some(l => l.includes('test'))) {
      return IssueType.TEST;
    }

    // タイトルと本文からも推定
    const content = `${this.title} ${this.body}`.toLowerCase();
    if (content.includes('bug') || content.includes('error') || content.includes('fix')) {
      return IssueType.BUG;
    }
    if (content.includes('add') || content.includes('implement') || content.includes('feature')) {
      return IssueType.FEATURE;
    }

    return IssueType.UNKNOWN;
  }

  /**
   * 全コンテンツを取得
   * @returns {string}
   */
  get fullContent() {
    let content = `# ${this.title}\n\n${this.body}`;
    if (this.comments.length > 0) {
      content += '\n\n## Comments\n\n';
      content += this.comments.map(c => `**${c.author}**: ${c.body}`).join('\n\n');
    }
    return content;
  }
}

/**
 * 解決結果
 */
class ResolverResult {
  constructor(options = {}) {
    this.status = options.status || ResolverStatus.PENDING;
    this.issue = options.issue;
    this.requirements = options.requirements || [];
    this.impactAnalysis = options.impactAnalysis || null;
    this.changes = options.changes || [];
    this.tests = options.tests || [];
    this.prUrl = options.prUrl || null;
    this.branchName = options.branchName || null;
    this.error = options.error || null;
    this.timestamp = new Date();
  }

  toJSON() {
    return {
      status: this.status,
      issueNumber: this.issue?.number,
      issueType: this.issue?.type,
      requirements: this.requirements,
      changesCount: this.changes.length,
      testsCount: this.tests.length,
      prUrl: this.prUrl,
      branchName: this.branchName,
      error: this.error,
      timestamp: this.timestamp.toISOString(),
    };
  }

  /**
   * Markdown形式でレポート
   * @returns {string}
   */
  toMarkdown() {
    let md = `# Issue Resolution Report\n\n`;
    md += `- **Status**: ${this.status}\n`;
    md += `- **Issue**: #${this.issue?.number} - ${this.issue?.title}\n`;
    md += `- **Type**: ${this.issue?.type}\n\n`;

    if (this.requirements.length > 0) {
      md += `## Extracted Requirements\n\n`;
      this.requirements.forEach((req, i) => {
        md += `${i + 1}. ${req}\n`;
      });
      md += '\n';
    }

    if (this.impactAnalysis) {
      md += `## Impact Analysis\n\n`;
      md += `${this.impactAnalysis}\n\n`;
    }

    if (this.changes.length > 0) {
      md += `## Changes\n\n`;
      this.changes.forEach(change => {
        md += `- \`${change.file}\`: ${change.description}\n`;
      });
      md += '\n';
    }

    if (this.tests.length > 0) {
      md += `## Tests Added\n\n`;
      this.tests.forEach(test => {
        md += `- \`${test.file}\`: ${test.description}\n`;
      });
      md += '\n';
    }

    if (this.prUrl) {
      md += `## Pull Request\n\n`;
      md += `[View PR](${this.prUrl})\n\n`;
    }

    if (this.error) {
      md += `## Error\n\n`;
      md += `\`\`\`\n${this.error}\n\`\`\`\n`;
    }

    return md;
  }
}

/**
 * 影響分析結果
 */
class ImpactAnalysis {
  constructor(options = {}) {
    this.affectedFiles = options.affectedFiles || [];
    this.affectedComponents = options.affectedComponents || [];
    this.relatedRequirements = options.relatedRequirements || [];
    this.riskLevel = options.riskLevel || 'low';
    this.estimatedEffort = options.estimatedEffort || 'unknown';
  }

  toMarkdown() {
    let md = `### Affected Files\n\n`;
    md += this.affectedFiles.map(f => `- \`${f}\``).join('\n') || '- None identified\n';
    md += `\n\n### Components\n\n`;
    md += this.affectedComponents.map(c => `- ${c}`).join('\n') || '- None identified\n';
    md += `\n\n### Risk Level: ${this.riskLevel}\n`;
    md += `### Estimated Effort: ${this.estimatedEffort}\n`;
    return md;
  }
}

/**
 * Issue リゾルバー
 */
class IssueResolver {
  /**
   * @param {Object} options
   * @param {string} options.projectRoot - プロジェクトルート
   * @param {string} options.githubToken - GitHub トークン
   * @param {boolean} options.draftPR - Draft PR を作成するか
   * @param {boolean} options.dryRun - 実際には変更しない
   */
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.githubToken = options.githubToken || process.env.GITHUB_TOKEN;
    this.draftPR = options.draftPR !== false;
    this.dryRun = options.dryRun || false;
    this.repo = options.repo || this._detectRepo();
    
    // GitHub クライアント初期化
    this.github = null;
    if (GitHubClient && this.githubToken && this.repo) {
      this.github = new GitHubClient({
        token: this.githubToken,
        owner: this.repo.owner,
        repo: this.repo.repo,
      });
    }
  }

  /**
   * リポジトリ情報を検出
   * @returns {Object|null}
   */
  _detectRepo() {
    try {
      const gitConfigPath = path.join(this.projectRoot, '.git/config');
      if (!fs.existsSync(gitConfigPath)) return null;

      const config = fs.readFileSync(gitConfigPath, 'utf-8');
      const match = config.match(/url\s*=\s*.*github\.com[:/]([^/]+)\/([^/\s.]+)/);
      if (match) {
        return { owner: match[1], repo: match[2].replace('.git', '') };
      }
    } catch (e) {
      // 無視
    }
    return null;
  }

  /**
   * Issue を解決
   * @param {string|number|IssueInfo} issue - Issue URL、番号、またはIssueInfo
   * @returns {Promise<ResolverResult>}
   */
  async resolve(issue) {
    const result = new ResolverResult({ status: ResolverStatus.ANALYZING });

    try {
      // 1. Issue 情報を取得/正規化
      const issueInfo = issue instanceof IssueInfo 
        ? issue 
        : await this.fetchIssue(issue);
      result.issue = issueInfo;

      // 2. 要件抽出
      result.requirements = this.extractRequirements(issueInfo);
      
      // 3. 影響範囲分析
      result.status = ResolverStatus.ANALYZING;
      result.impactAnalysis = await this.analyzeImpact(result.requirements, issueInfo);

      // 4. 変更計画を生成
      result.status = ResolverStatus.IMPLEMENTING;
      result.changes = await this.planChanges(issueInfo, result.requirements, result.impactAnalysis);

      // 5. テスト計画を生成
      result.status = ResolverStatus.TESTING;
      result.tests = await this.planTests(issueInfo, result.changes);

      // 6. ブランチ名を決定
      result.branchName = this.generateBranchName(issueInfo);

      // 7. Dry run でなければ PR を作成
      if (!this.dryRun && this.github) {
        try {
          // ブランチ作成
          await this.github.createBranch(result.branchName);

          // 分析結果を Issue にコメント
          const analysisComment = this._formatAnalysisComment(result);
          await this.github.addIssueComment(issueInfo.number, analysisComment);

          // ラベル追加
          await this.github.addLabels(issueInfo.number, ['musubi-analyzed']);

          // PR 作成（Draft）
          const prBody = this._formatPRBody(issueInfo, result);
          const pr = await this.github.createPullRequest({
            title: `${issueInfo.type === IssueType.BUG ? 'fix' : 'feat'}: ${issueInfo.title} (Closes #${issueInfo.number})`,
            body: prBody,
            head: result.branchName,
            base: 'main',
            draft: this.draftPR,
          });

          result.prUrl = pr.html_url;
        } catch (apiError) {
          console.warn(`GitHub API error: ${apiError.message}`);
          // API エラーでも解析結果は返す
        }
      }

      result.status = ResolverStatus.COMPLETE;
    } catch (error) {
      result.status = ResolverStatus.FAILED;
      result.error = error.message;
    }

    return result;
  }

  /**
   * 分析コメントをフォーマット
   * @param {ResolverResult} result 
   * @returns {string}
   */
  _formatAnalysisComment(result) {
    let comment = `## 🤖 MUSUBI Issue Analysis\n\n`;
    comment += `**Type**: ${result.issue?.type}\n`;
    comment += `**Branch**: \`${result.branchName}\`\n\n`;

    if (result.requirements.length > 0) {
      comment += `### Extracted Requirements\n\n`;
      result.requirements.forEach((req, i) => {
        comment += `${i + 1}. ${req}\n`;
      });
      comment += '\n';
    }

    if (result.impactAnalysis) {
      comment += `### Impact Analysis\n\n`;
      comment += `- **Risk Level**: ${result.impactAnalysis.riskLevel}\n`;
      comment += `- **Estimated Effort**: ${result.impactAnalysis.estimatedEffort}\n`;
      if (result.impactAnalysis.affectedFiles.length > 0) {
        comment += `- **Affected Files**: ${result.impactAnalysis.affectedFiles.slice(0, 5).map(f => `\`${f}\``).join(', ')}\n`;
      }
    }

    comment += `\n---\n_Analyzed by MUSUBI Issue Resolver_`;
    return comment;
  }

  /**
   * PR 本文をフォーマット
   * @param {IssueInfo} issue 
   * @param {ResolverResult} result 
   * @returns {string}
   */
  _formatPRBody(issue, result) {
    let body = `## Summary\n\n`;
    body += `Resolves #${issue.number}\n\n`;

    body += `## Requirements Addressed\n\n`;
    result.requirements.forEach((req, _i) => {
      body += `- [ ] ${req}\n`;
    });

    if (result.changes.length > 0) {
      body += `\n## Planned Changes\n\n`;
      result.changes.forEach(change => {
        body += `- \`${change.file}\`: ${change.description}\n`;
      });
    }

    if (result.tests.length > 0) {
      body += `\n## Tests\n\n`;
      result.tests.forEach(test => {
        body += `- \`${test.file}\`: ${test.description}\n`;
      });
    }

    body += `\n---\n_This PR was created by MUSUBI Issue Resolver_`;
    return body;
  }

  /**
   * Issue を取得
   * @param {string|number} issueRef - Issue URL または番号
   * @returns {Promise<IssueInfo>}
   */
  async fetchIssue(issueRef) {
    // URL からパース
    let issueNumber;
    if (typeof issueRef === 'string' && issueRef.includes('github.com')) {
      const match = issueRef.match(/\/issues\/(\d+)/);
      if (match) {
        issueNumber = parseInt(match[1]);
      }
    } else {
      issueNumber = typeof issueRef === 'number' ? issueRef : parseInt(issueRef);
    }

    // GitHub API で取得
    if (this.github && issueNumber) {
      try {
        const issueData = await this.github.getIssue(issueNumber);
        const comments = await this.github.getIssueComments(issueNumber);

        return new IssueInfo({
          number: issueData.number,
          title: issueData.title,
          body: issueData.body || '',
          labels: issueData.labels.map(l => l.name || l),
          author: issueData.user?.login || '',
          url: issueData.html_url,
          createdAt: new Date(issueData.created_at),
          comments: comments.map(c => ({
            author: c.user?.login || '',
            body: c.body || '',
          })),
        });
      } catch (error) {
        console.warn(`Failed to fetch issue #${issueNumber} from GitHub: ${error.message}`);
        // フォールバック
      }
    }

    // フォールバック: ローカルモック
    return new IssueInfo({
      number: issueNumber,
      title: `Issue #${issueNumber}`,
      body: '',
      url: typeof issueRef === 'string' ? issueRef : '',
    });
  }

  /**
   * Issue から要件を抽出
   * @param {IssueInfo} issue 
   * @returns {string[]}
   */
  extractRequirements(issue) {
    const requirements = [];
    const content = issue.fullContent;

    // タスクリスト（チェックボックス）を抽出
    const taskPattern = /- \[[ x]\] (.+)/g;
    let match;
    while ((match = taskPattern.exec(content)) !== null) {
      requirements.push(match[1].trim());
    }

    // 「should」「must」「need to」パターンを抽出
    const requirementPatterns = [
      /(?:should|must|need to|needs to)\s+(.+?)(?:\.|$)/gi,
      /(?:expected|expect|want)\s+(?:to\s+)?(.+?)(?:\.|$)/gi,
    ];

    for (const pattern of requirementPatterns) {
      while ((match = pattern.exec(content)) !== null) {
        const req = match[1].trim();
        if (req.length > 10 && req.length < 200 && !requirements.includes(req)) {
          requirements.push(req);
        }
      }
    }

    // Issue タイプに基づくデフォルト要件
    if (requirements.length === 0) {
      switch (issue.type) {
        case IssueType.BUG:
          requirements.push(`Fix the issue described: ${issue.title}`);
          break;
        case IssueType.FEATURE:
          requirements.push(`Implement the feature: ${issue.title}`);
          break;
        default:
          requirements.push(`Address: ${issue.title}`);
      }
    }

    return requirements;
  }

  /**
   * 影響範囲を分析
   * @param {string[]} requirements 
   * @param {IssueInfo} issue 
   * @returns {Promise<ImpactAnalysis>}
   */
  async analyzeImpact(requirements, issue) {
    const analysis = new ImpactAnalysis();
    const content = issue.fullContent.toLowerCase();

    // ファイルパスの検出
    const filePattern = /(?:in|at|file)\s+[`"]?([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)[`"]?/gi;
    let match;
    while ((match = filePattern.exec(content)) !== null) {
      const filePath = match[1];
      if (!analysis.affectedFiles.includes(filePath)) {
        analysis.affectedFiles.push(filePath);
      }
    }

    // バッククォートで囲まれたパスを検出
    const backtickPattern = /`([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)`/g;
    while ((match = backtickPattern.exec(content)) !== null) {
      const filePath = match[1];
      if (!analysis.affectedFiles.includes(filePath)) {
        analysis.affectedFiles.push(filePath);
      }
    }

    // コンポーネントの検出
    const componentPatterns = [
      /(?:component|module|class|function)\s+[`"]?(\w+)[`"]?/gi,
      /(\w+)(?:Component|Module|Service|Controller|Manager)/g,
    ];

    for (const pattern of componentPatterns) {
      while ((match = pattern.exec(issue.fullContent)) !== null) {
        const component = match[1];
        if (component.length > 2 && !analysis.affectedComponents.includes(component)) {
          analysis.affectedComponents.push(component);
        }
      }
    }

    // 要件IDの検出
    const reqPattern = /REQ-[A-Z0-9]+-\d+/g;
    const reqMatches = issue.fullContent.match(reqPattern) || [];
    analysis.relatedRequirements = [...new Set(reqMatches)];

    // リスクレベルの推定
    analysis.riskLevel = this._estimateRiskLevel(issue, analysis);

    // 工数の推定
    analysis.estimatedEffort = this._estimateEffort(issue, requirements);

    return analysis;
  }

  /**
   * リスクレベルを推定
   * @param {IssueInfo} issue 
   * @param {ImpactAnalysis} analysis 
   * @returns {string}
   */
  _estimateRiskLevel(issue, analysis) {
    const content = issue.fullContent.toLowerCase();
    
    // 高リスクキーワード
    const highRiskKeywords = ['security', 'authentication', 'authorization', 'database', 'migration', 'production'];
    if (highRiskKeywords.some(k => content.includes(k))) {
      return 'high';
    }

    // 中リスク
    if (analysis.affectedFiles.length > 5 || analysis.affectedComponents.length > 3) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * 工数を推定
   * @param {IssueInfo} issue 
   * @param {string[]} requirements 
   * @returns {string}
   */
  _estimateEffort(issue, requirements) {
    if (requirements.length > 5) return 'large';
    if (requirements.length > 2) return 'medium';
    return 'small';
  }

  /**
   * 変更計画を作成
   * @param {IssueInfo} issue 
   * @param {string[]} requirements 
   * @param {ImpactAnalysis} impact 
   * @returns {Promise<Object[]>}
   */
  async planChanges(issue, requirements, impact) {
    const changes = [];

    // 影響ファイルに対する変更を計画
    for (const file of impact.affectedFiles) {
      changes.push({
        file,
        type: 'modify',
        description: `Update based on requirements`,
      });
    }

    // Issue タイプに基づく追加変更
    if (issue.type === IssueType.BUG && changes.length === 0) {
      changes.push({
        file: 'src/fix.js', // プレースホルダー
        type: 'modify',
        description: `Fix: ${issue.title}`,
      });
    }

    if (issue.type === IssueType.FEATURE) {
      changes.push({
        file: 'src/new-feature.js', // プレースホルダー
        type: 'create',
        description: `Implement: ${issue.title}`,
      });
    }

    return changes;
  }

  /**
   * テスト計画を作成
   * @param {IssueInfo} issue 
   * @param {Object[]} changes 
   * @returns {Promise<Object[]>}
   */
  async planTests(issue, changes) {
    const tests = [];

    for (const change of changes) {
      if (change.file.endsWith('.js') && !change.file.includes('.test.')) {
        const testFile = change.file.replace(/\.js$/, '.test.js');
        tests.push({
          file: testFile,
          type: change.type === 'create' ? 'create' : 'update',
          description: `Add/update tests for ${change.file}`,
        });
      }
    }

    // Issue タイプに基づく追加テスト
    if (issue.type === IssueType.BUG) {
      tests.push({
        file: 'tests/regression.test.js',
        type: 'update',
        description: `Add regression test for issue #${issue.number}`,
      });
    }

    return tests;
  }

  /**
   * ブランチ名を生成
   * @param {IssueInfo} issue 
   * @returns {string}
   */
  generateBranchName(issue) {
    const prefix = issue.type === IssueType.BUG ? 'fix' : 'feat';
    const slug = issue.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .substring(0, 30)
      .replace(/-+$/, '');
    return `${prefix}/${issue.number}-${slug}`;
  }

  /**
   * プレビューを生成（dry run用）
   * @param {ResolverResult} result 
   * @returns {string}
   */
  generatePreview(result) {
    let preview = `# Issue Resolution Preview\n\n`;
    preview += `This is a dry run. No changes will be made.\n\n`;
    preview += result.toMarkdown();
    return preview;
  }
}

module.exports = {
  IssueResolver,
  IssueInfo,
  IssueType,
  ResolverResult,
  ResolverStatus,
  ImpactAnalysis,
};
