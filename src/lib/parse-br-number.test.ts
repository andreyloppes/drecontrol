import { describe, it, expect } from 'vitest';
import { parseBRNumber } from './parse-br-number';

describe('parseBRNumber', () => {
  describe('typical pt-BR inputs', () => {
    it('parses a simple decimal with comma', () => {
      expect(parseBRNumber('1500,50')).toBe(1500.5);
    });

    it('parses with a single thousands separator', () => {
      expect(parseBRNumber('1.500,50')).toBe(1500.5);
    });

    it('parses large number with multiple thousands separators', () => {
      expect(parseBRNumber('1.234.567,89')).toBe(1234567.89);
    });

    it('parses a value with two decimal zeros', () => {
      expect(parseBRNumber('100,00')).toBe(100);
    });

    it('parses a value below one real (0,01)', () => {
      expect(parseBRNumber('0,01')).toBe(0.01);
    });

    it('parses zero as "0"', () => {
      expect(parseBRNumber('0')).toBe(0);
    });

    it('parses an integer string with no comma', () => {
      expect(parseBRNumber('100')).toBe(100);
    });
  });

  describe('whitespace handling', () => {
    it('trims leading/trailing whitespace', () => {
      expect(parseBRNumber(' 100 ')).toBe(100);
    });

    it('strips internal whitespace', () => {
      expect(parseBRNumber('1 500,50')).toBe(1500.5);
    });

    it('handles tabs and newlines', () => {
      expect(parseBRNumber('\t1.000,00\n')).toBe(1000);
    });
  });

  describe('negative numbers', () => {
    it('parses a negative BRL value', () => {
      expect(parseBRNumber('-100,50')).toBe(-100.5);
    });

    it('parses a negative value with thousands separators', () => {
      expect(parseBRNumber('-1.500,00')).toBe(-1500);
    });
  });

  describe('invalid inputs (return NaN)', () => {
    it('returns NaN for non-numeric strings', () => {
      expect(parseBRNumber('abc')).toBeNaN();
    });

    it('returns NaN for empty string', () => {
      expect(parseBRNumber('')).toBeNaN();
    });

    it('returns NaN for whitespace only', () => {
      expect(parseBRNumber('   ')).toBeNaN();
    });
  });

  describe('documented edge cases (current behavior)', () => {
    // English-style decimal is ambiguous and dots get stripped as thousands separators.
    // "1500.50" -> remove dots -> "150050" -> parseFloat -> 150050.
    it('treats en-US style "1500.50" as 150050 (dots stripped)', () => {
      expect(parseBRNumber('1500.50')).toBe(150050);
    });

    // replace(',', '.') only swaps the FIRST comma, so "1,2,3" -> "1.2,3" -> parseFloat -> 1.2
    it('handles "1,2,3" by replacing only the first comma (→ 1.2)', () => {
      expect(parseBRNumber('1,2,3')).toBe(1.2);
    });

    it('handles value that is only a comma ","', () => {
      // ',' -> '.' -> parseFloat('.') -> NaN
      expect(parseBRNumber(',')).toBeNaN();
    });

    it('parses ".5" (input "0,5") correctly', () => {
      expect(parseBRNumber('0,5')).toBe(0.5);
    });
  });
});
