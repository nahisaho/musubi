/**
 * AST Extractor
 * 
 * Extracts Abstract Syntax Tree information from source code files.
 * Provides structured analysis of code structure, symbols, and relationships.
 * 
 * Part of MUSUBI v5.0.0 - Codebase Intelligence
 * 
 * @module analyzers/ast-extractor
 * @version 1.0.0
 * 
 * @traceability
 * - Requirement: REQ-P4-002 (AST Extraction and Analysis)
 * - Design: docs/design/tdd-musubi-v5.0.0.md#2.2
 * - Test: tests/analyzers/ast-extractor.test.js
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

/**
 * @typedef {Object} SymbolInfo
 * @property {string} name - Symbol name
 * @property {string} type - Symbol type (function, class, variable, etc.)
 * @property {number} line - Line number
 * @property {number} column - Column number
 * @property {string} [docstring] - Documentation string
 * @property {string[]} [params] - Function parameters
 * @property {string} [returnType] - Return type
 * @property {string} [visibility] - public, private, protected
 * @property {boolean} [isExported] - Whether exported
 * @property {boolean} [isAsync] - Whether async
 * @property {string[]} [decorators] - Applied decorators
 */

/**
 * @typedef {Object} ImportInfo
 * @property {string} source - Import source
 * @property {string[]} names - Imported names
 * @property {boolean} isDefault - Whether default import
 * @property {boolean} isNamespace - Whether namespace import
 * @property {number} line - Line number
 */

/**
 * @typedef {Object} FileAST
 * @property {string} path - File path
 * @property {string} language - Detected language
 * @property {SymbolInfo[]} symbols - Extracted symbols
 * @property {ImportInfo[]} imports - Import statements
 * @property {string[]} exports - Exported names
 * @property {Object} structure - Hierarchical structure
 * @property {Object} metadata - Additional metadata
 */

/**
 * Language-specific patterns
 */
const PATTERNS = {
  javascript: {
    // Function declarations (removed ^ to match anywhere in line)
    functionDecl: /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/g,
    // Arrow functions with const/let/var
    arrowFunc: /(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
    // Class declarations
    classDecl: /(?:^|\n)\s*(?:export\s+)?class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s+extends\s+([a-zA-Z_$][a-zA-Z0-9_$]*))?/g,
    // Class methods
    methodDecl: /\n\s+(?:static\s+)?(?:async\s+)?(?:get\s+|set\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/g,
    // Variable declarations
    constDecl: /(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,
    // ES6 imports
    importStmt: /import\s+(?:(\{[^}]+\})|([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s*,\s*(\{[^}]+\}))?|\*\s+as\s+([a-zA-Z_$][a-zA-Z0-9_$]*))\s+from\s+['"](.*?)['"]/g,
    // CommonJS require
    requireStmt: /(?:const|let|var)\s+(?:(\{[^}]+\})|([a-zA-Z_$][a-zA-Z0-9_$]*))\s*=\s*require\s*\(\s*['"](.*?)['"]\s*\)/g,
    // Exports - capture function/class/const names after export
    exportStmt: /export\s+(?:default\s+)?(?:(const|let|var|function|class|async\s+function)\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)?/g,
    namedExport: /export\s*\{([^}]+)\}/gm,
    // JSDoc comments
    jsdoc: /\/\*\*\s*([\s\S]*?)\s*\*\//g,
    // Single-line comments
    comment: /\/\/\s*(.+)$/g
  },
  
  typescript: {
    // Extends JavaScript patterns
    // Interface declarations
    interfaceDecl: /(?:^|\n)\s*(?:export\s+)?interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)(?:<[^>]+>)?(?:\s+extends\s+([^{]+))?/g,
    // Type aliases
    typeDecl: /(?:^|\n)\s*(?:export\s+)?type\s+([a-zA-Z_$][a-zA-Z0-9_$]*)(?:<[^>]+>)?\s*=/g,
    // Enum declarations
    enumDecl: /(?:^|\n)\s*(?:export\s+)?(?:const\s+)?enum\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    // Function with types
    typedFunc: /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)(?:<[^>]+>)?\s*\(([^)]*)\)\s*:\s*([^{]+)/g
  },
  
  python: {
    // Function definitions
    functionDef: /(?:^|\n)(?:async\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)(?:\s*->\s*([^\s:]+))?/g,
    // Class definitions
    classDef: /(?:^|\n)class\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*\(([^)]*)\))?/g,
    // Method definitions (inside class)
    methodDef: /\n\s+(?:async\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(self(?:,\s*)?([^)]*)\)/g,
    // Decorators
    decorator: /(?:^|\n)@([a-zA-Z_][a-zA-Z0-9_.]*(?:\([^)]*\))?)/g,
    // Imports
    importFrom: /(?:^|\n)from\s+([^\s]+)\s+import\s+(.+)/g,
    importModule: /(?:^|\n)import\s+([^\s]+)(?:\s+as\s+([^\s]+))?/g,
    // Docstrings
    docstring: /"""([\s\S]*?)"""|'''([\s\S]*?)'''/g,
    // Type hints
    typeHint: /:\s*([a-zA-Z_][a-zA-Z0-9_[\],\s]*)/g
  }
};

