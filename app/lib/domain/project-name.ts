export type ProjectNameResult = { valid: true; value: string } | { valid: false; message: string };

export function validateProjectName(input: string): ProjectNameResult {
  const name = input.trim();

  if (!name) {
    return { valid: false, message: 'Enter a project name.' };
  }

  return { valid: true, value: name };
}
