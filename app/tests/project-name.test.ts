import { describe, expect, it } from 'vitest';
import { validateProjectName } from '@/lib/domain/project-name';

describe('validateProjectName', () => {
  it('trims and accepts a project name', () => {
    expect(validateProjectName('  Summer cardigan  ')).toEqual({
      valid: true,
      value: 'Summer cardigan',
    });
  });

  it('rejects a blank project name', () => {
    expect(validateProjectName('   ')).toEqual({
      valid: false,
      message: 'Enter a project name.',
    });
  });
});
