/**
 * Traceability View Provider
 *
 * Phase 6 P2: Requirements → Code visualization
 */

import * as vscode from 'vscode';

interface TraceabilityItem {
  id: string;
  type: 'requirement' | 'design' | 'task' | 'code' | 'test';
  name: string;
  path?: string;
  status: 'implemented' | 'partial' | 'missing';
  children: TraceabilityItem[];
}

export class TraceabilityViewProvider
  implements vscode.TreeDataProvider<TraceabilityItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    TraceabilityItem | undefined | null | void
  > = new vscode.EventEmitter<TraceabilityItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    TraceabilityItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private _items: TraceabilityItem[] = [];

  constructor() {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setItems(items: TraceabilityItem[]): void {
    this._items = items;
    this.refresh();
  }

  getTreeItem(element: TraceabilityItem): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(
      element.name,
      element.children.length > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    treeItem.id = element.id;
    treeItem.description = element.type;
    treeItem.tooltip = this._getTooltip(element);
    treeItem.iconPath = this._getIcon(element);
    treeItem.contextValue = element.type;

    if (element.path) {
      treeItem.command = {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [vscode.Uri.file(element.path)],
      };
    }

    return treeItem;
  }

  getChildren(element?: TraceabilityItem): Thenable<TraceabilityItem[]> {
    if (element) {
      return Promise.resolve(element.children);
    }
    return Promise.resolve(this._items);
  }

  getParent(_element: TraceabilityItem): vscode.ProviderResult<TraceabilityItem> {
    // Not implemented - flat structure for now
    return null;
  }

  private _getTooltip(item: TraceabilityItem): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**${item.name}**\n\n`);
    md.appendMarkdown(`- Type: ${item.type}\n`);
    md.appendMarkdown(`- Status: ${item.status}\n`);
    if (item.path) {
      md.appendMarkdown(`- Path: ${item.path}\n`);
    }
    if (item.children.length > 0) {
      md.appendMarkdown(`- Children: ${item.children.length}\n`);
    }
    return md;
  }

  private _getIcon(item: TraceabilityItem): vscode.ThemeIcon {
    const icons: Record<TraceabilityItem['type'], string> = {
      requirement: 'book',
      design: 'symbol-class',
      task: 'tasklist',
      code: 'file-code',
      test: 'beaker',
    };

    const colors: Record<TraceabilityItem['status'], string | undefined> = {
      implemented: 'charts.green',
      partial: 'charts.yellow',
      missing: 'charts.red',
    };

    return new vscode.ThemeIcon(
      icons[item.type] || 'circle-outline',
      colors[item.status] ? new vscode.ThemeColor(colors[item.status]!) : undefined
    );
  }

  // Helper method to generate sample traceability data
  static generateSampleData(): TraceabilityItem[] {
    return [
      {
        id: 'req-001',
        type: 'requirement',
        name: 'REQ-001: User Authentication',
        status: 'implemented',
        children: [
          {
            id: 'des-001',
            type: 'design',
            name: 'AUTH-DESIGN: Login Flow',
            status: 'implemented',
            children: [
              {
                id: 'task-001',
                type: 'task',
                name: 'TASK-001: Implement Login API',
                status: 'implemented',
                children: [
                  {
                    id: 'code-001',
                    type: 'code',
                    name: 'auth/login.ts',
                    path: 'src/auth/login.ts',
                    status: 'implemented',
                    children: [],
                  },
                  {
                    id: 'test-001',
                    type: 'test',
                    name: 'login.test.ts',
                    path: 'tests/auth/login.test.ts',
                    status: 'implemented',
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'req-002',
        type: 'requirement',
        name: 'REQ-002: Data Export',
        status: 'partial',
        children: [
          {
            id: 'des-002',
            type: 'design',
            name: 'EXPORT-DESIGN: CSV/JSON Export',
            status: 'implemented',
            children: [],
          },
          {
            id: 'task-002',
            type: 'task',
            name: 'TASK-002: Implement Export API',
            status: 'missing',
            children: [],
          },
        ],
      },
    ];
  }
}
