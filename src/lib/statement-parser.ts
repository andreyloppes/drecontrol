import { TransactionType, PaymentStatus } from '@/types/finance';

export interface ParsedTransaction {
  date: string;       // YYYY-MM-DD
  description: string;
  amount: number;     // positive = income, negative = expense (raw from bank)
  type: TransactionType;
  status: PaymentStatus;
  category: string;
  month: string;      // YYYY-MM
}

// ─── File Reader with encoding detection ──────────────────────

async function readFileContent(file: File): Promise<string> {
  // Try UTF-8 first
  let text = await file.text();

  // If we see replacement characters, try Latin-1 (ISO-8859-1)
  if (text.includes('\ufffd') || text.includes('�')) {
    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder('iso-8859-1');
    text = decoder.decode(buffer);
  }

  return text;
}

// ─── PDF Parser (comprovantes PIX + extratos) ─────────────────

async function parsePDF(file: File): Promise<ParsedTransaction[]> {
  const pdfjsLib = await import('pdfjs-dist');
  // Worker bundlado localmente pelo Vite — funciona offline (PWA) e sem depender de CDN externo.
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  const comprovante = parseComprovantePIX(fullText);
  if (comprovante) return [comprovante];

  const extrato = parseExtratoPDF(fullText);
  if (extrato.length > 0) return extrato;

  return [];
}

