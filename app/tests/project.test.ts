import { describe, expect, it } from 'vitest';
import { compareProjects, getSafePatternUrl, parseProject } from '@/lib/domain/project';

const validProject = {
  name: 'Cardigan',
  status: 'planned',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  schemaVersion: 1,
};

describe('project documents', () => {
  it('accepts a valid project and optional blank fields', () => {
    expect(parseProject('one', { ...validProject, description: '' })).toMatchObject({
      id: 'one',
      name: 'Cardigan',
    });
  });

  it('rejects malformed remote data with a useful diagnostic', () => {
    expect(() => parseProject('broken', { ...validProject, status: 'maybe' })).toThrow(
      'broken has an invalid status',
    );
  });

  it('renders only HTTPS pattern text as a link', () => {
    expect(getSafePatternUrl('https://example.com/pattern')).toBe('https://example.com/pattern');
    expect(getSafePatternUrl('javascript:alert(1)')).toBeNull();
    expect(getSafePatternUrl('not a url')).toBeNull();
  });

  it('uses the document ID when creation times are equal', () => {
    const later = parseProject('b', validProject);
    const earlier = parseProject('a', validProject);
    expect([later, earlier].sort(compareProjects).map((project) => project.id)).toEqual(['a', 'b']);
  });

  it('uses a saved display order before creation time', () => {
    const first = parseProject('first', { ...validProject, displayOrder: 0 });
    const second = parseProject('second', {
      ...validProject,
      createdAt: new Date('2025-01-01'),
      displayOrder: 1,
    });
    expect([second, first].sort(compareProjects).map((project) => project.id)).toEqual([
      'first',
      'second',
    ]);
  });
});
