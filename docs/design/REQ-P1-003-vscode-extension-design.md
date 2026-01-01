# REQ-P1-003: MUSUBI VS Code Extension - Design Document

| Item | Content |
|------|---------|
| **Document ID** | DESIGN-P1-003-001 |
| **Version** | 1.0 |
| **Created** | 2025-12-07 |
| **Related ADR** | ADR-P1-003 |
| **Target Version** | MUSUBI VS Code Extension v1.0.0 |

---

## 1. Overview

### 1.1 Purpose

This document defines the technical design for the MUSUBI VS Code Extension, providing developers with an integrated SDD workflow directly within VS Code.

### 1.2 Scope

- Extension architecture and components
- UI/UX specifications
- API contracts
- Data models
- Implementation guidelines

---

## 2. Extension Manifest (package.json)

```json
{
  "name": "musubi-sdd",
  "displayName": "MUSUBI SDD",
  "description": "Ultimate Specification Driven Development Tool - 25 Agents, 7 AI Platforms",
  "version": "0.1.0",
  "publisher": "nahisaho",
  "icon": "resources/icon.png",
  "repository": {
    "type": "git",
    "url": "https://github.com/nahisaho/MUSUBI-vscode"
  },
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": [
    "Other",
    "Linters",
    "Snippets"
  ],
  "keywords": [
    "sdd",
    "specification-driven-development",
    "ai-coding",
    "claude-code",
    "github-copilot",
    "requirements",
    "traceability"
  ],
  "activationEvents": [
    "workspaceContains:steering/",
    "onCommand:musubi.init"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [...],
    "viewsContainers": {...},
    "views": {...},
    "menus": {...},
    "configuration": {...}
  }
}
```

---

## 3. Component Design

### 3.1 Directory Structure

```
musubi-vscode/
├── .vscode/
│   ├── launch.json          # Debug configuration
│   └── tasks.json            # Build tasks
├── src/
│   ├── extension.ts          # Entry point
│   ├── commands/
│   │   ├── index.ts
│   │   ├── init.ts           # Initialize project
│   │   ├── validate.ts       # Validate constitution
│   │   ├── requirements.ts   # Generate requirements
│   │   ├── design.ts         # Generate design
│   │   └── agent.ts          # Agent selection
│   ├── providers/
│   │   ├── steeringTreeProvider.ts
│   │   ├── requirementsTreeProvider.ts
│   │   ├── tasksTreeProvider.ts
│   │   └── agentsTreeProvider.ts
│   ├── services/
│   │   ├── cliBridge.ts      # CLI command execution
│   │   ├── steeringParser.ts # Parse steering files
│   │   ├── requirementParser.ts
│   │   └── workspaceState.ts # State management
│   ├── views/
│   │   ├── statusBar.ts      # Status bar item
│   │   └── webview/          # Webview panels
│   │       ├── traceability.ts
│   │       └── dashboard.ts
│   ├── models/
│   │   ├── requirement.ts
│   │   ├── steering.ts
│   │   ├── task.ts
│   │   └── agent.ts
│   └── utils/
│       ├── logger.ts
│       ├── config.ts
│       └── constants.ts
├── resources/
│   ├── icon.png              # Extension icon
│   ├── icons/                # TreeView icons
│   │   ├── steering.svg
│   │   ├── requirement.svg
│   │   ├── task.svg
│   │   └── agent.svg
│   └── webview/
│       ├── styles.css
│       └── scripts.js
├── test/
│   ├── suite/
│   │   ├── extension.test.ts
│   │   ├── commands.test.ts
│   │   └── providers.test.ts
│   └── runTest.ts
├── package.json
├── tsconfig.json
├── esbuild.js
├── .vscodeignore
├── CHANGELOG.md
└── README.md
```

---

### 3.2 Entry Point (extension.ts)

```typescript
import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { SteeringTreeProvider } from './providers/steeringTreeProvider';
import { RequirementsTreeProvider } from './providers/requirementsTreeProvider';
import { StatusBarManager } from './views/statusBar';
import { WorkspaceState } from './services/workspaceState';

export async function activate(context: vscode.ExtensionContext) {
  console.log('MUSUBI SDD extension is now active');

  // Initialize workspace state
  const workspaceState = new WorkspaceState(context);
  
  // Check if this is a MUSUBI project
  const isMusubiProject = await checkMusubiProject();
  
  if (isMusubiProject) {
    // Register tree view providers
    const steeringProvider = new SteeringTreeProvider();
    const requirementsProvider = new RequirementsTreeProvider();
    
    vscode.window.registerTreeDataProvider('musubi-steering', steeringProvider);
    vscode.window.registerTreeDataProvider('musubi-requirements', requirementsProvider);
    
    // Initialize status bar
    const statusBar = new StatusBarManager(context);
    await statusBar.update();
    
    // Watch for file changes
    setupFileWatchers(steeringProvider, requirementsProvider, statusBar);
  }
  
  // Register commands (always available)
  registerCommands(context, workspaceState);
}

export function deactivate() {
  console.log('MUSUBI SDD extension deactivated');
}
```

