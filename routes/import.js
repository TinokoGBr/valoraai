const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const { extractTextFromFile } = require('../utils/fileParser');
const { structureStatementWithAI } = require('../utils/aiStructuring');

const router = express.Router();

// Armazena o arquivo temporariamente em /uploads, com nome único.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const ALLOWED_EXTENSIONS = ['.pdf', '.xlsx', '.xls', '.csv', '.ofx'];

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB por arquivo
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error(`Formato não permitido: ${ext}. Use PDF, Excel, CSV ou OFX.`));
    }
    cb(null, true);
  },
});

/**
 * POST /api/import
 * multipart/form-data com campo "file"
 * Resposta: { fileName, transactions: [...] }
 */
router.post('/', upload.single('file'), async (req, res) => {
  let filePath;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    filePath = req.file.path;
    const originalName = req.file.originalname;

    // 1. Extrai o texto bruto do arquivo (PDF/Excel/CSV/OFX)
    const rawText = await extractTextFromFile(filePath, originalName);

    if (!rawText || rawText.trim().length < 10) {
      return res.status(422).json({
        error: 'Não foi possível ler conteúdo do arquivo. Ele pode estar vazio, protegido por senha ou ser uma imagem escaneada.',
      });
    }

    // 2. Envia o texto para a IA estruturar em lançamentos (data, valor, categoria...)
    const transactions = await structureStatementWithAI(rawText);

    res.json({
      fileName: originalName,
      count: transactions.length,
      transactions,
    });
  } catch (err) {
    console.error('Erro no /api/import:', err.message);
    res.status(500).json({ error: err.message || 'Erro ao processar o extrato.' });
  } finally {
    // Remove o arquivo temporário do disco (não guardamos extratos no servidor)
    if (filePath && fs.existsSync(filePath)) {
      fs.unlink(filePath, () => {});
    }
  }
});

module.exports = router;
