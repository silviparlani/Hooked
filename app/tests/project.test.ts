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

  it('ignores old manual order and sorts by most recent update', () => {
    const first = parseProject('a', { ...validProject, displayOrder: 0 });
    const latest = parseProject('z', {
      ...validProject,
      displayOrder: 9,
      updatedAt: new Date('2026-02-01'),
    });
    expect([first, latest].sort(compareProjects).map((project) => project.id)).toEqual(['z', 'a']);
  });
  it('uses completion dates for Made rather than later edits', () => {
    const first = parseProject('a', {
      ...validProject,
      status: 'completed',
      completedAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-03-01'),
    });
    const latest = parseProject('z', {
      ...validProject,
      status: 'completed',
      completedAt: new Date('2026-02-01'),
    });
    expect([first, latest].sort(compareProjects).map((project) => project.id)).toEqual(['z', 'a']);
  });
});
