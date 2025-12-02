const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');

/**
 * Gap Detector - Identifies orphaned requirements, untested code, and missing traceability
 */
class GapDetector {
  constructor(options = {}) {
    this.requirementsDir = options.requirementsDir || 'docs/requirements';
    this.designDir = options.designDir || 'docs/design';
    this.tasksDir = options.tasksDir || 'docs/tasks';
    this.srcDir = options.srcDir || 'src';
    this.testsDir = options.testsDir || 'tests';
  }

  /**
   * Detect all gaps (requirements, code, tests)
   */
  async detectAllGaps() {
    const orphanedRequirements = await this.detectOrphanedRequirements();
    const unimplementedRequirements = await this.detectUnimplementedRequirements();
    const untestedCode = await this.detectUntestedCode();
    const missingTests = await this.detectMissingTests();

    return {
      orphanedRequirements,
      unimplementedRequirements,
      untestedCode,
      missingTests,
      summary: {
        total:
          orphanedRequirements.length +
          unimplementedRequirements.length +
          untestedCode.length +
          missingTests.length,
        orphanedRequirements: orphanedRequirements.length,
        unimplementedRequirements: unimplementedRequirements.length,
        untestedCode: untestedCode.length,
        missingTests: missingTests.length,
      },
    };
  }

  /**
   * Detect orphaned requirements (no design/task references)
   */
  async detectOrphanedRequirements() {
    const requirements = await this.extractRequirements();
    const designRefs = await this.extractDesignReferences();
    const taskRefs = await this.extractTaskReferences();

    const orphaned = [];
    for (const req of requirements) {
      const hasDesign = designRefs.some(ref => ref === req.id);
      const hasTask = taskRefs.some(ref => ref === req.id);

      if (!hasDesign && !hasTask) {
        orphaned.push({
          id: req.id,
          title: req.title,
          file: req.file,
          reason: 'No design or task references found',
        });
      }
    }

    return orphaned;
  }

  /**
   * Detect unimplemented requirements (no code references)
   */
  async detectUnimplementedRequirements() {
    const requirements = await this.extractRequirements();
    const codeRefs = await this.extractCodeReferences();

    const unimplemented = [];
    for (const req of requirements) {
      const hasCode = codeRefs.some(ref => ref === req.id);

      if (!hasCode) {
        unimplemented.push({
          id: req.id,
          title: req.title,
          file: req.file,
          reason: 'No code implementation found',
        });
      }
    }

    return unimplemented;
  }

  /**
   * Detect untested code (no test files)
   */
  async detectUntestedCode() {
    const srcFiles = await this.getSourceFiles();
    const testFiles = await this.getTestFiles();

    const untested = [];
    for (const srcFile of srcFiles) {
      const baseName = path.basename(srcFile, path.extname(srcFile));
      const hasTest = testFiles.some(testFile => {
        const testBaseName = path.basename(testFile, path.extname(testFile));
        return testBaseName.includes(baseName) || testBaseName.replace('.test', '') === baseName;
      });

      if (!hasTest) {
        untested.push({
          file: srcFile,
          reason: 'No corresponding test file found',
        });
      }
    }

    return untested;
  }

  /**
   * Detect missing tests (requirements without test coverage)
   */
  async detectMissingTests() {
    const requirements = await this.extractRequirements();
    const testRefs = await this.extractTestReferences();

    const missing = [];
    for (const req of requirements) {
      const hasTest = testRefs.some(ref => ref === req.id);

      if (!hasTest) {
        missing.push({
          id: req.id,
          title: req.title,
          file: req.file,
          reason: 'No test coverage found',
        });
      }
    }

    return missing;
  }

