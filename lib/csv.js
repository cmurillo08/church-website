// CSV building for Excel: UTF-8 BOM, comma separator, CRLF, RFC 4180
// quoting, and a guard against formula injection.

const BOM = '﻿';

// Cells starting with these are run as formulas by Excel/Sheets.
const FORMULA_START = /^[=+\-@\t\r]/;

function escapeCell(value) {
  if (value == null) return '';
  if (typeof value === 'number') return String(value);
  let text = String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Marks a trusted value (e.g. a validated 8-digit phone) to be written as
// ="value" so Excel keeps it as text instead of reformatting it as a number.
export function asText(value) {
  return { excelText: String(value) };
}

function formatCell(value) {
  if (value && typeof value === 'object' && 'excelText' in value) {
    return `"=""${value.excelText.replace(/"/g, '')}"""`;
  }
  return escapeCell(value);
}

export function toCsv(headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(formatCell).join(','));
  return `${BOM}${lines.join('\r\n')}\r\n`;
}

// "Lámina de zinc" → "lamina-de-zinc", for file names.
export function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
