/**
 * AdaptiveGoalModifier - 状況に応じた目標の動的調整
 * 
 * Goal-Driven Replanning の完全実装 (Phase 2/3)
 * 目標の優先度・スコープ・タイムライン・成功基準を動的に調整
 * 
 * @module orchestration/replanning/adaptive-goal-modifier
 */

'use strict';

/**
 * 目標調整の理由を分類
 */
const ModificationReason = {
  RESOURCE_CONSTRAINT: 'resource_constraint',      // リソース制約
  TIME_CONSTRAINT: 'time_constraint',              // 時間制約
  DEPENDENCY_FAILURE: 'dependency_failure',        // 依存関係の失敗
  PRIORITY_SHIFT: 'priority_shift',                // 優先度の変更
  SCOPE_CREEP: 'scope_creep',                      // スコープの拡大
  EXTERNAL_CHANGE: 'external_change',              // 外部要因の変化
  PERFORMANCE_ISSUE: 'performance_issue',          // パフォーマンス問題
  USER_REQUEST: 'user_request',                    // ユーザーリクエスト
  STRATEGIC_PIVOT: 'strategic_pivot'               // 戦略的転換
};

/**
 * 調整タイプ
 */
const ModificationType = {
  PRIORITY_ADJUSTMENT: 'priority_adjustment',      // 優先度調整
  SCOPE_REDUCTION: 'scope_reduction',              // スコープ縮小
  SCOPE_EXPANSION: 'scope_expansion',              // スコープ拡大
  TIMELINE_EXTENSION: 'timeline_extension',        // タイムライン延長
  TIMELINE_COMPRESSION: 'timeline_compression',    // タイムライン圧縮
  SUCCESS_CRITERIA_RELAXATION: 'criteria_relaxation', // 成功基準緩和
  SUCCESS_CRITERIA_TIGHTENING: 'criteria_tightening', // 成功基準厳格化
  GOAL_DECOMPOSITION: 'goal_decomposition',        // 目標分解
  GOAL_MERGE: 'goal_merge',                        // 目標統合
  GOAL_DEFERRAL: 'goal_deferral',                  // 目標延期
  GOAL_CANCELLATION: 'goal_cancellation'           // 目標キャンセル
};

/**
 * 影響分析エンジン
 * 目標変更による影響を分析
 */
class ImpactAnalyzer {
  /**
   * @param {Object} options - 設定オプション
   */
  constructor(options = {}) {
    this.config = {
      cascadeDepth: options.cascadeDepth || 3,
      impactThreshold: options.impactThreshold || 0.3,
      ...options
    };
  }

