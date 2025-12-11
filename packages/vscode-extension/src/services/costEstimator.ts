/**
 * Cost Estimator Service
 *
 * Phase 6 P2: Pre-run token estimation
 */

import * as vscode from 'vscode';

interface ModelPricing {
  inputTokenCost: number; // Cost per 1K input tokens
  outputTokenCost: number; // Cost per 1K output tokens
  contextWindow: number;
}

interface CostEstimate {
  model: string;
  inputTokens: number;
  estimatedOutputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  withinContext: boolean;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4o': {
    inputTokenCost: 0.005,
    outputTokenCost: 0.015,
    contextWindow: 128000,
  },
  'gpt-4o-mini': {
    inputTokenCost: 0.00015,
    outputTokenCost: 0.0006,
    contextWindow: 128000,
  },
  'gpt-4-turbo': {
    inputTokenCost: 0.01,
    outputTokenCost: 0.03,
    contextWindow: 128000,
  },
  'gpt-3.5-turbo': {
    inputTokenCost: 0.0005,
    outputTokenCost: 0.0015,
    contextWindow: 16385,
  },
  'claude-3-5-sonnet': {
    inputTokenCost: 0.003,
    outputTokenCost: 0.015,
    contextWindow: 200000,
  },
  'claude-3-opus': {
    inputTokenCost: 0.015,
    outputTokenCost: 0.075,
    contextWindow: 200000,
  },
  'claude-3-haiku': {
    inputTokenCost: 0.00025,
    outputTokenCost: 0.00125,
    contextWindow: 200000,
  },
};

export class CostEstimatorService {
  private static readonly TOKENS_PER_CHAR = 0.25;
  private static readonly OUTPUT_RATIO = 0.3; // Estimate output as 30% of input

  /**
   * Estimate tokens from text
   */
  public estimateTokens(text: string): number {
    return Math.ceil(text.length * CostEstimatorService.TOKENS_PER_CHAR);
  }

  /**
   * Estimate cost for a single prompt
   */
  public estimateCost(
    text: string,
    model: string = 'gpt-4o',
    outputRatio: number = CostEstimatorService.OUTPUT_RATIO
  ): CostEstimate {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o'];
    const inputTokens = this.estimateTokens(text);
    const estimatedOutputTokens = Math.ceil(inputTokens * outputRatio);

    const inputCost = (inputTokens / 1000) * pricing.inputTokenCost;
    const outputCost = (estimatedOutputTokens / 1000) * pricing.outputTokenCost;

    return {
      model,
      inputTokens,
      estimatedOutputTokens,
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      withinContext: inputTokens <= pricing.contextWindow,
    };
  }

  /**
   * Estimate cost for multiple files
   */
  public estimateCostForFiles(
    files: { path: string; content: string }[],
    model: string = 'gpt-4o'
  ): CostEstimate & { fileCount: number; breakdown: CostEstimate[] } {
    const breakdown = files.map((f) => ({
      ...this.estimateCost(f.content, model),
      path: f.path,
    }));

    const totalInput = breakdown.reduce((sum, e) => sum + e.inputTokens, 0);
    const totalOutput = breakdown.reduce(
      (sum, e) => sum + e.estimatedOutputTokens,
      0
    );
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o'];

    return {
      model,
      fileCount: files.length,
      inputTokens: totalInput,
      estimatedOutputTokens: totalOutput,
      inputCost: breakdown.reduce((sum, e) => sum + e.inputCost, 0),
      outputCost: breakdown.reduce((sum, e) => sum + e.outputCost, 0),
      totalCost: breakdown.reduce((sum, e) => sum + e.totalCost, 0),
      withinContext: totalInput <= pricing.contextWindow,
      breakdown,
    };
  }

  /**
   * Get available models
   */
  public getAvailableModels(): string[] {
    return Object.keys(MODEL_PRICING);
  }

  /**
   * Get model pricing info
   */
  public getModelPricing(model: string): ModelPricing | undefined {
    return MODEL_PRICING[model];
  }

  /**
   * Show cost estimate in UI
   */
  public async showCostEstimate(text: string, model?: string): Promise<void> {
    const selectedModel =
      model ||
      (await vscode.window.showQuickPick(this.getAvailableModels(), {
        placeHolder: 'Select AI model for cost estimation',
      }));

    if (!selectedModel) {
      return;
    }

    const estimate = this.estimateCost(text, selectedModel);

    const message = [
      `📊 Cost Estimate for ${selectedModel}`,
      ``,
      `Input Tokens: ${estimate.inputTokens.toLocaleString()}`,
      `Est. Output Tokens: ${estimate.estimatedOutputTokens.toLocaleString()}`,
      ``,
      `Input Cost: $${estimate.inputCost.toFixed(4)}`,
      `Output Cost: $${estimate.outputCost.toFixed(4)}`,
      `Total Cost: $${estimate.totalCost.toFixed(4)}`,
      ``,
      estimate.withinContext
        ? '✅ Within context window'
        : '⚠️ Exceeds context window - will require chunking',
    ].join('\n');

    await vscode.window.showInformationMessage(message, { modal: true });
  }

  /**
   * Show cost estimate for current selection
   */
  public async estimateSelectionCost(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const selection = editor.selection;
    const text = selection.isEmpty
      ? editor.document.getText()
      : editor.document.getText(selection);

    await this.showCostEstimate(text);
  }

  /**
   * Create status bar item showing estimated cost
   */
  public createStatusBarItem(): vscode.StatusBarItem {
    const item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      90
    );
    item.command = 'musubi.estimateCost';
    item.tooltip = 'Click to estimate AI cost for selection';
    return item;
  }

  /**
   * Update status bar with current estimate
   */
  public updateStatusBar(
    item: vscode.StatusBarItem,
    text: string,
    model: string = 'gpt-4o'
  ): void {
    const estimate = this.estimateCost(text, model);
    item.text = `$(dollar) ~$${estimate.totalCost.toFixed(4)}`;
    item.tooltip = new vscode.MarkdownString(
      [
        `**Cost Estimate (${model})**`,
        ``,
        `- Input: ${estimate.inputTokens.toLocaleString()} tokens`,
        `- Output: ~${estimate.estimatedOutputTokens.toLocaleString()} tokens`,
        `- Total: $${estimate.totalCost.toFixed(4)}`,
      ].join('\n')
    );
    item.show();
  }
}

export const costEstimator = new CostEstimatorService();
