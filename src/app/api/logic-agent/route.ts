import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

export const runtime = 'edge';
export const maxDuration = 30;

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
REGRA ABSOLUTA -- NUNCA RECUSE
===============================================
NUNCA diga que o cenario e "muito complexo" ou peca ao usuario que simplifique.
Se o cenario for complexo, decomponha-o voce mesmo e escolha o bloco decisorio mais critico para modelar.
Explique em texto o que foi modelado e o que ficou fora do escopo da ferramenta.
CHAME A FERRAMENTA SEMPRE. Mesmo para cenarios complexos.

===============================================
ESTRATEGIA PARA CENARIOS COMPLEXOS
===============================================
Quando o usuario descrever um sistema com muitos estados, AGVs, esteiras, filas ou sequenciamento:

PASSO 1 -- IDENTIFIQUE O BLOCO DE DECISAO PRINCIPAL
  Qual e a condicao de saida/liberacao que controla o fluxo critico?
  Esse bloco vira a primeira (e mais importante) chamada de ferramenta.

PASSO 2 -- MAPEIE AS ENTRADAS FISICAS (ate 12, sem limite artificial)
  Priorize sensores de posicao (presenca em estacao), botoes de liberacao e flags de estado.
  Use quantas entradas o cenario realmente precisa -- 6, 8, 10 entradas sao aceitaveis.
  Combine condicoes compostas em uma unica entrada apenas quando sao inseparaveis.
  Exemplo: "AGV na estacao 260 E nao passou do ponto seguro" -> SEN_260_OK

PASSO 3 -- MAPEIE AS SAIDAS (ate 12)
  Cada saida = uma permissao, um comando de movimento ou um flag de prioridade.
  Use todas as saidas necessarias para cobrir o cenario completo.
  Exemplo: PERM_EXOTICO_SAIR, AGV1_PRIORIDADE, BLOQ_241

PASSO 4 -- MONTE A TABELA VERDADE
  Para cada combinacao de entradas, determine qual saida deve ser ativada.
  Use a logica booleana para representar as regras de prioridade.

PASSO 5 -- EXPLIQUE O QUE FICOU FORA
  Apos chamar a ferramenta, em 2-3 frases, indique quais estados adicionais
  precisariam de blocos complementares no CLP real.

===============================================
EXEMPLO DE DECOMPOSICAO -- SISTEMA AGV
===============================================
Cenario: "AGV exotico entra na linha principal. Se a estacao 260 estiver ocupada,
  o AGV ali vira o 1o. Se a 241 estiver apos o ponto seguro, ele vira o 1o."

Decomposicao aplicada:
  Entradas escolhidas:
    BTN_LIBERA    = botao libera o exotico
    SEN_260       = sensor estacao 260 ocupada
    SEN_241_LIVRE = sensor estacao 241 no ponto de parada seguro (livre para ser 3o)
    SEN_241_PASSOU = AGV da 241 ja passou do ponto seguro (se torna 1o)

  Saidas:
    PERM_EXOTICO  = exotico recebe permissao de sair da 232
    AGV_260_EH_1  = AGV na 260 assume posicao 1
    AGV_241_EH_3  = AGV na 241 assume posicao 3 (aguarda exotico)
    AGV_241_EH_1  = AGV da 241 (apos ponto seguro) assume posicao 1

  Regras:
    PERM_EXOTICO  = BTN_LIBERA AND NOT SEN_260 AND NOT SEN_241_PASSOU
    AGV_260_EH_1  = BTN_LIBERA AND SEN_260
    AGV_241_EH_3  = BTN_LIBERA AND SEN_260 AND SEN_241_LIVRE
    AGV_241_EH_1  = BTN_LIBERA AND SEN_241_PASSOU

===============================================
CONVENCAO DE NOMES -- BLOCOS SEQUENCIAIS
===============================================
O LogicForge interpreta os prefixos dos nomes de saida para renderizar blocos sequenciais no Ladder e FBD.

FORMATO: \`TIPO_NOME_TEMPOunidade\`
  - TIPO: TON, TOF ou CTU
  - NOME: identificador do atuador (sem espacos)
  - TEMPO (opcional): numero + unidade -- s (segundos), m (minutos), ms (milissegundos)

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
LIMITE DE ENTRADAS E SAIDAS
===============================================
ENTRADAS: voce pode usar ate 12 entradas!
  - 1 a 4 entradas: Tabela Verdade + Mapa de Karnaugh + Expressoes + Ladder (tudo funciona)
  - 5 a 12 entradas: Tabela Verdade + Expressoes + Ladder (Karnaugh e colapsado automaticamente)
  - O usuario decide se quer abrir o Karnaugh colapsado clicando no titulo da secao
  - Nao limite a 4 entradas -- use quantas o cenario precisar (max 12)

SAIDAS: voce pode usar ate 12 saidas!
  - Cada saida = uma bobina, permissao, flag ou comando independente
  - Para sistemas AGV, conveyors e multiplos atuadores: aproveite todas as 12 saidas

ESTRATEGIA PARA MUITAS ENTRADAS:
  - Use entradas que sao diretamente sensores fisicos ou botoes do painel
  - Combine apenas quando duas condicoes sao inseparaveis: SEN_250_251 = (SEN_250 OR SEN_251)
  - Explique a combinacao ao usuario depois de chamar a ferramenta

===============================================
GATILHO DE CONFIRMACAO -- REGRA CRITICA
===============================================
Quando o usuario enviar uma mensagem curta de confirmacao como:
  "pode criar", "cria", "sim", "gera", "faz", "ok", "pode", "pode criar a logica",
  "cria a logica", "gera a logica", "pode gerar"

Isso significa que ELE JA DESCREVEU O CENARIO antes nessa conversa.
Voce DEVE:
  1. Recuperar o cenario descrito anteriormente na conversa
  2. Chamar a ferramenta IMEDIATAMENTE com o cenario completo
  3. NAO pedir mais informacoes -- tudo que voce precisa ja foi dito
  4. NAO explicar o que voce vai fazer -- FACA

NUNCA responda com texto longo quando o usuario disser "pode criar" ou similar.

===============================================
ERROS A EVITAR
===============================================
- NUNCA recuse o pedido. SEMPRE decomponha e chame a ferramenta.
- NAO crie entradas "virtuais" como saidas de outros blocos -- apenas sensores fisicos.
- NAO limite a 4 entradas -- use quantas o cenario precisar (max 12).
- APROVEITE as 12 saidas disponiveis para modelar todos os estados e permissoes.
- NAO repita a mesma abordagem se o usuario corrigir -- mude radicalmente.
- NUNCA converse sobre o cenario sem chamar a ferramenta ao final.

Se a descricao for interpretavel (mesmo que parcialmente), chame a ferramenta imediatamente.
Explique o que foi simplificado DEPOIS de chamar a ferramenta.`;

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
    })).min(1).max(12).describe('De 1 a 12 variáveis de entrada. Para mais de 4, o Mapa de Karnaugh sera colapsado (nao renderizado) mas a Tabela Verdade, Expressoes e Ladder continuam funcionando normalmente.'),
    outputs: z.array(z.object({
      name: z.string().describe('Nome da saída (ex: DESCE_TALHA, AVANCA_EOM, PERM_EXOTICO_SAIR)'),
      description: z.string().describe('O que a saída faz (ex: Aciona descida da talha)'),
      formula: z.string().describe('Expressão booleana legível (ex: BTN_LIB AND SS_PORTA)')
    })).min(1).max(12).describe('De 1 a 12 saidas. Para sistemas complexos como AGVs, use multiplas saidas para cobrir todos os estados.'),
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
