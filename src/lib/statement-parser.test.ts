import { describe, it, expect } from 'vitest';
import {
  parseOFX,
  parseCSV,
  parseBRLAmount,
  parseFlexibleDate,
  categorize,
} from './statement-parser';

// ─── parseBRLAmount ───────────────────────────────────────────

describe('parseBRLAmount', () => {
  it('parses pt-BR format with thousands separator and decimal comma', () => {
    expect(parseBRLAmount('1.234,56')).toBe(1234.56);
  });

  it('parses value with only decimal comma (no thousands)', () => {
    expect(parseBRLAmount('1500,50')).toBe(1500.5);
  });

  it('strips the R$ prefix', () => {
    expect(parseBRLAmount('R$ 1.234,56')).toBe(1234.56);
  });

  it('strips whitespace', () => {
    expect(parseBRLAmount('  1.000,00  ')).toBe(1000);
  });

  it('parses negative amounts with comma decimal', () => {
    expect(parseBRLAmount('-1.500,50')).toBe(-1500.5);
  });

  it('parses en-US format "1,234.56" as 1234.56 (thousands "," + decimal ".")', () => {
    expect(parseBRLAmount('1,234.56')).toBe(1234.56);
  });

  it('returns NaN for purely non-numeric input', () => {
    expect(parseBRLAmount('abc')).toBeNaN();
  });

  it('parses simple integer amounts', () => {
    expect(parseBRLAmount('100')).toBe(100);
  });
});

// ─── parseFlexibleDate ────────────────────────────────────────

describe('parseFlexibleDate', () => {
  it('parses pt-BR dd/MM/yyyy into ISO YYYY-MM-DD', () => {
    expect(parseFlexibleDate('15/03/2024')).toBe('2024-03-15');
  });

  it('pads single-digit days and months', () => {
    expect(parseFlexibleDate('5/3/2024')).toBe('2024-03-05');
  });

  it('accepts hyphen-separated dd-MM-yyyy', () => {
    expect(parseFlexibleDate('15-03-2024')).toBe('2024-03-15');
  });

  it('passes through ISO YYYY-MM-DD', () => {
    expect(parseFlexibleDate('2024-03-15')).toBe('2024-03-15');
  });

  it('rejects 00/00/0000 sentinel (BB "Saldo do dia" marker)', () => {
    expect(parseFlexibleDate('00/00/0000')).toBeNull();
  });

  it('rejects dates starting with "00/"', () => {
    expect(parseFlexibleDate('00/12/2024')).toBeNull();
  });

  it('returns null for completely invalid input', () => {
    expect(parseFlexibleDate('not a date')).toBeNull();
  });
});

// ─── categorize ──────────────────────────────────────────────

describe('categorize', () => {
  it('categorizes PIX sent transactions', () => {
    expect(categorize('PIX enviado para fulano')).toBe('PIX Enviado');
  });

  it('categorizes PIX received transactions', () => {
    expect(categorize('PIX recebido de cliente')).toBe('PIX Recebido');
  });

  it('categorizes iFood/Rappi as Alimentação', () => {
    expect(categorize('IFOOD RESTAURANTE XYZ')).toBe('Alimentação');
  });

  it('categorizes Netflix/Spotify as Assinatura', () => {
    expect(categorize('NETFLIX.COM')).toBe('Assinatura');
    expect(categorize('Spotify Premium')).toBe('Assinatura');
  });

  it('returns "Outros" for unknown descriptions', () => {
    expect(categorize('Lojinha do bairro qualquer')).toBe('Outros');
  });

  it('categorizes electricity providers', () => {
    expect(categorize('ENEL DISTRIBUICAO')).toBe('Energia');
  });

  it('categorizes TED/DOC transfers', () => {
    expect(categorize('TED para conta corrente')).toBe('Transferência');
  });
});

// ─── parseOFX ────────────────────────────────────────────────