  /**
   * Calculate coverage statistics
   */
  async calculateCoverage() {
    const requirements = await this.extractRequirements();
    const designRefs = await this.extractDesignReferences();
    const taskRefs = await this.extractTaskReferences();
    const codeRefs = await this.extractCodeReferences();
    const testRefs = await this.extractTestReferences();
    const srcFiles = await this.getSourceFiles();
    const testFiles = await this.getTestFiles();

    const totalReqs = requirements.length;
    const withDesign = requirements.filter(req => designRefs.some(ref => ref === req.id)).length;
    const withTasks = requirements.filter(req => taskRefs.some(ref => ref === req.id)).length;
    const withCode = requirements.filter(req => codeRefs.some(ref => ref === req.id)).length;
    const withTests = requirements.filter(req => testRefs.some(ref => ref === req.id)).length;

    const totalSrc = srcFiles.length;
    const testedSrc = srcFiles.filter(srcFile => {
      const baseName = path.basename(srcFile, path.extname(srcFile));
      return testFiles.some(testFile => {
        const testBaseName = path.basename(testFile, path.extname(testFile));
        return testBaseName.includes(baseName) || testBaseName.replace('.test', '') === baseName;
      });
    }).length;

    return {
      requirements: {
        total: totalReqs,
        withDesign,
        withTasks,
        withCode,
        withTests,
        designCoverage: totalReqs > 0 ? (withDesign / totalReqs) * 100 : 100,
        taskCoverage: totalReqs > 0 ? (withTasks / totalReqs) * 100 : 100,
        implementationCoverage: totalReqs > 0 ? (withCode / totalReqs) * 100 : 100,
        testCoverage: totalReqs > 0 ? (withTests / totalReqs) * 100 : 100,
      },
      code: {
        total: totalSrc,
        tested: testedSrc,
        untested: totalSrc - testedSrc,
        testCoverage: totalSrc > 0 ? (testedSrc / totalSrc) * 100 : 100,
      },
    };
  }

  /**
   * Extract requirements from requirements directory
   */
  async extractRequirements() {
    if (!(await fs.pathExists(this.requirementsDir))) {
      return [];
    }

    const files = glob.sync(`${this.requirementsDir}/**/*.md`);
    const requirements = [];

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const matches = content.matchAll(/^##\s+(REQ-[A-Z]+-\d+):\s+(.+)$/gm);

      for (const match of matches) {
        requirements.push({
          id: match[1],
          title: match[2],
          file: path.relative(process.cwd(), file),
        });
      }
    }

    return requirements;
  }

  /**
   * Extract design references from design directory
   */
  async extractDesignReferences() {
    if (!(await fs.pathExists(this.designDir))) {
      return [];
    }

    const files = glob.sync(`${this.designDir}/**/*.md`);
    const references = new Set();

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const matches = content.matchAll(/REQ-[A-Z]+-\d+/g);

      for (const match of matches) {
        references.add(match[0]);
      }
    }

