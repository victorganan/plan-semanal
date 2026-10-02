import { describe, expect, it } from 'vitest';
import { isPlanningWindow, shouldShowPlanningNudge } from './planning-nudge';

describe('isPlanningWindow', () => {
  it('is true on Friday, Saturday and Sunday', () => {
    expect(isPlanningWindow(5)).toBe(true);
    expect(isPlanningWindow(6)).toBe(true);
    expect(isPlanningWindow(0)).toBe(true);
  });

  it('is false Monday through Thursday', () => {
    expect(isPlanningWindow(1)).toBe(false);
    expect(isPlanningWindow(2)).toBe(false);
    expect(isPlanningWindow(3)).toBe(false);
    expect(isPlanningWindow(4)).toBe(false);
  });
});

describe('shouldShowPlanningNudge', () => {
  it('shows the nudge on a planning day when next week has no objectives yet', () => {
    expect(shouldShowPlanningNudge(5, false)).toBe(true);
  });

  it('hides the nudge once next week already has objectives', () => {
    expect(shouldShowPlanningNudge(5, true)).toBe(false);
  });

  it('hides the nudge outside the planning window regardless of objectives', () => {
    expect(shouldShowPlanningNudge(2, false)).toBe(false);
  });
});
