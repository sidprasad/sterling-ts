/**
 * CND Pre-Parser
 *
 * Parses a raw CND YAML string and extracts top-level `projections` and
 * `sequence` blocks before passing the remaining `constraints` / `directives`
 * to spytial-core's `parseLayoutSpec`.
 *
 * This keeps spytial-core's parser untouched while letting Sterling-TS
 * support richer `.cnd` files.
 *
 * Example CND spec:
 * ```yaml
 * projections:
 *   - sig: State
 *     orderBy: next
 *   - sig: Time
 *
 * sequence:
 *   policy: stability
 *
 * constraints:
 *   - orientation:
 *       selector: "friend"
 *       directions: [right]
 *
 * directives:
 *   - flag: hideDisconnectedBuiltIns
 * ```
 */

import * as yaml from 'js-yaml';

// ─── Types ───────────────────────────────────────────────────────────

/**
 * A projection directive declaring which type/sig to project over.
 * Mirrors spytial-core's Projection interface from projection-transform.ts.
 */
export interface CndProjection {
  /** The type/sig name to project over (e.g. "State", "Time") */
  type: string;
  /**
   * Optional relation/selector used to order atoms of this type.
   * For example, `next` for a linear trace ordering.
   */
  orderBy?: string;
}

/** Valid sequence policy names supported by spytial-core. */
export type SequencePolicyName =
  | 'ignore_history'
  | 'stability'
  | 'change_emphasis'
  | 'random_positioning';

const VALID_SEQUENCE_POLICIES: ReadonlySet<string> = new Set<SequencePolicyName>([
  'ignore_history',
  'stability',
  'change_emphasis',
  'random_positioning',
]);

/**
 * Sequence configuration parsed from the CND spec.
 */
export interface CndSequenceConfig {
  /** The sequence policy to apply when navigating between instances. */
  policy: SequencePolicyName;
}

/**
 * Result of pre-parsing a CND spec.
 */
export interface ParsedCndFile {
  /** Projection directives extracted from the top-level `projections` block. */
  projections: CndProjection[];
  /** Sequence configuration extracted from the top-level `sequence` block. */
  sequence: CndSequenceConfig;
  /**
   * The YAML string containing only `constraints` and `directives`,
   * suitable for passing to spytial-core's `parseLayoutSpec`.
   */
  layoutYaml: string;
}

// ─── Default values ──────────────────────────────────────────────────

const DEFAULT_SEQUENCE_CONFIG: CndSequenceConfig = {
  policy: 'ignore_history',
};

// ─── Parser ──────────────────────────────────────────────────────────

/**
 * Pre-parse a CND YAML string, extracting top-level `projections` and
 * `sequence` blocks, and re-serializing the remaining `constraints` /
 * `directives` for spytial-core's layout parser.
 *
 * If the input is empty or contains no YAML, sensible defaults are returned
 * and `layoutYaml` will be the empty string.
 *
 * @param cndSpec - Raw CND YAML spec string
 * @returns A {@link ParsedCndFile} with projections, sequence config, and layout YAML
 */
export function parseCndFile(cndSpec: string): ParsedCndFile {
  if (!cndSpec || !cndSpec.trim()) {
    return {
      projections: [],
      sequence: { ...DEFAULT_SEQUENCE_CONFIG },
      layoutYaml: '',
    };
  }

  let parsed: Record<string, unknown>;
  try {
    const raw = yaml.load(cndSpec);
    if (!raw || typeof raw !== 'object') {
      // The spec is a scalar or otherwise non-object YAML — treat as
      // layout-only (the layout parser may still understand it).
      return {
        projections: [],
        sequence: { ...DEFAULT_SEQUENCE_CONFIG },
        layoutYaml: cndSpec,
      };
    }
    parsed = raw as Record<string, unknown>;
  } catch {
    // If YAML parsing fails, pass the raw string through to the layout
    // parser so it can surface its own error messages.
    return {
      projections: [],
      sequence: { ...DEFAULT_SEQUENCE_CONFIG },
      layoutYaml: cndSpec,
    };
  }

  // ── Extract projections ──────────────────────────────────────────

  const projections: CndProjection[] = [];

  if (Array.isArray(parsed.projections)) {
    for (const entry of parsed.projections) {
      if (entry && typeof entry === 'object') {
        // Accept both 'type' and 'sig' keys in YAML, preferring 'type'
        const typeName = (entry as any).type || (entry as any).sig;
        if (typeof typeName === 'string') {
          const proj: CndProjection = { type: typeName };
          if (typeof (entry as any).orderBy === 'string') {
            proj.orderBy = (entry as any).orderBy;
          }
          projections.push(proj);
        }
      }
    }
  }

  // ── Extract sequence config ──────────────────────────────────────

  let sequence: CndSequenceConfig = { ...DEFAULT_SEQUENCE_CONFIG };

  if (parsed.sequence && typeof parsed.sequence === 'object') {
    const seqBlock = parsed.sequence as Record<string, unknown>;
    if (typeof seqBlock.policy === 'string') {
      const policyName = seqBlock.policy.toLowerCase();
      if (VALID_SEQUENCE_POLICIES.has(policyName)) {
        sequence = { policy: policyName as SequencePolicyName };
      } else {
        console.warn(
          `[CND Pre-Parser] Unknown sequence policy "${seqBlock.policy}". ` +
          `Valid values: ${[...VALID_SEQUENCE_POLICIES].join(', ')}. ` +
          `Falling back to "ignore_history".`
        );
      }
    }
  }

  // ── Rebuild layout YAML ──────────────────────────────────────────
  // Pass through only the keys that spytial-core's parseLayoutSpec
  // understands: `constraints` and `directives`.

  const layoutObj: Record<string, unknown> = {};
  if (parsed.constraints !== undefined) {
    layoutObj.constraints = parsed.constraints;
  }
  if (parsed.directives !== undefined) {
    layoutObj.directives = parsed.directives;
  }

  const hasLayoutContent = Object.keys(layoutObj).length > 0;
  const layoutYaml = hasLayoutContent ? yaml.dump(layoutObj, { lineWidth: -1 }) : '';

  return {
    projections,
    sequence,
    layoutYaml,
  };
}