describe('parseOFX', () => {
  it('parses a minimal OFX SGML snippet with a debit transaction', () => {
    const ofx = `
OFXHEADER:100
DATA:OFXSGML
<OFX>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240315120000[-3:BRT]
<TRNAMT>-150.50
<FITID>ABC123
<MEMO>Compra supermercado
</STMTTRN>
</OFX>
    `;
    const txs = parseOFX(ofx);
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({
      date: '2024-03-15',
      description: 'Compra supermercado',
      amount: -150.5,
      type: 'despesa',
      status: 'recebido',
      month: '2024-03',
    });
  });

  it('parses multiple STMTTRN blocks and infers type from sign', () => {
    const ofx = `
<OFX>
<STMTTRN>
<DTPOSTED>20240101
<TRNAMT>1000.00
<MEMO>Salário cliente
</STMTTRN>
<STMTTRN>
<DTPOSTED>20240102
<TRNAMT>-50.25
<MEMO>Uber viagem
</STMTTRN>
</OFX>
`;
    const txs = parseOFX(ofx);
    expect(txs).toHaveLength(2);

    expect(txs[0].amount).toBe(1000);
    expect(txs[0].type).toBe('recorrencia');
    expect(txs[0].date).toBe('2024-01-01');

    expect(txs[1].amount).toBe(-50.25);
    expect(txs[1].type).toBe('despesa');
    expect(txs[1].category).toBe('Transporte');
  });

  it('parses XML-style OFX (closing tags)', () => {
    const ofx = `
<OFX>
<STMTTRN>
<TRNTYPE>CREDIT</TRNTYPE>
<DTPOSTED>20240520</DTPOSTED>
<TRNAMT>2500.00</TRNAMT>
<MEMO>Transferência recebida</MEMO>
</STMTTRN>
</OFX>
`;
    const txs = parseOFX(ofx);
    expect(txs).toHaveLength(1);
    expect(txs[0].amount).toBe(2500);
    expect(txs[0].date).toBe('2024-05-20');
    expect(txs[0].description).toBe('Transferência recebida');
  });

  it('returns empty array for malformed / empty content', () => {
    expect(parseOFX('')).toEqual([]);
    expect(parseOFX('not an ofx file at all')).toEqual([]);
  });

  it('skips transactions missing required fields', () => {
    const ofx = `
<OFX>
<STMTTRN>
<MEMO>No amount, no date
</STMTTRN>
</OFX>
`;
    expect(parseOFX(ofx)).toEqual([]);
  });
});

// ─── parseCSV (BB format + generic) ──────────────────────────

describe('parseCSV — Banco do Brasil format', () => {
  it('parses a minimal BB-style CSV with Entrada/Saída', () => {
    const csv = [
      '"Data","Lançamento","Detalhes","Nº documento","Valor","Tipo Lançamento"',
      '"15/03/2024","TED RECEBIDA","Cliente Alpha","123456","1500,00","Entrada"',
      '"16/03/2024","PAGAMENTO BOLETO","Fornecedor Beta","123457","-450,75","Saída"',
    ].join('\n');

    const txs = parseCSV(csv);
    expect(txs).toHaveLength(2);

    expect(txs[0]).toMatchObject({
      date: '2024-03-15',
      amount: 1500,
      type: 'recorrencia',
      month: '2024-03',
    });
    expect(txs[0].description).toContain('TED RECEBIDA');

    expect(txs[1]).toMatchObject({
      date: '2024-03-16',
      amount: -450.75,
      type: 'despesa',
    });
  });

  it('skips "Saldo" rows in BB CSVs', () => {
    const csv = [
      '"Data","Lançamento","Detalhes","Nº documento","Valor","Tipo Lançamento"',
      '"00/00/0000","Saldo Anterior","","","1000,00","Saldo"',
      '"15/03/2024","TED","Cliente","1","100,00","Entrada"',
      '"00/00/0000","S A L D O","","","1100,00","Saldo"',
    ].join('\n');

    const txs = parseCSV(csv);
    expect(txs).toHaveLength(1);
    expect(txs[0].amount).toBe(100);
  });

  it('skips BB Rende Fácil automatic sweeps', () => {
    const csv = [
      '"Data","Lançamento","Detalhes","Nº documento","Valor","Tipo Lançamento"',
      '"15/03/2024","BB Rende Fácil","aplicação","1","-500,00","Saída"',
      '"16/03/2024","TED recebida","Cliente","2","800,00","Entrada"',
    ].join('\n');

    const txs = parseCSV(csv);
    expect(txs).toHaveLength(1);
    expect(txs[0].amount).toBe(800);
  });

  it('handles semicolon-separated CSVs', () => {
    const csv = [
      'Data;Descrição;Valor',
      '15/03/2024;Compra teste;-99,90',
      '16/03/2024;Recebimento;250,00',
    ].join('\n');

    const txs = parseCSV(csv);
    expect(txs).toHaveLength(2);
    expect(txs[0].amount).toBe(-99.9);
    expect(txs[0].type).toBe('despesa');
    expect(txs[1].amount).toBe(250);
    expect(txs[1].type).toBe('recorrencia');
  });

  it('returns empty array for empty CSV', () => {
    expect(parseCSV('')).toEqual([]);
  });

  it('returns empty array for single header line only', () => {
    expect(parseCSV('Data,Descrição,Valor')).toEqual([]);
  });

  it('populates the month field in YYYY-MM format', () => {
    const csv = [
      'Data,Descrição,Valor',
      '01/07/2024,Teste,100,00',
    ].join('\n');
    // Note: amount "100,00" across comma-separator CSV → split issue.
    // Use a value without comma to avoid CSV ambiguity:
    const csvClean = [
      'Data;Descrição;Valor',
      '01/07/2024;Teste;100,00',
    ].join('\n');
    const txs = parseCSV(csvClean);
    expect(txs).toHaveLength(1);
    expect(txs[0].month).toBe('2024-07');
  });
});
