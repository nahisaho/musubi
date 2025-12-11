/**
 * Dashboard View Provider
 *
 * Phase 6 P2: Visual orchestration status dashboard
 */

import * as vscode from 'vscode';

interface OrchestrationTask {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  tokens?: number;
  cost?: number;
}

interface DashboardData {
  tasks: OrchestrationTask[];
  totalTokens: number;
  totalCost: number;
  startTime: Date;
  status: 'idle' | 'running' | 'completed' | 'failed';
}

export class DashboardViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'musubi.dashboardView';

  private _view?: vscode.WebviewView;
  private _data: DashboardData = {
    tasks: [],
    totalTokens: 0,
    totalCost: 0,
    startTime: new Date(),
    status: 'idle',
  };

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case 'refresh':
          this.refresh();
          break;
        case 'cancelTask':
          this._cancelTask(message.taskId);
          break;
      }
    });
  }

  public updateTask(task: Partial<OrchestrationTask> & { id: string }): void {
    const existingIndex = this._data.tasks.findIndex((t) => t.id === task.id);
    if (existingIndex >= 0) {
      this._data.tasks[existingIndex] = {
        ...this._data.tasks[existingIndex],
        ...task,
      };
    } else {
      this._data.tasks.push({
        id: task.id,
        name: task.name || 'Unknown Task',
        status: task.status || 'pending',
        progress: task.progress || 0,
        ...task,
      });
    }

    this._updateTotals();
    this.refresh();
  }

  public setStatus(status: DashboardData['status']): void {
    this._data.status = status;
    if (status === 'running' && this._data.startTime === undefined) {
      this._data.startTime = new Date();
    }
    this.refresh();
  }

  public clear(): void {
    this._data = {
      tasks: [],
      totalTokens: 0,
      totalCost: 0,
      startTime: new Date(),
      status: 'idle',
    };
    this.refresh();
  }

  public refresh(): void {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'update',
        data: this._data,
      });
    }
  }

  private _updateTotals(): void {
    this._data.totalTokens = this._data.tasks.reduce(
      (sum, t) => sum + (t.tokens || 0),
      0
    );
    this._data.totalCost = this._data.tasks.reduce(
      (sum, t) => sum + (t.cost || 0),
      0
    );
  }

  private _cancelTask(taskId: string): void {
    const task = this._data.tasks.find((t) => t.id === taskId);
    if (task && task.status === 'running') {
      task.status = 'failed';
      this.refresh();
      vscode.window.showInformationMessage(`Task ${task.name} cancelled`);
    }
  }

  private _getHtmlForWebview(_webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MUSUBI Dashboard</title>
  <style>
    body {
      padding: 10px;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .status {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .status-idle { background-color: var(--vscode-charts-gray); }
    .status-running { background-color: var(--vscode-charts-blue); animation: pulse 1s infinite; }
    .status-completed { background-color: var(--vscode-charts-green); }
    .status-failed { background-color: var(--vscode-charts-red); }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 16px;
    }
    .stat-card {
      background: var(--vscode-input-background);
      padding: 8px;
      border-radius: 4px;
    }
    .stat-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .stat-value {
      font-size: 16px;
      font-weight: bold;
    }
    .task-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .task {
      background: var(--vscode-input-background);
      padding: 8px;
      border-radius: 4px;
    }
    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .task-name {
      font-weight: 500;
    }
    .task-status {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .task-pending { background: var(--vscode-charts-gray); }
    .task-running { background: var(--vscode-charts-blue); }
    .task-completed { background: var(--vscode-charts-green); }
    .task-failed { background: var(--vscode-charts-red); }
    .progress-bar {
      margin-top: 6px;
      height: 4px;
      background: var(--vscode-progressBar-background);
      border-radius: 2px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--vscode-progressBar-foreground);
      transition: width 0.3s ease;
    }
    .empty-state {
      text-align: center;
      padding: 20px;
      color: var(--vscode-descriptionForeground);
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 4px 8px;
      border-radius: 3px;
      cursor: pointer;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="status">
      <div class="status-indicator status-idle" id="statusIndicator"></div>
      <span id="statusText">Idle</span>
    </div>
    <button onclick="refresh()">⟳ Refresh</button>
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-label">Total Tokens</div>
      <div class="stat-value" id="totalTokens">0</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Estimated Cost</div>
      <div class="stat-value" id="totalCost">$0.00</div>
    </div>
  </div>

  <div id="taskList" class="task-list">
    <div class="empty-state">No active tasks</div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function refresh() {
      vscode.postMessage({ command: 'refresh' });
    }

    function cancelTask(taskId) {
      vscode.postMessage({ command: 'cancelTask', taskId });
    }

    function updateDashboard(data) {
      // Update status
      const indicator = document.getElementById('statusIndicator');
      indicator.className = 'status-indicator status-' + data.status;
      document.getElementById('statusText').textContent = 
        data.status.charAt(0).toUpperCase() + data.status.slice(1);

      // Update stats
      document.getElementById('totalTokens').textContent = 
        data.totalTokens.toLocaleString();
      document.getElementById('totalCost').textContent = 
        '$' + data.totalCost.toFixed(4);

      // Update task list
      const taskList = document.getElementById('taskList');
      if (data.tasks.length === 0) {
        taskList.innerHTML = '<div class="empty-state">No active tasks</div>';
      } else {
        taskList.innerHTML = data.tasks.map(task => \`
          <div class="task">
            <div class="task-header">
              <span class="task-name">\${task.name}</span>
              <span class="task-status task-\${task.status}">\${task.status}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: \${task.progress}%"></div>
            </div>
          </div>
        \`).join('');
      }
    }

    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type === 'update') {
        updateDashboard(message.data);
      }
    });
  </script>
</body>
</html>`;
  }
}
