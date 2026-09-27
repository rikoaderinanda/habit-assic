/** Uniform Server Action result consumed by client forms/toasts. */
export type ActionResult<TField extends string = string> =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Partial<Record<TField, string>> };

/** First Zod issue message per top-level field. */
export function fieldErrorsFrom<TField extends string>(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): Partial<Record<TField, string>> {
  const errors: Partial<Record<TField, string>> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "") as TField;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}
