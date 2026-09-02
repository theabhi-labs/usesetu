/**
 * Replaces {{variableName}} placeholders in a template string with values
 * from the given map. Unknown placeholders render as an empty string
 * rather than throwing — a missing variable shouldn't crash a notification.
 */
export const renderTemplate = (template: string, variables: Record<string, unknown>): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value === undefined || value === null ? '' : String(value);
  });
};
