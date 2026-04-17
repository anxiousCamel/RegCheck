/**
 * Resolves a free-form `bindingKey` (`global.<key>` or `eq.<key>`) against a
 * {@link BindingContext}. Intentionally namespace-based rather than enum-based
 * so new binding sources can be added without schema migrations.
 */

/** Value map for a single data source (globals or one equipment record). */
export type BindingScope = Record<string, string | undefined>;

export interface BindingContext {
  /** Document-level values (date, signature, technician name, ...). */
  globals: BindingScope;
  /** One entry per item, indexed by itemIndex. */
  items: BindingScope[];
}

/** Allowed binding-key shape: `<ns>.<key>` where ns ∈ {global, eq}. */
const BINDING_KEY_PATTERN = /^(global|eq)\.([a-z][a-z0-9_]*)$/;

export interface ParsedBindingKey {
  namespace: 'global' | 'eq';
  key: string;
}

export class FieldBindingResolver {
  /** Parse a binding key into its namespace and key. Returns null if malformed. */
  static parse(bindingKey: string): ParsedBindingKey | null {
    const match = BINDING_KEY_PATTERN.exec(bindingKey);
    if (!match) return null;
    return { namespace: match[1] as 'global' | 'eq', key: match[2]! };
  }

  /**
   * Resolve a binding key against the context.
   *
   * @param bindingKey  e.g. `"global.data"` or `"eq.serie"`
   * @param ctx         the data context
   * @param itemIndex   required for `eq.*` bindings; ignored for `global.*`
   * @returns resolved value or `undefined` if missing / invalid key
   */
  static resolve(
    bindingKey: string,
    ctx: BindingContext,
    itemIndex?: number,
  ): string | undefined {
    const parsed = this.parse(bindingKey);
    if (!parsed) return undefined;

    if (parsed.namespace === 'global') {
      return ctx.globals[parsed.key];
    }
    // eq.*
    if (itemIndex === undefined || itemIndex < 0) return undefined;
    return ctx.items[itemIndex]?.[parsed.key];
  }

  /** Shape check for use in validators / input sanitization. */
  static isValidKey(bindingKey: string): boolean {
    return BINDING_KEY_PATTERN.test(bindingKey);
  }
}