function parseComprovantePIX(text: string): ParsedTransaction | null {
  const isPix = /comprovante.*pix|pix.*comprovante|pagamento\s*pix/i.test(text);
  if (!isPix) return null;

  const amountMatch = text.match(/Valor(?:\s*original)?[:\s]*R\$\s*([\d.,]+)/i)
    || text.match(/R\$\s*([\d.,]+)/i);
  if (!amountMatch) return null;
  const amount = parseBRLAmount(amountMatch[1]);

  const dateMatch = text.match(/(?:Realizado|Emitido|Data)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (!dateMatch) return null;
  const date = parseFlexibleDate(dateMatch[1]);
  if (!date) return null;

  const destMatch = text.match(/(?:Nome do destinat[áa]rio|Recebedor|Favorecido)[:\s]*([^\n]+)/i);
  const destName = destMatch ? destMatch[1].trim() : '';

  const payerMatch = text.match(/(?:Nome do pagador|Pagador|Solicitante)[:\s]*([^\n]+)/i);
  const payerName = payerMatch ? payerMatch[1].trim() : '';

  const isReceived = /recebimento|recebido|transferência recebida/i.test(text);

  let description: string;
  let type: TransactionType;

  if (isReceived) {
    description = `PIX recebido de ${payerName || 'N/A'}`;
    type = 'recorrencia';
  } else {
    description = `PIX para ${destName || 'N/A'}`;
    type = 'despesa';
  }

  return {
    date,
    description,
    amount: type === 'despesa' ? -amount : amount,
    type,
    status: 'recebido',
    category: categorize(description + ' ' + destName + ' ' + payerName),
    month: date.substring(0, 7),
  };
}

function parseExtratoPDF(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  const lineRegex = /(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+([\-]?\s*R?\$?\s*[\d.,]+)\s*(D|C|[-+])?/gi;
  let match;

  while ((match = lineRegex.exec(text)) !== null) {
    const dateRaw = match[1];
    const desc = match[2].trim();
    const amountRaw = match[3];
    const dcFlag = match[4]?.trim();

    const date = parseFlexibleDate(dateRaw);
    if (!date) continue;

    let amount = parseBRLAmount(amountRaw);
    if (isNaN(amount)) continue;

    if (dcFlag === 'D' || dcFlag === '-') amount = -Math.abs(amount);
    else if (dcFlag === 'C' || dcFlag === '+') amount = Math.abs(amount);

    const isExpense = amount < 0;

    transactions.push({
      date,
      description: desc,
      amount,
      type: isExpense ? 'despesa' : 'recorrencia',
      status: 'recebido',
      category: categorize(desc),
      month: date.substring(0, 7),
    });
  }

  return transactions;
}

// ─── OFX Parser ───────────────────────────────────────────────

export function parseOFX(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;

  while ((match = trnRegex.exec(content)) !== null) {
    const block = match[1];

    const amount = extractOFXField(block, 'TRNAMT');
    const dateRaw = extractOFXField(block, 'DTPOSTED');
    const memo = extractOFXField(block, 'MEMO') || extractOFXField(block, 'NAME') || 'Sem descrição';

    if (!amount || !dateRaw) continue;

    const numAmount = parseFloat(amount.replace(',', '.'));
    const date = parseOFXDate(dateRaw);
    if (!date) continue;

    const isExpense = numAmount < 0;

    transactions.push({
      date,
      description: memo.trim(),
      amount: numAmount,
      type: isExpense ? 'despesa' : 'recorrencia',
      status: 'recebido',
      category: categorize(memo),
      month: date.substring(0, 7),
    });
  }

  return transactions;
}

function extractOFXField(block: string, field: string): string | null {
  const xmlRegex = new RegExp(`<${field}>([^<]+)</${field}>`, 'i');
  const sgmlRegex = new RegExp(`<${field}>([^\\n<]+)`, 'i');

  const xmlMatch = block.match(xmlRegex);
  if (xmlMatch) return xmlMatch[1].trim();

  const sgmlMatch = block.match(sgmlRegex);
  if (sgmlMatch) return sgmlMatch[1].trim();

  return null;
}

function parseOFXDate(raw: string): string | null {
  const cleaned = raw.replace(/\[.*\]/, '').trim();
  if (cleaned.length < 8) return null;
  return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 6)}-${cleaned.substring(6, 8)}`;
}

// ─── CSV Parser ───────────────────────────────────────────────

export function parseCSV(content: string): ParsedTransaction[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const separator = detectSeparator(lines[0]);
  const headerCols = splitCSVLine(lines[0], separator).map(h => h.replace(/^"|"$/g, '').trim());

  // Try Banco do Brasil / Sicredi specific format first
  const bbResult = parseBBFormat(lines, separator, headerCols);
  if (bbResult.length > 0) return bbResult;

  // Generic CSV
  const header = headerCols.map(h => h.toLowerCase());
  const mapping = detectColumnMapping(header);

  if (!mapping) {
    return parseHeaderlessCSV(lines, separator);
  }

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], separator);
    if (cols.length < 3) continue;

    const dateRaw = cols[mapping.dateIdx]?.replace(/^"|"$/g, '').trim();
    const desc = cols[mapping.descIdx]?.replace(/^"|"$/g, '').trim();
    const amountRaw = cols[mapping.amountIdx]?.replace(/^"|"$/g, '').trim();

    if (!dateRaw || !desc || !amountRaw) continue;

    const date = parseFlexibleDate(dateRaw);
    if (!date) continue;

    const numAmount = parseBRLAmount(amountRaw);
    if (isNaN(numAmount)) continue;

    const isExpense = numAmount < 0;

    transactions.push({
      date,
      description: desc,
      amount: numAmount,
      type: isExpense ? 'despesa' : 'recorrencia',
      status: 'recebido',
      category: categorize(desc),
      month: date.substring(0, 7),
    });
  }

  return transactions;
}

// ─── Banco do Brasil / Brazilian Bank CSV Format ──────────────

function parseBBFormat(lines: string[], sep: string, headerCols: string[]): ParsedTransaction[] {
  // Detect BB format by header pattern:
  // "Data","Lançamento","Detalhes","Nº documento","Valor","Tipo Lançamento"
  // Headers may have encoding issues, so normalize and check loosely
  const normalized = headerCols.map(h =>
    h.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase().trim()
  );

  // Check if first column is "data" and we have at least 5 columns
  const hasData = normalized[0] === 'data';
  const hasValor = normalized.some(h => h.includes('valor'));
  const hasMultipleCols = headerCols.length >= 5;

  if (!hasData || !hasValor || !hasMultipleCols) return [];

  // Find column indices
  const dateIdx = 0; // "Data" is always first
  const valorIdx = normalized.findIndex(h => h === 'valor');
  if (valorIdx < 0) return [];

  // "Lançamento" column (transaction type) — index 1 usually
  // "Detalhes" column — index 2 usually
  // We combine them for the description
  const lancamentoIdx = 1;
  const detalhesIdx = 2;

  // "Tipo Lançamento" column (Entrada/Saída) — last column usually
  const tipoIdx = normalized.findIndex(h => h.includes('tipo'));

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], sep).map(c => c.replace(/^"|"$/g, '').trim());
    if (cols.length < 5) continue;

    const dateRaw = cols[dateIdx];

    // Skip invalid dates (00/00/0000 = "Saldo do dia" rows)
    if (!dateRaw || dateRaw.startsWith('00/') || dateRaw === '00/00/0000') continue;

    const date = parseFlexibleDate(dateRaw);
    if (!date) continue;

    const lancamento = cols[lancamentoIdx] || '';
    const detalhes = cols[detalhesIdx] || '';
    const amountRaw = cols[valorIdx];

    if (!amountRaw) continue;

    // Skip "Saldo Anterior", "Saldo do dia", "S A L D O" rows
    if (/saldo|^s\s*a\s*l\s*d\s*o$/i.test(lancamento)) continue;

    const numAmount = parseBRLAmount(amountRaw);
    if (isNaN(numAmount) || numAmount === 0) continue;

    // Build description from lancamento + detalhes
    let description = lancamento;
    if (detalhes && detalhes !== lancamento) {
      // Clean up time prefix from detalhes (e.g., "02/03 20:17 FULANO" → "FULANO")
      const cleanDetail = detalhes.replace(/^\d{2}\/\d{2}\s+\d{2}:\d{2}\s+/, '').trim();
      if (cleanDetail) {
        description = `${lancamento} - ${cleanDetail}`;
      }
    }

    // Skip BB Rende Fácil (automatic investment sweeps)
    if (/rende\s*f[áa]cil/i.test(lancamento)) continue;

    const isExpense = numAmount < 0;

    transactions.push({
      date,
      description,
      amount: numAmount,
      type: isExpense ? 'despesa' : 'recorrencia',
      status: 'recebido',
      category: categorize(description + ' ' + detalhes),
      month: date.substring(0, 7),
    });
  }

  return transactions;
}

// ─── Generic helpers ──────────────────────────────────────────

function detectSeparator(headerLine: string): string {
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0, '|': 0 };
  for (const char of headerLine) {
    if (char in counts) counts[char]++;
  }
  if (counts[';'] >= 2) return ';';
  if (counts[','] >= 2) return ',';
  if (counts['\t'] >= 2) return '\t';
  return ',';
}

function splitCSVLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === sep && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

interface ColumnMapping {
  dateIdx: number;
  descIdx: number;
  amountIdx: number;
}

function detectColumnMapping(header: string[]): ColumnMapping | null {
  const dateKw = ['data', 'date', 'dt'];
  const descKw = ['descricao', 'descrição', 'description', 'historico', 'histórico', 'memo', 'lancamento', 'lançamento', 'titulo', 'título', 'detail', 'detalhes'];
  const amountKw = ['valor', 'amount', 'value', 'quantia', 'vlr', 'montante'];

  let dateIdx = -1, descIdx = -1, amountIdx = -1;

  for (let i = 0; i < header.length; i++) {
    const h = header[i].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (dateIdx === -1 && dateKw.some(k => h.includes(k))) dateIdx = i;
    if (descIdx === -1 && descKw.some(k => h.includes(k))) descIdx = i;
    if (amountIdx === -1 && amountKw.some(k => h.includes(k))) amountIdx = i;
  }

  if (dateIdx >= 0 && descIdx >= 0 && amountIdx >= 0) {
    return { dateIdx, descIdx, amountIdx };
  }
  return null;
}

function parseHeaderlessCSV(lines: string[], sep: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  for (const line of lines) {
    const cols = splitCSVLine(line, sep);
    if (cols.length < 3) continue;

    const dateRaw = cols[0].replace(/^"|"$/g, '').trim();
    const desc = cols.length === 3 ? cols[1].replace(/^"|"$/g, '').trim() : cols.slice(1, -1).join(' ').replace(/^"|"$/g, '').trim();
    const amountRaw = cols[cols.length - 1].replace(/^"|"$/g, '').trim();

    const date = parseFlexibleDate(dateRaw);
    if (!date) continue;

    const numAmount = parseBRLAmount(amountRaw);
    if (isNaN(numAmount)) continue;

    const isExpense = numAmount < 0;

    transactions.push({
      date,
      description: desc,
      amount: numAmount,
      type: isExpense ? 'despesa' : 'recorrencia',
      status: 'recebido',
      category: categorize(desc),
      month: date.substring(0, 7),
    });
  }

  return transactions;
}

// ─── Date & Amount Utils ──────────────────────────────────────

export function parseFlexibleDate(raw: string): string | null {
  // Skip invalid dates
  if (raw.startsWith('00/') || raw === '00/00/0000') return null;

  const brMatch = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const isoMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  return null;
}

export function parseBRLAmount(raw: string): number {
  let cleaned = raw.replace(/\s/g, '').replace(/R\$/g, '');

  if (/\d\.\d{3}/.test(cleaned) && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    cleaned = cleaned.replace(',', '.');
  } else if (/\d,\d{3}/.test(cleaned) && cleaned.includes('.')) {
    cleaned = cleaned.replace(/,/g, '');
  }

  return parseFloat(cleaned);
}

// ─── Auto-categorization ─────────────────────────────────────

const CATEGORY_RULES: [RegExp, string][] = [
  [/pix.*(?:enviado|transfere|envio)/i, 'PIX Enviado'],
  [/pix.*recebido/i, 'PIX Recebido'],
  [/pix.*devolvido/i, 'PIX Devolvido'],
  [/ted|doc|transf/i, 'Transferência'],
  [/boleto|pagamento de boleto/i, 'Boleto'],
  [/compra.*cart[aã]o/i, 'Cartão Débito'],
  [/salario|salário|folha|proventos/i, 'Salário'],
  [/aluguel|condominio|condomínio|iptu|imobili/i, 'Moradia'],
  [/luz|energia|celpe|enel|cemig|copel|cpfl|ceee|dist.*energ/i, 'Energia'],
  [/agua|água|saneamento|compesa|sabesp|corsan/i, 'Água'],
  [/internet|fibra|net\s|claro|vivo|tim|oi\s|fale\s*s\.?a/i, 'Telecom'],
  [/google/i, 'Tecnologia'],
  [/uber|99|cabify|lyft/i, 'Transporte'],
  [/ifood|rappi|zé\s*delivery|restaurante|cafe|bistro|bar\s/i, 'Alimentação'],
  [/mercado|supermercado|atacad[aã]o|assai|carrefour|zaffari|minimercado/i, 'Mercado'],
  [/farmacia|farmácia|drogaria|droga|panvel|s[aã]o jo[aã]o/i, 'Saúde'],
  [/combustivel|combustível|gasolina|etanol|posto|shell|ipiranga/i, 'Combustível'],
  [/netflix|spotify|disney|hbo|amazon\s*prime|apple/i, 'Assinatura'],
  [/seguro|porto\s*seguro|sulamerica|bradesco\s*seg/i, 'Seguro'],
  [/imposto|tributo|darf|gps|inss|irrf/i, 'Impostos'],
  [/fatura|anuidade/i, 'Cartão'],
  [/emprestimo|empréstimo|financiamento|parcela/i, 'Financiamento'],
  [/invest|cdb|tesouro|lci|lca|fundo|a[çc][aã]o|rende/i, 'Investimento'],
  [/escola|faculdade|curso|mensalidade|educa[çc][aã]o/i, 'Educação'],
];

export function categorize(description: string): string {
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(description)) return category;
  }
  return 'Outros';
}

// ─── Main Parser ──────────────────────────────────────────────

export async function parseStatement(file: File, filename: string): Promise<ParsedTransaction[]> {
  const ext = filename.toLowerCase().split('.').pop();

  let transactions: ParsedTransaction[];

  if (ext === 'pdf') {
    transactions = await parsePDF(file);
  } else {
    const content = await readFileContent(file);

    if (ext === 'ofx' || ext === 'ofc') {
      transactions = parseOFX(content);
    } else if (ext === 'csv' || ext === 'txt') {
      transactions = parseCSV(content);
    } else {
      if (content.includes('<STMTTRN>') || content.includes('<OFX>')) {
        transactions = parseOFX(content);
      } else {
        transactions = parseCSV(content);
      }
    }
  }

  // Filter up to today
  const today = new Date().toISOString().split('T')[0];
  transactions = transactions.filter(t => t.date <= today);

  // Sort by date ascending
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  return transactions;
}
