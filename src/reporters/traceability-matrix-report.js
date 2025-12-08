/**
 * MUSUBI Traceability Matrix Report Generator
 *
 * Generates interactive HTML reports for bidirectional traceability
 * Implements Constitutional Article V: Complete Traceability
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Report format options
 */
const ReportFormat = {
  HTML: 'html',
  MARKDOWN: 'markdown',
  JSON: 'json',
};

/**
 * TraceabilityMatrixReport - Generates visual traceability reports
 */
class TraceabilityMatrixReport {
  constructor(workspaceRoot, options = {}) {
    this.workspaceRoot = workspaceRoot;
    this.options = {
      outputDir: options.outputDir || 'traceability-reports',
      theme: options.theme || 'light',
      interactive: options.interactive !== false,
      includeOrphaned: options.includeOrphaned !== false,
      ...options,
    };
  }

  /**
   * Generate traceability matrix report
   */
  async generate(traceabilityData, format = ReportFormat.HTML) {
    const reportData = this.prepareReportData(traceabilityData);

    switch (format) {
      case ReportFormat.HTML:
        return this.generateHTML(reportData);
      case ReportFormat.MARKDOWN:
        return this.generateMarkdown(reportData);
      case ReportFormat.JSON:
        return this.generateJSON(reportData);
      default:
        return this.generateHTML(reportData);
    }
  }

  /**
   * Prepare report data
   */
  prepareReportData(traceabilityData) {
    const { forward, backward, orphaned, completeness } = traceabilityData;

    return {
      timestamp: new Date().toISOString(),
      forward: forward || [],
      backward: backward || [],
      orphaned: orphaned || { requirements: [], design: [], tasks: [], code: [], tests: [] },
      completeness: completeness || {
        forwardComplete: 0,
        forwardTotal: 0,
        forwardPercentage: 0,
        backwardComplete: 0,
        backwardTotal: 0,
        backwardPercentage: 0,
      },
      summary: this.calculateSummary(traceabilityData),
    };
  }

  /**
   * Calculate summary statistics
   */
  calculateSummary(data) {
    const forward = data.forward || [];
    const backward = data.backward || [];
    const orphaned = data.orphaned || {};

    return {
      totalRequirements: forward.length,
      completeChains: forward.filter(f => f.complete).length,
      incompleteChains: forward.filter(f => !f.complete).length,
      totalTests: backward.length,
      orphanedCount: {
        requirements: (orphaned.requirements || []).length,
        design: (orphaned.design || []).length,
        tasks: (orphaned.tasks || []).length,
        code: (orphaned.code || []).length,
        tests: (orphaned.tests || []).length,
      },
      totalOrphaned: Object.values(orphaned).reduce((sum, arr) => sum + (arr?.length || 0), 0),
    };
  }

