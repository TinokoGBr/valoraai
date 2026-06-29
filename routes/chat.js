const express = require('express');
const { GoogleGenAI } = require('@google/genai');

const router = express.Router();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Contexto fixo do consultor — em produção, monte essa string dinamicamente
// a partir dos dados reais do usuário (banco de dados), em vez de texto fixo.
function buildSystemPrompt(userContext) {
  return `Você é o Consultor IA do app FinançasPro, um assistente financeiro pessoal inteligente.

Dados financeiros do usuário:
${userContext || 'Nenhum dado financeiro fornecido ainda.'}

Responda em português do Brasil, de forma objetiva, prática e personalizada.
Forneça recomendações concretas com valores e percentuais quando possível.
Máximo de 3 parágrafos por resposta, a menos que seja pedido um diagnóstico completo.`;
}

// Converte o histórico no formato do nosso front ({role, content})
// para o formato que o Gemini espera ({role: 'user'|'model', parts: [{text}]}).
// O Gemini exige: (1) o histórico deve começar com role 'user', e
// (2) os papéis devem alternar estritamente (user, model, user, model...).
// Por isso descartamos mensagens iniciais do tipo 'model' (ex: saudação automática
// do bot) e colapsamos qualquer sequência repetida do mesmo papel.
function toGeminiHistory(history) {
  if (!Array.isArray(history)) return [];

  const converted = history.map(h => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }],
  }));

  const firstUserIndex = converted.findIndex(h => h.role === 'user');
  if (firstUserIndex === -1) return []; // não há nenhuma mensagem de usuário ainda

  const trimmed = converted.slice(firstUserIndex);

  // Garante alternância estrita — se dois papéis iguais aparecerem em sequência,
  // mantém só o último daquela sequência.
  const alternated = [];
  for (const item of trimmed) {
    const last = alternated[alternated.length - 1];
    if (last && last.role === item.role) {
      alternated[alternated.length - 1] = item;
    } else {
      alternated.push(item);
    }
  }

  return alternated;
}

/**
 * POST /api/chat
 * body: { message: string, userContext?: string, history?: [{role, content}] }
 */
router.post('/', async (req, res) => {
  try {
    const { message, userContext, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Campo "message" é obrigatório.' });
    }

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: buildSystemPrompt(userContext),
      },
      history: toGeminiHistory(history),
    });

    const result = await chat.sendMessage({ message });
    const text = result.text;

    res.json({ reply: text });
  } catch (err) {
    console.error('Erro no /api/chat:', err.message);
    res.status(500).json({ error: 'Não foi possível consultar a IA agora. Tente novamente.' });
  }
});

/**
 * POST /api/chat/diagnosis
 * body: { userContext: string }
 * Gera o diagnóstico completo exibido na tela do Consultor IA.
 */
router.post('/diagnosis', async (req, res) => {
  try {
    const { userContext } = req.body;

    const prompt = 'Gere um diagnóstico financeiro completo e atualizado com 4 pontos principais: análise de gastos, oportunidades de economia, estratégia de investimento e previsão financeira. Use dados concretos e valores em reais. Responda em formato JSON com a estrutura: {"items": [{"title": "...", "text": "..."}]} — exatamente 4 itens, sem texto fora do JSON.';

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: buildSystemPrompt(userContext),
        responseMimeType: 'application/json',
      },
    });
    const text = result.text;

    let parsed;
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = { items: [{ title: 'Diagnóstico', text }] };
    }

    res.json(parsed);
  } catch (err) {
    console.error('Erro no /api/chat/diagnosis:', err.message);
    res.status(500).json({ error: 'Não foi possível gerar o diagnóstico agora.' });
  }
});

module.exports = router;