/**
 * AST Extractor class
 * @extends EventEmitter
 */
class ASTExtractor extends EventEmitter {
  /**
   * Create AST extractor
   * @param {Object} options - Configuration options
   * @param {string[]} [options.supportedLanguages] - Languages to support
   * @param {boolean} [options.includeDocstrings=true] - Include documentation
   * @param {boolean} [options.extractComments=false] - Extract inline comments
   */
  constructor(options = {}) {
    super();
    this.supportedLanguages = options.supportedLanguages || ['javascript', 'typescript', 'python'];
    this.includeDocstrings = options.includeDocstrings ?? true;
    this.extractComments = options.extractComments ?? false;
    
    // Results cache
    this.cache = new Map();
  }
  
  /**
   * Extract AST from file
   * @param {string} filePath - File path
   * @returns {Promise<FileAST>}
   */
  async extractFromFile(filePath) {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const language = this.detectLanguage(filePath);
    
    if (!this.supportedLanguages.includes(language)) {
      return {
        path: filePath,
        language,
        symbols: [],
        imports: [],
        exports: [],
        structure: {},
        metadata: { supported: false }
      };
    }
    
    return this.extract(content, language, filePath);
  }
  
  /**
   * Extract AST from content
   * @param {string} content - Source code content
   * @param {string} language - Programming language
   * @param {string} [filePath='<source>'] - Optional file path
   * @returns {FileAST}
   */
  extract(content, language, filePath = '<source>') {
    this.emit('extract:start', { filePath, language });
    
    const lines = content.split('\n');
    const symbols = [];
    const imports = [];
    const exports = [];
    const structure = {
      classes: [],
      functions: [],
      variables: []
    };
    
    try {
      switch (language) {
        case 'javascript':
        case 'typescript':
          this.extractJavaScript(content, lines, symbols, imports, exports, structure);
          if (language === 'typescript') {
            this.extractTypeScript(content, lines, symbols, structure);
          }
          break;
        case 'python':
          this.extractPython(content, lines, symbols, imports, exports, structure);
          break;
      }
      
      const result = {
        path: filePath,
        language,
        symbols,
        imports,
        exports,
        structure,
        metadata: {
          lineCount: lines.length,
          symbolCount: symbols.length,
          extractedAt: new Date().toISOString()
        }
      };
      
      this.emit('extract:complete', result);
      return result;
      
    } catch (error) {
      this.emit('extract:error', { filePath, error });
      return {
        path: filePath,
        language,
        symbols: [],
        imports: [],
        exports: [],
        structure: {},
        metadata: { error: error.message }
      };
    }
  }
  