  /**
   * Generate HTML report
   */
  generateHTML(data) {
    const { theme } = this.options;
    const isDark = theme === 'dark';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Traceability Matrix Report - MUSUBI</title>
  <style>
    :root {
      --bg-primary: ${isDark ? '#1a1a2e' : '#f5f5f5'};
      --bg-secondary: ${isDark ? '#16213e' : '#ffffff'};
      --text-primary: ${isDark ? '#eee' : '#333'};
      --text-secondary: ${isDark ? '#aaa' : '#666'};
      --border-color: ${isDark ? '#333' : '#ddd'};
      --success: #28a745;
      --warning: #ffc107;
      --danger: #dc3545;
      --info: #17a2b8;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      margin: 0;
      padding: 20px;
      line-height: 1.6;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding: 20px;
      background: var(--bg-secondary);
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header h1 { margin: 0 0 10px; font-size: 2em; }
    .timestamp { color: var(--text-secondary); font-size: 0.9em; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: var(--bg-secondary);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stat-card .value { font-size: 2.5em; font-weight: bold; margin: 10px 0; }
    .stat-card .label { color: var(--text-secondary); }
    .stat-card.success .value { color: var(--success); }
    .stat-card.warning .value { color: var(--warning); }
    .stat-card.danger .value { color: var(--danger); }
    .section {
      background: var(--bg-secondary);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .section h2 { margin-top: 0; border-bottom: 2px solid var(--border-color); padding-bottom: 10px; }
    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .tab {
      padding: 10px 20px;
      background: var(--bg-primary);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      color: var(--text-primary);
      transition: background 0.3s;
    }
    .tab:hover { background: var(--border-color); }
    .tab.active { background: var(--info); color: white; }
    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    .matrix-table th, .matrix-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }
    .matrix-table th { background: var(--bg-primary); font-weight: 600; }
    .matrix-table tr:hover { background: var(--bg-primary); }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8em;
      margin: 2px;
    }
    .badge.complete { background: #d4edda; color: #155724; }
    .badge.incomplete { background: #f8d7da; color: #721c24; }
    .badge.link { background: #cce5ff; color: #004085; }
    .badge.orphan { background: #fff3cd; color: #856404; }
    .collapsible {
      cursor: pointer;
      user-select: none;
    }
    .collapsible::before { content: '▶ '; transition: transform 0.3s; }
    .collapsible.open::before { content: '▼ '; }
    .collapsible-content { display: none; padding-left: 20px; }
    .collapsible-content.open { display: block; }
    .progress-container { display: flex; align-items: center; gap: 10px; }
    .progress { flex: 1; background: var(--border-color); border-radius: 10px; height: 20px; overflow: hidden; }
    .progress-bar { height: 100%; border-radius: 10px; transition: width 0.5s; }
    .progress-bar.high { background: linear-gradient(90deg, #28a745, #5cb85c); }
    .progress-bar.medium { background: linear-gradient(90deg, #ffc107, #ffda44); }
    .progress-bar.low { background: linear-gradient(90deg, #dc3545, #e74c5c); }
    .legend { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 10px; }
    .legend-item { display: flex; align-items: center; gap: 5px; }
    .legend-color { width: 12px; height: 12px; border-radius: 3px; }
    .chain-viz {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-wrap: wrap;
    }
    .chain-node {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.9em;
    }
    .chain-arrow { color: var(--text-secondary); }
    .chain-node.req { background: #cce5ff; color: #004085; }
    .chain-node.design { background: #d4edda; color: #155724; }
    .chain-node.task { background: #fff3cd; color: #856404; }
    .chain-node.code { background: #e2e3e5; color: #383d41; }
    .chain-node.test { background: #f5c6cb; color: #721c24; }
    .chain-node.missing { background: #f8d7da; color: #721c24; border: 2px dashed #dc3545; }
    .filter-bar {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .filter-bar input {
      padding: 10px 15px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-primary);
      color: var(--text-primary);
      flex: 1;
      min-width: 200px;
    }
    .filter-bar select {
      padding: 10px 15px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-primary);
      color: var(--text-primary);
    }
    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .tabs { flex-wrap: wrap; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Traceability Matrix Report</h1>
      <p class="timestamp">Generated: ${data.timestamp}</p>
      <p>MUSUBI - Ultimate Specification Driven Development</p>
    </div>

    <!-- Statistics Overview -->
    <div class="stats-grid">
      <div class="stat-card ${data.completeness.forwardPercentage >= 80 ? 'success' : data.completeness.forwardPercentage >= 60 ? 'warning' : 'danger'}">
        <div class="label">Forward Traceability</div>
        <div class="value">${data.completeness.forwardPercentage}%</div>
        <div class="label">${data.completeness.forwardComplete}/${data.completeness.forwardTotal} Complete</div>
      </div>
      <div class="stat-card ${data.completeness.backwardPercentage >= 80 ? 'success' : data.completeness.backwardPercentage >= 60 ? 'warning' : 'danger'}">
        <div class="label">Backward Traceability</div>
        <div class="value">${data.completeness.backwardPercentage}%</div>
        <div class="label">${data.completeness.backwardComplete}/${data.completeness.backwardTotal} Complete</div>
      </div>
      <div class="stat-card ${data.summary.totalOrphaned === 0 ? 'success' : 'warning'}">
        <div class="label">Orphaned Items</div>
        <div class="value">${data.summary.totalOrphaned}</div>
        <div class="label">Needs Linking</div>
      </div>
      <div class="stat-card">
        <div class="label">Total Requirements</div>
        <div class="value">${data.summary.totalRequirements}</div>
        <div class="label">Tracked</div>
      </div>
    </div>

    <!-- Forward Traceability Section -->
    <div class="section">
      <h2>🔗 Forward Traceability (Requirements → Tests)</h2>
      <p>Tracing each requirement through design, tasks, code, and tests.</p>
      
      <div class="progress-container">
        <span>Progress:</span>
        <div class="progress">
          <div class="progress-bar ${data.completeness.forwardPercentage >= 80 ? 'high' : data.completeness.forwardPercentage >= 60 ? 'medium' : 'low'}" 
               style="width: ${data.completeness.forwardPercentage}%"></div>
        </div>
        <span>${data.completeness.forwardPercentage}%</span>
      </div>

      <div class="filter-bar">
        <input type="text" id="forward-search" placeholder="Search requirements..." onkeyup="filterForward()">
        <select id="forward-filter" onchange="filterForward()">
          <option value="all">All</option>
          <option value="complete">Complete Only</option>
          <option value="incomplete">Incomplete Only</option>
        </select>
      </div>

      <table class="matrix-table" id="forward-table">
        <thead>
          <tr>
            <th>Requirement</th>
            <th>Design</th>
            <th>Tasks</th>
            <th>Code</th>
            <th>Tests</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${this.generateForwardRows(data.forward)}
        </tbody>
      </table>
    </div>

    <!-- Backward Traceability Section -->
    <div class="section">
      <h2>🔙 Backward Traceability (Tests → Requirements)</h2>
      <p>Tracing each test back to its originating requirements.</p>
      
      <div class="progress-container">
        <span>Progress:</span>
        <div class="progress">
          <div class="progress-bar ${data.completeness.backwardPercentage >= 80 ? 'high' : data.completeness.backwardPercentage >= 60 ? 'medium' : 'low'}" 
               style="width: ${data.completeness.backwardPercentage}%"></div>
        </div>
        <span>${data.completeness.backwardPercentage}%</span>
      </div>

      <table class="matrix-table" id="backward-table">
        <thead>
          <tr>
            <th>Test</th>
            <th>Code</th>
            <th>Tasks</th>
            <th>Design</th>
            <th>Requirements</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${this.generateBackwardRows(data.backward)}
        </tbody>
      </table>
    </div>

    <!-- Orphaned Items Section -->
    ${this.options.includeOrphaned ? this.generateOrphanedSection(data.orphaned, data.summary) : ''}

    <!-- Legend -->
    <div class="section">
      <h2>📋 Legend</h2>
      <div class="legend">
        <div class="legend-item">
          <div class="legend-color" style="background: #d4edda;"></div>
          <span>Complete Chain</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #f8d7da;"></div>
          <span>Incomplete Chain</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #cce5ff;"></div>
          <span>Linked Item</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #fff3cd;"></div>
          <span>Orphaned Item</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    ${this.options.interactive ? this.generateInteractiveScript() : ''}
  </script>
</body>
</html>`;
  }

  /**
   * Generate forward traceability rows
   */
  generateForwardRows(forward) {
    if (!forward || forward.length === 0) {
      return '<tr><td colspan="6" style="text-align: center;">No requirements found</td></tr>';
    }

    return forward.map(item => {
      const req = item.requirement;
      const reqId = req?.id || req?.file || 'Unknown';

      return `
        <tr data-complete="${item.complete}">
          <td><code>${this.escapeHtml(reqId)}</code></td>
          <td>${this.formatLinks(item.design, 'design')}</td>
          <td>${this.formatLinks(item.tasks, 'task')}</td>
          <td>${this.formatLinks(item.code, 'code')}</td>
          <td>${this.formatLinks(item.tests, 'test')}</td>
          <td>
            <span class="badge ${item.complete ? 'complete' : 'incomplete'}">
              ${item.complete ? '✓ Complete' : '✗ Incomplete'}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Generate backward traceability rows
   */
  generateBackwardRows(backward) {
    if (!backward || backward.length === 0) {
      return '<tr><td colspan="6" style="text-align: center;">No tests found</td></tr>';
    }

    return backward.map(item => {
      const test = item.test;
      const testId = test?.file || test?.id || 'Unknown';

      return `
        <tr data-complete="${item.complete}">
          <td><code>${this.escapeHtml(path.basename(testId))}</code></td>
          <td>${this.formatLinks(item.code, 'code')}</td>
          <td>${this.formatLinks(item.tasks, 'task')}</td>
          <td>${this.formatLinks(item.design, 'design')}</td>
          <td>${this.formatLinks(item.requirements, 'req')}</td>
          <td>
            <span class="badge ${item.complete ? 'complete' : 'incomplete'}">
              ${item.complete ? '✓ Traced' : '✗ Untraced'}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Format linked items
   */
  formatLinks(items, type) {
    if (!items || items.length === 0) {
      return `<span class="badge missing">None</span>`;
    }

    return items.map(item => {
      const id = item?.id || item?.file || 'Unknown';
      const displayId = path.basename(id);
      return `<span class="badge link chain-node ${type}">${this.escapeHtml(displayId)}</span>`;
    }).join(' ');
  }

  /**
   * Generate orphaned items section
   */
  generateOrphanedSection(orphaned, summary) {
    if (summary.totalOrphaned === 0) {
      return `
        <div class="section">
          <h2>🎉 Orphaned Items</h2>
          <p style="color: var(--success);">All items are properly linked! No orphaned items found.</p>
        </div>
      `;
    }

    return `
      <div class="section">
        <h2>⚠️ Orphaned Items (${summary.totalOrphaned})</h2>
        <p>These items are not linked to any requirements and may need attention.</p>
        
        ${this.generateOrphanedList('Requirements', orphaned.requirements)}
        ${this.generateOrphanedList('Design', orphaned.design)}
        ${this.generateOrphanedList('Tasks', orphaned.tasks)}
        ${this.generateOrphanedList('Code', orphaned.code)}
        ${this.generateOrphanedList('Tests', orphaned.tests)}
      </div>
    `;
  }

  /**
   * Generate orphaned list for a category
   */
  generateOrphanedList(category, items) {
    if (!items || items.length === 0) return '';

    return `
      <div style="margin: 15px 0;">
        <h3 class="collapsible" onclick="toggleCollapsible(this)">${category} (${items.length})</h3>
        <div class="collapsible-content">
          <ul>
            ${items.map(item => {
              const id = item?.id || item?.file || 'Unknown';
              return `<li><code>${this.escapeHtml(id)}</code></li>`;
            }).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Generate interactive JavaScript
   */
  generateInteractiveScript() {
    return `
      function filterForward() {
        const search = document.getElementById('forward-search').value.toLowerCase();
        const filter = document.getElementById('forward-filter').value;
        const rows = document.querySelectorAll('#forward-table tbody tr');
        
        rows.forEach(row => {
          const text = row.textContent.toLowerCase();
          const isComplete = row.getAttribute('data-complete') === 'true';
          
          let show = text.includes(search);
          
          if (filter === 'complete') show = show && isComplete;
          if (filter === 'incomplete') show = show && !isComplete;
          
          row.style.display = show ? '' : 'none';
        });
      }

      function toggleCollapsible(element) {
        element.classList.toggle('open');
        const content = element.nextElementSibling;
        if (content) {
          content.classList.toggle('open');
        }
      }

      // Auto-expand orphaned sections
      document.querySelectorAll('.collapsible').forEach(el => {
        if (el.textContent.includes('(0)')) {
          el.style.display = 'none';
          el.nextElementSibling.style.display = 'none';
        }
      });
    `;
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Generate Markdown report
   */
  generateMarkdown(data) {
    let md = `# Traceability Matrix Report

Generated: ${data.timestamp}

## Summary

| Metric | Value |
|--------|-------|
| Total Requirements | ${data.summary.totalRequirements} |
| Complete Chains | ${data.summary.completeChains} |
| Incomplete Chains | ${data.summary.incompleteChains} |
| Total Tests | ${data.summary.totalTests} |
| Orphaned Items | ${data.summary.totalOrphaned} |

## Completeness

| Direction | Complete | Total | Percentage |
|-----------|----------|-------|------------|
| Forward (Req → Test) | ${data.completeness.forwardComplete} | ${data.completeness.forwardTotal} | ${data.completeness.forwardPercentage}% |
| Backward (Test → Req) | ${data.completeness.backwardComplete} | ${data.completeness.backwardTotal} | ${data.completeness.backwardPercentage}% |

## Forward Traceability

| Requirement | Design | Tasks | Code | Tests | Status |
|-------------|--------|-------|------|-------|--------|
`;

    for (const item of data.forward) {
      const req = item.requirement;
      const reqId = req?.id || req?.file || 'Unknown';
      md += `| ${reqId} | ${item.design.length} | ${item.tasks.length} | ${item.code.length} | ${item.tests.length} | ${item.complete ? '✓' : '✗'} |\n`;
    }

    md += `
## Backward Traceability

| Test | Code | Tasks | Design | Requirements | Status |
|------|------|-------|--------|--------------|--------|
`;

    for (const item of data.backward) {
      const test = item.test;
      const testFile = test?.file ? path.basename(test.file) : 'Unknown';
      md += `| ${testFile} | ${item.code.length} | ${item.tasks.length} | ${item.design.length} | ${item.requirements.length} | ${item.complete ? '✓' : '✗'} |\n`;
    }

    if (data.summary.totalOrphaned > 0) {
      md += `
## Orphaned Items

`;
      const categories = ['requirements', 'design', 'tasks', 'code', 'tests'];
      for (const cat of categories) {
        const items = data.orphaned[cat] || [];
        if (items.length > 0) {
          md += `### ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${items.length})

`;
          for (const item of items) {
            md += `- ${item?.id || item?.file || 'Unknown'}\n`;
          }
          md += '\n';
        }
      }
    }

    return md;
  }

  /**
   * Generate JSON report
   */
  generateJSON(data) {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Save report to file
   */
  async saveReport(report, filename, format = ReportFormat.HTML) {
    const outputDir = path.join(this.workspaceRoot, this.options.outputDir);
    await fs.ensureDir(outputDir);

    const extension = format === ReportFormat.HTML ? '.html' : format === ReportFormat.MARKDOWN ? '.md' : '.json';
    const fullPath = path.join(outputDir, filename + extension);

    await fs.writeFile(fullPath, report, 'utf8');

    return fullPath;
  }
}

module.exports = {
  TraceabilityMatrixReport,
  ReportFormat,
};
