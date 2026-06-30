const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas no .env');
  console.error('   Copie .env.example para .env e cole os valores do painel do Supabase\n');
  console.error('   (Project Settings → API).\n');
  process.exit(1);
}

// Cliente "admin": usa a service_role key, que ignora as regras de RLS.
// Por isso ele só pode existir aqui, no servidor — nunca no front-end.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws },
  }
);

// Cria um cliente "como o usuário", a partir do token enviado por ele.
// Esse cliente RESPEITA as regras de RLS (cada usuário só vê seus dados),
// o que é uma camada extra de segurança além da verificação manual.
function supabaseAsUser(accessToken) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: ws },
    }
  );
}

module.exports = { supabaseAdmin, supabaseAsUser };