---

### 3.3 Commands

#### 3.3.1 Command Registration

```typescript
// src/commands/index.ts
export function registerCommands(
  context: vscode.ExtensionContext,
  state: WorkspaceState
) {
  const commands = [
    { id: 'musubi.init', handler: initProject },
    { id: 'musubi.validate', handler: validateConstitution },
    { id: 'musubi.requirements', handler: generateRequirements },
    { id: 'musubi.design', handler: generateDesign },
    { id: 'musubi.tasks', handler: generateTasks },
    { id: 'musubi.selectAgent', handler: selectAgent },
    { id: 'musubi.openSteering', handler: openSteeringFile },
    { id: 'musubi.showTraceability', handler: showTraceabilityMatrix },
    { id: 'musubi.refresh', handler: refreshAll },
  ];

  for (const cmd of commands) {
    context.subscriptions.push(
      vscode.commands.registerCommand(cmd.id, () => cmd.handler(state))
    );
  }
}
```

#### 3.3.2 Command Implementations

```typescript
// src/commands/init.ts
import { CliBridge } from '../services/cliBridge';

export async function initProject(state: WorkspaceState): Promise<void> {
  // Show platform selection
  const platform = await vscode.window.showQuickPick(
    [
      { label: 'Claude Code', value: '--claude' },
      { label: 'GitHub Copilot', value: '--copilot' },
      { label: 'Cursor', value: '--cursor' },
      { label: 'Gemini CLI', value: '--gemini' },
      { label: 'Windsurf', value: '--windsurf' },
      { label: 'Codex CLI', value: '--codex' },
      { label: 'Qwen Code', value: '--qwen' },
    ],
    { placeHolder: 'Select your AI coding platform' }
  );

  if (!platform) return;

  // Execute CLI command
  const cli = new CliBridge();
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Initializing MUSUBI project...',
      cancellable: false,
    },
    async () => {
      await cli.execute(`npx musubi-sdd init ${platform.value}`);
    }
  );

  vscode.window.showInformationMessage('MUSUBI project initialized!');
  vscode.commands.executeCommand('musubi.refresh');
}
```

```typescript
// src/commands/validate.ts
export async function validateConstitution(state: WorkspaceState): Promise<void> {
  const cli = new CliBridge();
  
  const result = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Validating constitutional compliance...',
    },
    async () => {
      return await cli.execute('npx musubi-sdd validate');
    }
  );

  if (result.success) {
    vscode.window.showInformationMessage(
      `✅ Constitutional compliance: ${result.data.passed}/${result.data.total} articles passed`
    );
  } else {
    vscode.window.showErrorMessage(
      `❌ Constitutional violations: ${result.data.violations.join(', ')}`
    );
  }
}
```

---

### 3.4 Tree View Providers

#### 3.4.1 Steering Tree Provider

```typescript
// src/providers/steeringTreeProvider.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { SteeringParser } from '../services/steeringParser';

export class SteeringTreeProvider implements vscode.TreeDataProvider<SteeringItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SteeringItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private parser: SteeringParser;

  constructor() {
    this.parser = new SteeringParser();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: SteeringItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SteeringItem): Promise<SteeringItem[]> {
    if (!element) {
      // Root level: steering files
      return [
        new SteeringItem('Product Context', 'product.md', vscode.TreeItemCollapsibleState.Collapsed),
        new SteeringItem('Architecture', 'structure.md', vscode.TreeItemCollapsibleState.Collapsed),
        new SteeringItem('Technology Stack', 'tech.md', vscode.TreeItemCollapsibleState.Collapsed),
        new SteeringItem('Rules', 'rules/', vscode.TreeItemCollapsibleState.Collapsed),
      ];
    }

    // Child level: file contents (sections)
    const content = await this.parser.parse(element.filePath);
    return content.sections.map(
      section => new SteeringItem(section.title, section.line, vscode.TreeItemCollapsibleState.None)
    );
  }
}

class SteeringItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly filePath: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    
    this.tooltip = filePath;
    this.iconPath = new vscode.ThemeIcon('file');
    
    if (collapsibleState === vscode.TreeItemCollapsibleState.None) {
      this.command = {
        command: 'musubi.openSteering',
        title: 'Open File',
        arguments: [filePath]
      };
    }
  }
}
```

#### 3.4.2 Requirements Tree Provider

