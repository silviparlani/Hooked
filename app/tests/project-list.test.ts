import { describe, expect, it } from 'vitest';
import { projectDoodle } from '@/components/projects/project-list';

describe('Made project doodles', () => {
  it('matches project names and descriptions to local doodles', () => {
    expect(projectDoodle({ name: 'Mood Octopus' }).name).toBe('sea creature');
    expect(projectDoodle({ name: 'Saturday outfit', description: 'A pleated skirt' }).name).toBe(
      'clothing',
    );
    expect(projectDoodle({ name: 'Market tote' }).name).toBe('bag');
    expect(projectDoodle({ name: 'Turtle' }).name).toBe('turtle');
    expect(projectDoodle({ name: 'Crochet cactus' }).name).toBe('plant');
    expect(projectDoodle({ name: 'Tiny fox amigurumi' }).name).toBe('animal');
    expect(projectDoodle({ name: 'Striped leg warmers' }).name).toBe('wearable accessory');
  });

  it('uses a crochet-project fallback for unknown descriptions', () => {
    expect(projectDoodle({ name: 'Mystery make' }).name).toBe('crochet project');
  });
});
