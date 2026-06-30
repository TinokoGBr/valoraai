require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const chatRoutes = require('./routes/chat');
const importRoutes = require('./routes/import');
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Validação de variáveis obrigatórias ----------
const required = ['GEMINI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY'];
const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`\n❌ Variáveis de ambiente ausentes: ${missing.join(', ')}`);
  console.error('   Configure-as no Render (Environment) ou no arquivo .env local.\n');
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
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/import', importRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Valora.AI Backend' });
});

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Valora.AI Backend rodando na porta ${PORT}`);
  console.log(`   Endpoints disponíveis:`);
  console.log(`   POST /api/auth/signup`);
  console.log(`   POST /api/auth/login`);
  console.log(`   GET  /api/data/transactions`);
  console.log(`   POST /api/data/transactions`);
  console.log(`   GET  /api/data/investments`);
  console.log(`   POST /api/data/investments`);
  console.log(`   GET  /api/data/goals`);
  console.log(`   POST /api/data/goals`);
  console.log(`   POST /api/chat`);
  console.log(`   POST /api/import`);
  console.log(`   GET  /api/health\n`);
});
