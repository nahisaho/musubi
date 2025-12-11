/**
 * MUSUBI CodeGraph MCP Integration
 *
 * Deep integration with CodeGraph MCP v0.8.0 for:
 * - Function call graph analysis
 * - Impact analysis for changes
 * - Dependency chain tracking
 * - Community detection (Louvain algorithm)
 * - GraphRAG (Global/Local search)
 * - File watching for auto re-indexing
 *
 * Supports 16 languages:
 * Python, TypeScript, JavaScript, Rust, Go, Java, PHP, C#,
 * C, C++, HCL, Ruby, Kotlin, Swift, Scala, Lua
 *
 * Based on analysis of GCC codebase with 1,436,920 relations
 *
 * @version 5.8.0
 * @see https://github.com/nahisaho/CodeGraphMCPServer
 */

const fs = require('fs-extra');
const path = require('path');
const { spawn, execSync } = require('child_process');
const Database = require('better-sqlite3');

// ============================================================================
// CodeGraph Integration
// ============================================================================

/**
 * Supported languages in CodeGraph MCP v0.8.0
 */
const SUPPORTED_LANGUAGES = [
  'python',
  'typescript',
  'javascript',
  'rust',
  'go',
  'java',
  'php',
  'csharp',
  'c',
  'cpp',
  'hcl',
  'ruby',
  'kotlin',
  'swift',
  'scala',
  'lua',
];

/**
 * File extensions supported by CodeGraph MCP
 */
const SUPPORTED_EXTENSIONS = [
  '.py',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.rs',
  '.go',
  '.java',
  '.php',
  '.cs',
  '.c',
  '.cpp',
  '.cc',
  '.cxx',
  '.h',
  '.hpp',
  '.hxx',
  '.tf',
  '.hcl',
  '.rb',
  '.kt',
  '.kts',
  '.swift',
  '.scala',
  '.sc',
  '.lua',
];

class CodeGraphIntegration {
  constructor(repoPath, options = {}) {
    this.repoPath = repoPath;
    this.dbPath = path.join(repoPath, '.codegraph', 'graph.db');
    this.options = {
      fullIndex: false,
      noCommunity: false,
      debounce: 1.0,
      ...options,
    };
    this.db = null;
    this.watchProcess = null;
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
   * Start file watching for auto re-indexing (v0.7.0+)
   * @param {Object} options - Watch options
   * @returns {Promise<Object>} Watch process info
   */
  async startWatch(options = {}) {
    const args = ['watch', this.repoPath];

    const debounce = options.debounce || this.options.debounce || 1.0;
    args.push('--debounce', debounce.toString());

    if (options.community) {
      args.push('--community');
    }

    return new Promise((resolve, reject) => {
      console.log(`👁️ Starting file watch: ${this.repoPath}`);
      this.watchProcess = spawn('codegraph-mcp', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      });

      let started = false;

      this.watchProcess.stdout.on('data', data => {
        const output = data.toString();
        if (!started && output.includes('Watching')) {
          started = true;
          resolve({
            success: true,
            pid: this.watchProcess.pid,
            message: 'File watching started',
          });
        }
        console.log(`[CodeGraph Watch] ${output.trim()}`);
      });

      this.watchProcess.stderr.on('data', data => {
        console.error(`[CodeGraph Watch Error] ${data.toString().trim()}`);
      });

      this.watchProcess.on('close', code => {
        this.watchProcess = null;
        if (!started) {
          reject(new Error(`Watch process exited with code ${code}`));
        }
      });

      this.watchProcess.on('error', error => {
        this.watchProcess = null;
        reject(error);
      });

      // Timeout if not started within 5 seconds
      setTimeout(() => {
        if (!started) {
          started = true;
          resolve({
            success: true,
            pid: this.watchProcess?.pid,
            message: 'File watching started (assumed)',
          });
        }
      }, 5000);
    });
  }

  /**
   * Stop file watching
   */
  stopWatch() {
    if (this.watchProcess) {
      this.watchProcess.kill('SIGTERM');
      this.watchProcess = null;
      console.log('👁️ File watching stopped');
      return { success: true };
    }
    return { success: false, message: 'No watch process running' };
  }

