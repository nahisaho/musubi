/**
 * MUSUBI Memory Condenser
 * 
 * 長いセッション履歴を圧縮してコンテキストウィンドウ内に収める
 * 
 * @module src/managers/memory-condenser
 * @see REQ-P0-B004
 * @inspired-by OpenHands openhands/memory/condenser/condenser.py
 */

/**
 * コンデンサータイプ
 */
const CondenserType = {
  LLM: 'llm',           // LLMで要約
  RECENT: 'recent',     // 最新N件を保持
  AMORTIZED: 'amortized', // 分割統治方式
  NOOP: 'noop',         // 圧縮なし
};

/**
 * イベントタイプ
 */
const MemoryEventType = {
  USER_MESSAGE: 'user_message',
  ASSISTANT_MESSAGE: 'assistant_message',
  ACTION: 'action',
  OBSERVATION: 'observation',
  SUMMARY: 'summary',
  SYSTEM: 'system',
};

/**
 * メモリイベント
 */
class MemoryEvent {
  /**
   * @param {Object} options
   * @param {string} options.type - イベントタイプ
   * @param {string} options.content - 内容
   * @param {Object} options.metadata - メタデータ
   */
  constructor(options = {}) {
    this.id = options.id || `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.type = options.type || MemoryEventType.ACTION;
    this.content = options.content || '';
    this.metadata = options.metadata || {};
    this.timestamp = options.timestamp || new Date();
    this.tokens = options.tokens || this._estimateTokens();
  }

  /**
   * トークン数を推定（簡易版）
   * @returns {number}
   */
  _estimateTokens() {
    // 簡易推定: 4文字 ≈ 1トークン
    return Math.ceil(this.content.length / 4);
  }

  /**
   * 要約イベントを作成
   * @param {string} summary 
   * @param {MemoryEvent[]} originalEvents 
   * @returns {MemoryEvent}
   */
  static createSummary(summary, originalEvents) {
    return new MemoryEvent({
      type: MemoryEventType.SUMMARY,
      content: summary,
      metadata: {
        summarizedCount: originalEvents.length,
        originalIds: originalEvents.map(e => e.id),
        summarizedAt: new Date(),
      },
    });
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      content: this.content,
      metadata: this.metadata,
      timestamp: this.timestamp.toISOString(),
      tokens: this.tokens,
    };
  }
}

/**
 * 圧縮結果
 */
class CondensedView {
  /**
   * @param {MemoryEvent[]} events - 圧縮後のイベント
   * @param {Object} stats - 統計情報
   */
  constructor(events, stats = {}) {
    this.events = events;
    this.stats = {
      originalCount: stats.originalCount || 0,
      condensedCount: events.length,
      summaryCount: events.filter(e => e.type === MemoryEventType.SUMMARY).length,
      compressionRatio: stats.originalCount 
        ? (1 - events.length / stats.originalCount) 
        : 0,
      totalTokens: events.reduce((sum, e) => sum + e.tokens, 0),
    };
  }

  /**
   * プロンプト用にフォーマット
   * @returns {string}
   */
  toPrompt() {
    return this.events.map(e => {
      if (e.type === MemoryEventType.SUMMARY) {
        return `[Previous conversation summary]\n${e.content}`;
      }
      return e.content;
    }).join('\n\n');
  }
}

/**
 * 基底コンデンサー
 */
class BaseCondenser {
  /**
   * @param {Object} options
   */
  constructor(options = {}) {
    this.preservePatterns = options.preservePatterns || [
      'DECISION:',
      'ARCHITECTURE:',
      'REQ-',
      '## Important',
      'BREAKING CHANGE',
    ];
  }

  /**
   * イベントを圧縮
   * @param {MemoryEvent[]} events 
   * @returns {Promise<CondensedView>}
   */
  async condense(_events) {
    throw new Error('Must implement condense()');
  }

  /**
   * 保持すべきイベントかチェック
   * @param {MemoryEvent} event 
   * @returns {boolean}
   */
  shouldPreserve(event) {
    // 要約イベントは常に保持
    if (event.type === MemoryEventType.SUMMARY) {
      return true;
    }

    // パターンマッチング
    return this.preservePatterns.some(pattern => 
      event.content.includes(pattern)
    );
  }
}

/**
 * Noopコンデンサー（圧縮なし）
 */
class NoopCondenser extends BaseCondenser {
  async condense(events) {
    return new CondensedView(events, {
      originalCount: events.length,
    });
  }
}

/**
 * 最新N件コンデンサー
 */
class RecentEventsCondenser extends BaseCondenser {
  /**
   * @param {Object} options
   * @param {number} options.keepFirst - 最初のN件を保持
   * @param {number} options.keepRecent - 最新のN件を保持
   */
  constructor(options = {}) {
    super(options);
    this.keepFirst = options.keepFirst || 2;
    this.keepRecent = options.keepRecent || 10;
  }

  async condense(events) {
    if (events.length <= this.keepFirst + this.keepRecent) {
      return new CondensedView(events, {
        originalCount: events.length,
      });
    }

    const firstEvents = events.slice(0, this.keepFirst);
    const recentEvents = events.slice(-this.keepRecent);
    
    // 中間イベントから保持すべきものを抽出
    const middleEvents = events.slice(this.keepFirst, -this.keepRecent);
    const preservedMiddle = middleEvents.filter(e => this.shouldPreserve(e));

    // 省略された数を示すサマリー
    const omittedCount = middleEvents.length - preservedMiddle.length;
    const summaryEvent = MemoryEvent.createSummary(
      `[${omittedCount} messages omitted for brevity]`,
      middleEvents.filter(e => !this.shouldPreserve(e))
    );

    const condensedEvents = [
      ...firstEvents,
      summaryEvent,
      ...preservedMiddle,
      ...recentEvents,
    ];

    return new CondensedView(condensedEvents, {
      originalCount: events.length,
    });
  }
}

/**
 * LLMコンデンサー
 */
class LLMCondenser extends BaseCondenser {
  /**
   * @param {Object} options
   * @param {number} options.maxTokens - 最大トークン数
   * @param {number} options.keepFirst - 最初のN件を保持
   * @param {Function} options.summarizer - 要約関数 (events) => Promise<string>
   */
  constructor(options = {}) {
    super(options);
    this.maxTokens = options.maxTokens || 4000;
    this.keepFirst = options.keepFirst || 2;
    this.chunkSize = options.chunkSize || 10;
    this.summarizer = options.summarizer || this._defaultSummarizer.bind(this);
  }

  async condense(events) {
    const totalTokens = events.reduce((sum, e) => sum + e.tokens, 0);
    
    if (totalTokens <= this.maxTokens) {
      return new CondensedView(events, {
        originalCount: events.length,
      });
    }

    // 最初のイベントは保持
    const preserved = events.slice(0, this.keepFirst);
    let remaining = events.slice(this.keepFirst);
    
    // 重要なイベントを抽出
    const importantEvents = remaining.filter(e => this.shouldPreserve(e));
    const regularEvents = remaining.filter(e => !this.shouldPreserve(e));

    // 通常イベントをチャンク化して要約
    const chunks = this._chunkEvents(regularEvents);
    const summaries = [];

    for (const chunk of chunks) {
      if (chunk.length === 0) continue;
      
      const summaryText = await this.summarizer(chunk);
      summaries.push(MemoryEvent.createSummary(summaryText, chunk));
    }

    const condensedEvents = [
      ...preserved,
      ...summaries,
      ...importantEvents,
    ];

    return new CondensedView(condensedEvents, {
      originalCount: events.length,
    });
  }

  /**
   * イベントをチャンク化
   * @param {MemoryEvent[]} events 
   * @returns {MemoryEvent[][]}
   */
  _chunkEvents(events) {
    const chunks = [];
    for (let i = 0; i < events.length; i += this.chunkSize) {
      chunks.push(events.slice(i, i + this.chunkSize));
    }
    return chunks;
  }

  /**
   * デフォルト要約関数（LLM未使用、簡易版）
   * @param {MemoryEvent[]} events 
   * @returns {Promise<string>}
   */
  async _defaultSummarizer(events) {
    const types = {};
    events.forEach(e => {
      types[e.type] = (types[e.type] || 0) + 1;
    });

    const typesSummary = Object.entries(types)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');

    return `[Summary of ${events.length} events: ${typesSummary}]`;
  }
}

/**
 * 分割統治コンデンサー（Amortized）
 */
class AmortizedCondenser extends BaseCondenser {
  /**
   * @param {Object} options
   * @param {number} options.maxSize - 最大イベント数
   * @param {number} options.targetSize - 目標イベント数
   * @param {Function} options.summarizer - 要約関数
   */
  constructor(options = {}) {
    super(options);
    this.maxSize = options.maxSize || 100;
    this.targetSize = options.targetSize || 50;
    this.summarizer = options.summarizer || this._defaultSummarizer.bind(this);
  }

  async condense(events) {
    if (events.length <= this.maxSize) {
      return new CondensedView(events, {
        originalCount: events.length,
      });
    }

    // ユーザーメッセージの位置を特定（境界として使用）
    const userMessageIndices = events
      .map((e, i) => e.type === MemoryEventType.USER_MESSAGE ? i : -1)
      .filter(i => i !== -1);

    // 最初と最新のユーザーメッセージ周辺は保持
    const preserveStart = userMessageIndices[0] !== undefined ? userMessageIndices[0] : 0;
    const preserveEnd = userMessageIndices.length > 1 
      ? userMessageIndices[userMessageIndices.length - 1] 
      : events.length;

    // 圧縮対象を特定
    const toCondense = events.slice(preserveStart + 1, preserveEnd);
    const condensedCount = events.length - this.targetSize;
    
    if (condensedCount <= 0 || toCondense.length === 0) {
      return new CondensedView(events, {
        originalCount: events.length,
      });
    }

    // 要約を作成
    const summaryText = await this.summarizer(toCondense.slice(0, condensedCount));
    const summaryEvent = MemoryEvent.createSummary(
      summaryText, 
      toCondense.slice(0, condensedCount)
    );

    const condensedEvents = [
      ...events.slice(0, preserveStart + 1),
      summaryEvent,
      ...toCondense.slice(condensedCount),
      ...events.slice(preserveEnd),
    ];

    return new CondensedView(condensedEvents, {
      originalCount: events.length,
    });
  }

  async _defaultSummarizer(events) {
    return `[Condensed ${events.length} previous interactions]`;
  }
}

/**
 * メモリコンデンサーファクトリー
 */
class MemoryCondenser {
  /**
   * コンデンサーを作成
   * @param {Object} options
   * @param {string} options.type - コンデンサータイプ
   * @returns {BaseCondenser}
   */
  static create(options = {}) {
    const type = options.type || CondenserType.RECENT;

    switch (type) {
      case CondenserType.NOOP:
        return new NoopCondenser(options);
      case CondenserType.RECENT:
        return new RecentEventsCondenser(options);
      case CondenserType.LLM:
        return new LLMCondenser(options);
      case CondenserType.AMORTIZED:
        return new AmortizedCondenser(options);
      default:
        throw new Error(`Unknown condenser type: ${type}`);
    }
  }

  /**
   * 設定ファイルからコンデンサーを作成
   * @param {Object} config - project.yml の condenser セクション
   * @returns {BaseCondenser}
   */
  static fromConfig(config = {}) {
    return this.create({
      type: config.type || CondenserType.RECENT,
      maxTokens: config.max_tokens,
      maxSize: config.max_size,
      keepFirst: config.keep_first,
      keepRecent: config.keep_recent,
      targetSize: config.target_size,
      preservePatterns: config.preserve_patterns,
    });
  }
}

module.exports = {
  MemoryCondenser,
  MemoryEvent,
  CondensedView,
  CondenserType,
  MemoryEventType,
  BaseCondenser,
  NoopCondenser,
  RecentEventsCondenser,
  LLMCondenser,
  AmortizedCondenser,
};