    return Array.from(references);
  }

  /**
   * Extract task references from tasks directory
   */
  async extractTaskReferences() {
    if (!(await fs.pathExists(this.tasksDir))) {
      return [];
    }

    const files = glob.sync(`${this.tasksDir}/**/*.md`);
    const references = new Set();

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const matches = content.matchAll(/REQ-[A-Z]+-\d+/g);

      for (const match of matches) {
        references.add(match[0]);
      }
    }

    return Array.from(references);
  }

  /**
   * Extract code references from source directory
   */
  async extractCodeReferences() {
    if (!(await fs.pathExists(this.srcDir))) {
      return [];
    }

    const files = glob.sync(`${this.srcDir}/**/*.{js,ts,jsx,tsx,py,java,go,rb}`);
    const references = new Set();

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const matches = content.matchAll(/REQ-[A-Z]+-\d+/g);

      for (const match of matches) {
        references.add(match[0]);
      }
    }

    return Array.from(references);
  }

  /**
   * Extract test references from tests directory
   */
  async extractTestReferences() {
    if (!(await fs.pathExists(this.testsDir))) {
      return [];
    }

    const files = glob.sync(`${this.testsDir}/**/*.{test,spec}.{js,ts,jsx,tsx,py,java,go,rb}`);
    const references = new Set();

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const matches = content.matchAll(/REQ-[A-Z]+-\d+/g);

      for (const match of matches) {
        references.add(match[0]);
      }
    }

    return Array.from(references);
  }

  /**
   * Get source files
   */
  async getSourceFiles() {
    if (!(await fs.pathExists(this.srcDir))) {
      return [];
    }

    return glob.sync(`${this.srcDir}/**/*.{js,ts,jsx,tsx}`, {
      ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**'],
    });
  }

  /**
   * Get test files
   */
  async getTestFiles() {
    if (!(await fs.pathExists(this.testsDir))) {
      return [];
    }

    return glob.sync(`${this.testsDir}/**/*.{test,spec}.{js,ts,jsx,tsx}`);
  }

  /**
   * Display gaps in table format
   */
  displayTable(gaps, verbose = false) {
    console.log(chalk.bold('\n📊 Gap Detection Summary\n'));
    console.log(`Total Gaps: ${chalk.yellow(gaps.summary.total)}`);
    console.log(`  Orphaned Requirements: ${chalk.yellow(gaps.summary.orphanedRequirements)}`);
    console.log(
      `  Unimplemented Requirements: ${chalk.yellow(gaps.summary.unimplementedRequirements)}`
    );
    console.log(`  Untested Code: ${chalk.yellow(gaps.summary.untestedCode)}`);
    console.log(`  Missing Tests: ${chalk.yellow(gaps.summary.missingTests)}`);

    if (verbose && gaps.orphanedRequirements.length > 0) {
      console.log(chalk.bold('\n🔴 Orphaned Requirements:\n'));
      gaps.orphanedRequirements.forEach(req => {
        console.log(`  ${chalk.red(req.id)}: ${req.title}`);
        console.log(`    File: ${req.file}`);
        console.log(`    Reason: ${req.reason}\n`);
      });
    }

    if (verbose && gaps.untestedCode.length > 0) {
      console.log(chalk.bold('\n🔴 Untested Code:\n'));
      gaps.untestedCode.forEach(item => {
        console.log(`  ${chalk.red(item.file)}`);
        console.log(`    Reason: ${item.reason}\n`);
      });
    }
  }

  /**
   * Display requirements table
   */
  displayRequirementsTable(orphaned) {
    if (orphaned.length === 0) {
      console.log(chalk.green('No orphaned requirements found.'));
      return;
    }

    console.log(chalk.bold('\n🔴 Orphaned Requirements:\n'));
    orphaned.forEach(req => {
      console.log(`  ${chalk.red(req.id)}: ${req.title}`);
      console.log(`    File: ${req.file}`);
      console.log(`    Reason: ${req.reason}\n`);
    });
  }

  /**
   * Display code table
   */
  displayCodeTable(untested) {
    if (untested.length === 0) {
      console.log(chalk.green('All code is tested.'));
      return;
    }

    console.log(chalk.bold('\n🔴 Untested Code:\n'));
    untested.forEach(item => {
      console.log(`  ${chalk.red(item.file)}`);
      console.log(`    Reason: ${item.reason}\n`);
    });
  }

  /**
   * Display coverage table
   */
  displayCoverageTable(coverage) {
    console.log(chalk.bold('\n📊 Coverage Statistics\n'));

    console.log(chalk.bold('Requirements Coverage:'));
    console.log(`  Total Requirements: ${coverage.requirements.total}`);
    console.log(
      `  With Design: ${coverage.requirements.withDesign} (${coverage.requirements.designCoverage.toFixed(1)}%)`
    );
    console.log(
      `  With Tasks: ${coverage.requirements.withTasks} (${coverage.requirements.taskCoverage.toFixed(1)}%)`
    );
    console.log(
      `  With Code: ${coverage.requirements.withCode} (${coverage.requirements.implementationCoverage.toFixed(1)}%)`
    );
    console.log(
      `  With Tests: ${coverage.requirements.withTests} (${coverage.requirements.testCoverage.toFixed(1)}%)`
    );

    console.log(chalk.bold('\nCode Coverage:'));
    console.log(`  Total Source Files: ${coverage.code.total}`);
    console.log(`  Tested: ${coverage.code.tested} (${coverage.code.testCoverage.toFixed(1)}%)`);
    console.log(`  Untested: ${coverage.code.untested}`);
  }

  /**
   * Format gaps as markdown
   */
  formatMarkdown(gaps) {
    let md = '# Gap Detection Report\n\n';
    md += '## Summary\n\n';
    md += `- **Total Gaps**: ${gaps.summary.total}\n`;
    md += `- **Orphaned Requirements**: ${gaps.summary.orphanedRequirements}\n`;
    md += `- **Unimplemented Requirements**: ${gaps.summary.unimplementedRequirements}\n`;
    md += `- **Untested Code**: ${gaps.summary.untestedCode}\n`;
    md += `- **Missing Tests**: ${gaps.summary.missingTests}\n\n`;

    if (gaps.orphanedRequirements.length > 0) {
      md += '## Orphaned Requirements\n\n';
      gaps.orphanedRequirements.forEach(req => {
        md += `### ${req.id}: ${req.title}\n\n`;
        md += `- **File**: ${req.file}\n`;
        md += `- **Reason**: ${req.reason}\n\n`;
      });
    }

    if (gaps.untestedCode.length > 0) {
      md += '## Untested Code\n\n';
      gaps.untestedCode.forEach(item => {
        md += `### ${item.file}\n\n`;
        md += `- **Reason**: ${item.reason}\n\n`;
      });
    }

    return md;
  }

  /**
   * Format requirements as markdown
   */
  formatRequirementsMarkdown(orphaned) {
    let md = '# Orphaned Requirements Report\n\n';
    md += `**Total**: ${orphaned.length}\n\n`;

    orphaned.forEach(req => {
      md += `## ${req.id}: ${req.title}\n\n`;
      md += `- **File**: ${req.file}\n`;
      md += `- **Reason**: ${req.reason}\n\n`;
    });

    return md;
  }

  /**
   * Format code as markdown
   */
  formatCodeMarkdown(untested) {
    let md = '# Untested Code Report\n\n';
    md += `**Total**: ${untested.length}\n\n`;

    untested.forEach(item => {
      md += `## ${item.file}\n\n`;
      md += `- **Reason**: ${item.reason}\n\n`;
    });

    return md;
  }

  /**
   * Format coverage as markdown
   */
  formatCoverageMarkdown(coverage) {
    let md = '# Coverage Report\n\n';

    md += '## Requirements Coverage\n\n';
    md += `- **Total Requirements**: ${coverage.requirements.total}\n`;
    md += `- **With Design**: ${coverage.requirements.withDesign} (${coverage.requirements.designCoverage.toFixed(1)}%)\n`;
    md += `- **With Tasks**: ${coverage.requirements.withTasks} (${coverage.requirements.taskCoverage.toFixed(1)}%)\n`;
    md += `- **With Code**: ${coverage.requirements.withCode} (${coverage.requirements.implementationCoverage.toFixed(1)}%)\n`;
    md += `- **With Tests**: ${coverage.requirements.withTests} (${coverage.requirements.testCoverage.toFixed(1)}%)\n\n`;

    md += '## Code Coverage\n\n';
    md += `- **Total Source Files**: ${coverage.code.total}\n`;
    md += `- **Tested**: ${coverage.code.tested} (${coverage.code.testCoverage.toFixed(1)}%)\n`;
    md += `- **Untested**: ${coverage.code.untested}\n`;

    return md;
  }
}

module.exports = GapDetector;