```typescript
// src/providers/requirementsTreeProvider.ts
export class RequirementsTreeProvider implements vscode.TreeDataProvider<RequirementItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<RequirementItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  async getChildren(element?: RequirementItem): Promise<RequirementItem[]> {
    if (!element) {
      // Root: Priority groups
      return [
        new RequirementItem('P0 - Critical', 'P0', vscode.TreeItemCollapsibleState.Expanded),
        new RequirementItem('P1 - High', 'P1', vscode.TreeItemCollapsibleState.Collapsed),
        new RequirementItem('P2 - Medium', 'P2', vscode.TreeItemCollapsibleState.Collapsed),
        new RequirementItem('P3 - Low', 'P3', vscode.TreeItemCollapsibleState.Collapsed),
      ];
    }

    // Load requirements for this priority
    const requirements = await this.loadRequirements(element.priority);
    return requirements.map(req => new RequirementItem(
      `${req.id}: ${req.title}`,
      req.id,
      vscode.TreeItemCollapsibleState.None,
      req.status
    ));
  }

  getTreeItem(element: RequirementItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, element.collapsibleState);
    
    // Status-based icon
    if (element.status) {
      item.iconPath = this.getStatusIcon(element.status);
      item.description = element.status;
    }
    
    return item;
  }

  private getStatusIcon(status: string): vscode.ThemeIcon {
    switch (status) {
      case 'completed': return new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
      case 'in-progress': return new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('testing.iconQueued'));
      case 'planned': return new vscode.ThemeIcon('circle-outline');
      default: return new vscode.ThemeIcon('circle-outline');
    }
  }
}
```

---

### 3.5 Status Bar

```typescript
// src/views/statusBar.ts
export class StatusBarManager {
  private complianceItem: vscode.StatusBarItem;
  private traceabilityItem: vscode.StatusBarItem;
  private agentItem: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    // Compliance status
    this.complianceItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.complianceItem.command = 'musubi.validate';
    this.complianceItem.tooltip = 'Click to validate constitutional compliance';
    context.subscriptions.push(this.complianceItem);

    // Traceability status
    this.traceabilityItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      99
    );
    this.traceabilityItem.command = 'musubi.showTraceability';
    this.traceabilityItem.tooltip = 'Click to view traceability matrix';
    context.subscriptions.push(this.traceabilityItem);

    // Agent selector
    this.agentItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      98
    );
    this.agentItem.command = 'musubi.selectAgent';
    this.agentItem.tooltip = 'Click to select an agent';
    context.subscriptions.push(this.agentItem);
  }

  async update(): Promise<void> {
    const cli = new CliBridge();
    
    // Get compliance status
    const validation = await cli.execute('npx musubi-sdd validate --json');
    if (validation.success) {
      const data = validation.data;
      this.complianceItem.text = `$(shield) ${data.passed}/${data.total}`;
      this.complianceItem.backgroundColor = 
        data.passed === data.total 
          ? undefined 
          : new vscode.ThemeColor('statusBarItem.warningBackground');
    }

    // Get traceability
    const trace = await cli.execute('npx musubi-sdd trace --summary --json');
    if (trace.success) {
      this.traceabilityItem.text = `$(git-branch) ${trace.data.coverage}%`;
    }

    // Show current agent
    this.agentItem.text = '$(robot) @orchestrator';

    // Show all items
    this.complianceItem.show();
    this.traceabilityItem.show();
    this.agentItem.show();
  }
}
```

---

### 3.6 CLI Bridge Service

```typescript
// src/services/cliBridge.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';

const execAsync = promisify(exec);

interface CliResult {
  success: boolean;
  data: any;
  error?: string;
}

export class CliBridge {
  private workspaceRoot: string;

  constructor() {
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  }

  async execute(command: string): Promise<CliResult> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.workspaceRoot,
        timeout: 30000,
      });

      // Try to parse as JSON
      try {
        return { success: true, data: JSON.parse(stdout) };
      } catch {
        return { success: true, data: stdout };
      }
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message,
      };
    }
  }

  async checkMusubiInstalled(): Promise<boolean> {
    try {
      await execAsync('npx musubi-sdd --version');
      return true;
    } catch {
      return false;
    }
  }
}
```

---

## 4. UI/UX Specifications

### 4.1 Sidebar View Container

```
┌────────────────────────────────────────┐
│ MUSUBI SDD                        [⟳] │
├────────────────────────────────────────┤
│ ▼ STEERING                            │
│   📄 Product Context                  │
│   📄 Architecture                     │
│   📄 Technology Stack                 │
│   📁 Rules                            │
├────────────────────────────────────────┤
│ ▼ REQUIREMENTS                        │
│   ▶ P0 - Critical (3)                 │
│     ✅ REQ-P0-001: GitHub Optimization│
│     🔄 REQ-P0-002: Awesome Lists      │
│     ✅ REQ-P0-003: Content Marketing  │
│   ▶ P1 - High (4)                     │
│   ▶ P2 - Medium (4)                   │
│   ▶ P3 - Low (3)                      │
├────────────────────────────────────────┤
│ ▼ AGENTS (25)                         │
│   🤖 @orchestrator                    │
│   📋 @requirements-analyst            │
│   🏗️ @system-architect               │
│   ...                                 │
└────────────────────────────────────────┘
```

