/**
 * Thrown when an unsupported path pattern is encountered.
 * For example, duplicate parameter names or invalid syntax.
 */
export class UnsupportedPathError extends Error {
  constructor(path: string) {
    super(`Unsupported path pattern: ${path}`);
    this.name = 'UnsupportedPathError';
  }
}

/**
 * Error message used when trying to add routes after matchers are built.
 */
export const MESSAGE_MATCHER_IS_ALREADY_BUILT = 'Matcher is already built — routes can no longer be added.';