  /**
   * 目標変更の影響を分析
   * @param {Object} goal - 対象目標
   * @param {Object} modification - 変更内容
   * @param {Object} context - コンテキスト
   * @returns {Object} 影響分析結果
   */
  analyzeImpact(goal, modification, context) {
    const directImpact = this._analyzeDirectImpact(goal, modification);
    const cascadeImpact = this._analyzeCascadeImpact(goal, modification, context);
    const resourceImpact = this._analyzeResourceImpact(goal, modification, context);
    const timelineImpact = this._analyzeTimelineImpact(goal, modification, context);

    const totalScore = this._calculateTotalImpact(
      directImpact,
      cascadeImpact,
      resourceImpact,
      timelineImpact
    );

    return {
      goalId: goal.id,
      modificationType: modification.type,
      directImpact,
      cascadeImpact,
      resourceImpact,
      timelineImpact,
      totalScore,
      riskLevel: this._categorizeRisk(totalScore),
      recommendations: this._generateRecommendations(totalScore, modification),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 直接的な影響を分析
   * @private
   */
  _analyzeDirectImpact(goal, modification) {
    const impacts = {
      [ModificationType.PRIORITY_ADJUSTMENT]: 0.3,
      [ModificationType.SCOPE_REDUCTION]: 0.5,
      [ModificationType.SCOPE_EXPANSION]: 0.6,
      [ModificationType.TIMELINE_EXTENSION]: 0.4,
      [ModificationType.TIMELINE_COMPRESSION]: 0.7,
      [ModificationType.SUCCESS_CRITERIA_RELAXATION]: 0.3,
      [ModificationType.SUCCESS_CRITERIA_TIGHTENING]: 0.5,
      [ModificationType.GOAL_DECOMPOSITION]: 0.4,
      [ModificationType.GOAL_MERGE]: 0.5,
      [ModificationType.GOAL_DEFERRAL]: 0.6,
      [ModificationType.GOAL_CANCELLATION]: 1.0
    };

    const baseImpact = impacts[modification.type] || 0.5;
    const priorityMultiplier = goal.priority === 'critical' ? 1.5 :
                               goal.priority === 'high' ? 1.2 : 1.0;

    return {
      score: Math.min(1.0, baseImpact * priorityMultiplier),
      affectedAreas: this._identifyAffectedAreas(modification.type)
    };
  }

  /**
   * カスケード影響を分析
   * @private
   */
  _analyzeCascadeImpact(goal, modification, context) {
    const dependentGoals = context.goals?.filter(g => 
      g.dependencies?.includes(goal.id)
    ) || [];

    let totalCascade = 0;
    const affectedGoals = [];

    for (const depGoal of dependentGoals) {
      const impact = this._calculateDependencyImpact(depGoal, modification);
      totalCascade += impact;
      if (impact > this.config.impactThreshold) {
        affectedGoals.push({
          goalId: depGoal.id,
          impact,
          requires: this._determineCascadeAction(impact)
        });
      }
    }

    return {
      score: Math.min(1.0, totalCascade / Math.max(1, dependentGoals.length)),
      affectedGoals,
      depth: Math.min(affectedGoals.length, this.config.cascadeDepth)
    };
  }

  /**
   * リソース影響を分析
   * @private
   */
  _analyzeResourceImpact(goal, modification, context) {
    const resourceChanges = {
      freed: [],
      required: [],
      conflicting: []
    };

    if (modification.type === ModificationType.SCOPE_REDUCTION ||
        modification.type === ModificationType.GOAL_CANCELLATION) {
      resourceChanges.freed = goal.resources || [];
    } else if (modification.type === ModificationType.SCOPE_EXPANSION ||
               modification.type === ModificationType.TIMELINE_COMPRESSION) {
      resourceChanges.required = this._estimateAdditionalResources(goal, modification);
    }

    // リソース競合チェック
    if (context.resourcePool) {
      resourceChanges.conflicting = this._findConflicts(
        resourceChanges.required,
        context.resourcePool
      );
    }

    return {
      score: resourceChanges.conflicting.length > 0 ? 0.7 : 0.3,
      changes: resourceChanges,
      feasibility: resourceChanges.conflicting.length === 0
    };
  }

  /**
   * タイムライン影響を分析
   * @private
   */
  _analyzeTimelineImpact(goal, modification, context) {
    let shift = 0;
    let affectedMilestones = [];

    switch (modification.type) {
      case ModificationType.TIMELINE_EXTENSION:
        shift = modification.extensionDays || 7;
        break;
      case ModificationType.TIMELINE_COMPRESSION:
        shift = -(modification.compressionDays || 3);
        break;
      case ModificationType.SCOPE_EXPANSION:
        shift = modification.estimatedDays || 5;
        break;
      case ModificationType.SCOPE_REDUCTION:
        shift = -(modification.savedDays || 2);
        break;
    }

    if (context.milestones) {
      affectedMilestones = context.milestones.filter(m =>
        new Date(m.dueDate) >= new Date(goal.targetDate)
      );
    }

    return {
      score: Math.min(1.0, Math.abs(shift) / 14), // 2週間を基準
      shiftDays: shift,
      direction: shift > 0 ? 'delay' : 'accelerate',
      affectedMilestones: affectedMilestones.length
    };
  }

  /**
   * 総合影響スコアを計算
   * @private
   */
  _calculateTotalImpact(direct, cascade, resource, timeline) {
    return (
      direct.score * 0.3 +
      cascade.score * 0.25 +
      resource.score * 0.25 +
      timeline.score * 0.2
    );
  }

  /**
   * リスクレベルを分類
   * @private
   */
  _categorizeRisk(score) {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * 影響を受けるエリアを特定
   * @private
   */
  _identifyAffectedAreas(modificationType) {
    const areaMap = {
      [ModificationType.PRIORITY_ADJUSTMENT]: ['scheduling', 'resources'],
      [ModificationType.SCOPE_REDUCTION]: ['deliverables', 'testing'],
      [ModificationType.SCOPE_EXPANSION]: ['deliverables', 'testing', 'resources'],
      [ModificationType.TIMELINE_EXTENSION]: ['milestones', 'dependencies'],
      [ModificationType.TIMELINE_COMPRESSION]: ['quality', 'resources', 'scope'],
      [ModificationType.SUCCESS_CRITERIA_RELAXATION]: ['quality', 'testing'],
      [ModificationType.SUCCESS_CRITERIA_TIGHTENING]: ['quality', 'testing', 'resources'],
      [ModificationType.GOAL_DECOMPOSITION]: ['tracking', 'dependencies'],
      [ModificationType.GOAL_MERGE]: ['tracking', 'dependencies', 'scope'],
      [ModificationType.GOAL_DEFERRAL]: ['milestones', 'dependencies'],
      [ModificationType.GOAL_CANCELLATION]: ['all']
    };
    return areaMap[modificationType] || ['unknown'];
  }

  /**
   * 依存関係の影響を計算
   * @private
   */
  _calculateDependencyImpact(depGoal, modification) {
    const baseImpact = depGoal.dependencyStrength || 0.5;
    const typeMultiplier = 
      modification.type === ModificationType.GOAL_CANCELLATION ? 1.0 :
      modification.type === ModificationType.TIMELINE_EXTENSION ? 0.7 :
      0.4;
    return baseImpact * typeMultiplier;
  }

  /**
   * カスケードアクションを決定
   * @private
   */
  _determineCascadeAction(impact) {
    if (impact >= 0.8) return 'immediate_replanning';
    if (impact >= 0.5) return 'review_required';
    return 'monitor';
  }

  /**
   * 追加リソースを見積もり
   * @private
   */
  _estimateAdditionalResources(goal, modification) {
    const currentResources = goal.resources || [];
    const expansionFactor = modification.expansionFactor || 1.5;
    return currentResources.map(r => ({
      ...r,
      amount: Math.ceil(r.amount * (expansionFactor - 1))
    }));
  }

  /**
   * リソース競合を検出
   * @private
   */
  _findConflicts(required, pool) {
    return required.filter(r => {
      const available = pool.find(p => p.type === r.type);
      return !available || available.available < r.amount;
    });
  }

  /**
   * 推奨事項を生成
   * @private
   */
  _generateRecommendations(totalScore, modification) {
    const recommendations = [];
    
    if (totalScore >= 0.7) {
      recommendations.push({
        priority: 'high',
        action: 'Conduct stakeholder review before proceeding',
        rationale: 'High impact modification requires approval'
      });
    }

    if (modification.type === ModificationType.SCOPE_EXPANSION) {
      recommendations.push({
        priority: 'medium',
        action: 'Review resource allocation',
        rationale: 'Scope expansion typically requires additional resources'
      });
    }

    if (modification.type === ModificationType.TIMELINE_COMPRESSION) {
      recommendations.push({
        priority: 'high',
        action: 'Assess quality risks',
        rationale: 'Compressed timelines may affect deliverable quality'
      });
    }

    return recommendations;
  }
}

/**
 * 目標調整ストラテジー
 * 状況に応じた調整戦略を決定
 */
class ModificationStrategy {
  /**
   * @param {Object} options - 設定オプション
   */
  constructor(options = {}) {
    this.config = {
      conservativeMode: options.conservativeMode || false,
      autoApproveThreshold: options.autoApproveThreshold || 0.3,
      ...options
    };
  }

  /**
   * 最適な調整戦略を決定
   * @param {Object} goal - 対象目標
   * @param {Object} trigger - トリガー情報
   * @param {Object} context - コンテキスト
   * @returns {Object} 調整戦略
   */
  determineStrategy(goal, trigger, context) {
    const strategies = this._generateCandidateStrategies(goal, trigger, context);
    const evaluated = strategies.map(s => ({
      ...s,
      score: this._evaluateStrategy(s, goal, context)
    }));

    evaluated.sort((a, b) => b.score - a.score);

    return {
      recommended: evaluated[0],
      alternatives: evaluated.slice(1, 3),
      confidence: evaluated[0]?.score || 0,
      autoApprovable: evaluated[0]?.score >= (1 - this.config.autoApproveThreshold)
    };
  }

  /**
   * 候補戦略を生成
   * @private
   */
  _generateCandidateStrategies(goal, trigger, _context) {
    const strategies = [];

    switch (trigger.reason) {
      case ModificationReason.TIME_CONSTRAINT:
        strategies.push(
          this._createScopeReductionStrategy(goal, trigger),
          this._createTimelineExtensionStrategy(goal, trigger),
          this._createCriteriaRelaxationStrategy(goal, trigger)
        );
        break;

      case ModificationReason.RESOURCE_CONSTRAINT:
        strategies.push(
          this._createScopeReductionStrategy(goal, trigger),
          this._createTimelineExtensionStrategy(goal, trigger),
          this._createGoalDeferralStrategy(goal, trigger)
        );
        break;

      case ModificationReason.DEPENDENCY_FAILURE:
        strategies.push(
          this._createGoalDecompositionStrategy(goal, trigger),
          this._createTimelineExtensionStrategy(goal, trigger),
          this._createGoalDeferralStrategy(goal, trigger)
        );
        break;

      case ModificationReason.PRIORITY_SHIFT:
        strategies.push(
          this._createPriorityAdjustmentStrategy(goal, trigger),
          this._createTimelineCompressionStrategy(goal, trigger),
          this._createScopeExpansionStrategy(goal, trigger)
        );
        break;

      case ModificationReason.SCOPE_CREEP:
        strategies.push(
          this._createScopeReductionStrategy(goal, trigger),
          this._createGoalDecompositionStrategy(goal, trigger),
          this._createTimelineExtensionStrategy(goal, trigger)
        );
        break;

      case ModificationReason.PERFORMANCE_ISSUE:
        strategies.push(
          this._createCriteriaRelaxationStrategy(goal, trigger),
          this._createTimelineExtensionStrategy(goal, trigger),
          this._createScopeReductionStrategy(goal, trigger)
        );
        break;

      default:
        strategies.push(
          this._createTimelineExtensionStrategy(goal, trigger),
          this._createScopeReductionStrategy(goal, trigger)
        );
    }

    return strategies.filter(s => s !== null);
  }

  /**
   * 戦略を評価
   * @private
   */
  _evaluateStrategy(strategy, goal, _context) {
    let score = 0.5; // ベーススコア

    // 目標優先度との整合性
    if (goal.priority === 'critical' && strategy.preservesCore) {
      score += 0.2;
    }

    // リソース効率
    if (strategy.resourceEfficiency === 'high') {
      score += 0.15;
    }

    // リスクレベル
    score -= strategy.riskLevel === 'high' ? 0.2 :
             strategy.riskLevel === 'medium' ? 0.1 : 0;

    // 保守的モードの場合
    if (this.config.conservativeMode && strategy.conservative) {
      score += 0.1;
    }

    // 実現可能性
    score += strategy.feasibility * 0.15;

    return Math.max(0, Math.min(1, score));
  }

  // 戦略生成メソッド群
  _createScopeReductionStrategy(goal, _trigger) {
    return {
      type: ModificationType.SCOPE_REDUCTION,
      description: 'Reduce scope to meet constraints',
      reductionTargets: this._identifyReductionTargets(goal),
      preservesCore: true,
      resourceEfficiency: 'high',
      riskLevel: 'medium',
      conservative: true,
      feasibility: 0.8
    };
  }

  _createTimelineExtensionStrategy(goal, trigger) {
    return {
      type: ModificationType.TIMELINE_EXTENSION,
      description: 'Extend timeline to accommodate current progress',
      extensionDays: Math.ceil((trigger.gap || 0.2) * 14),
      preservesCore: true,
      resourceEfficiency: 'medium',
      riskLevel: 'low',
      conservative: true,
      feasibility: 0.9
    };
  }

  _createTimelineCompressionStrategy(goal, trigger) {
    return {
      type: ModificationType.TIMELINE_COMPRESSION,
      description: 'Compress timeline for higher priority',
      compressionDays: Math.ceil((trigger.urgency || 0.3) * 7),
      preservesCore: true,
      resourceEfficiency: 'low',
      riskLevel: 'high',
      conservative: false,
      feasibility: 0.6
    };
  }

  _createCriteriaRelaxationStrategy(_goal, _trigger) {
    return {
      type: ModificationType.SUCCESS_CRITERIA_RELAXATION,
      description: 'Relax success criteria to achievable levels',
      relaxationTargets: ['performance', 'coverage'],
      preservesCore: false,
      resourceEfficiency: 'high',
      riskLevel: 'medium',
      conservative: false,
      feasibility: 0.7
    };
  }

  _createGoalDecompositionStrategy(goal, _trigger) {
    return {
      type: ModificationType.GOAL_DECOMPOSITION,
      description: 'Decompose goal into smaller, manageable sub-goals',
      suggestedSubGoals: this._suggestSubGoals(goal),
      preservesCore: true,
      resourceEfficiency: 'medium',
      riskLevel: 'low',
      conservative: true,
      feasibility: 0.85
    };
  }

  _createGoalDeferralStrategy(goal, trigger) {
    return {
      type: ModificationType.GOAL_DEFERRAL,
      description: 'Defer goal to next iteration',
      deferralReason: trigger.reason,
      preservesCore: true,
      resourceEfficiency: 'high',
      riskLevel: 'medium',
      conservative: true,
      feasibility: 0.9
    };
  }

  _createPriorityAdjustmentStrategy(goal, trigger) {
    return {
      type: ModificationType.PRIORITY_ADJUSTMENT,
      description: 'Adjust goal priority based on new context',
      newPriority: trigger.suggestedPriority || 'high',
      preservesCore: true,
      resourceEfficiency: 'medium',
      riskLevel: 'low',
      conservative: true,
      feasibility: 0.95
    };
  }

  _createScopeExpansionStrategy(goal, trigger) {
    return {
      type: ModificationType.SCOPE_EXPANSION,
      description: 'Expand scope to include additional requirements',
      expansionItems: trigger.additionalRequirements || [],
      preservesCore: true,
      resourceEfficiency: 'low',
      riskLevel: 'medium',
      conservative: false,
      feasibility: 0.7
    };
  }

  /**
   * 削減対象を特定
   * @private
   */
  _identifyReductionTargets(goal) {
    const deliverables = goal.deliverables || [];
    return deliverables
      .filter(d => d.priority !== 'critical')
      .map(d => ({
        id: d.id,
        name: d.name,
        estimatedSavings: d.effort || 1
      }));
  }

  /**
   * サブゴールを提案
   * @private
   */
  _suggestSubGoals(goal) {
    const phases = ['core', 'enhancement', 'polish'];
    return phases.map((phase, index) => ({
      id: `${goal.id}-${phase}`,
      name: `${goal.name} - ${phase.charAt(0).toUpperCase() + phase.slice(1)} Phase`,
      priority: index === 0 ? goal.priority : 'normal',
      estimatedEffort: Math.ceil((goal.estimatedEffort || 10) / 3)
    }));
  }
}

/**
 * 調整履歴マネージャー
 * 目標調整の履歴を管理・分析
 */
class ModificationHistoryManager {
  /**
   * @param {Object} options - 設定オプション
   */
  constructor(options = {}) {
    this.history = new Map();
    this.config = {
      maxHistoryPerGoal: options.maxHistoryPerGoal || 50,
      ...options
    };
  }

  /**
   * 調整を記録
   * @param {string} goalId - 目標ID
   * @param {Object} modification - 調整内容
   * @param {Object} impact - 影響分析結果
   */
  recordModification(goalId, modification, impact) {
    if (!this.history.has(goalId)) {
      this.history.set(goalId, []);
    }

    const history = this.history.get(goalId);
    history.push({
      id: `mod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      modification,
      impact,
      timestamp: new Date().toISOString(),
      status: 'applied'
    });

    // 履歴サイズ制限
    if (history.length > this.config.maxHistoryPerGoal) {
      history.shift();
    }
  }

  /**
   * 目標の調整履歴を取得
   * @param {string} goalId - 目標ID
   * @returns {Array} 調整履歴
   */
  getHistory(goalId) {
    return this.history.get(goalId) || [];
  }

  /**
   * 調整パターンを分析
   * @param {string} goalId - 目標ID
   * @returns {Object} パターン分析結果
   */
  analyzePatterns(goalId) {
    const history = this.getHistory(goalId);
    if (history.length === 0) {
      return { patterns: [], insights: [] };
    }

    const typeCounts = {};
    const reasonCounts = {};
    let totalImpact = 0;

    for (const entry of history) {
      const type = entry.modification.type;
      const reason = entry.modification.reason;

      typeCounts[type] = (typeCounts[type] || 0) + 1;
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      totalImpact += entry.impact?.totalScore || 0;
    }

    const dominantType = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])[0];
    const dominantReason = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])[0];

    const insights = [];
    
    if (history.length > 5) {
      insights.push({
        type: 'volatility',
        message: 'Goal has been modified frequently - consider stabilization',
        severity: 'warning'
      });
    }

    if (dominantType && dominantType[1] > history.length * 0.5) {
      insights.push({
        type: 'pattern',
        message: `Recurring ${dominantType[0]} modifications detected`,
        suggestion: `Address root cause of ${dominantReason?.[0] || 'unknown'}`
      });
    }

    return {
      totalModifications: history.length,
      averageImpact: totalImpact / history.length,
      typeDistribution: typeCounts,
      reasonDistribution: reasonCounts,
      dominantType: dominantType?.[0],
      dominantReason: dominantReason?.[0],
      insights
    };
  }

  /**
   * 調整をロールバック
   * @param {string} goalId - 目標ID
   * @param {string} modificationId - 調整ID
   * @returns {Object|null} ロールバックされた調整
   */
  rollback(goalId, modificationId) {
    const history = this.history.get(goalId);
    if (!history) return null;

    const index = history.findIndex(h => h.id === modificationId);
    if (index === -1) return null;

    const entry = history[index];
    entry.status = 'rolled_back';
    entry.rolledBackAt = new Date().toISOString();

    return entry;
  }
}

/**
 * AdaptiveGoalModifier
 * 状況に応じた目標の動的調整を行うメインクラス
 */
class AdaptiveGoalModifier {
  /**
   * @param {Object} options - 設定オプション
   */
  constructor(options = {}) {
    this.impactAnalyzer = new ImpactAnalyzer(options.impact);
    this.strategy = new ModificationStrategy(options.strategy);
    this.historyManager = new ModificationHistoryManager(options.history);
    
    this.config = {
      requireApproval: options.requireApproval ?? true,
      autoModifyThreshold: options.autoModifyThreshold || 0.3,
      notifyOnModification: options.notifyOnModification ?? true,
      ...options
    };

    this.goals = new Map();
    this.pendingModifications = new Map();
    this.eventHandlers = new Map();
  }

  /**
   * 目標を登録
   * @param {Object} goal - 目標定義
   * @returns {Object} 登録された目標
   */
  registerGoal(goal) {
    const normalizedGoal = {
      id: goal.id || `goal-${Date.now()}`,
      name: goal.name,
      description: goal.description,
      priority: goal.priority || 'normal',
      targetDate: goal.targetDate,
      successCriteria: goal.successCriteria || [],
      deliverables: goal.deliverables || [],
      dependencies: goal.dependencies || [],
      resources: goal.resources || [],
      estimatedEffort: goal.estimatedEffort,
      status: 'active',
      createdAt: new Date().toISOString(),
      modificationCount: 0
    };

    this.goals.set(normalizedGoal.id, normalizedGoal);
    return normalizedGoal;
  }

  /**
   * 目標調整をトリガー
   * @param {string} goalId - 目標ID
   * @param {Object} trigger - トリガー情報
   * @returns {Promise<Object>} 調整結果
   */
  async triggerModification(goalId, trigger) {
    const goal = this.goals.get(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    // コンテキスト構築
    const context = this._buildContext(goalId);

    // 戦略決定
    const strategyResult = this.strategy.determineStrategy(goal, trigger, context);

    // 影響分析
    const impact = this.impactAnalyzer.analyzeImpact(
      goal,
      { type: strategyResult.recommended.type, ...strategyResult.recommended },
      context
    );

    const modification = {
      id: `mod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      goalId,
      trigger,
      strategy: strategyResult.recommended,
      alternatives: strategyResult.alternatives,
      impact,
      confidence: strategyResult.confidence,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // 自動承認チェック
    if (!this.config.requireApproval || 
        (strategyResult.autoApprovable && impact.totalScore < this.config.autoModifyThreshold)) {
      return this._applyModification(modification);
    }

    // 承認待ち
    this.pendingModifications.set(modification.id, modification);
    this._emit('modification_pending', modification);

    return {
      status: 'pending_approval',
      modification,
      message: 'Modification requires approval before application'
    };
  }

  /**
   * 調整を承認
   * @param {string} modificationId - 調整ID
   * @returns {Object} 適用結果
   */
  approveModification(modificationId) {
    const modification = this.pendingModifications.get(modificationId);
    if (!modification) {
      throw new Error(`Modification not found: ${modificationId}`);
    }

    this.pendingModifications.delete(modificationId);
    return this._applyModification(modification);
  }

  /**
   * 調整を拒否
   * @param {string} modificationId - 調整ID
   * @param {string} reason - 拒否理由
   * @returns {Object} 拒否結果
   */
  rejectModification(modificationId, reason) {
    const modification = this.pendingModifications.get(modificationId);
    if (!modification) {
      throw new Error(`Modification not found: ${modificationId}`);
    }

    modification.status = 'rejected';
    modification.rejectedAt = new Date().toISOString();
    modification.rejectionReason = reason;

    this.pendingModifications.delete(modificationId);
    this._emit('modification_rejected', modification);

    return {
      status: 'rejected',
      modification,
      message: `Modification rejected: ${reason}`
    };
  }

  /**
   * 調整を適用
   * @private
   */
  _applyModification(modification) {
    const goal = this.goals.get(modification.goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${modification.goalId}`);
    }

    const strategy = modification.strategy;
    const previousState = { ...goal };

    // タイプに応じた調整適用
    switch (strategy.type) {
      case ModificationType.PRIORITY_ADJUSTMENT:
        goal.priority = strategy.newPriority;
        break;

      case ModificationType.SCOPE_REDUCTION:
        goal.deliverables = goal.deliverables.filter(d =>
          !strategy.reductionTargets?.some(t => t.id === d.id)
        );
        break;

      case ModificationType.SCOPE_EXPANSION:
        goal.deliverables = [
          ...goal.deliverables,
          ...(strategy.expansionItems || [])
        ];
        break;

      case ModificationType.TIMELINE_EXTENSION:
        if (goal.targetDate) {
          const date = new Date(goal.targetDate);
          date.setDate(date.getDate() + (strategy.extensionDays || 7));
          goal.targetDate = date.toISOString();
        }
        break;

      case ModificationType.TIMELINE_COMPRESSION:
        if (goal.targetDate) {
          const date = new Date(goal.targetDate);
          date.setDate(date.getDate() - (strategy.compressionDays || 3));
          goal.targetDate = date.toISOString();
        }
        break;

      case ModificationType.SUCCESS_CRITERIA_RELAXATION:
        goal.successCriteria = goal.successCriteria.map(c => ({
          ...c,
          threshold: c.threshold ? c.threshold * 0.8 : c.threshold
        }));
        break;

      case ModificationType.SUCCESS_CRITERIA_TIGHTENING:
        goal.successCriteria = goal.successCriteria.map(c => ({
          ...c,
          threshold: c.threshold ? c.threshold * 1.2 : c.threshold
        }));
        break;

      case ModificationType.GOAL_DECOMPOSITION:
        // サブゴール作成
        for (const subGoal of strategy.suggestedSubGoals || []) {
          this.registerGoal({
            ...subGoal,
            parentGoalId: goal.id
          });
        }
        goal.status = 'decomposed';
        break;

      case ModificationType.GOAL_DEFERRAL:
        goal.status = 'deferred';
        goal.deferredAt = new Date().toISOString();
        goal.deferralReason = strategy.deferralReason;
        break;

      case ModificationType.GOAL_CANCELLATION:
        goal.status = 'cancelled';
        goal.cancelledAt = new Date().toISOString();
        break;
    }

    // メタデータ更新
    goal.modificationCount++;
    goal.lastModifiedAt = new Date().toISOString();

    // 履歴記録
    this.historyManager.recordModification(
      modification.goalId,
      { ...modification, previousState },
      modification.impact
    );

    modification.status = 'applied';
    modification.appliedAt = new Date().toISOString();

    this._emit('modification_applied', {
      modification,
      goal,
      previousState
    });

    return {
      status: 'applied',
      modification,
      goal,
      previousState,
      message: `Successfully applied ${strategy.type} to goal ${goal.id}`
    };
  }

  /**
   * コンテキストを構築
   * @private
   */
  _buildContext(goalId) {
    return {
      goals: Array.from(this.goals.values()),
      currentGoal: this.goals.get(goalId),
      history: this.historyManager.getHistory(goalId),
      patterns: this.historyManager.analyzePatterns(goalId)
    };
  }

  /**
   * 目標を取得
   * @param {string} goalId - 目標ID
   * @returns {Object|undefined} 目標
   */
  getGoal(goalId) {
    return this.goals.get(goalId);
  }

  /**
   * 全目標を取得
   * @returns {Array} 全目標リスト
   */
  getAllGoals() {
    return Array.from(this.goals.values());
  }

  /**
   * 目標の調整履歴を取得
   * @param {string} goalId - 目標ID
   * @returns {Object} 履歴と分析
   */
  getGoalHistory(goalId) {
    return {
      history: this.historyManager.getHistory(goalId),
      patterns: this.historyManager.analyzePatterns(goalId)
    };
  }

  /**
   * 保留中の調整を取得
   * @returns {Array} 保留中の調整リスト
   */
  getPendingModifications() {
    return Array.from(this.pendingModifications.values());
  }

  /**
   * イベントハンドラーを登録
   * @param {string} event - イベント名
   * @param {Function} handler - ハンドラー関数
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * イベントを発火
   * @private
   */
  _emit(event, data) {
    const handlers = this.eventHandlers.get(event) || [];
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    }
  }

  /**
   * 調整提案を生成
   * @param {string} goalId - 目標ID
   * @param {Object} currentState - 現在の状態
   * @returns {Object} 調整提案
   */
  generateSuggestions(goalId, currentState) {
    const goal = this.goals.get(goalId);
    if (!goal) {
      return { suggestions: [] };
    }

    const suggestions = [];
    const patterns = this.historyManager.analyzePatterns(goalId);

    // 進捗ベースの提案
    if (currentState.progress < 0.3 && currentState.timeElapsed > 0.5) {
      suggestions.push({
        trigger: { reason: ModificationReason.TIME_CONSTRAINT, gap: 0.2 },
        urgency: 'high',
        description: 'Progress behind schedule - consider scope reduction or timeline extension'
      });
    }

    // リソースベースの提案
    if (currentState.resourceUtilization > 0.9) {
      suggestions.push({
        trigger: { reason: ModificationReason.RESOURCE_CONSTRAINT },
        urgency: 'medium',
        description: 'High resource utilization - consider prioritization'
      });
    }

    // パターンベースの提案
    if (patterns.insights?.some(i => i.type === 'volatility')) {
      suggestions.push({
        trigger: { reason: ModificationReason.SCOPE_CREEP },
        urgency: 'medium',
        description: 'Goal volatility detected - consider stabilization or decomposition'
      });
    }

    return {
      goalId,
      suggestions,
      patterns,
      generatedAt: new Date().toISOString()
    };
  }
}

module.exports = {
  AdaptiveGoalModifier,
  ImpactAnalyzer,
  ModificationStrategy,
  ModificationHistoryManager,
  ModificationReason,
  ModificationType
};
