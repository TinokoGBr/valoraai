const { supabaseAdmin } = require('../utils/supabase');

// Verifica o token enviado pelo front-end (header Authorization: Bearer <token>)
// e, se for válido, anexa o usuário autenticado em req.user.
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Não autenticado. Faça login novamente.' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }

  req.user = data.user;
  req.token = token;
  next();
}

module.exports = { requireAuth };
