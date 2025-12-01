/**
 * SterlingEvaluator - An IEvaluator implementation for SpyTial that:
 * 1. Uses Sterling's server-based evaluation via WebSocket when available (PREFERRED)
 * 2. Falls back to CndCore.ForgeEvaluator when server is not available
 * 
 * Since SpyTial's IEvaluator interface is synchronous but server evaluation is async,
 * we cannot directly use server evaluation in the sync interface. Instead:
 * - The sync `evaluate()` always uses ForgeEvaluator
 * - An async `evaluateAsync()` method is provided that prefers server when available
 * - Consumers can use `prefetchEvaluations()` or wrap usage in async context
 */

// Type definitions matching SpyTial's IEvaluator interface
export type SingleValue = string | number | boolean;
export type Tuple = SingleValue[];

export interface ErrorResult {
  error: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
}

export type EvaluatorResult = SingleValue | Tuple[] | ErrorResult;

export interface EvaluatorConfig {
  debug?: boolean;
  timeout?: number;
  maxResults?: number;
  instanceIndex?: number;
}

export interface EvaluationContext {
  sourceData: string | Record<string, unknown> | any;
  processedData?: Record<string, unknown>;
  sourceCode?: string;
  metadata?: Record<string, unknown>;
}

export interface IEvaluatorResult {
  prettyPrint(): string;
  noResult(): boolean;
  singleResult(): SingleValue;
  selectedAtoms(): string[];
  selectedTwoples(): string[][];
  selectedTuplesAll(): string[][];
  isError(): boolean;
  isSingleton(): boolean;
  getExpression(): string;
  getRawResult(): EvaluatorResult;
}

export interface IEvaluator {
  initialize(_context: EvaluationContext): void;
  isReady(): boolean;
  evaluate(_expression: string, _config?: EvaluatorConfig): IEvaluatorResult;
}

/**
 * Simple wrapper for evaluation results
 */
class EvaluatorResultWrapper implements IEvaluatorResult {
  private result: EvaluatorResult;
  private expression: string;

  constructor(result: EvaluatorResult, expression: string) {
    this.result = result;
    this.expression = expression;
  }

  prettyPrint(): string {
    if (this.isError()) {
      const err = this.result as ErrorResult;
      return `Error: ${err.error.message}`;
    }
    if (Array.isArray(this.result)) {
      if (this.result.length === 0) return '(empty)';
      return this.result.map(tuple => 
        Array.isArray(tuple) ? tuple.join(' -> ') : String(tuple)
      ).join('\n');
    }
    return String(this.result);
  }

  noResult(): boolean {
    if (this.isError()) return true;
    if (Array.isArray(this.result)) return this.result.length === 0;
    return this.result === undefined || this.result === null;
  }

  singleResult(): SingleValue {
    if (this.isError()) {
      throw new Error((this.result as ErrorResult).error.message);
    }
    if (Array.isArray(this.result)) {
      if (this.result.length !== 1) {
        throw new Error('Result is not a singleton');
      }
      const first = this.result[0];
      if (Array.isArray(first) && first.length === 1) {
        return first[0];
      }
      if (Array.isArray(first)) {
        throw new Error('Result tuple has multiple elements');
      }
      return first as SingleValue;
    }
    return this.result as SingleValue;
  }

  selectedAtoms(): string[] {
    if (this.isError() || !Array.isArray(this.result)) return [];
    return this.result
      .filter(tuple => Array.isArray(tuple) && tuple.length === 1)
      .map(tuple => String((tuple as Tuple)[0]));
  }

  selectedTwoples(): string[][] {
    if (this.isError() || !Array.isArray(this.result)) return [];
    return this.result
      .filter(tuple => Array.isArray(tuple) && tuple.length >= 2)
      .map(tuple => {
        const t = tuple as Tuple;
        return [String(t[0]), String(t[t.length - 1])];
      });
  }

  selectedTuplesAll(): string[][] {
    if (this.isError() || !Array.isArray(this.result)) return [];
    return this.result.map(tuple => {
      if (Array.isArray(tuple)) {
        return tuple.map(v => String(v));
      }
      return [String(tuple)];
    });
  }

  isError(): boolean {
    return this.result !== null && 
           typeof this.result === 'object' && 
           !Array.isArray(this.result) &&
           'error' in this.result;
  }

  isSingleton(): boolean {
    if (this.isError()) return false;
    if (Array.isArray(this.result)) {
      return this.result.length === 1;
    }
    return true;
  }

  getExpression(): string {
    return this.expression;
  }

  getRawResult(): EvaluatorResult {
    return this.result;
  }
}

/**
 * Callback type for server-based evaluation
 * Returns a Promise that resolves with the result string
 */
export type ServerEvalCallback = (expression: string) => Promise<string>;