  /**
   * Extract JavaScript/TypeScript patterns
   * @private
   */
  extractJavaScript(content, lines, symbols, imports, exports, structure) {
    const patterns = PATTERNS.javascript;
    
    // Extract docstrings for association
    const docstrings = this.extractDocstrings(content, 'javascript');
    
    // Functions
    let match;
    const funcPattern = new RegExp(patterns.functionDecl.source, 'g');
    while ((match = funcPattern.exec(content)) !== null) {
      const line = this.getLineNumber(content, match.index);
      const isExported = match[0].includes('export ');
      const isAsync = match[0].includes('async');
      const params = this.parseParams(match[2]);
      const doc = this.findNearestDocstring(docstrings, line);
      
      const symbol = {
        name: match[1],
        type: 'function',
        line,
        column: match.index - content.lastIndexOf('\n', match.index) - 1,
        params,
        isExported,
        isAsync,
        docstring: doc
      };
      
      symbols.push(symbol);
      structure.functions.push(symbol.name);
      
      if (isExported) {
        exports.push(match[1]);
      }
    }
    
    // Arrow functions
    const arrowPattern = new RegExp(patterns.arrowFunc.source, 'g');
    while ((match = arrowPattern.exec(content)) !== null) {
      const line = this.getLineNumber(content, match.index);
      const isExported = match[0].includes('export ');
      const isAsync = match[0].includes('async');
      const doc = this.findNearestDocstring(docstrings, line);
      
      const symbol = {
        name: match[1],
        type: 'function',
        line,
        isExported,
        isAsync,
        docstring: doc
      };
      
      symbols.push(symbol);
      structure.functions.push(symbol.name);
      
      if (isExported) {
        exports.push(match[1]);
      }
    }
    
    // Classes
    const classPattern = new RegExp(patterns.classDecl.source, 'g');
    while ((match = classPattern.exec(content)) !== null) {
      const line = this.getLineNumber(content, match.index);
      const isExported = match[0].includes('export ');
      const doc = this.findNearestDocstring(docstrings, line);
      
      const classSymbol = {
        name: match[1],
        type: 'class',
        line,
        isExported,
        extends: match[2] || null,
        docstring: doc,
        methods: []
      };
      
      // Extract class methods
      const classEndIndex = this.findClassEnd(content, match.index);
      const classContent = content.slice(match.index, classEndIndex);
      const methodPattern = new RegExp(patterns.methodDecl.source, 'gm');
      let methodMatch;
      
      while ((methodMatch = methodPattern.exec(classContent)) !== null) {
        classSymbol.methods.push(methodMatch[1]);
        
        symbols.push({
          name: `${match[1]}.${methodMatch[1]}`,
          type: 'method',
          line: line + this.getLineNumber(classContent, methodMatch.index) - 1,
          parentClass: match[1]
        });
      }
      
      symbols.push(classSymbol);
      structure.classes.push({
        name: classSymbol.name,
        extends: classSymbol.extends,
        methods: classSymbol.methods
      });
      
      if (isExported) {
        exports.push(match[1]);
      }
    }
    
    // Imports (ES6)
    const importPattern = new RegExp(patterns.importStmt.source, 'gm');
    while ((match = importPattern.exec(content)) !== null) {
      const line = this.getLineNumber(content, match.index);
      const source = match[5];
      let names = [];
      let isDefault = false;
      let isNamespace = false;
      
      if (match[1]) {
        // Named imports { a, b }
        names = match[1].replace(/[{}]/g, '').split(',').map(n => n.trim());
      }
      if (match[2]) {
        // Default import
        names.push(match[2]);
        isDefault = true;
      }
      if (match[3]) {
        // Additional named imports after default
        names.push(...match[3].replace(/[{}]/g, '').split(',').map(n => n.trim()));
      }
      if (match[4]) {
        // Namespace import * as X
        names.push(match[4]);
        isNamespace = true;
      }
      
      imports.push({ source, names, isDefault, isNamespace, line });
    }
    
    // CommonJS require
    const requirePattern = new RegExp(patterns.requireStmt.source, 'gm');
    while ((match = requirePattern.exec(content)) !== null) {
      const line = this.getLineNumber(content, match.index);
      const source = match[3];
      let names = [];
      
      if (match[1]) {
        // Destructured require
        names = match[1].replace(/[{}]/g, '').split(',').map(n => n.trim());
      }
      if (match[2]) {
        // Simple require
        names.push(match[2]);
      }
      
      imports.push({ source, names, isDefault: !!match[2], isNamespace: false, line });
    }
    
    // Named exports: export { a, b }
    const namedExportPattern = new RegExp(patterns.namedExport.source, 'gm');
    while ((match = namedExportPattern.exec(content)) !== null) {
      const names = match[1].split(',').map(n => n.trim().split(' as ')[0].trim());
      exports.push(...names);
    }
    
    // Direct exports: export const/let/var/function/class name
    const exportStmtPattern = new RegExp(patterns.exportStmt.source, 'gm');
    while ((match = exportStmtPattern.exec(content)) !== null) {
      // match[2] is the exported name (e.g., VALUE, helper, Service)
      if (match[2] && !exports.includes(match[2])) {
        exports.push(match[2]);
      }
    }
  }
  
