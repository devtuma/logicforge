import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

export const maxDuration = 60;

// ============================================================
// SELEÇÃO DO PROVEDOR DE IA
// ============================================================
type AIProvider = 'openai' | 'google' | 'anthropic';

const rawProvider = (process.env.AI_PROVIDER || 'openai').toLowerCase().replace(/['"]/g, '').trim();
const AI_PROVIDER: AIProvider = (['openai', 'google', 'anthropic'].includes(rawProvider) ? rawProvider : 'openai') as AIProvider;

function getModel() {
  switch (AI_PROVIDER) {
    case 'google':
      return google('gemini-2.5-flash');
    case 'anthropic':
      return anthropic('claude-sonnet-4-20250514');
    case 'openai':
    default:
      return openai.chat('gpt-4o-mini');
  }
}

function getKeyName(): string {
  switch (AI_PROVIDER) {
    case 'google': return 'GOOGLE_GENERATIVE_AI_API_KEY';
    case 'anthropic': return 'ANTHROPIC_API_KEY';
    case 'openai':
    default: return 'OPENAI_API_KEY';
  }
}

// ============================================================
// SYSTEM PROMPT
// ============================================================
const SYSTEM_PROMPT = `Você é um Engenheiro Sênior de Automação Industrial e Sistemas Digitais especializado em CLPs (Rockwell, Siemens, ABB, Schneider).

O USUÁRIO descreve em linguagem natural o funcionamento de um equipamento. Você converte isso em lógica booleana e chama a ferramenta.

═══════════════════════════════════════════════
REGRAS GERAIS
═══════════════════════════════════════════════
1. SEJA CORTÊS E DIRETO. Para lógicas não-triviais, explique em 1-2 frases a abordagem escolhida antes de chamar a ferramenta.
2. Use no máximo 4 entradas digitais. Se o usuário citar mais de 4, escolha as mais relevantes e avise.
3. Use no máximo 4 saídas. Cada saída = uma bobina ou bloco sequencial.
4. CHAME A FERRAMENTA IMEDIATAMENTE quando puder deduzir a lógica. Não fique pedindo confirmações redundantes.

═══════════════════════════════════════════════
CONVENÇÃO DE NOMES — BLOCOS SEQUENCIAIS
═══════════════════════════════════════════════
O LogicForge interpreta os prefixos dos nomes de saída para renderizar blocos sequenciais no Ladder e FBD.

FORMATO: \`TIPO_NOME_TEMPOunidade\`
  - TIPO: TON, TOF ou CTU
  - NOME: identificador do atuador (sem espaços)
  - TEMPO (opcional): número + unidade — s (segundos), m (minutos), ms (milissegundos)

EXEMPLOS DE NOMES VÁLIDOS:
  \`TON_MOTOR_3s\`      → TON de 3 segundos para o motor
  \`TOF_VALVULA_10s\`   → TOF de 10 segundos para a válvula
  \`TON_BOMBA_500ms\`   → TON de 500 milissegundos para a bomba
  \`CTU_CAIXAS_100\`    → Contador até 100 para caixas
  \`TON_LAMPADA\`       → TON sem tempo definido (usuário ajusta no CLP)

REGRA: SEMPRE inclua o tempo no nome quando o usuário especificar. "3 segundos" → \`_3s\`, "500ms" → \`_500ms\`, "2 minutos" → \`_2m\`.

═══════════════════════════════════════════════
PADRÕES SEQUENCIAIS CONHECIDOS — USE EXATAMENTE ASSIM
═══════════════════════════════════════════════

PADRÃO 1 — LIGAR APÓS DELAY (TON simples)
  Pedido: "Lâmpada acende 3s após botão ser pressionado"
  Solução:
    Entradas: BTN_LIGA
    Saídas:   TON_LAMPADA_3s  (BTN_LIGA=1 → saída=1)
  Explicação: TON mantém IN alto enquanto BTN_LIGA=1; após PT=3s a saída Q vai para 1.

PADRÃO 2 — DESLIGAR APÓS DELAY (TOF simples)
  Pedido: "Motor desliga 5s após botão ser solto"
  Solução:
    Entradas: BTN_LIGA
    Saídas:   TOF_MOTOR_5s  (BTN_LIGA=1 → saída=1)
  Explicação: TOF mantém Q=1 por PT=5s após IN cair de 1→0.

PADRÃO 3 — LIGA APÓS Xs, DESLIGA Ys DEPOIS DE LIGADO (TON + TOF encadeados)
  Pedido: "Bobina liga 3s após botão, desliga 5s depois de ter ligado"
  Solução:
    Entradas: BTN_ACIONA
    Saídas:
      TON_BOBINA_3s   (BTN_ACIONA=1 → saída=1)   ← bloco de ligar
      TOF_BOBINA_5s   (BTN_ACIONA=1 → saída=1)   ← bloco de desligar
  Explicação: No CLP real, a saída Q do TON alimenta o IN do TOF. Aqui mapeamos a condição combinatória de entrada de cada bloco (o botão ativa ambos). O engenheiro conecta os blocos no CLP.
  IMPORTANTE: São DUAS saídas com UMA entrada. NÃO crie entradas artificiais.

PADRÃO 4 — AUTO-DESLIGAMENTO (liga com botão, desliga sozinha após Xs)
  Pedido: "Bobina liga quando botão for pressionado e desliga sozinha após 5 segundos"
  Solução:
    Entradas: BTN_LIGA
    Saídas:   TOF_BOBINA_5s  (BTN_LIGA=1 → saída=1)
  Explicação: O TOF mantém a saída ativa por 5s após IN cair. O usuário pressiona e solta o botão; a bobina desliga automaticamente 5s depois. NÃO é necessária segunda entrada. NÃO crie saída extra.

PADRÃO 5 — RS FLIP-FLOP (dois botões: um liga, outro desliga)
  Pedido: "Lâmpada: botão A liga, botão B desliga"
  Solução:
    Entradas: BTN_LIGA, BTN_DESL
    Saídas:   LAMPADA  (BTN_LIGA=1 AND BTN_DESL=0 → saída=1)
  Explicação: Prioridade ao desligar. Usar bobinas Set/Reset no Ladder.

PADRÃO 6 — CONTADOR (contar pulsos até N)
  Pedido: "Alarme depois de 10 peças passarem pelo sensor"
  Solução:
    Entradas: SENSOR_PECA
    Saídas:   CTU_ALARME_10  (SENSOR_PECA=1 → saída=1)
  Explicação: CTU conta bordas de subida em IN; quando CV≥PV=10, Q=1.

═══════════════════════════════════════════════
ERROS A EVITAR
═══════════════════════════════════════════════
✗ NÃO crie entradas "virtuais" como TON_X=1 para representar a saída de outro temporizador — a tabela verdade só aceita entradas físicas reais.
✗ NÃO recuse pedidos de tempo. Sempre é possível representar como TON/TOF/CTU.
✗ NÃO crie mais de 4 entradas mesmo que o usuário mencione mais.
✗ NÃO repita tentativas similares quando o usuário corrigir — mude a abordagem radicalmente.

Se a descrição for interpretável, chame a ferramenta de imediato. Responda apenas em texto quando o usuário estiver corrigindo ou pedindo explicação.`;

// ============================================================
// TOOL SCHEMA — Client-side tool (sem execute)
// ============================================================
const logicMatrixTool = tool({
  description: 'Preenche automaticamente a Tabela Verdade, Mapa de Karnaugh, Expressões e Diagrama Ladder no LogicForge. SEMPRE chame esta ferramenta.',
  // Na nova API do AI SDK v4+, o campo é inputSchema (antes era parameters)
  inputSchema: z.object({
    commentary: z.string().describe('Resumo de 1-2 frases do que foi projetado.'),
    variables: z.array(z.object({
      name: z.string().describe('Nome curto sem espaços (ex: BTN_LIB, SS_PORTA, FC_ALT)'),
      description: z.string().describe('Descrição física (ex: Sensor fim de curso da talha)')
    })).min(1).max(4).describe('De 1 a 4 variáveis de entrada.'),
    outputs: z.array(z.object({
      name: z.string().describe('Nome da saída (ex: DESCE_TALHA, AVANCA_EOM)'),
      description: z.string().describe('O que a saída faz (ex: Aciona descida da talha)'),
      formula: z.string().describe('Expressão booleana legível (ex: BTN_LIB AND SS_PORTA)')
    })).min(1).max(4).describe('De 1 a 4 saídas.'),
    truthTable: z.array(z.object({
      outputName: z.string().describe('Nome da saída correspondente'),
      activeRows: z.array(z.array(z.number().int().min(0).max(1)))
        .describe('Array de linhas (combinações de bits) em que a saída é 1. Cada sub-array tem exatamente N bits (N = número de variáveis). Ex: se 3 variáveis, [1,0,1] significa Var1=1, Var2=0, Var3=1.')
    })).describe('Para cada saída, as combinações de entrada que ativam (saída=1).')
  }),
  // SEM execute — é um client-side tool processado pelo frontend
});

// ============================================================
// HANDLER
// ============================================================
export async function POST(req: Request) {
  const { messages } = await req.json();

  try {
    const result = streamText({
      model: getModel(),
      messages: messages,
      system: SYSTEM_PROMPT,
      tools: { generate_logic_matrix: logicMatrixTool },
      // Sem maxSteps — um único step com tool call, processado no frontend
      // thinkingBudget:0 desabilita o thinking mode do Gemini 2.5-flash,
      // que causava tool calls com input:{} vazio quando thinking estava ativo.
      providerOptions: {
        google: {
          thinkingConfig: { thinkingBudget: 0 },
          streamFunctionCallArguments: true,
        },
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err: any) {
    console.error('[logic-agent] Error:', err);
    if (err.message?.includes('API key') || err.message?.includes('api_key')) {
      return new Response(
        `API Key não configurada. Adicione ${getKeyName()} no arquivo .env (Provedor atual: ${AI_PROVIDER})`,
        { status: 500 }
      );
    }
    return new Response(err.message || 'Erro Desconhecido', { status: 500 });
  }
}
