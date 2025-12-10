/**
 * MUSUBI CodeGraph MCP Integration
 *
 * Deep integration with CodeGraph MCP for:
 * - Function call graph analysis
 * - Impact analysis for changes
 * - Dependency chain tracking
 * - Community detection
 *
 * Based on analysis of GCC codebase with 1,436,920 relations
 *
 * @version 5.5.0
 */

const fs = require('fs-extra');
const path = require('path');
const { spawn, execSync } = require('child_process');
const Database = require('better-sqlite3');

// ============================================================================
// CodeGraph Integration
// ============================================================================

class CodeGraphIntegration {
  constructor(repoPath, options = {}) {
    this.repoPath = repoPath;
    this.dbPath = path.join(repoPath, '.codegraph', 'graph.db');
    this.options = {
      fullIndex: false,
      noCommunity: false,
      ...options,
    };
    this.db = null;
  }

  /**
   * Check if CodeGraph MCP is installed
   */
  static isInstalled() {
    try {
      execSync('which codegraph-mcp', { encoding: 'utf8', stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if index exists
   */
  hasIndex() {
    return fs.existsSync(this.dbPath);
  }

  /**
   * Initialize or update CodeGraph index
   */
  async indexRepository(options = {}) {
    const args = ['index', this.repoPath];

    if (options.full || this.options.fullIndex) {
      args.push('--full');
    }

    if (options.noCommunity || this.options.noCommunity) {
      args.push('--no-community');
    }

    return new Promise((resolve, reject) => {
      console.log(`📊 Indexing repository: ${this.repoPath}`);
      const proc = spawn('codegraph-mcp', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', data => {
        stdout += data.toString();
      });

      proc.stderr.on('data', data => {
        stderr += data.toString();
      });

      proc.on('close', code => {
        if (code === 0) {
          resolve({ success: true, output: stdout });
        } else {
          reject(new Error(`CodeGraph indexing failed: ${stderr}`));
        }
      });

      proc.on('error', error => {
        reject(error);
      });
    });
  }

  /**
   * Open database connection
   */
  open() {
    if (!this.hasIndex()) {
      throw new Error(`CodeGraph index not found at ${this.dbPath}. Run indexRepository() first.`);
    }
    this.db = new Database(this.dbPath, { readonly: true });
    return this;
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Get repository statistics
   */
  getStats() {
    this.ensureOpen();

    const entityCount = this.db.prepare('SELECT COUNT(*) as count FROM entities').get().count;
    const fileCount = this.db
      .prepare("SELECT COUNT(*) as count FROM entities WHERE type = 'module'")
      .get().count;
    const relationCount = this.db.prepare('SELECT COUNT(*) as count FROM relations').get().count;

    const entityTypes = this.db
      .prepare(
        `
      SELECT type, COUNT(*) as count
      FROM entities
      GROUP BY type
      ORDER BY count DESC
    `
      )
      .all();

    const relationTypes = this.db
      .prepare(
        `
      SELECT type, COUNT(*) as count
      FROM relations
      GROUP BY type
      ORDER BY count DESC
    `
      )
      .all();

    return {
      entities: entityCount,
      files: fileCount,
      relations: relationCount,
      entityTypes,
      relationTypes,
    };
  }

  /**
   * Get call graph for a function
   */
  getCallGraph(functionName, options = {}) {
    this.ensureOpen();

    const depth = options.depth || 3;
    const direction = options.direction || 'both'; // 'callers', 'callees', 'both'

    const result = {
      function: functionName,
      callers: [],
      callees: [],
    };

    // Get function entity
    const entity = this.db
      .prepare(
        `
      SELECT id, name, file, start_line, end_line
      FROM entities
      WHERE name = ? AND type = 'function'
      LIMIT 1
    `
      )
      .get(functionName);

    if (!entity) {
      return { error: `Function "${functionName}" not found` };
    }

    result.entity = entity;

    // Get callees (functions this function calls)
    if (direction === 'callees' || direction === 'both') {
      result.callees = this.getCallees(entity.id, depth);
    }

    // Get callers (functions that call this function)
    if (direction === 'callers' || direction === 'both') {
      result.callers = this.getCallers(entity.id, depth);
    }

    return result;
  }

  /**
   * Get functions called by given function (recursive)
   */
  getCallees(entityId, depth, visited = new Set()) {
    if (depth <= 0 || visited.has(entityId)) return [];
    visited.add(entityId);

    const callees = this.db
      .prepare(
        `
      SELECT e.id, e.name, e.file, e.start_line, r.type as relation_type
      FROM relations r
      JOIN entities e ON r.target_id = e.id
      WHERE r.source_id = ?
        AND r.type IN ('calls', 'invokes', 'references')
        AND e.type = 'function'
    `
      )
      .all(entityId);

    return callees.map(callee => ({
      ...callee,
      callees: depth > 1 ? this.getCallees(callee.id, depth - 1, visited) : [],
    }));
  }

  /**
   * Get functions that call given function (recursive)
   */
  getCallers(entityId, depth, visited = new Set()) {
    if (depth <= 0 || visited.has(entityId)) return [];
    visited.add(entityId);

    const callers = this.db
      .prepare(
        `
      SELECT e.id, e.name, e.file, e.start_line, r.type as relation_type
      FROM relations r
      JOIN entities e ON r.source_id = e.id
      WHERE r.target_id = ?
        AND r.type IN ('calls', 'invokes', 'references')
        AND e.type = 'function'
    `
      )
      .all(entityId);

    return callers.map(caller => ({
      ...caller,
      callers: depth > 1 ? this.getCallers(caller.id, depth - 1, visited) : [],
    }));
  }

  /**
   * Analyze impact of changes to specified files
   */
  async analyzeImpact(changedFiles) {
    this.ensureOpen();

    const impact = {
      changedFiles,
      directlyAffected: new Set(),
      transitivelyAffected: new Set(),
      affectedTests: [],
      affectedDocs: [],
      riskLevel: 'low',
      summary: {},
    };

    for (const file of changedFiles) {
      // Get all entities in changed file
      const entities = this.db
        .prepare(
          `
        SELECT id, name, type
        FROM entities
        WHERE file LIKE ?
      `
        )
        .all(`%${file}%`);

      for (const entity of entities) {
        // Find all entities that depend on changed entities
        const dependents = this.db
          .prepare(
            `
          SELECT DISTINCT e.file, e.name, e.type
          FROM relations r
          JOIN entities e ON r.source_id = e.id
          WHERE r.target_id = ?
        `
          )
          .all(entity.id);

        for (const dep of dependents) {
          if (!changedFiles.includes(dep.file)) {
            impact.directlyAffected.add(dep.file);
          }
        }
      }
    }

    // Convert Sets to arrays
    impact.directlyAffected = [...impact.directlyAffected];

    // Find transitive dependencies
    const toCheck = [...impact.directlyAffected];
    const checked = new Set(changedFiles);

    while (toCheck.length > 0) {
      const file = toCheck.pop();
      if (checked.has(file)) continue;
      checked.add(file);

      const entities = this.db
        .prepare(
          `
        SELECT id FROM entities WHERE file LIKE ?
      `
        )
        .all(`%${file}%`);

      for (const entity of entities) {
        const dependents = this.db
          .prepare(
            `
          SELECT DISTINCT e.file
          FROM relations r
          JOIN entities e ON r.source_id = e.id
          WHERE r.target_id = ?
        `
          )
          .all(entity.id);

        for (const dep of dependents) {
          if (!checked.has(dep.file) && !changedFiles.includes(dep.file)) {
            impact.transitivelyAffected.add(dep.file);
            toCheck.push(dep.file);
          }
        }
      }
    }

    impact.transitivelyAffected = [...impact.transitivelyAffected];

    // Find affected tests
    const allAffected = [...impact.directlyAffected, ...impact.transitivelyAffected];
    impact.affectedTests = allAffected.filter(
      f => f.includes('test') || f.includes('spec') || f.includes('__tests__')
    );

    // Calculate risk level
    const totalAffected = allAffected.length;
    if (totalAffected > 100) {
      impact.riskLevel = 'critical';
    } else if (totalAffected > 50) {
      impact.riskLevel = 'high';
    } else if (totalAffected > 20) {
      impact.riskLevel = 'medium';
    } else {
      impact.riskLevel = 'low';
    }

    // Summary
    impact.summary = {
      changedFiles: changedFiles.length,
      directlyAffected: impact.directlyAffected.length,
      transitivelyAffected: impact.transitivelyAffected.length,
      affectedTests: impact.affectedTests.length,
      totalImpact: totalAffected,
      riskLevel: impact.riskLevel,
    };

    return impact;
  }

  /**
   * Get largest functions in the codebase
   */
  getLargestFunctions(limit = 50) {
    this.ensureOpen();

    return this.db
      .prepare(
        `
      SELECT 
        name,
        file,
        start_line,
        end_line,
        (end_line - start_line) as lines
      FROM entities
      WHERE type = 'function'
        AND end_line > start_line
      ORDER BY (end_line - start_line) DESC
      LIMIT ?
    `
      )
      .all(limit);
  }

  /**
   * Get most connected entities (potential refactoring candidates)
   */
  getMostConnected(limit = 50) {
    this.ensureOpen();

    return this.db
      .prepare(
        `
      SELECT 
        e.name,
        e.file,
        e.type,
        COUNT(DISTINCT r1.source_id) as incoming,
        COUNT(DISTINCT r2.target_id) as outgoing,
        COUNT(DISTINCT r1.source_id) + COUNT(DISTINCT r2.target_id) as total_connections
      FROM entities e
      LEFT JOIN relations r1 ON e.id = r1.target_id
      LEFT JOIN relations r2 ON e.id = r2.source_id
      GROUP BY e.id
      ORDER BY total_connections DESC
      LIMIT ?
    `
      )
      .all(limit);
  }

  /**
   * Find circular dependencies
   */
  findCircularDependencies(maxDepth = 5) {
    this.ensureOpen();

    const cycles = [];
    const visited = new Set();

    // Get all modules
    const modules = this.db
      .prepare(
        `
      SELECT id, name, file FROM entities WHERE type = 'module' LIMIT 1000
    `
      )
      .all();

    for (const module of modules) {
      const path = [module.file];
      this.findCycles(module.id, path, visited, cycles, maxDepth);
    }

    return cycles;
  }

  /**
   * Helper to find cycles (DFS)
   */
  findCycles(entityId, path, visited, cycles, depth) {
    if (depth <= 0) return;
    if (visited.has(entityId)) return;

    const deps = this.db
      .prepare(
        `
      SELECT DISTINCT e.id, e.file
      FROM relations r
      JOIN entities e ON r.target_id = e.id
      WHERE r.source_id = ?
        AND e.type = 'module'
        AND r.type IN ('imports', 'includes', 'requires')
    `
      )
      .all(entityId);

    for (const dep of deps) {
      if (path.includes(dep.file)) {
        const cycleStart = path.indexOf(dep.file);
        cycles.push([...path.slice(cycleStart), dep.file]);
      } else {
        this.findCycles(dep.id, [...path, dep.file], visited, cycles, depth - 1);
      }
    }

    visited.add(entityId);
  }

  /**
   * Get file dependencies
   */
  getFileDependencies(filePath) {
    this.ensureOpen();

    const imports = this.db
      .prepare(
        `
      SELECT DISTINCT 
        target.file as imported_file,
        target.name as imported_name,
        r.type as relation_type
      FROM entities source
      JOIN relations r ON source.id = r.source_id
      JOIN entities target ON r.target_id = target.id
      WHERE source.file LIKE ?
        AND r.type IN ('imports', 'includes', 'requires', 'references')
        AND target.type = 'module'
    `
      )
      .all(`%${filePath}%`);

    const exports = this.db
      .prepare(
        `
      SELECT DISTINCT 
        source.file as importing_file,
        source.name as importing_name,
        r.type as relation_type
      FROM entities target
      JOIN relations r ON target.id = r.target_id
      JOIN entities source ON r.source_id = source.id
      WHERE target.file LIKE ?
        AND r.type IN ('imports', 'includes', 'requires', 'references')
        AND source.type = 'module'
    `
      )
      .all(`%${filePath}%`);

    return { imports, exports };
  }

  /**
   * Search entities by pattern
   */
  searchEntities(pattern, options = {}) {
    this.ensureOpen();

    const type = options.type || null;
    const limit = options.limit || 100;

    let query = `
      SELECT id, name, type, file, start_line, end_line
      FROM entities
      WHERE name LIKE ?
    `;

    const params = [`%${pattern}%`];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY name LIMIT ?';
    params.push(limit);

    return this.db.prepare(query).all(...params);
  }

  /**
   * Get community information (if available)
   */
  getCommunities() {
    this.ensureOpen();

    try {
      return this.db
        .prepare(
          `
        SELECT 
          community_id,
          COUNT(*) as member_count,
          GROUP_CONCAT(name, ', ') as members
        FROM entities
        WHERE community_id IS NOT NULL
        GROUP BY community_id
        ORDER BY member_count DESC
        LIMIT 50
      `
        )
        .all();
    } catch (error) {
      return { error: 'Community data not available. Re-index without --no-community flag.' };
    }
  }

  /**
   * Ensure database is open
   */
  ensureOpen() {
    if (!this.db) {
      this.open();
    }
  }

  /**
   * Generate markdown report
   */
  generateReport() {
    const stats = this.getStats();
    const largestFunctions = this.getLargestFunctions(20);
    const mostConnected = this.getMostConnected(20);

    let report = '# CodeGraph Analysis Report\n\n';
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Repository**: ${this.repoPath}\n\n`;

    report += '## Statistics\n\n';
    report += `- Total Entities: ${stats.entities.toLocaleString()}\n`;
    report += `- Total Files: ${stats.files.toLocaleString()}\n`;
    report += `- Total Relations: ${stats.relations.toLocaleString()}\n\n`;

    report += '### Entity Types\n\n';
    report += '| Type | Count |\n|------|-------|\n';
    for (const { type, count } of stats.entityTypes) {
      report += `| ${type} | ${count.toLocaleString()} |\n`;
    }
    report += '\n';

    report += '## Largest Functions (Refactoring Candidates)\n\n';
    report += '| Function | File | Lines |\n|----------|------|-------|\n';
    for (const func of largestFunctions) {
      report += `| ${func.name} | ${func.file} | ${func.lines} |\n`;
    }
    report += '\n';

    report += '## Most Connected Entities (High Coupling)\n\n';
    report += '| Entity | Type | Connections |\n|--------|------|-------------|\n';
    for (const entity of mostConnected) {
      report += `| ${entity.name} | ${entity.type} | ${entity.total_connections} |\n`;
    }

    return report;
  }
}

module.exports = { CodeGraphIntegration };
