const express = require('express');
const { supabaseAdmin } = require('../utils/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas abaixo exigem autenticação
router.use(requireAuth);

// ==================== MOVIMENTAÇÕES ====================

router.get('/transactions', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('date', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar movimentações:', err);
    res.status(500).json({ error: 'Erro ao carregar movimentações.' });
  }
});

router.post('/transactions', async (req, res) => {
  try {
    const { type, category, description, amount, date, payment } = req.body;

    if (!type || !category || !description || !amount || !date) {
      return res.status(400).json({ error: 'Campos obrigatórios: type, category, description, amount, date.' });
    }

    const { data, error } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: req.user.id,
        type,
        category,
        description,
        amount: parseFloat(amount),
        date,
        payment: payment || 'PIX',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Erro ao criar movimentação:', err);
    res.status(500).json({ error: 'Erro ao salvar movimentação.' });
  }
});

router.delete('/transactions/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao apagar movimentação:', err);
    res.status(500).json({ error: 'Erro ao apagar movimentação.' });
  }
});

// ==================== INVESTIMENTOS ====================

router.get('/investments', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('investments')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar investimentos:', err);
    res.status(500).json({ error: 'Erro ao carregar investimentos.' });
  }
});

router.post('/investments', async (req, res) => {
  try {
    const { name, type, amount, return_pct } = req.body;

    if (!name || !type || !amount) {
      return res.status(400).json({ error: 'Campos obrigatórios: name, type, amount.' });
    }

    const { data, error } = await supabaseAdmin
      .from('investments')
      .insert({
        user_id: req.user.id,
        name,
        type,
        amount: parseFloat(amount),
        return_pct: parseFloat(return_pct) || 0,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Erro ao criar investimento:', err);
    res.status(500).json({ error: 'Erro ao salvar investimento.' });
  }
});

router.delete('/investments/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('investments')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao apagar investimento:', err);
    res.status(500).json({ error: 'Erro ao apagar investimento.' });
  }
});

// ==================== METAS ====================

router.get('/goals', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('goals')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar metas:', err);
    res.status(500).json({ error: 'Erro ao carregar metas.' });
  }
});

router.post('/goals', async (req, res) => {
  try {
    const { name, icon, target, current, deadline } = req.body;

    if (!name || !target) {
      return res.status(400).json({ error: 'Campos obrigatórios: name, target.' });
    }

    const { data, error } = await supabaseAdmin
      .from('goals')
      .insert({
        user_id: req.user.id,
        name,
        icon: icon || 'ti-star',
        target: parseFloat(target),
        current: parseFloat(current) || 0,
        deadline: deadline || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Erro ao criar meta:', err);
    res.status(500).json({ error: 'Erro ao salvar meta.' });
  }
});

router.patch('/goals/:id', async (req, res) => {
  try {
    const { current } = req.body;

    const { data, error } = await supabaseAdmin
      .from('goals')
      .update({ current: parseFloat(current) })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Erro ao atualizar meta:', err);
    res.status(500).json({ error: 'Erro ao atualizar meta.' });
  }
});

router.delete('/goals/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('goals')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao apagar meta:', err);
    res.status(500).json({ error: 'Erro ao apagar meta.' });
  }
});

module.exports = router;
