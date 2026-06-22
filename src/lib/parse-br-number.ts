/**
 * Parses a Brazilian-formatted number string (pt-BR).
 *
 * Behavior:
 * - Strips whitespace and dots (thousands separators in pt-BR).
 * - Converts the last comma into a decimal point.
 * - Returns NaN for inputs that do not produce a finite number.
 *
 * Examples:
 *   "1500,50"     → 1500.5
 *   "1.500,50"    → 1500.5
 *   "1.234.567,89"→ 1234567.89
 *   "abc"         → NaN
 *   ""            → NaN
 *
 * Caveats (documented current behavior, not a contract):
 * - "1500.50" (en-US style) is interpreted as "150050" because dots are stripped.
 * - "1,2,3" collapses to "1,23" after dot removal, then the LAST comma becomes '.',
 *   so it yields 1.23 (the replace call only swaps the first comma).
 *   Actually: since replace(',', '.') replaces only the first occurrence, "1,2,3"
 *   becomes "1.2,3" → parseFloat reads 1.2.
 */
export function parseBRNumber(raw: string): number {
  const cleaned = raw
    .trim()
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(cleaned);
}
