import { describe, expect, it } from 'vitest';
import { digitsOnly, formatDraft, naturalDate, parseDigitsToTime, quarterHourOptionsAround, shiftQuarterHour } from './time-input';

describe('digitsOnly', () => {
  it('strips non-digits and caps at 4 chars', () => {
    expect(digitsOnly('9:30')).toBe('930');
    expect(digitsOnly('093045')).toBe('0930');
  });
});

describe('formatDraft', () => {
  it('leaves 1-2 digits without a colon', () => {
    expect(formatDraft('9')).toBe('9');
    expect(formatDraft('14')).toBe('14');
  });

  it('inserts a colon from the 3rd digit', () => {
    expect(formatDraft('930')).toBe('9:30');
    expect(formatDraft('1345')).toBe('13:45');
  });
});

describe('parseDigitsToTime', () => {
  it('treats 1-2 digits as hour only, minutes 00', () => {
    expect(parseDigitsToTime('9')).toBe('09:00');
    expect(parseDigitsToTime('14')).toBe('14:00');
  });

  it('treats 3 digits as a 1-digit hour + minutes', () => {
    expect(parseDigitsToTime('930')).toBe('09:30');
  });

  it('treats 4 digits as HH + MM', () => {
    expect(parseDigitsToTime('1345')).toBe('13:45');
  });

  it('rounds minutes to the nearest quarter hour', () => {
    expect(parseDigitsToTime('0907')).toBe('09:00');
    expect(parseDigitsToTime('0908')).toBe('09:15');
    expect(parseDigitsToTime('0922')).toBe('09:15');
    expect(parseDigitsToTime('0923')).toBe('09:30');
    expect(parseDigitsToTime('0952')).toBe('09:45');
  });

  it('rounds 53-59 up into the next hour', () => {
    expect(parseDigitsToTime('0958')).toBe('10:00');
    expect(parseDigitsToTime('2358')).toBe('00:00');
  });

  it('clamps an out-of-range hour', () => {
    expect(parseDigitsToTime('99')).toBe('23:00');
  });

  it('returns empty for empty input', () => {
    expect(parseDigitsToTime('')).toBe('');
  });
});

describe('shiftQuarterHour', () => {
  it('adds 15 minutes', () => {
    expect(shiftQuarterHour('09:00', 15)).toBe('09:15');
  });

  it('subtracts 15 minutes', () => {
    expect(shiftQuarterHour('09:00', -15)).toBe('08:45');
  });

  it('wraps the hour forward past 23:45', () => {
    expect(shiftQuarterHour('23:45', 15)).toBe('00:00');
  });

  it('wraps the hour backward past 00:00', () => {
    expect(shiftQuarterHour('00:00', -15)).toBe('23:45');
  });

  it('falls back to 00:00 for an unparsable value', () => {
    expect(shiftQuarterHour('', 15)).toBe('00:15');
  });
});

describe('quarterHourOptionsAround', () => {
  it('returns 96 quarter-hour slots covering the full day', () => {
    expect(quarterHourOptionsAround('09:00')).toHaveLength(96);
  });

  it('starts 3 quarters (45min) before the given center by default', () => {
    const options = quarterHourOptionsAround('09:00');
    expect(options[0]).toBe('08:15');
    expect(options[3]).toBe('09:00');
    expect(options[4]).toBe('09:15');
  });

  it('wraps around midnight when the center is near 00:00', () => {
    const options = quarterHourOptionsAround('00:00');
    expect(options[0]).toBe('23:15');
    expect(options[3]).toBe('00:00');
  });

  it('centers on now when given an empty value', () => {
    const options = quarterHourOptionsAround('');
    expect(options[3]).toBe('00:00');
  });
});

describe('naturalDate', () => {
  it('formats a date as weekday + day + month, in Spanish', () => {
    // 2026-09-24 es jueves
    expect(naturalDate('2026-09-24T00:00:00')).toBe('jueves 24 de septiembre');
  });
});
