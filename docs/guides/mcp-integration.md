# MCP Integration Guide

> **Version**: 3.11.0
> **Phase**: Sprint 3.4 - Tool Ecosystem

This guide explains how to integrate Model Context Protocol (MCP) servers with MUSUBI for enhanced tool capabilities.

## Overview

MUSUBI's MCP integration enables:
- **Tool Discovery**: Automatically discover tools from MCP servers
- **Unified Interface**: Single API for all MCP tools
- **Skill Mapping**: Map tools to MUSUBI skills
- **Analytics**: Track tool usage and reliability

## Quick Start

### 1. Basic MCP Connection

```javascript
const { MCPConnector, TransportType } = require('musubi/integrations');

// Create connector
const connector = new MCPConnector();

// Add MCP server
connector.addServer('filesystem', {
  transport: TransportType.STDIO,
  command: 'npx',
  args: ['@modelcontextprotocol/server-filesystem', '/path/to/project']
});

// Connect
await connector.connectServer('filesystem');

// List available tools
const tools = connector.getAllTools();
console.log(`Available tools: ${tools.map(t => t.name).join(', ')}`);
```

### 2. Tool Discovery

```javascript
const { ToolDiscovery } = require('musubi/integrations');

const discovery = new ToolDiscovery();

// Discover tools from connector
await discovery.discoverFromConnector(connector);

// Find tools for a task
const matches = discovery.matchToolsToTask('I need to read a file');
console.log('Best match:', matches[0].tool.name);
```

### 3. Skill-Tool Mapping

```javascript
const { SkillToolsManager } = require('musubi/managers');

const skillTools = new SkillToolsManager();

// Auto-configure based on skills
skillTools.autoConfigureSkills([
  { name: 'requirements-skill', description: 'Generate requirements' },
  { name: 'implementation-skill', description: 'Implement code' }
]);

// Get allowed tools for a skill
const allowedTools = skillTools.getAllowedTools('implementation-skill');
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MUSUBI Skill                          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│               SkillToolsManager                          │
│  - Tool restrictions per skill                           │
│  - Optimized tool configurations                         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                ToolDiscovery                             │
│  - Categorization                                        │
│  - Task matching                                         │
│  - Analytics                                             │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                MCPConnector                              │
│  - Multi-server management                               │
│  - Tool routing                                          │
│  - Connection pooling                                    │
└─────────────────────────────────────────────────────────┘
        │                  │                    │
        ▼                  ▼                    ▼
┌──────────────┐  ┌──────────────┐   ┌──────────────────┐
│ MCP Server 1 │  │ MCP Server 2 │   │   MCP Server N   │
│ (filesystem) │  │   (search)   │   │     (custom)     │
└──────────────┘  └──────────────┘   └──────────────────┘
```

## MCP Connector

### Multi-Server Configuration

```javascript
const connector = new MCPConnector({
  timeout: 30000,
  retryAttempts: 3,
  enableLogging: true
});

// Add multiple servers
connector.addServer('filesystem', {
  transport: 'stdio',
  command: 'npx',
  args: ['@modelcontextprotocol/server-filesystem', '.']
});

connector.addServer('github', {
  transport: 'stdio',
  command: 'npx',
  args: ['@modelcontextprotocol/server-github'],
  env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN }
});

connector.addServer('search', {
  transport: 'sse',
  url: 'http://localhost:3001/sse'
});

// Connect all at once
const results = await connector.connectAll();
console.log('Connected:', results.success);
console.log('Failed:', results.failed);
```

### Tool Invocation

```javascript
// Find and call a tool by name
const result = await connector.callTool('read_file', {
  path: '/path/to/file.txt'
});

console.log(result.content[0].text);

// Find which server has a tool
const toolInfo = connector.findTool('search_files');
console.log(`Tool found on server: ${toolInfo.server}`);
```

### Status Monitoring

```javascript
const status = connector.getStatus();

console.log(`Total servers: ${status.serverCount}`);
console.log(`Connected: ${status.connectedCount}`);
console.log(`Available tools: ${status.totalTools}`);

for (const [name, serverStatus] of Object.entries(status.servers)) {
  console.log(`  ${name}: ${serverStatus.state} (${serverStatus.toolCount} tools)`);
}
```

## Tool Discovery

### Automatic Categorization

Tools are automatically categorized based on their names and descriptions:

| Category | Keywords |
|----------|----------|
| `file-system` | file, read, write, directory, path |
| `code-analysis` | code, analyze, parse, ast, syntax |
| `search` | search, find, grep, query, lookup |
| `testing` | test, spec, assert, mock, coverage |
| `deployment` | deploy, release, publish, ci, cd |
| `ai` | ai, ml, llm, generate, embed |

