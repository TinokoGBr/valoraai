const { GoogleGenAI, Type } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const CATEGORIES = [
  'salario', 'freelance', 'comissao', 'rendimentos',
  'moradia', 'alimentacao', 'transporte', 'saude',
  'educacao', 'lazer', 'assinaturas', 'impostos',
  'transferencia', 'outros',
];

const EXTRACTION_PROMPT = `Você é um sistema especializado em extrair lançamentos financeiros de extratos bancários brasileiros.

Vou te enviar o texto bruto extraído de um extrato bancário (pode ser de qualquer banco: Itaú, Nubank, Bradesco, Banco do Brasil, Caixa, Inter, C6, etc — o layout varia bastante).

Sua tarefa:
1. Identifique CADA lançamento financeiro (entrada ou saída de dinheiro).
2. Para cada lançamento, extraia: data, descrição original, valor e se é entrada (receita) ou saída (despesa).
3. Classifique cada lançamento em UMA destas categorias: ${CATEGORIES.join(', ')}.
   - Use o bom senso pela descrição. Ex: "SUPERMERCADO", "IFOOD" → alimentacao. "UBER", "POSTO" → transporte.
     "ENERGISA", "ALUGUEL", "CONDOMINIO" → moradia. "NETFLIX", "SPOTIFY" → assinaturas.
     "SALARIO", "FOLHA PAGAMENTO" → salario. "PIX RECEBIDO" sem contexto claro → outros (a menos que o nome indique salário/freelance).
4. Atribua um nível de confiança ("high" ou "medium") para a categoria escolhida.
   - "high": a descrição deixa claro o tipo de gasto.
   - "medium": você teve que adivinhar com pouca informação.
5. Ignore linhas que não são lançamentos reais (cabeçalhos, saldo do dia, totais, "saldo anterior", etc).
6. Datas devem estar em formato ISO: YYYY-MM-DD. Se o ano não estiver explícito no extrato, assuma o ano atual.
7. Valores devem ser números positivos (sem sinal). O campo "type" já indica se é receita ou despesa.

Se não conseguir identificar NENHUM lançamento, devolva uma lista vazia.

Texto do extrato:
---
`;

// Schema estruturado nativo do Gemini — garante que a resposta sempre
// venha no formato esperado, sem precisar fazer parsing manual "na esperança".
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    transactions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING, description: 'Data no formato YYYY-MM-DD' },
          desc: { type: Type.STRING, description: 'Descrição original do lançamento' },
          type: { type: Type.STRING, enum: ['receita', 'despesa'] },
          category: { type: Type.STRING, enum: CATEGORIES },
          amount: { type: Type.NUMBER, description: 'Valor absoluto, sem sinal' },
          confidence: { type: Type.STRING, enum: ['high', 'medium'] },
        },
        required: ['date', 'desc', 'type', 'category', 'amount', 'confidence'],
      },
    },
  },
  required: ['transactions'],
};

/**
 * Envia o texto bruto extraído do arquivo para a IA e recebe de volta
 * uma lista estruturada de transações (data, descrição, valor, tipo, categoria).
 */
async function structureStatementWithAI(rawText) {
  // Extratos muito longos são truncados para caber no contexto e reduzir custo.
  // Para extratos enormes, o ideal em produção é dividir em lotes (chunks).
  const MAX_CHARS = 15000;
  const trimmedText = rawText.length > MAX_CHARS
    ? rawText.slice(0, MAX_CHARS) + '\n\n[...extrato truncado por tamanho...]'
    : rawText;

  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: EXTRACTION_PROMPT + trimmedText,
    config: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });
  const text = result.text;

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error('A IA retornou um formato inesperado. Tente novamente ou use outro arquivo.');
  }

  if (!Array.isArray(parsed.transactions)) {
    throw new Error('Nenhum lançamento foi identificado no arquivo.');
  }

  // Validação e limpeza básica de cada item
  return parsed.transactions
    .filter(t => t && t.date && t.desc && typeof t.amount === 'number')
    .map((t, idx) => ({
      id: idx + 1,
      date: t.date,
      desc: String(t.desc).trim(),
      type: t.type === 'receita' ? 'receita' : 'despesa',
      category: CATEGORIES.includes(t.category) ? t.category : 'outros',
      amount: Math.abs(t.amount),
      confidence: t.confidence === 'high' ? 'high' : 'medium',
    }));
}

module.exports = { structureStatementWithAI, CATEGORIES };