/**
 * SterlingEvaluator - Hybrid evaluator that PREFERS server when available,
 * falls back to CndCore.ForgeEvaluator otherwise.
 * 
 * NOTE: Since IEvaluator.evaluate() is synchronous but server eval is async,
 * we use ForgeEvaluator for the sync interface. The server callback is available
 * for async usage patterns.
 */
export class SterlingEvaluator implements IEvaluator {
  private context: EvaluationContext | null = null;
  private forgeEvaluator: any = null;
  private serverEvalCallback: ServerEvalCallback | null = null;
  private isInitialized: boolean = false;

  /**
   * Set the server evaluation callback
   * This should be called when Sterling is connected and evaluator is enabled
   */
  setServerCallback(callback: ServerEvalCallback | null) {
    this.serverEvalCallback = callback;
  }

  /**
   * Check if server-based evaluation is available
   */
  hasServerEvaluation(): boolean {
    return this.serverEvalCallback !== null;
  }

  initialize(context: EvaluationContext): void {
    this.context = context;
    this.isInitialized = false;

    // Initialize ForgeEvaluator as the sync evaluator (and fallback for async)
    if (typeof window !== 'undefined' && window.CndCore?.ForgeEvaluator) {
      try {
        this.forgeEvaluator = new window.CndCore.ForgeEvaluator();
        this.forgeEvaluator.initialize(context);
        this.isInitialized = true;
        console.log('SterlingEvaluator: Initialized with ForgeEvaluator');
      } catch (err) {
        console.error('SterlingEvaluator: Failed to initialize ForgeEvaluator:', err);
      }
    } else {
      console.warn('SterlingEvaluator: CndCore.ForgeEvaluator not available');
    }

    if (this.serverEvalCallback) {
      console.log('SterlingEvaluator: Server evaluation available for async usage');
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.forgeEvaluator !== null;
  }

  /**
   * Synchronous evaluate - Uses ForgeEvaluator (server eval is async, can't be used here)
   */
  evaluate(expression: string, _config?: EvaluatorConfig): IEvaluatorResult {
    if (!this.isReady() || !this.forgeEvaluator) {
      return new EvaluatorResultWrapper(
        { error: { message: 'Evaluator not initialized' } },
        expression
      );
    }

    try {
      const result = this.forgeEvaluator.evaluate(expression, _config);
      // If ForgeEvaluator returns an IEvaluatorResult, return it directly
      if (result && typeof result.prettyPrint === 'function') {
        return result;
      }
      // Otherwise wrap the result
      return new EvaluatorResultWrapper(result, expression);
    } catch (err: any) {
      return new EvaluatorResultWrapper(
        { error: { message: err.message || 'Evaluation failed' } },
        expression
      );
    }
  }

  /**
   * Async evaluate - PREFERS server when available, falls back to ForgeEvaluator
   */
  async evaluateAsync(expression: string, _config?: EvaluatorConfig): Promise<IEvaluatorResult> {
    // PREFER server-based evaluation if available
    if (this.serverEvalCallback) {
      try {
        console.log('SterlingEvaluator: Using server evaluation for:', expression);
        const result = await this.serverEvalCallback(expression);
        return new EvaluatorResultWrapper(this.parseServerResult(result), expression);
      } catch (err: any) {
        console.warn('SterlingEvaluator: Server evaluation failed, falling back to ForgeEvaluator:', err);
        // Fall through to ForgeEvaluator
      }
    }

    // Fall back to ForgeEvaluator (sync)
    return this.evaluate(expression, _config);
  }

  /**
   * Parse server result string into EvaluatorResult
   */
  private parseServerResult(result: string): EvaluatorResult {
    const trimmed = result.trim();
    
    // Check for empty result
    if (trimmed === '' || trimmed === '{}' || trimmed === '(empty)') {
      return [];
    }

    // Check for boolean
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;

    // Check for number
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== '') {
      return num;
    }

    // Try to parse as tuples (format: "A->B, C->D" or "A\nB\nC")
    if (trimmed.includes('->') || trimmed.includes('\n')) {
      const lines = trimmed.includes('\n') 
        ? trimmed.split('\n') 
        : trimmed.split(',').map(s => s.trim());
      
      const tuples: Tuple[] = [];
      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.includes('->')) {
          tuples.push(line.split('->').map(s => s.trim()));
        } else {
          tuples.push([line.trim()]);
        }
      }
      return tuples;
    }

    // Return as single string value
    return trimmed;
  }
}

/**
 * Create a SterlingEvaluator instance configured for a specific datum
 */
export function createSterlingEvaluator(
  alloyXml: string,
  serverCallback?: ServerEvalCallback | null,
  _datumId?: string | null
): SterlingEvaluator {
  const evaluator = new SterlingEvaluator();
  
  if (serverCallback) {
    evaluator.setServerCallback(serverCallback);
  }
  
  evaluator.initialize({ sourceData: alloyXml });
  
  return evaluator;
}
