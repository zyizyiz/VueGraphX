import { describe, expect, it } from 'vitest';
import { getParityCapabilitySummaries, parityRendererBackends } from './parityStatus';

const requiredInteractionIds = [
  'viewport.zoom',
  'viewport.gestureZoom',
  'viewport.pan',
  'object.pick',
  'object.select',
  'object.highlight',
  'project',
  'unproject',
  'diagnostics'
] as const;

describe('playground backend interaction status matrix', () => {
  it('documents active backend interaction support and explicit degradation', () => {
    const summaries = getParityCapabilitySummaries();

    expect(parityRendererBackends.map((backend) => backend.id)).toEqual(['jsxgraph', 'canvas2d', 'babylon']);
    for (const backend of parityRendererBackends) {
      const interactions = summaries[backend.id].interactions;
      expect(interactions.map((item) => item.id)).toEqual(requiredInteractionIds);
      expect(interactions.every((item) => ['supported', 'partial-support', 'unsupported'].includes(item.status))).toBe(true);
    }

    expect(summaries.babylon.interactions.find((item) => item.id === 'viewport.gestureZoom')).toMatchObject({
      status: 'partial-support',
      detail: expect.stringContaining('gesture bridge')
    });
  });
});