  /**
   * Extract TypeScript-specific patterns
   * @private
   */
  extractTypeScript(content, lines, symbols, _structure) {
    const patterns = PATTERNS.typescript;
    let match;
    
    // Interfaces
    const interfacePattern = new RegExp(patterns.interfaceDecl.source, 'gm');
    while ((match = interfacePattern.exec(content)) !== null) {
      const line = this.getLineNumber(content, match.index);
      const isExported = match[0].includes('export');
      
      symbols.push({
        name: match[1],
        type: 'interface',
        line,
        isExported,
        extends: match[2] ? match[2].split(',').map(s => s.trim()) : []
      });
    }
    
    // Type aliases
    const typePattern = new RegExp(patterns.typeDecl.source, 'gm');
    while ((match = typePattern.exec(content)) !== null) {
      const line = this.getLineNumber(content, match.index);
      const isExported = match[0].includes('export');
      
      symbols.push({
        name: match[1],
        type: 'type',
        line,
        isExported
      });
    }
    
    // Enums
    const enumPattern = new RegExp(patterns.enumDecl.source, 'gm');
    while ((match = enumPattern.exec(content)) !== null) {
      const line = this.getLineNumber(content, match.index);
      const isExported = match[0].includes('export');
      
      symbols.push({
        name: match[1],
        type: 'enum',
        line,
        isExported
      });
    }
  }
  
  /**
   * Extract Python patterns
   * @private
   */
  extractPython(content, lines, symbols, imports, exports, structure) {
    const patterns = PATTERNS.python;
    let match;
    
    // Collect decorators for association
    const decorators = [];
    const decoratorPattern = new RegExp(patterns.decorator.source, 'gm');
    while ((match = decoratorPattern.exec(content)) !== null) {
      const line = this.getLineNumber(content, match.index);
      decorators.push({ name: match[1], line });
    }
    
    // Extract docstrings
    const docstrings = this.extractDocstrings(content, 'python');
    
    // Functions
    const funcPattern = new RegExp(patterns.functionDef.source, 'gm');
    while ((match = funcPattern.exec(content)) !== null) {
      const line = this.getLineNumber(content, match.index);
      const isAsync = match[0].includes('async');
      const params = this.parseParams(match[2]);
      const returnType = match[3] || null;
      const doc = this.findNearestDocstring(docstrings, line);
      const funcDecorators = decorators
        .filter(d => d.line === line - 1)
        .map(d => d.name);
      
      const symbol = {
        name: match[1],
        type: 'function',
        line,
        params,
        returnType,
        isAsync,
        docstring: doc,
        decorators: funcDecorators,
        visibility: match[1].startsWith('_') ? 'private' : 'public'
      };
      
      symbols.push(symbol);
      structure.functions.push(symbol.name);
      
      // Python uses __all__ for explicit exports, but we mark non-underscore as potentially exported
      if (!match[1].startsWith('_')) {
        exports.push(match[1]);
      }
    }
    
    // Classes
    const classPattern = new RegExp(patterns.classDef.source, 'gm');
    while ((match = classPattern.exec(content)) !== null) {
      const line = this.getLineNumber(content, match.index);
      const doc = this.findNearestDocstring(docstrings, line);
      const baseClasses = match[2] ? match[2].split(',').map(s => s.trim()) : [];
      const classDecorators = decorators
        .filter(d => d.line === line - 1)
        .map(d => d.name);
      
      const classSymbol = {
        name: match[1],
        type: 'class',
        line,
        extends: baseClasses,
        docstring: doc,
        decorators: classDecorators,
        methods: [],
        visibility: match[1].startsWith('_') ? 'private' : 'public'
      };
      
      // Extract class methods
      const classEndIndex = this.findPythonClassEnd(content, lines, match.index);
      const classContent = content.slice(match.index, classEndIndex);
      const methodPattern = new RegExp(patterns.methodDef.source, 'gm');
      let methodMatch;
      
      while ((methodMatch = methodPattern.exec(classContent)) !== null) {
        const methodName = methodMatch[1];
        classSymbol.methods.push(methodName);
        
        symbols.push({
          name: `${match[1]}.${methodName}`,
          type: 'method',
          line: line + this.getLineNumber(classContent, methodMatch.index) - 1,
          parentClass: match[1],
          visibility: methodName.startsWith('_') ? 'private' : 'public'
        });
      }
      
      symbols.push(classSymbol);
      structure.classes.push({
        name: classSymbol.name,
        extends: classSymbol.extends,
        methods: classSymbol.methods
      });
      
      if (!match[1].startsWith('_')) {
        exports.push(match[1]);
      }
    }
    
    // Imports
    const importFromPattern = new RegExp(patterns.importFrom.source, 'gm');
    while ((match = importFromPattern.exec(content)) !== null) {
      const line = this.getLineNumber(content, match.index);
      const source = match[1];
      const names = match[2].split(',').map(n => {
        const parts = n.trim().split(' as ');
        return parts[0].trim();
      });
      
      imports.push({ source, names, isDefault: false, isNamespace: false, line });
    }
    
    const importModulePattern = new RegExp(patterns.importModule.source, 'gm');
    while ((match = importModulePattern.exec(content)) !== null) {
      const line = this.getLineNumber(content, match.index);
      const source = match[1];
      const alias = match[2] || match[1];
      
      imports.push({ source, names: [alias], isDefault: true, isNamespace: false, line });
    }
  }
  
