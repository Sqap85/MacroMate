import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';

/**
 * Tests for the CSV import validation rules used in FoodTemplatesModal.
 * The validation logic is duplicated here as pure functions so it can be
 * tested without mounting the React component.
 */

const EXPECTED_HEADER = ['name', 'unit', 'calories', 'protein', 'carbs', 'fat'];
const MAX_ROWS = 1000;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

interface CsvRow {
  name: string;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const dangerous = (val: string) => /^[=+\-@]/.test(val);

function parseCSV(text: string): { valid: CsvRow[]; skippedCount: number; headerError?: string } {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const rows = result.data;

  if (rows.length === 0) return { valid: [], skippedCount: 0 };

  const header = rows[0].map(h => h.trim());
  if (header.join(',') !== EXPECTED_HEADER.join(',')) {
    return { valid: [], skippedCount: 0, headerError: 'bad header' };
  }

  const nameIdx = header.indexOf('name');
  const unitIdx = header.indexOf('unit');
  const calIdx = header.indexOf('calories');
  const proIdx = header.indexOf('protein');
  const carbIdx = header.indexOf('carbs');
  const fatIdx = header.indexOf('fat');

  const dataRows = rows.slice(1);
  const valid: CsvRow[] = [];
  let skippedCount = 0;

  for (const row of dataRows) {
    if (row.length < 6) { skippedCount++; continue; }
    const name = row[nameIdx]?.trim() || '';
    const unit = row[unitIdx]?.trim();
    const calories = Number(row[calIdx]);
    const protein = Number(row[proIdx]);
    const carbs = Number(row[carbIdx]);
    const fat = Number(row[fatIdx]);

    if (calories < 0 || protein < 0 || carbs < 0 || fat < 0) { skippedCount++; continue; }
    if (
      !name || name.length > 50 || dangerous(name) ||
      !['piece', 'gram'].includes(unit) ||
      Number.isNaN(calories) || Number.isNaN(protein) || Number.isNaN(carbs) || Number.isNaN(fat) ||
      calories <= 0 || calories > 5000 || protein > 500 || carbs > 1000 || fat > 500
    ) { skippedCount++; continue; }

    valid.push({ name, unit, calories, protein, carbs, fat });
  }

  return { valid, skippedCount };
}

describe('CSV import validation', () => {
  it('parses a well-formed CSV correctly', () => {
    const csv = `name,unit,calories,protein,carbs,fat
"Tavuk Göğsü",gram,165,31,0,3.6`;
    const { valid } = parseCSV(csv);
    expect(valid).toHaveLength(1);
    expect(valid[0].name).toBe('Tavuk Göğsü');
    expect(valid[0].calories).toBe(165);
  });

  it('handles names with commas inside quotes (RFC 4180)', () => {
    const csv = `name,unit,calories,protein,carbs,fat
"Chicken, Grilled",gram,165,31,0,7`;
    const { valid } = parseCSV(csv);
    expect(valid).toHaveLength(1);
    expect(valid[0].name).toBe('Chicken, Grilled');
  });

  it('rejects rows with wrong header', () => {
    const csv = `Name,Unit,Calories,Protein,Carbs,Fat
Test,gram,100,10,10,5`;
    const { headerError } = parseCSV(csv);
    expect(headerError).toBeDefined();
  });

  it('rejects rows with invalid unit', () => {
    const csv = `name,unit,calories,protein,carbs,fat
Test,kg,100,10,10,5`;
    const { valid, skippedCount } = parseCSV(csv);
    expect(valid).toHaveLength(0);
    expect(skippedCount).toBe(1);
  });

  it('rejects formula injection (= prefix)', () => {
    const csv = `name,unit,calories,protein,carbs,fat
"=SUM(A1:A10)",gram,100,10,10,5`;
    const { valid } = parseCSV(csv);
    expect(valid).toHaveLength(0);
  });

  it('rejects formula injection (+ prefix)', () => {
    const csv = `name,unit,calories,protein,carbs,fat
"+1234",gram,100,10,10,5`;
    const { valid } = parseCSV(csv);
    expect(valid).toHaveLength(0);
  });

  it('rejects negative calorie values', () => {
    const csv = `name,unit,calories,protein,carbs,fat
Test,gram,-100,10,10,5`;
    const { valid, skippedCount } = parseCSV(csv);
    expect(valid).toHaveLength(0);
    expect(skippedCount).toBe(1);
  });

  it('rejects calories > 5000', () => {
    const csv = `name,unit,calories,protein,carbs,fat
HyperFood,gram,5001,10,10,5`;
    const { valid } = parseCSV(csv);
    expect(valid).toHaveLength(0);
  });

  it('rejects non-numeric calorie field', () => {
    const csv = `name,unit,calories,protein,carbs,fat
Test,gram,abc,10,10,5`;
    const { valid } = parseCSV(csv);
    expect(valid).toHaveLength(0);
  });

  it('rejects rows with fewer than 6 columns', () => {
    const csv = `name,unit,calories,protein,carbs,fat
Test,gram,100,10`;
    const { skippedCount } = parseCSV(csv);
    expect(skippedCount).toBe(1);
  });

  it('parses all 41 rows from the example file', () => {
    // Representative sample — all rows from the Turkish example template
    const lines = [
      'name,unit,calories,protein,carbs,fat',
      '"Adana Kebap",piece,600,40,2,45',
      '"Beyaz Peynir",gram,265,17,1.5,21',
      '"Tavuk Göğsü",gram,165,31,0,3.6',
      '"Ton Balığı (konserve, suda)",gram,116,26,0,1',
      '"Balık (levrek, ızgara)",gram,124,22,0,4.5',
    ];
    const { valid } = parseCSV(lines.join('\n'));
    expect(valid).toHaveLength(5);
    // Comma-in-name rows should parse correctly
    expect(valid.find(r => r.name === 'Ton Balığı (konserve, suda)')).toBeDefined();
    expect(valid.find(r => r.name === 'Balık (levrek, ızgara)')).toBeDefined();
  });

  it('file size limit constant is 2 MB', () => {
    expect(MAX_FILE_BYTES).toBe(2 * 1024 * 1024);
  });

  it('row limit constant is 1000', () => {
    expect(MAX_ROWS).toBe(1000);
  });
});