### 4.2 Command Palette

| Command | Description |
|---------|-------------|
| `MUSUBI: Initialize Project` | Run `musubi-sdd init` with platform selection |
| `MUSUBI: Validate Constitution` | Check constitutional compliance |
| `MUSUBI: Generate Requirements` | Create EARS requirements |
| `MUSUBI: Generate Design` | Create C4 + ADR design |
| `MUSUBI: Generate Tasks` | Break down into tasks |
| `MUSUBI: Show Traceability` | Open traceability matrix view |
| `MUSUBI: Select Agent` | Quick pick agent selection |
| `MUSUBI: Refresh` | Refresh all views |

### 4.3 Status Bar

```
┌─────────────────────────────────────────────────────────────────┐
│ ... │ $(shield) 9/9 │ $(git-branch) 85% │ $(robot) @orchestrator│
└─────────────────────────────────────────────────────────────────┘
       │               │                    │
       │               │                    └── Current agent (clickable)
       │               └── Traceability coverage (clickable)
       └── Constitutional compliance (clickable)
```

---

## 5. Data Models

### 5.1 Requirement Model

```typescript
interface Requirement {
  id: string;           // e.g., "REQ-P0-001"
  title: string;        // Short description
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  pattern: 'WHEN' | 'WHILE' | 'IF' | 'WHERE' | 'SHALL';
  status: 'planned' | 'in-progress' | 'completed';
  description: string;  // Full EARS requirement
  acceptanceCriteria: AcceptanceCriterion[];
  traceability: {
    tests: string[];    // Test file references
    code: string[];     // Code file references
    design: string[];   // Design document references
  };
  filePath: string;     // Source file location
  line: number;         // Line number in source file
}

interface AcceptanceCriterion {
  id: string;
  description: string;
  verified: boolean;
}
```

### 5.2 Steering Model

```typescript
interface SteeringFile {
  type: 'product' | 'structure' | 'tech' | 'rules';
  path: string;
  lastModified: Date;
  sections: Section[];
}

interface Section {
  title: string;
  level: number;        // Heading level (1-6)
  content: string;
  line: number;
}
```

### 5.3 Agent Model

```typescript
interface Agent {
  id: string;           // e.g., "orchestrator"
  name: string;         // e.g., "@orchestrator"
  category: AgentCategory;
  description: string;
  triggerTerms: string[];
  icon: string;         // VS Code icon name
}

type AgentCategory = 
  | 'orchestration'
  | 'requirements'
  | 'design'
  | 'development'
  | 'security'
  | 'operations'
  | 'documentation';
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

```typescript
// test/suite/providers.test.ts
import * as assert from 'assert';
import { SteeringTreeProvider } from '../../src/providers/steeringTreeProvider';

suite('SteeringTreeProvider', () => {
  test('should return 4 root items', async () => {
    const provider = new SteeringTreeProvider();
    const items = await provider.getChildren();
    assert.strictEqual(items.length, 4);
  });

  test('should parse product.md sections', async () => {
    const provider = new SteeringTreeProvider();
    const root = (await provider.getChildren())[0];
    const children = await provider.getChildren(root);
    assert.ok(children.length > 0);
  });
});
```

### 6.2 Integration Tests

```typescript
// test/suite/commands.test.ts
suite('Commands', () => {
  test('musubi.init should create steering folder', async () => {
    await vscode.commands.executeCommand('musubi.init');
    const steeringUri = vscode.Uri.joinPath(
      vscode.workspace.workspaceFolders![0].uri,
      'steering'
    );
    const stat = await vscode.workspace.fs.stat(steeringUri);
    assert.strictEqual(stat.type, vscode.FileType.Directory);
  });
});
```

---

## 7. Release Checklist

### 7.1 Pre-release

- [ ] All tests passing
- [ ] README with screenshots/GIF
- [ ] CHANGELOG updated
- [ ] Icon designed (128x128 PNG)
- [ ] License file present
- [ ] package.json complete

### 7.2 Marketplace Submission

- [ ] Publisher account created (nahisaho)
- [ ] Personal Access Token generated
- [ ] `vsce package` successful
- [ ] `vsce publish` executed
- [ ] Verify listing on Marketplace

### 7.3 Post-release

- [ ] Announce on X/Twitter
- [ ] Update MUSUBI README with extension link
- [ ] Monitor reviews and issues
- [ ] Plan v0.2.0 features

---

## 8. References

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [ADR-P1-003](./adr/ADR-P1-003-vscode-extension.md)