  /**
   * Check if file watching is active
   */
  isWatching() {
    return this.watchProcess !== null;
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

  // ============================================================================
  // MCP Tools Integration (14 tools from v0.8.0)
  // ============================================================================

  /**
   * Query codebase with natural language
   * @param {string} query - Search query
   * @param {Object} options - Query options
   */
  async queryCodebase(query, options = {}) {
    const args = ['query', `"${query}"`, '--repo', this.repoPath];

    if (options.maxResults) {
      args.push('--max-results', options.maxResults.toString());
    }

    return this._runCommand(args);
  }

  /**
   * Find dependencies of an entity
   * @param {string} entityId - Entity ID
   * @param {number} depth - Search depth
   */
  async findDependencies(entityId, depth = 3) {
    this.ensureOpen();

    const entity = this._resolveEntityId(entityId);
    if (!entity) {
      return { error: `Entity "${entityId}" not found` };
    }

    return this._findDependenciesRecursive(entity.id, depth, new Set());
  }

  /**
   * Find callers of a function/method (MCP tool: find_callers)
   */
  async findCallers(entityId) {
    this.ensureOpen();

    const entity = this._resolveEntityId(entityId);
    if (!entity) {
      return { error: `Entity "${entityId}" not found` };
    }

    return this.getCallers(entity.id, 1);
  }

  /**
   * Find callees of a function/method (MCP tool: find_callees)
   */
  async findCallees(entityId) {
    this.ensureOpen();

    const entity = this._resolveEntityId(entityId);
    if (!entity) {
      return { error: `Entity "${entityId}" not found` };
    }

    return this.getCallees(entity.id, 1);
  }

  /**
   * Find implementations of an interface
   */
  async findImplementations(entityId) {
    this.ensureOpen();

    const entity = this._resolveEntityId(entityId);
    if (!entity) {
      return { error: `Entity "${entityId}" not found` };
    }

    return this.db
      .prepare(
        `
        SELECT e.id, e.name, e.type, e.file, e.start_line
        FROM relations r
        JOIN entities e ON r.source_id = e.id
        WHERE r.target_id = ?
          AND r.type IN ('implements', 'extends', 'inherits')
      `
      )
      .all(entity.id);
  }

  /**
   * Analyze module structure
   */
  async analyzeModuleStructure(filePath) {
    this.ensureOpen();

    const entities = this.db
      .prepare(
        `
        SELECT id, name, type, start_line, end_line
        FROM entities
        WHERE file LIKE ?
        ORDER BY start_line
      `
      )
      .all(`%${filePath}%`);

    const relations = [];
    for (const entity of entities) {
      const entityRelations = this.db
        .prepare(
          `
          SELECT r.type, e.name as target_name, e.file as target_file
          FROM relations r
          JOIN entities e ON r.target_id = e.id
          WHERE r.source_id = ?
        `
        )
        .all(entity.id);

      relations.push({
        entity: entity.name,
        entityType: entity.type,
        relations: entityRelations,
      });
    }

    return {
      file: filePath,
      entities,
      relations,
      summary: {
        totalEntities: entities.length,
        functions: entities.filter(e => e.type === 'function').length,
        classes: entities.filter(e => e.type === 'class').length,
        methods: entities.filter(e => e.type === 'method').length,
      },
    };
  }

  /**
   * Get code snippet for an entity
   */
  async getCodeSnippet(entityId, options = {}) {
    this.ensureOpen();

    const entity = this._resolveEntityId(entityId);
    if (!entity) {
      return { error: `Entity "${entityId}" not found` };
    }

    const contextLines = options.includeContext ? 5 : 0;
    const startLine = Math.max(1, entity.start_line - contextLines);
    const endLine = entity.end_line + contextLines;

    // Read file content
    const filePath = path.isAbsolute(entity.file)
      ? entity.file
      : path.join(this.repoPath, entity.file);

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const snippet = lines.slice(startLine - 1, endLine).join('\n');

      return {
        entity: entity.name,
        file: entity.file,
        startLine: entity.start_line,
        endLine: entity.end_line,
        code: snippet,
      };
    }

    return { error: `File not found: ${entity.file}` };
  }

