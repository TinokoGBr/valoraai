const fs = require('fs');
const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');

/**
 * Extrai texto bruto de um arquivo PDF.
 */
async function extractFromPDF(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * Extrai texto bruto de uma planilha Excel (.xlsx/.xls).
 * Converte cada aba em texto delimitado por | para a IA conseguir ler.
 */
function extractFromExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  let text = '';
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    rows.forEach(row => {
      text += row.join(' | ') + '\n';
    });
  });
  return text;
}

/**
 * Extrai texto bruto de um CSV.
 */
function extractFromCSV(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Extrai texto bruto de um arquivo OFX (formato padrão de extrato bancário).
 * OFX é um XML/SGML simplificado — extraímos as tags de transação (STMTTRN).
 */
function extractFromOFX(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  // Pega todos os blocos <STMTTRN>...</STMTTRN> (ou sem fechamento, formato SGML antigo)
  const matches = raw.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|<\/CCSTMTTRN>)/gi) || [raw];
  return matches.join('\n---\n');
}

/**
 * Roteador principal: detecta o tipo de arquivo pela extensão e
 * devolve o texto bruto extraído para a IA processar.
 */
async function extractTextFromFile(filePath, originalName) {
  const ext = originalName.split('.').pop().toLowerCase();

  switch (ext) {
    case 'pdf':
      return await extractFromPDF(filePath);
    case 'xlsx':
    case 'xls':
      return extractFromExcel(filePath);
    case 'csv':
      return extractFromCSV(filePath);
    case 'ofx':
      return extractFromOFX(filePath);
    default:
      throw new Error(`Formato de arquivo não suportado: .${ext}`);
  }
}

module.exports = { extractTextFromFile };