### Finding Tools

```javascript
// Find by category
const fileTools = discovery.findTools({ 
  category: 'file-system' 
});

// Find by server
const githubTools = discovery.findTools({ 
  server: 'github' 
});

// Find by capabilities
const readTools = discovery.findTools({ 
  capabilities: ['read'] 
});

// Find by name pattern
const searchTools = discovery.findTools({ 
  namePattern: 'search' 
});

// Combined filters
const results = discovery.findTools({
  category: 'file-system',
  capabilities: ['read'],
  minReliability: 0.9,
  sortBy: 'usage',
  limit: 5
});
```

### Task Matching

```javascript
// Match tools to natural language task
const matches = discovery.matchToolsToTask(
  'I need to search for all TypeScript files containing a function',
  { limit: 3, minScore: 0.4 }
);

for (const { tool, score } of matches) {
  console.log(`${tool.name}: ${(score * 100).toFixed(0)}% match`);
}
```

### Usage Analytics

```javascript
// Record tool usage
discovery.recordToolUsage('read_file', 150, true);
discovery.recordToolUsage('read_file', 200, true);
discovery.recordToolUsage('search', 500, false);

// Get analytics
const analytics = discovery.getAnalytics();

console.log(`Total tools: ${analytics.totalTools}`);
console.log(`Total usage: ${analytics.totalUsage}`);
console.log('Top used:', analytics.topUsed);
console.log('Least reliable:', analytics.leastReliable);
```

## Skill Tools Manager

### Configuration Options

```yaml
# .musubi/tools/config.yaml

defaults:
  toolSet: standard

toolDependencies:
  file_write:
    - file_read
  run_tests:
    - file_read
    - run_command

skills:
  requirements-skill:
    allowedTools:
      - file_read
      - file_write
      - search_files
    restrictionLevel: standard

  implementation-skill:
    allowedTools:
      - file_read
      - file_write
      - run_command
      - code_analysis
    restrictionLevel: standard
    
  validation-skill:
    allowedTools:
      - file_read
      - validate
    deniedTools:
      - file_write
      - run_command
    restrictionLevel: strict
```

### Restriction Levels

| Level | Description |
|-------|-------------|
| `none` | No restrictions, all tools allowed |
| `standard` | Default restrictions, common tools allowed |
| `strict` | Minimal tools, explicit allow-list only |
| `custom` | Custom configuration |

### Context-Based Optimization

```javascript
// Generate optimized config based on context
const config = skillTools.generateOptimizedConfig('implementation-skill', {
  readOnly: true,        // Remove write operations
  noNetwork: false,      // Keep network tools
  minimalPermissions: false
});

console.log('Optimized tools:', config.allowedTools);
```

### Validation

```javascript
// Check tool availability for a skill
const validation = skillTools.validateToolAvailability('implementation-skill');

if (!validation.valid) {
  console.log('Missing tools:', validation.missing);
  console.log(`Coverage: ${(validation.coverage * 100).toFixed(0)}%`);
}
```

## Common MCP Servers

### Filesystem Server

```javascript
connector.addServer('filesystem', {
  transport: 'stdio',
  command: 'npx',
  args: ['@modelcontextprotocol/server-filesystem', '/path/to/project']
});
```

Available tools:
- `read_file` - Read file contents
- `write_file` - Write file contents
- `list_directory` - List directory contents
- `create_directory` - Create a directory
- `move_file` - Move or rename a file

### GitHub Server

```javascript
connector.addServer('github', {
  transport: 'stdio',
  command: 'npx',
  args: ['@modelcontextprotocol/server-github'],
  env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN }
});
```

Available tools:
- `search_repositories` - Search GitHub repositories
- `get_file_contents` - Get file from repository
- `create_issue` - Create a new issue
- `list_pull_requests` - List pull requests

### Memory Server

```javascript
connector.addServer('memory', {
  transport: 'stdio',
  command: 'npx',
  args: ['@modelcontextprotocol/server-memory']
});
```

Available tools:
- `store` - Store a key-value pair
- `retrieve` - Retrieve a stored value
- `list_keys` - List all stored keys

### Context7 Server

```javascript
connector.addServer('context7', {
  transport: 'stdio',
  command: 'npx',
  args: ['@context7/mcp-server']
});
```

Available tools:
- `resolve-library-id` - Resolve library to Context7 ID
- `get-library-docs` - Get library documentation

## Integration Example

### Full Workflow Integration

