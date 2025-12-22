/**
 * Package Manager
 *
 * Manages monorepo package configuration and dependencies.
 * Supports npm workspaces, yarn workspaces, and pnpm workspaces.
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

/**
 * Package types
 */
const PackageType = {
  LIBRARY: 'library',
  CLI: 'cli',
  APPLICATION: 'application',
  EXTENSION: 'extension',
  INFRASTRUCTURE: 'infrastructure',
  MONOREPO_ROOT: 'monorepo-root',
};

/**
 * Default coverage targets by package type
 */
const DEFAULT_COVERAGE_TARGETS = {
  [PackageType.LIBRARY]: 90,
  [PackageType.CLI]: 70,
  [PackageType.APPLICATION]: 60,
  [PackageType.EXTENSION]: 60,
  [PackageType.INFRASTRUCTURE]: 50,
  [PackageType.MONOREPO_ROOT]: 70,
};

/**
 * Package manager detection patterns
 */
const PACKAGE_MANAGER_FILES = {
  pnpm: ['pnpm-lock.yaml', 'pnpm-workspace.yaml'],
  yarn: ['yarn.lock', '.yarnrc.yml'],
  npm: ['package-lock.json'],
};

class PackageManager {
  /**
   * Create a new PackageManager
   * @param {string} projectRoot - Project root directory
   */
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.configPath = path.join(projectRoot, 'steering/packages.yml');
    this._config = null;
    this._packages = null;
  }

  /**
   * Load configuration from file
   * @returns {Promise<object>} Configuration object
   */
  async loadConfig() {
    if (this._config) return this._config;

    try {
      if (await fs.pathExists(this.configPath)) {
        const content = await fs.readFile(this.configPath, 'utf8');
        this._config = yaml.load(content);
        return this._config;
      }
    } catch (error) {
      console.warn(`Warning: Could not load packages config: ${error.message}`);
    }

    // Return default configuration
    return {
      schema_version: '1.0',
      package_manager: await this.detectPackageManager(),
      packages: [],
      coverage_targets: DEFAULT_COVERAGE_TARGETS,
    };
  }

  /**
   * Save configuration to file
   * @param {object} config - Configuration to save
   */
  async saveConfig(config) {
    await fs.ensureDir(path.dirname(this.configPath));
    await fs.writeFile(this.configPath, yaml.dump(config, { indent: 2 }), 'utf8');
    this._config = config;
  }

  /**
   * Detect package manager from project files
   * @returns {Promise<string>} Detected package manager
   */
  async detectPackageManager() {
    for (const [manager, files] of Object.entries(PACKAGE_MANAGER_FILES)) {
      for (const file of files) {
        if (await fs.pathExists(path.join(this.projectRoot, file))) {
          return manager;
        }
      }
    }
    return 'npm';
  }

  /**
   * Detect workspace packages from package manager config
   * @returns {Promise<object[]>} Array of package objects
   */
  async detectWorkspacePackages() {
    const manager = await this.detectPackageManager();
    const packages = [];

    try {
      switch (manager) {
        case 'pnpm': {
          const workspaceFile = path.join(this.projectRoot, 'pnpm-workspace.yaml');
          if (await fs.pathExists(workspaceFile)) {
            const content = await fs.readFile(workspaceFile, 'utf8');
            const workspace = yaml.load(content);
            const patterns = workspace.packages || [];
            packages.push(...(await this._resolvePatterns(patterns)));
          }
          break;
        }
        case 'yarn':
        case 'npm': {
          const packageJson = path.join(this.projectRoot, 'package.json');
          if (await fs.pathExists(packageJson)) {
            const pkg = JSON.parse(await fs.readFile(packageJson, 'utf8'));
            const patterns = pkg.workspaces?.packages || pkg.workspaces || [];
            if (Array.isArray(patterns)) {
              packages.push(...(await this._resolvePatterns(patterns)));
            }
          }
          break;
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not detect workspace packages: ${error.message}`);
    }

    return packages;
  }

  /**
   * Resolve glob patterns to package directories
   * @private
   */
  async _resolvePatterns(patterns) {
    const packages = [];
    const glob = require('glob');

    for (const pattern of patterns) {
      const matches = glob.sync(pattern, { cwd: this.projectRoot });
      for (const match of matches) {
        const pkgJsonPath = path.join(this.projectRoot, match, 'package.json');
        if (await fs.pathExists(pkgJsonPath)) {
          const pkg = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
          packages.push({
            name: pkg.name,
            path: match,
            version: pkg.version,
            type: this._inferPackageType(pkg, match),
            dependencies: Object.keys(pkg.dependencies || {}),
            devDependencies: Object.keys(pkg.devDependencies || {}),
          });
        }
      }
    }

    return packages;
  }

  /**
   * Infer package type from package.json and path
   * @private
   */
  _inferPackageType(pkg, pkgPath) {
    if (pkg.bin) return PackageType.CLI;
    if (pkgPath.includes('extension') || pkg.engines?.vscode) return PackageType.EXTENSION;
    if (pkgPath.includes('app') || pkgPath.includes('web')) return PackageType.APPLICATION;
    if (pkgPath.includes('infra')) return PackageType.INFRASTRUCTURE;
    return PackageType.LIBRARY;
  }

  /**
   * Get all packages
   * @returns {Promise<object[]>} Array of packages
   */
  async getPackages() {
    if (this._packages) return this._packages;

    const config = await this.loadConfig();
    
    if (config.packages && config.packages.length > 0) {
      this._packages = config.packages;
    } else {
      // Auto-detect from workspace
      this._packages = await this.detectWorkspacePackages();
    }

    return this._packages;
  }

  /**
   * Get a specific package by name
   * @param {string} name - Package name
   * @returns {Promise<object|null>} Package object or null
   */
  async getPackage(name) {
    const packages = await this.getPackages();
    return packages.find(p => p.name === name) || null;
  }

  /**
   * Get package by path
   * @param {string} pkgPath - Package path
   * @returns {Promise<object|null>} Package object or null
   */
  async getPackageByPath(pkgPath) {
    const packages = await this.getPackages();
    return packages.find(p => p.path === pkgPath) || null;
  }

  /**
   * Get coverage target for a package
   * @param {string} packageName - Package name
   * @returns {Promise<number>} Coverage target percentage
   */
  async getCoverageTarget(packageName) {
    const pkg = await this.getPackage(packageName);
    if (!pkg) return 80;

    // Check if package has explicit target
    if (pkg.coverage_target) return pkg.coverage_target;

    // Use type-based default
    const config = await this.loadConfig();
    const targets = config.coverage_targets || DEFAULT_COVERAGE_TARGETS;
    return targets[pkg.type] || 80;
  }

  /**
   * Get all coverage targets
   * @returns {Promise<object>} Package name to coverage target map
   */
  async getAllCoverageTargets() {
    const packages = await this.getPackages();
    const targets = {};

    for (const pkg of packages) {
      targets[pkg.name] = await this.getCoverageTarget(pkg.name);
    }

    return targets;
  }

  /**
   * Build dependency graph
   * @returns {Promise<object>} Dependency graph
   */
  async buildDependencyGraph() {
    const packages = await this.getPackages();
    const config = await this.loadConfig();
    const packageNames = new Set(packages.map(p => p.name));

    const graph = {
      nodes: [],
      edges: [],
    };

    for (const pkg of packages) {
      graph.nodes.push({
        id: pkg.name,
        type: pkg.type,
        path: pkg.path,
      });

      // Add edges for internal dependencies
      const deps = [
        ...(pkg.dependencies || []),
        ...(config.dependency_graph?.ignore_dev_dependencies 
          ? [] 
          : (pkg.devDependencies || [])),
      ];

      for (const dep of deps) {
        if (packageNames.has(dep)) {
          graph.edges.push({
            from: pkg.name,
            to: dep,
            type: 'depends-on',
          });
        }
      }
    }

    return graph;
  }

  /**
   * Generate dependency graph as Mermaid diagram
   * @returns {Promise<string>} Mermaid diagram code
   */
  async generateMermaidGraph() {
    const graph = await this.buildDependencyGraph();

    let mermaid = 'graph TD\n';

    // Add nodes
    for (const node of graph.nodes) {
      const shape = node.type === PackageType.CLI ? '([' : '[';
      const shapeEnd = node.type === PackageType.CLI ? '])' : ']';
      const label = node.id.replace('@', '').replace('/', '-');
      mermaid += `    ${label}${shape}"${node.id}"${shapeEnd}\n`;
    }

    mermaid += '\n';

    // Add edges
    for (const edge of graph.edges) {
      const from = edge.from.replace('@', '').replace('/', '-');
      const to = edge.to.replace('@', '').replace('/', '-');
      mermaid += `    ${from} --> ${to}\n`;
    }

    return mermaid;
  }

  /**
   * Generate dependency graph markdown
   * @returns {Promise<string>} Markdown content
   */
  async generateDependencyGraphDoc() {
    const packages = await this.getPackages();
    const graph = await this.buildDependencyGraph();
    const mermaid = await this.generateMermaidGraph();

    let doc = `# Package Dependency Graph

Generated by MUSUBI Package Manager

## Overview

| Package | Type | Coverage Target |
|---------|------|-----------------|
`;

    for (const pkg of packages) {
      const target = await this.getCoverageTarget(pkg.name);
      doc += `| ${pkg.name} | ${pkg.type} | ${target}% |\n`;
    }

    doc += `
## Dependency Graph

\`\`\`mermaid
${mermaid}
\`\`\`

## Package Details

`;

    for (const pkg of packages) {
      doc += `### ${pkg.name}

- **Path**: \`${pkg.path}\`
- **Type**: ${pkg.type}
- **Version**: ${pkg.version || 'N/A'}

`;
      const deps = graph.edges.filter(e => e.from === pkg.name);
      if (deps.length > 0) {
        doc += `**Dependencies**: ${deps.map(d => d.to).join(', ')}\n\n`;
      }
    }

    return doc;
  }

  /**
   * Write dependency graph to file
   */
  async writeDependencyGraph() {
    const config = await this.loadConfig();
    const output = config.dependency_graph?.output || 'docs/architecture/dependency-graph.md';
    const outputPath = path.join(this.projectRoot, output);

    const doc = await this.generateDependencyGraphDoc();
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, doc, 'utf8');

    return outputPath;
  }

  /**
   * Get publishable packages
   * @returns {Promise<object[]>} Publishable packages
   */
  async getPublishablePackages() {
    const packages = await this.getPackages();
    return packages.filter(p => p.publishable !== false);
  }

  /**
   * Validate package configuration
   * @returns {Promise<object>} Validation result
   */
  async validate() {
    const packages = await this.getPackages();
    const errors = [];
    const warnings = [];

    for (const pkg of packages) {
      // Check for package.json
      const pkgJsonPath = path.join(this.projectRoot, pkg.path, 'package.json');
      if (!(await fs.pathExists(pkgJsonPath))) {
        errors.push(`Package ${pkg.name}: package.json not found at ${pkg.path}`);
      }

      // Check coverage target
      if (pkg.coverage_target && (pkg.coverage_target < 0 || pkg.coverage_target > 100)) {
        errors.push(`Package ${pkg.name}: Invalid coverage target ${pkg.coverage_target}`);
      }

      // Check for circular dependencies
      const graph = await this.buildDependencyGraph();
      const hasCycle = this._detectCycle(graph, pkg.name);
      if (hasCycle) {
        errors.push(`Package ${pkg.name}: Circular dependency detected`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      packageCount: packages.length,
    };
  }

  /**
   * Detect circular dependencies
   * @private
   */
  _detectCycle(graph, startNode, visited = new Set(), stack = new Set()) {
    if (stack.has(startNode)) return true;
    if (visited.has(startNode)) return false;

    visited.add(startNode);
    stack.add(startNode);

    const edges = graph.edges.filter(e => e.from === startNode);
    for (const edge of edges) {
      if (this._detectCycle(graph, edge.to, visited, stack)) {
        return true;
      }
    }

    stack.delete(startNode);
    return false;
  }
}

module.exports = { PackageManager, PackageType, DEFAULT_COVERAGE_TARGETS };