  /**
   * Suggest refactoring for an entity
   */
  async suggestRefactoring(entityId, _type = 'general') {
    this.ensureOpen();

    const entity = this._resolveEntityId(entityId);
    if (!entity) {
      return { error: `Entity "${entityId}" not found` };
    }

    const suggestions = [];
    const lines = entity.end_line - entity.start_line;

    // Check function length
    if (lines > 50) {
      suggestions.push({
        type: 'extract_method',
        reason: `Function is ${lines} lines long (recommended: < 50)`,
        priority: 'high',
      });
    }

    // Check connections
    const connections = this.db
      .prepare(
        `
        SELECT COUNT(DISTINCT r1.source_id) as incoming,
               COUNT(DISTINCT r2.target_id) as outgoing
        FROM entities e
        LEFT JOIN relations r1 ON e.id = r1.target_id
        LEFT JOIN relations r2 ON e.id = r2.source_id
        WHERE e.id = ?
      `
      )
      .get(entity.id);

    if (connections.incoming > 10) {
      suggestions.push({
        type: 'reduce_coupling',
        reason: `High incoming connections (${connections.incoming})`,
        priority: 'medium',
      });
    }

    if (connections.outgoing > 15) {
      suggestions.push({
        type: 'single_responsibility',
        reason: `High outgoing dependencies (${connections.outgoing})`,
        priority: 'medium',
      });
    }

    return {
      entity: entity.name,
      type: entity.type,
      file: entity.file,
      metrics: {
        lines,
        incomingConnections: connections.incoming,
        outgoingConnections: connections.outgoing,
      },
      suggestions,
    };
  }

  // ============================================================================
  // GraphRAG Tools (v0.6.0+)
  // ============================================================================

  /**
   * Global search using community summaries
   */
  async globalSearch(query) {
    const args = ['global-search', `"${query}"`, '--repo', this.repoPath];
    return this._runCommand(args);
  }

  /**
   * Local search in entity neighborhood
   */
  async localSearch(query, entityId) {
    const args = ['local-search', `"${query}"`, '--repo', this.repoPath];
    if (entityId) {
      args.push('--entity', entityId);
    }
    return this._runCommand(args);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Resolve partial entity ID to full ID
   */
  _resolveEntityId(partialId) {
    // Try exact match first
    let entity = this.db
      .prepare('SELECT * FROM entities WHERE id = ? OR name = ? LIMIT 1')
      .get(partialId, partialId);

    if (entity) return entity;

    // Try qualified_name suffix match
    entity = this.db
      .prepare('SELECT * FROM entities WHERE qualified_name LIKE ? LIMIT 1')
      .get(`%${partialId}`);

    if (entity) return entity;

    // Try file::name pattern
    if (partialId.includes('::')) {
      const [file, name] = partialId.split('::');
      entity = this.db
        .prepare('SELECT * FROM entities WHERE file LIKE ? AND name = ? LIMIT 1')
        .get(`%${file}%`, name);
    }

    return entity;
  }

  /**
   * Find dependencies recursively
   */
  _findDependenciesRecursive(entityId, depth, visited) {
    if (depth <= 0 || visited.has(entityId)) return [];
    visited.add(entityId);

    const deps = this.db
      .prepare(
        `
        SELECT e.id, e.name, e.type, e.file, r.type as relation_type
        FROM relations r
        JOIN entities e ON r.target_id = e.id
        WHERE r.source_id = ?
      `
      )
      .all(entityId);

    return deps.map(dep => ({
      ...dep,
      dependencies: depth > 1 ? this._findDependenciesRecursive(dep.id, depth - 1, visited) : [],
    }));
  }

  /**
   * Run CLI command
   */
  async _runCommand(args) {
    return new Promise((resolve, reject) => {
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
          try {
            resolve(JSON.parse(stdout));
          } catch {
            resolve({ output: stdout });
          }
        } else {
          reject(new Error(`Command failed: ${stderr}`));
        }
      });

      proc.on('error', error => {
        reject(error);
      });
    });
  }

  /**
   * Get supported languages
   */
  static getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
  }

  /**
   * Get supported file extensions
   */
  static getSupportedExtensions() {
    return SUPPORTED_EXTENSIONS;
  }

  /**
   * Check if a file is supported
   */
  static isFileSupported(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext);
  }
}

module.exports = {
  CodeGraphIntegration,
  SUPPORTED_LANGUAGES,
  SUPPORTED_EXTENSIONS,
};