  /**
   * Extract docstrings from content
   * @private
   */
  extractDocstrings(content, language) {
    const docstrings = [];
    let match;
    
    if (language === 'javascript' || language === 'typescript') {
      const pattern = PATTERNS.javascript.jsdoc;
      const jsdocPattern = new RegExp(pattern.source, 'gm');
      while ((match = jsdocPattern.exec(content)) !== null) {
        const line = this.getLineNumber(content, match.index);
        const text = match[1]
          .replace(/^\s*\*\s?/gm, '')
          .trim();
        docstrings.push({ line, text });
      }
    } else if (language === 'python') {
      const pattern = PATTERNS.python.docstring;
      const docPattern = new RegExp(pattern.source, 'gm');
      while ((match = docPattern.exec(content)) !== null) {
        const line = this.getLineNumber(content, match.index);
        const text = (match[1] || match[2]).trim();
        docstrings.push({ line, text });
      }
    }
    
    return docstrings;
  }
  
  /**
   * Find nearest docstring before a line
   * @private
   */
  findNearestDocstring(docstrings, line) {
    if (!this.includeDocstrings) return null;
    
    // Look for docstring within 10 lines before or 2 lines after
    // JSDoc/docstrings can span multiple lines, so we need a wider range
    const candidates = docstrings.filter(d => 
      d.line >= line - 10 && d.line <= line + 2
    );
    
    if (candidates.length === 0) return null;
    
    // Return the closest one that comes before the target line
    const before = candidates.filter(d => d.line <= line);
    if (before.length > 0) {
      // Sort by line descending to get the closest before
      before.sort((a, b) => b.line - a.line);
      return before[0].text;
    }
    
    // Fall back to any candidate
    candidates.sort((a, b) => Math.abs(a.line - line) - Math.abs(b.line - line));
    return candidates[0].text;
  }
  
  /**
   * Get line number from character index
   * @private
   */
  getLineNumber(content, index) {
    return content.slice(0, index).split('\n').length;
  }
  
  /**
   * Parse function parameters
   * @private
   */
  parseParams(paramsStr) {
    if (!paramsStr || !paramsStr.trim()) return [];
    
    return paramsStr
      .split(',')
      .map(p => p.trim())
      .filter(p => p)
      .map(p => {
        // Remove default values and type annotations for basic param name
        const name = p.split('=')[0].split(':')[0].trim();
        return name;
      });
  }
  
