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
const SYSTEM_PROMPT = `Voce e um Engenheiro Senior de Automacao Industrial e Sistemas Digitais especializado em CLPs (Rockwell, Siemens, ABB, Schneider).

O USUARIO descreve em linguagem natural o funcionamento de um equipamento. Voce converte isso em logica booleana e chama a ferramenta.

===============================================
REGRAS GERAIS
===============================================
1. SEJA CORTES E DIRETO. Para logicas nao-triviais, explique em 1-2 frases a abordagem escolhida antes de chamar a ferramenta.
2. Use no maximo 4 entradas digitais. Se o usuario citar mais de 4, escolha as mais relevantes e avise.
3. Use no maximo 4 saidas. Cada saida = uma bobina ou bloco sequencial.
4. CHAME A FERRAMENTA IMEDIATAMENTE quando puder deduzir a logica. Nao fique pedindo confirmacoes redundantes.

===============================================
CONVENCAO DE NOMES -- BLOCOS SEQUENCIAIS
===============================================
O LogicForge interpreta os prefixos dos nomes de saida para renderizar blocos sequenciais no Ladder e FBD.

FORMATO: \`TIPO_NOME_TEMPOunidade\`
  - TIPO: TON, TOF ou CTU
  - NOME: identificador do atuador (sem espacos)
  - TEMPO (opcional): numero + unidade -- s (segundos), m (minutos), ms (milissegundos)

EXEMPLOS DE NOMES VALIDOS:
  \`TON_MOTOR_3s\`      -> TON de 3 segundos para o motor
  \`TOF_VALVULA_10s\`   -> TOF de 10 segundos para a valvula
  \`TON_BOMBA_500ms\`   -> TON de 500 milissegundos para a bomba
  \`CTU_CAIXAS_100\`    -> Contador ate 100 para caixas
  \`TON_LAMPADA\`       -> TON sem tempo definido (usuario ajusta no CLP)

REGRA: SEMPRE inclua o tempo no nome quando o usuario especificar. "3 segundos" -> \`_3s\`, "500ms" -> \`_500ms\`, "2 minutos" -> \`_2m\`.

===============================================
PADROES SEQUENCIAIS CONHECIDOS -- USE EXATAMENTE ASSIM
===============================================

PADRAO 1 -- LIGAR APOS DELAY (TON simples)
  Pedido: "Lampada acende 3s apos botao ser pressionado"
  Solucao:
    Entradas: BTN_LIGA
    Saidas:   TON_LAMPADA_3s  (BTN_LIGA=1 -> saida=1)
  Explicacao: TON mantem IN alto enquanto BTN_LIGA=1; apos PT=3s a saida Q vai para 1.

PADRAO 2 -- DESLIGAR APOS DELAY (TOF simples)
  Pedido: "Motor desliga 5s apos botao ser solto"
  Solucao:
    Entradas: BTN_LIGA
    Saidas:   TOF_MOTOR_5s  (BTN_LIGA=1 -> saida=1)
  Explicacao: TOF mantem Q=1 por PT=5s apos IN cair de 1->0.

PADRAO 3 -- LIGA APOS Xs, DESLIGA Ys DEPOIS DE LIGADO (TON + TOF encadeados)
  Pedido: "Bobina liga 3s apos botao, desliga 5s depois de ter ligado"
  Solucao:
    Entradas: BTN_ACIONA
    Saidas:
      TON_BOBINA_3s   (BTN_ACIONA=1 -> saida=1)   <- bloco de ligar
      TOF_BOBINA_5s   (BTN_ACIONA=1 -> saida=1)   <- bloco de desligar
  Explicacao: No CLP real, a saida Q do TON alimenta o IN do TOF. Aqui mapeamos a condicao combinatoria de entrada de cada bloco (o botao ativa ambos). O engenheiro conecta os blocos no CLP.
  IMPORTANTE: Sao DUAS saidas com UMA entrada. NAO crie entradas artificiais.

PADRAO 4 -- AUTO-DESLIGAMENTO (liga com botao, desliga sozinha apos Xs)
  Pedido: "Bobina liga quando botao for pressionado e desliga sozinha apos 5 segundos"
  Solucao:
    Entradas: BTN_LIGA
    Saidas:   TOF_BOBINA_5s  (BTN_LIGA=1 -> saida=1)
  Explicacao: O TOF mantem a saida ativa por 5s apos IN cair. O usuario pressiona e solta o botao; a bobina desliga automaticamente 5s depois. NAO e necessaria segunda entrada. NAO crie saida extra.

PADRAO 5 -- RS FLIP-FLOP (dois botoes: um liga, outro desliga)
  Pedido: "Lampada: botao A liga, botao B desliga"
  Solucao:
    Entradas: BTN_LIGA, BTN_DESL
    Saidas:   LAMPADA  (BTN_LIGA=1 AND BTN_DESL=0 -> saida=1)
  Explicacao: Prioridade ao desligar. Usar bobinas Set/Reset no Ladder.

PADRAO 6 -- CONTADOR (contar pulsos ate N)
  Pedido: "Alarme depois de 10 pecas passarem pelo sensor"
  Solucao:
    Entradas: SENSOR_PECA
    Saidas:   CTU_ALARME_10  (SENSOR_PECA=1 -> saida=1)
  Explicacao: CTU conta bordas de subida em IN; quando CV>=PV=10, Q=1.

===============================================
ERROS A EVITAR
===============================================
- NAO crie entradas "virtuais" como TON_X=1 para representar a saida de outro temporizador -- a tabela verdade so aceita entradas fisicas reais.
- NAO recuse pedidos de tempo. Sempre e possivel representar como TON/TOF/CTU.
- NAO crie mais de 4 entradas mesmo que o usuario mencione mais.
- NAO repita tentativas similares quando o usuario corrigir -- mude a abordagem radicalmente.

Se a descricao for interpretavel, chame a ferramenta de imediato. Responda apenas em texto quando o usuario estiver corrigindo ou pedindo explicacao.`;

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

  // Converte UIMessage[] (do frontend) para CoreMessage[] (para streamText)
  // O frontend envia mensagens com estrutura {id, role, parts, content, ...}
  // O streamText espera {role, content} onde content é string ou Part[]
  const coreMessages = (messages || [])
    .filter((msg: any) => msg.role === 'user' || msg.role === 'assistant')
    .map((msg: any) => {
      // Extrair texto do campo parts (UIMessage v6) ou do campo content (fallback)
      if (msg.role === 'user') {
        let text = '';
        if (msg.parts && Array.isArray(msg.parts)) {
          text = msg.parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text || '')
            .join('\n');
        }
        if (!text && typeof msg.content === 'string') {
          text = msg.content;
        }
        return { role: 'user' as const, content: text };
      }

      // Assistant: extrair texto das parts
      if (msg.role === 'assistant') {
        let text = '';
        if (msg.parts && Array.isArray(msg.parts)) {
          text = msg.parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text || '')
            .join('\n');
        }
        if (!text && typeof msg.content === 'string') {
          text = msg.content;
        }
        return { role: 'assistant' as const, content: text || '...' };
      }

      return { role: msg.role, content: msg.content || '' };
    });

  try {
    const result = streamText({
      model: getModel(),
      messages: coreMessages,
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