```javascript
const { 
  MCPConnector, 
  ToolDiscovery 
} = require('musubi/integrations');
const { SkillToolsManager } = require('musubi/managers');

async function setupToolEcosystem() {
  // 1. Create and configure MCP connector
  const connector = new MCPConnector();
  
  connector.addServer('filesystem', {
    transport: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-filesystem', '.']
  });
  
  await connector.connectAll();

  // 2. Discover available tools
  const discovery = new ToolDiscovery();
  await discovery.discoverFromConnector(connector);

  // 3. Configure skill tool mappings
  const skillTools = new SkillToolsManager();
  skillTools.setAvailableTools(
    discovery.getAllTools().map(t => t.name)
  );

  // Auto-configure from skill definitions
  const skills = require('./.musubi/skills.json');
  skillTools.autoConfigureSkills(skills);

  // 4. Validate all skills have required tools
  for (const skill of skills) {
    const validation = skillTools.validateToolAvailability(skill.name);
    if (!validation.valid) {
      console.warn(`Skill ${skill.name} missing tools:`, validation.missing);
    }
  }

  return { connector, discovery, skillTools };
}

// Usage in orchestration
async function executeSkill(skillName, task, ecosystem) {
  const { connector, discovery, skillTools } = ecosystem;

  // Get allowed tools for this skill
  const allowedTools = skillTools.getAllowedTools(skillName, {
    filterByAvailable: true
  });

  // Find best tool for task
  const matches = discovery.matchToolsToTask(task, { limit: 1 });
  const selectedTool = matches[0]?.tool;

  if (!selectedTool || !allowedTools.includes(selectedTool.name)) {
    throw new Error(`No suitable tool available for: ${task}`);
  }

  // Execute tool
  const startTime = Date.now();
  try {
    const result = await connector.callTool(selectedTool.name, {});
    discovery.recordToolUsage(selectedTool.name, Date.now() - startTime, true);
    return result;
  } catch (error) {
    discovery.recordToolUsage(selectedTool.name, Date.now() - startTime, false);
    throw error;
  }
}
```

## CLI Integration

### MCP Commands

```bash
# List available MCP servers
musubi-orchestrate mcp-status

# Connect to MCP server
musubi-orchestrate mcp-connect filesystem

# Discover tools
musubi-orchestrate mcp-discover

# List tools by category
musubi-orchestrate mcp-tools --category file-system

# Call a tool
musubi-orchestrate mcp-call read_file --args '{"path": "README.md"}'
```

## Best Practices

### 1. Connection Management

```javascript
// Use connection pooling for high-throughput scenarios
const connector = new MCPConnector({
  maxConcurrentRequests: 10,
  keepAlive: true
});

// Disconnect on shutdown
process.on('SIGTERM', async () => {
  await connector.disconnectAll();
  process.exit(0);
});
```

### 2. Error Handling

```javascript
connector.on('serverError', (serverName, error) => {
  console.error(`Server ${serverName} error:`, error.message);
  
  // Attempt reconnection
  setTimeout(async () => {
    try {
      await connector.connectServer(serverName);
    } catch (e) {
      console.error(`Reconnection failed: ${e.message}`);
    }
  }, 5000);
});
```

### 3. Tool Selection

```javascript
// Prefer reliability over speed for critical tasks
const criticalTool = discovery.findTools({
  capabilities: ['write'],
  minReliability: 0.99,
  sortBy: 'reliability'
})[0];

// Prefer speed for exploratory tasks
const fastTool = discovery.findTools({
  capabilities: ['read'],
  sortBy: 'latency'
})[0];
```

### 4. Skill Configuration

```javascript
// Use strict mode for sensitive skills
skillTools.setSkillConfig('security-audit', {
  allowedTools: ['file_read', 'validate'],
  deniedTools: ['file_write', 'run_command', 'http_request'],
  restrictionLevel: 'strict'
});
```

## Troubleshooting

### Connection Issues

```javascript
// Enable detailed logging
const connector = new MCPConnector({ enableLogging: true });

// Check server status
const status = connector.getStatus();
for (const [name, server] of Object.entries(status.servers)) {
  if (server.state !== 'connected') {
    console.log(`Server ${name} is ${server.state}`);
  }
}
```

### Tool Not Found

```javascript
// Check if tool exists
const toolInfo = connector.findTool('my_tool');
if (!toolInfo) {
  // List all available tools
  const allTools = connector.getAllTools();
  console.log('Available tools:', allTools.map(t => t.name));
}
```

### Permission Denied

```javascript
// Validate tool is allowed for skill
const config = skillTools.getSkillConfig('my-skill');
if (config && !config.isToolAllowed('my_tool')) {
  console.log('Tool not allowed. Allowed tools:', config.allowedTools);
}
```

## See Also

- [Orchestration Patterns Guide](./orchestration-patterns.md)
- [P-Label Parallelization Tutorial](./p-label-parallelization.md)
- [Guardrails Guide](./guardrails-guide.md)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