  /**
   * Find end of JavaScript class
   * @private
   */
  findClassEnd(content, startIndex) {
    let depth = 0;
    let inClass = false;
    
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') {
        depth++;
        inClass = true;
      } else if (content[i] === '}') {
        depth--;
        if (inClass && depth === 0) {
          return i + 1;
        }
      }
    }
    
    return content.length;
  }
  
  /**
   * Find end of Python class (by indentation)
   * @private
   */
  findPythonClassEnd(content, lines, startIndex) {
    const startLine = this.getLineNumber(content, startIndex);
    const classLine = lines[startLine - 1];
    const classIndent = classLine.match(/^(\s*)/)[1].length;
    
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') continue;
      
      const indent = line.match(/^(\s*)/)[1].length;
      if (indent <= classIndent && i > startLine) {
        // Found line with same or less indentation
        let charIndex = 0;
        for (let j = 0; j < i; j++) {
          charIndex += lines[j].length + 1;
        }
        return charIndex;
      }
    }
    
    return content.length;
  }
  
  /**
   * Detect language from file path
   * @param {string} filePath - File path
   * @returns {string}
   */
  detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const langMap = {
      '.js': 'javascript',
      '.mjs': 'javascript',
      '.cjs': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python'
    };
    return langMap[ext] || 'unknown';
  }
  
  /**
   * Generate symbol summary for LLM context
   * @param {FileAST} ast - Parsed AST
   * @returns {string}
   */
  toSummary(ast) {
    let summary = `# ${ast.path}\n\n`;
    summary += `Language: ${ast.language}\n`;
    summary += `Lines: ${ast.metadata.lineCount}\n`;
    summary += `Symbols: ${ast.metadata.symbolCount}\n\n`;
    
    // Imports
    if (ast.imports.length > 0) {
      summary += `## Dependencies\n\n`;
      for (const imp of ast.imports) {
        summary += `- ${imp.source}: ${imp.names.join(', ')}\n`;
      }
      summary += '\n';
    }
    
    // Classes
    const classes = ast.symbols.filter(s => s.type === 'class');
    if (classes.length > 0) {
      summary += `## Classes\n\n`;
      for (const cls of classes) {
        summary += `### ${cls.name}`;
        if (cls.extends) {
          summary += ` extends ${Array.isArray(cls.extends) ? cls.extends.join(', ') : cls.extends}`;
        }
        summary += '\n';
        
        if (cls.docstring) {
          summary += `${cls.docstring}\n`;
        }
        
        if (cls.methods && cls.methods.length > 0) {
          summary += `Methods: ${cls.methods.join(', ')}\n`;
        }
        summary += '\n';
      }
    }
    
    // Functions
    const functions = ast.symbols.filter(s => s.type === 'function');
    if (functions.length > 0) {
      summary += `## Functions\n\n`;
      for (const func of functions) {
        summary += `- \`${func.name}(${(func.params || []).join(', ')})\``;
        if (func.isAsync) summary += ' (async)';
        if (func.isExported) summary += ' [exported]';
        summary += '\n';
        
        if (func.docstring) {
          summary += `  ${func.docstring.split('\n')[0]}\n`;
        }
      }
      summary += '\n';
    }
    
    // Exports
    if (ast.exports.length > 0) {
      summary += `## Exports\n\n`;
      summary += ast.exports.join(', ') + '\n';
    }
    
    return summary;
  }
  
  /**
   * Get cache key
   * @param {string} filePath - File path
   * @param {number} mtime - Modification time
   * @returns {string}
   */
  getCacheKey(filePath, mtime) {
    return `ast:${filePath}:${mtime}`;
  }
  
  /**
   * Get from cache
   * @param {string} filePath - File path
   * @param {number} mtime - Modification time
   * @returns {FileAST|null}
   */
  getFromCache(filePath, mtime) {
    const key = this.getCacheKey(filePath, mtime);
    return this.cache.get(key) || null;
  }
  
  /**
   * Add to cache
   * @param {string} filePath - File path
   * @param {number} mtime - Modification time
   * @param {FileAST} ast - AST result
   */
  addToCache(filePath, mtime, ast) {
    const key = this.getCacheKey(filePath, mtime);
    this.cache.set(key, ast);
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

/**
 * Create AST extractor
 * @param {Object} options - Options
 * @returns {ASTExtractor}
 */
function createASTExtractor(options = {}) {
  return new ASTExtractor(options);
}

/**
 * Extract AST from file
 * @param {string} filePath - File path
 * @param {Object} options - Options
 * @returns {Promise<FileAST>}
 */
async function extractAST(filePath, options = {}) {
  const extractor = createASTExtractor(options);
  return extractor.extractFromFile(filePath);
}

module.exports = {
  ASTExtractor,
  createASTExtractor,
  extractAST,
  PATTERNS
};
