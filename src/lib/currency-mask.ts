/**
 * BRL currency mask utilities (pt-BR).
 *
 * Strategy: internal canonical form is the MASKED STRING itself
 * (e.g. "1.500,50"). The mask works on raw keystrokes by reducing
 * any input to digits, interpreting the last 2 digits as cents and
 * grouping thousands with ".".
 *
 * This is resilient to:
 *  - backspace (the removed char simply disappears from the digit string,
 *    which shifts the decimal naturally: "1.500,50" -> backspace -> "150,05")
 *  - pasted strings in any format ("R$ 1.500,50", "1500.50", "1,500.50")
 *  - empty input (returns "")
 */

/** Strips everything except digits and trims leading zeros (keeps at least one). */
function toDigits(raw: string): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  // Remove leading zeros but keep the string non-empty if user typed something.
  // "" stays "", "00" -> "0", "007" -> "7", "0" -> "0"
  if (digits === '') return '';
  const trimmed = digits.replace(/^0+/, '');
  return trimmed === '' ? '0' : trimmed;
}

/**
 * Masks raw input into BR currency display.
 *
 * Examples:
 *   ""        -> ""
 *   "0"       -> "0,00"
 *   "1"       -> "0,01"
 *   "1500"    -> "15,00"
 *   "150050"  -> "1.500,50"
 *   "R$ 1.500,50" -> "1.500,50"
 *   "1500.50" -> "1.500,50" (digit-only pass: 150050)
 */
export function maskBRCurrency(raw: string): string {
  const digits = toDigits(raw);
  if (digits === '') return '';

  // Pad to at least 3 digits so we always have 2 cents + at least 1 integer digit.
  const padded = digits.padStart(3, '0');
  const intPart = padded.slice(0, -2);
  const centsPart = padded.slice(-2);

  // Remove leading zeros from the integer part but keep at least one digit.
  const intNormalized = intPart.replace(/^0+/, '') || '0';

  // Insert "." as thousands separator.
  const intWithThousands = intNormalized.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${intWithThousands},${centsPart}`;
}

/**
 * Parses a masked BR string back into a number.
 *
 * - Empty / whitespace -> returns 0 (safe default for "no value entered").
 * - Invalid (no digits after cleaning) -> returns NaN.
 * - Accepts already-masked ("1.500,50") or any BR-style input.
 *
 * Behavior documented: empty -> 0, garbage -> NaN, valid -> number.
 */
export function parseMaskedBRNumber(masked: string): number {
  if (!masked || !masked.trim()) return 0;
  const digits = (masked.match(/\d/g) ?? []).join('');
  if (digits === '') return NaN;
  // Last 2 digits are cents.
  const asNumber = Number(digits) / 100;
  return Number.isFinite(asNumber) ? asNumber : NaN;
}

/**
 * Formats a raw number (e.g. from the DB: 1500.5) into the mask format
 * used in the input field ("1.500,50"). Used on edit-mode hydration.
 */
export function formatNumberToMask(value: number): string {
  if (!Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  // Convert to integer cents via rounding to avoid float drift (1500.5 -> 150050).
  const cents = Math.round(abs * 100).toString();
  return maskBRCurrency(cents);
}
