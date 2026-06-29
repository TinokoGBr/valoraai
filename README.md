# FinançasPro — Backend

Backend que liga a IA de verdade ao app FinançasPro: chat do Consultor Financeiro e leitura automática de extratos bancários (PDF, Excel, CSV, OFX). Usa a API do **Google Gemini**.

## Por que isso é necessário

O arquivo `financeapp.html` por si só **não pode** chamar a API do Gemini com segurança quando hospedado em um site público — a chave de API ficaria visível no código do navegador para qualquer visitante. Este backend resolve isso: a chave fica só aqui, no servidor, e o front-end conversa apenas com este backend.

---

## 1. Instalação

Pré-requisito: [Node.js](https://nodejs.org) versão 18 ou mais recente.

```bash
cd financeapp-backend
npm install
```

## 2. Configurar a chave da API

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```
2. Pegue sua chave em **https://aistudio.google.com/apikey**
3. Abra o `.env` e cole sua chave:
   ```
   GEMINI_API_KEY=AIzaSy-sua-chave-aqui
   ```

⚠️ **Nunca** suba o arquivo `.env` para o GitHub ou qualquer lugar público. Ele já está no `.gitignore`.

## 3. Rodar localmente

```bash
npm start
```

Você verá:
```
✅ FinançasPro Backend rodando na porta 3000
```

Teste se está no ar:
```bash
curl http://localhost:3000/api/health
```

---

## 4. Ligar o front-end (financeapp.html) a este backend

No arquivo `financeapp.html`, já existe uma constante `BACKEND_URL` no topo do `<script>`. Troque pelo endereço do seu backend:

```javascript
const BACKEND_URL = 'https://financeapp-helton.fly.dev'; // ou http://localhost:3000 em desenvolvimento
```

Todo o resto do front já está adaptado para conversar com este backend (chat, diagnóstico e importação de extrato).

---

## 5. Endpoints disponíveis

### `POST /api/chat`
Conversa com o Consultor IA.

**Body:**
```json
{
  "message": "Onde posso economizar este mês?",
  "userContext": "Renda: R$ 8.200. Despesas: R$ 5.720...",
  "history": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }]
}
```

**Resposta:**
```json
{ "reply": "Com base nos seus dados, você pode economizar..." }
```

### `POST /api/chat/diagnosis`
Gera o diagnóstico financeiro completo (os 4 cards da tela do Consultor).

**Body:**
```json
{ "userContext": "Renda: R$ 8.200. Despesas: R$ 5.720..." }
```

**Resposta:**
```json
{ "items": [{ "title": "Gastos crescentes", "text": "..." }, ...] }
```

### `POST /api/import`
Recebe um arquivo de extrato e devolve os lançamentos já estruturados pela IA.

**Tipo de requisição:** `multipart/form-data`, campo `file`.

Formatos aceitos: `.pdf`, `.xlsx`, `.xls`, `.csv`, `.ofx` (máx. 15 MB).

**Resposta:**
```json
{
  "fileName": "extrato_junho.pdf",
  "count": 12,
  "transactions": [
    {
      "id": 1,
      "date": "2025-06-01",
      "desc": "PIX RECEBIDO - EMPRESA AGENCIA LTDA",
      "type": "receita",
      "category": "salario",
      "amount": 6500,
      "confidence": "high"
    }
  ]
}
```

### `GET /api/health`
Verifica se o servidor está no ar.

---

## 6. Deploy no Fly.io

Este projeto já vem com `Dockerfile` e `fly.toml` prontos para o Fly.io.

### a) Instalar o CLI do Fly

**Mac/Linux:**
```bash
curl -L https://fly.io/install.sh | sh
```

**Windows (PowerShell):**
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

### b) Login

```bash
fly auth login
```

### c) Lançar o app

Dentro da pasta `financeapp-backend`:

```bash
fly launch
```

O CLI vai perguntar:
- **Nome do app**: escolha um nome único (ex: `financeapp-helton`)
- **Região**: o `fly.toml` já está configurado para `gru` (São Paulo)
- **Banco de dados agora?** → Não (este backend não precisa)
- **Deploy agora?** → Pode dizer Não ainda; primeiro configure a chave (próximo passo). Se disser Sim, sem problema — é só rodar `fly deploy` de novo depois.

### d) Configurar a chave da API como secret

**Nunca** coloque a chave do Gemini no `fly.toml` (esse arquivo geralmente fica versionado/visível). Use o sistema de *secrets* do Fly:

```bash
fly secrets set GEMINI_API_KEY=AIzaSy-sua-chave-aqui
```

Isso já criptografa e injeta a chave como variável de ambiente, sem ela aparecer em nenhum arquivo do projeto.

### e) Deploy

```bash
fly deploy
```

Ao final, você verá algo como:

```
Visit your newly deployed app at https://financeapp-helton.fly.dev/
```

Essa é a URL do seu backend. Teste:

```bash
curl https://financeapp-helton.fly.dev/api/health
```

### f) Ajustar o domínio liberado (CORS)

Depois de saber onde seu front-end vai ficar hospedado (ex: `https://meusite.com`), atualize a variável `ALLOWED_ORIGIN`:

```bash
fly secrets set ALLOWED_ORIGIN=https://meusite.com
```

Isso reinicia a aplicação automaticamente com o novo valor.

### g) Comandos úteis do dia a dia

```bash
fly logs              # ver logs em tempo real
fly status            # ver se a máquina está rodando
fly deploy            # reenviar após alterar o código
fly secrets list      # ver quais secrets estão configurados (sem mostrar valores)
fly apps restart      # reiniciar manualmente
```

### Sobre o plano gratuito do Fly.io

O `fly.toml` já está configurado com `auto_stop_machines = "stop"` e `min_machines_running = 0` — ou seja, a máquina desliga automaticamente quando não está sendo usada e liga de novo na primeira requisição (com um pequeno delay de alguns segundos no primeiro acesso após inatividade). Isso mantém o custo em zero/quase-zero para uso pessoal.

---

## 6.1. Alternativas de deploy (caso prefira não usar Fly.io)

<details>
<summary>Render.com / Railway.app / VPS própria</summary>

**Render.com**
1. https://render.com → "New Web Service" → conecte seu repositório
2. Build command: `npm install` · Start command: `npm start`
3. Em "Environment", adicione `GEMINI_API_KEY`

**Railway.app**
1. https://railway.app → "New Project" → "Deploy from GitHub repo"
2. Adicione `GEMINI_API_KEY` em "Variables"

**VPS própria**
```bash
git clone <seu-repositorio>
cd financeapp-backend
npm install --production
cp .env.example .env   # edite com sua chave real
npm install -g pm2
pm2 start server.js --name financeapp-backend
pm2 save && pm2 startup
```
</details>

### Importante em produção (qualquer plataforma)
- Ajuste `ALLOWED_ORIGIN` para o domínio exato do seu front-end (em vez de `*`).
- Considere reduzir o `max` do rate limit em `server.js` se quiser controlar custos da API do Gemini.
- Nunca exponha `GEMINI_API_KEY` em variáveis de ambiente do lado do cliente — ela deve existir somente no servidor.

---

## 7. Sobre o modelo usado e custos

Este backend usa o modelo **`gemini-2.5-flash`** — rápido e de baixo custo, adequado tanto para o chat do consultor quanto para estruturar extratos bancários. Caso queira respostas com mais qualidade/raciocínio (com custo maior), troque o nome do modelo nos arquivos `routes/chat.js` e `utils/aiStructuring.js` por `gemini-2.5-pro`.

O Google AI Studio costuma oferecer uma cota gratuita mensal generosa para o Gemini Flash — confira os limites atuais em **https://ai.google.dev/pricing**, já que eles podem mudar.

---

## 8. Estrutura de arquivos

```
financeapp-backend/
├── server.js              → ponto de entrada, configura Express e rotas
├── routes/
│   ├── chat.js             → endpoints de chat e diagnóstico do Consultor IA
│   └── import.js           → endpoint de upload e processamento de extratos
├── utils/
│   ├── fileParser.js       → extrai texto bruto de PDF/Excel/CSV/OFX
│   └── aiStructuring.js    → envia o texto para a IA estruturar em JSON
├── uploads/                → pasta temporária (arquivos são apagados após o processamento)
├── Dockerfile              → empacota o backend para o Fly.io
├── fly.toml                → configuração do Fly.io
├── .env.example            → modelo de variáveis de ambiente
└── package.json
```

## 9. Limitações conhecidas

- PDFs que são **imagens escaneadas** (sem texto selecionável) não funcionam com `pdf-parse` — seria necessário OCR (ex: Tesseract.js, ou enviar a imagem direto para o Gemini, que também aceita imagens). Posso adaptar isso se for um caso comum no seu uso.
- Extratos muito longos (muitas páginas) são truncados em ~15.000 caracteres antes de ir para a IA, para controlar custo e ficar dentro do limite de contexto. Para extratos grandes, o ideal é dividir em lotes — posso implementar isso se for necessário no seu caso.
- O endpoint `/api/import` processa um arquivo por requisição. Múltiplos arquivos = múltiplas chamadas (o front já faz isso em paralelo automaticamente).
