/**
 * MUSUBI Hierarchical Reporter
 *
 * Generates hierarchical, drilldown-capable reports for large projects:
 * - Module/directory-based grouping
 * - Hotspot identification
 * - Interactive drill-down support
 * - Multiple output formats
 *
 * Designed for projects with 10,000+ files (like GCC with 109,073 files)
 *
 * @version 5.5.0
 */

const fs = require('fs-extra');
// const path = require('path');

// ============================================================================
// Hierarchical Reporter
// ============================================================================

class HierarchicalReporter {
  constructor(options = {}) {
    this.options = {
      maxDepth: 4,
      hotspotThreshold: 25,
      groupingDepth: 3,
      outputFormat: 'markdown',
      ...options,
    };
  }

  /**
   * Generate hierarchical report from analysis results
   */
  generateReport(analysis, options = {}) {
    const mergedOptions = { ...this.options, ...options };

    const report = {
      generatedAt: new Date().toISOString(),
      projectPath: analysis.projectPath || process.cwd(),
      summary: this.generateSummary(analysis),
      hierarchy: this.buildHierarchy(analysis.files || analysis.results?.files || [], mergedOptions.groupingDepth),
      hotspots: this.identifyHotspots(analysis, mergedOptions.hotspotThreshold),
      trends: this.analyzeTrends(analysis),
      recommendations: this.generateRecommendations(analysis),
    };

    return report;
  }

  /**
   * Generate executive summary
   */
  generateSummary(analysis) {
    const files = analysis.files || analysis.results?.files || [];
    const summary = analysis.summary || analysis.results?.summary || {};

    return {
      totalFiles: files.length,
      totalLines: summary.totalLines || files.reduce((sum, f) => sum + (f.lines || 0), 0),
      averageComplexity: summary.averageComplexity || this.calculateAverage(files, 'complexity'),
      averageMaintainability: summary.averageMaintainability || this.calculateAverage(files, 'maintainability'),
      languageDistribution: summary.languageDistribution || this.calculateLanguageDistribution(files),
      issueCount: this.countIssues(files),
      healthScore: this.calculateHealthScore(files),
    };
  }

  /**
   * Build hierarchical tree from file list
   */
  buildHierarchy(files, depth = 3) {
    const tree = {
      name: 'root',
      path: '',
      stats: {
        files: 0,
        lines: 0,
        complexity: 0,
        issues: 0,
      },
      children: {},
    };

    for (const file of files) {
      const filePath = file.path || file.absolutePath || '';
      const parts = filePath.split('/').filter(p => p);
      const relevantParts = parts.slice(0, depth);

      let current = tree;
      let currentPath = '';

      for (let i = 0; i < relevantParts.length; i++) {
        const part = relevantParts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: currentPath,
            stats: {
              files: 0,
              lines: 0,
              complexity: 0,
              issues: 0,
            },
            children: {},
          };
        }

        current = current.children[part];

        // Add stats to each level
        current.stats.files++;
        current.stats.lines += file.lines || 0;
        current.stats.complexity += file.complexity || 0;
        current.stats.issues += file.issueCount || (file.issues?.length || 0);
      }

