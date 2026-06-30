const express = require('express');
const { supabaseAdmin } = require('../utils/supabase');

const router = express.Router();

// ---------- Criar conta ----------
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({
        error: 'Preencha todos os campos. A senha deve ter ao menos 6 caracteres.',
      });
    }

    // Cria o usuário já confirmado (sem exigir clique em e-mail de confirmação,
    // já que esse app não tem fluxo de e-mail configurado ainda).
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (error) {
      const msg = error.message.includes('already been registered')
        ? 'Esse e-mail já está cadastrado. Tente fazer login.'
        : 'Não foi possível criar a conta. Tente novamente.';
      return res.status(400).json({ error: msg });
    }

    // Cria o perfil correspondente na tabela profiles.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({ id: data.user.id, name, plan: 'Gratuito' });

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError);
      return res.status(500).json({ error: 'Conta criada, mas houve um erro ao salvar o perfil.' });
    }

    // Gera uma sessão (token) para o usuário já entrar logado, sem precisar
    // fazer login de novo depois de criar a conta.
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return res.status(500).json({ error: 'Conta criada. Faça login para continuar.' });
    }

    res.json({
      user: { id: data.user.id, name, email, plan: 'Gratuito' },
      session: signInData.session,
    });
  } catch (err) {
    console.error('Erro no /api/auth/signup:', err);
    res.status(500).json({ error: 'Erro interno ao criar conta.' });
  }
});

// ---------- Login ----------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Informe e-mail e senha.' });
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return res.status(401).json({
        error: 'E-mail ou senha incorretos. Se ainda não tem conta, use a aba "Criar conta".',
      });
    }

    // Busca o perfil (nome e plano) na tabela profiles.
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name, plan')
      .eq('id', data.user.id)
      .single();

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.name || data.user.user_metadata?.name || 'Usuário',
        plan: profile?.plan || 'Gratuito',
      },
      session: data.session,
    });
  } catch (err) {
    console.error('Erro no /api/auth/login:', err);
    res.status(500).json({ error: 'Erro interno ao fazer login.' });
  }
});

module.exports = router;
