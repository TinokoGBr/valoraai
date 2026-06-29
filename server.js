require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const chatRoutes = require('./routes/chat');
const importRoutes = require('./routes/import');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Segurança básica ----------
if (!process.env.GEMINI_API_KEY) {
  console.error('\n❌ GEMINI_API_KEY não encontrada no .env');
  console.error('   Copie .env.example para .env e cole sua chave do Google AI Studio.\n');
  process.exit(1);
}

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
}));

app.use(express.json({ limit: '2mb' }));

// Limite de requisições — evita abuso/custos inesperados na API do Gemini
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 60,                  // 60 requisições por IP nesse intervalo
  message: { error: 'Muitas requisições. Aguarde um pouco e tente novamente.' },
});
app.use('/api/', limiter);

// ---------- Rotas ----------
app.use('/api/chat', chatRoutes);
app.use('/api/import', importRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'FinançasPro Backend' });
});

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ FinançasPro Backend rodando na porta ${PORT}`);
  console.log(`   Endpoints disponíveis:`);
  console.log(`   POST /api/chat`);
  console.log(`   POST /api/import`);
  console.log(`   GET  /api/health\n`);
});