      // Add to root
      tree.stats.files++;
      tree.stats.lines += file.lines || 0;
      tree.stats.complexity += file.complexity || 0;
      tree.stats.issues += file.issueCount || (file.issues?.length || 0);
    }

    // Calculate averages for each node
    this.calculateNodeAverages(tree);

    return tree;
  }

  /**
   * Calculate averages for a node and its children recursively
   */
  calculateNodeAverages(node) {
    if (node.stats.files > 0) {
      node.stats.averageComplexity = Math.round(node.stats.complexity / node.stats.files);
      node.stats.issuesPerFile = Math.round((node.stats.issues / node.stats.files) * 100) / 100;
    }

    for (const child of Object.values(node.children)) {
      this.calculateNodeAverages(child);
    }
  }

  /**
   * Identify hotspots (high-complexity, high-issue areas)
   */
  identifyHotspots(analysis, threshold = 25) {
    const files = analysis.files || analysis.results?.files || [];
    const hotspots = [];

    // File-level hotspots
    for (const file of files) {
      const complexity = file.complexity || 0;
      const issues = file.issueCount || (file.issues?.length || 0);

      if (complexity >= threshold || issues >= 3) {
        hotspots.push({
          type: 'file',
          path: file.path,
          complexity,
          issues,
          reason: complexity >= threshold ? 'high-complexity' : 'many-issues',
          severity: complexity >= 50 || issues >= 5 ? 'critical' : 'warning',
        });
      }
    }

    // Function-level hotspots (from giant functions)
    const giantFunctions = analysis.results?.giantFunctions || [];
    for (const func of giantFunctions) {
      hotspots.push({
        type: 'function',
        path: `${func.file}:${func.name}`,
        lines: func.lines,
        reason: 'giant-function',
        severity: func.lines >= 1000 ? 'critical' : 'warning',
      });
    }

    // Directory-level hotspots
    const hierarchy = this.buildHierarchy(files, 2);
    for (const [name, node] of Object.entries(hierarchy.children)) {
      if (node.stats.averageComplexity >= threshold || node.stats.issuesPerFile >= 2) {
        hotspots.push({
          type: 'directory',
          path: name,
          files: node.stats.files,
          averageComplexity: node.stats.averageComplexity,
          issuesPerFile: node.stats.issuesPerFile,
          reason: 'concentrated-issues',
          severity: node.stats.averageComplexity >= 50 ? 'critical' : 'warning',
        });
      }
    }

    // Sort by severity and complexity
    return hotspots.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (a.severity !== 'critical' && b.severity === 'critical') return 1;
      return (b.complexity || b.lines || 0) - (a.complexity || a.lines || 0);
    });
  }

  /**
   * Analyze trends (for comparison with previous analyses)
   */
  analyzeTrends(analysis) {
    // This would compare with historical data if available
    const files = analysis.files || analysis.results?.files || [];

    const complexityDistribution = {
      low: 0,
      medium: 0,
      high: 0,
      extreme: 0,
    };

    for (const file of files) {
      const c = file.complexity || 0;
      if (c < 10) complexityDistribution.low++;
      else if (c < 25) complexityDistribution.medium++;
      else if (c < 50) complexityDistribution.high++;
      else complexityDistribution.extreme++;
    }

    return {
      complexityDistribution,
      timestamp: new Date().toISOString(),
      // Future: compare with previous analysis
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(analysis) {
    const recommendations = [];
    const files = analysis.files || analysis.results?.files || [];
    const summary = analysis.summary || analysis.results?.summary || {};
    const hotspots = this.identifyHotspots(analysis);

    // Giant functions
    const giantFunctions = analysis.results?.giantFunctions || [];
    if (giantFunctions.length > 0) {
      recommendations.push({
        priority: 'P0',
        category: 'refactoring',
        title: 'Refactor Giant Functions',
        description: `${giantFunctions.length} functions exceed 1000 lines`,
        impact: 'Significantly improves maintainability and testability',
        effort: 'High',
        items: giantFunctions.slice(0, 5).map(f => `${f.file}:${f.name} (${f.lines} lines)`),
      });
    }

    // Critical hotspots
    const criticalHotspots = hotspots.filter(h => h.severity === 'critical');
    if (criticalHotspots.length > 0) {
      recommendations.push({
        priority: 'P1',
        category: 'quality',
        title: 'Address Critical Hotspots',
        description: `${criticalHotspots.length} critical areas need attention`,
        impact: 'Reduces bug risk and improves code health',
        effort: 'Medium',
        items: criticalHotspots.slice(0, 5).map(h => `${h.path} (${h.reason})`),
      });
    }

    // Low maintainability
    const avgMaintainability = summary.averageMaintainability || this.calculateAverage(files, 'maintainability');
    if (avgMaintainability < 40) {
      recommendations.push({
        priority: 'P2',
        category: 'documentation',
        title: 'Improve Code Documentation',
        description: `Average maintainability index is ${avgMaintainability} (target: >60)`,
        impact: 'Easier onboarding and reduced knowledge silos',
        effort: 'Low',
        items: [
          'Add JSDoc/docstring comments to public functions',
          'Document complex algorithms inline',
          'Create architecture documentation',
        ],
      });
    }

    // Language diversity
    const languages = Object.keys(summary.languageDistribution || this.calculateLanguageDistribution(files));
    if (languages.length > 5) {
      recommendations.push({
        priority: 'P3',
        category: 'architecture',
        title: 'Consider Language Consolidation',
        description: `${languages.length} different languages detected`,
        impact: 'Simplified tooling and reduced context switching',
        effort: 'High',
        items: languages,
      });
    }

    return recommendations;
  }

  /**
   * Calculate average of a property across files
   */
  calculateAverage(files, property) {
    if (files.length === 0) return 0;
    const sum = files.reduce((acc, f) => acc + (f[property] || 0), 0);
    return Math.round(sum / files.length);
  }

  /**
   * Calculate language distribution
   */
  calculateLanguageDistribution(files) {
    const distribution = {};
    for (const file of files) {
      const lang = file.language || 'unknown';
      distribution[lang] = (distribution[lang] || 0) + 1;
    }
    return distribution;
  }

  /**
   * Count total issues across files
   */
  countIssues(files) {
    return files.reduce((sum, f) => sum + (f.issueCount || (f.issues?.length || 0)), 0);
  }

  /**
   * Calculate overall health score (0-100)
   */
  calculateHealthScore(files) {
    if (files.length === 0) return 100;

    const avgComplexity = this.calculateAverage(files, 'complexity');
    const avgMaintainability = this.calculateAverage(files, 'maintainability');
    const issueRatio = this.countIssues(files) / files.length;

    // Weighted score
    const complexityScore = Math.max(0, 100 - avgComplexity * 2);
    const maintainabilityScore = avgMaintainability;
    const issueScore = Math.max(0, 100 - issueRatio * 20);

    return Math.round(complexityScore * 0.3 + maintainabilityScore * 0.4 + issueScore * 0.3);
  }

  /**
   * Get drill-down data for a specific path
   */
  drillDown(report, targetPath) {
    const pathParts = targetPath.split('/').filter(p => p);
    let current = report.hierarchy;

    for (const part of pathParts) {
      if (current.children && current.children[part]) {
        current = current.children[part];
      } else {
        return null;
      }
    }

    return {
      path: targetPath,
      stats: current.stats,
      children: Object.entries(current.children).map(([name, node]) => ({
        name,
        path: node.path,
        stats: node.stats,
        hasChildren: Object.keys(node.children).length > 0,
      })),
    };
  }

  /**
   * Format report as Markdown
   */
  formatAsMarkdown(report) {
    let md = '# Hierarchical Code Analysis Report\n\n';
    md += `**Generated**: ${report.generatedAt}\n`;
    md += `**Project**: ${report.projectPath}\n\n`;

    // Summary
    md += '## Executive Summary\n\n';
    md += `| Metric | Value |\n|--------|-------|\n`;
    md += `| Total Files | ${report.summary.totalFiles.toLocaleString()} |\n`;
    md += `| Total Lines | ${report.summary.totalLines.toLocaleString()} |\n`;
    md += `| Average Complexity | ${report.summary.averageComplexity} |\n`;
    md += `| Average Maintainability | ${report.summary.averageMaintainability} |\n`;
    md += `| Total Issues | ${report.summary.issueCount} |\n`;
    md += `| Health Score | ${report.summary.healthScore}/100 |\n\n`;

    // Language distribution
    md += '### Language Distribution\n\n';
    md += '| Language | Files |\n|----------|-------|\n';
    for (const [lang, count] of Object.entries(report.summary.languageDistribution)) {
      md += `| ${lang} | ${count} |\n`;
    }
    md += '\n';

    // Hierarchy (top level)
    md += '## Project Structure\n\n';
    md += '| Directory | Files | Lines | Avg Complexity | Issues |\n';
    md += '|-----------|-------|-------|----------------|--------|\n';
    for (const [name, node] of Object.entries(report.hierarchy.children)) {
      md += `| ${name}/ | ${node.stats.files} | ${node.stats.lines.toLocaleString()} | ${node.stats.averageComplexity} | ${node.stats.issues} |\n`;
    }
    md += '\n';

    // Hotspots
    if (report.hotspots.length > 0) {
      md += '## Hotspots\n\n';
      md += '| Type | Path | Severity | Reason |\n';
      md += '|------|------|----------|--------|\n';
      for (const hotspot of report.hotspots.slice(0, 20)) {
        md += `| ${hotspot.type} | ${hotspot.path} | ${hotspot.severity} | ${hotspot.reason} |\n`;
      }
      md += '\n';
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      md += '## Recommendations\n\n';
      for (const rec of report.recommendations) {
        md += `### ${rec.priority}: ${rec.title}\n\n`;
        md += `**Category**: ${rec.category}\n`;
        md += `**Impact**: ${rec.impact}\n`;
        md += `**Effort**: ${rec.effort}\n\n`;
        md += `${rec.description}\n\n`;
        if (rec.items && rec.items.length > 0) {
          md += 'Items:\n';
          for (const item of rec.items) {
            md += `- ${item}\n`;
          }
          md += '\n';
        }
      }
    }

    // Complexity distribution
    md += '## Complexity Distribution\n\n';
    md += '| Level | File Count |\n|-------|------------|\n';
    for (const [level, count] of Object.entries(report.trends.complexityDistribution)) {
      md += `| ${level} | ${count} |\n`;
    }

    return md;
  }

  /**
   * Format report as JSON
   */
  formatAsJson(report) {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Save report to file
   */
  async saveReport(report, outputPath, format = 'markdown') {
    let content;
    let extension;

    switch (format) {
      case 'json':
        content = this.formatAsJson(report);
        extension = '.json';
        break;
      case 'markdown':
      default:
        content = this.formatAsMarkdown(report);
        extension = '.md';
        break;
    }

    const finalPath = outputPath.endsWith(extension) ? outputPath : outputPath + extension;
    await fs.writeFile(finalPath, content, 'utf8');

    return finalPath;
  }
}

module.exports = { HierarchicalReporter };
