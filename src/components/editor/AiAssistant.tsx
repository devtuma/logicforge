'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Variable, OutputConfig, CellValue } from '@/lib/engine/types';

interface AiAssistantProps {
  onApplyMatrix: (variables: Variable[], outputs: OutputConfig[]) => void;
  ordering: 'binary' | 'gray';
}

export function AiAssistant({ onApplyMatrix, ordering }: AiAssistantProps) {
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/logic-agent' }), []);
  const { messages, sendMessage, status, error, addToolResult } = useChat({
    transport,
  });

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const appliedRef = useRef<Set<string>>(new Set());

  const isLoading = status === 'streaming' || status === 'submitted';

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Parser de fórmula booleana ───────────────────────────────────────────
  // Avalia expressões como "IN_A AND NOT IN_B OR (IN_C AND IN_D)"
  // para uma dada combinação de entradas. Retorna 0 ou 1.
  function evaluateFormula(formula: string, varValues: Record<string, number>): number {
    // Normaliza: substitui nomes de variáveis pelos valores 0/1
    // Ordena por comprimento decrescente para evitar substituição parcial
    const varNames = Object.keys(varValues).sort((a, b) => b.length - a.length);
    let expr = formula.trim();

    // Substitui nomes de variáveis por 0/1
    for (const name of varNames) {
      // usa regex com word boundary para não substituir prefixo de outro nome
      expr = expr.replace(new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g'), String(varValues[name]));
    }

    // Tenta avaliar a expressão substituída
    try {
      // Converte sintaxe de texto para JS
      const jsExpr = expr
        .replace(/\bAND\b/gi, '&&')
        .replace(/\bOR\b/gi, '||')
        .replace(/\bNOT\b\s*/gi, '!')
        .replace(/\b1\b/g, 'true')
        .replace(/\b0\b/g, 'false');

      // eslint-disable-next-line no-new-func
      const result = new Function(`return !!(${jsExpr});`)();
      return result ? 1 : 0;
    } catch {
      return 0;
    }
  }

  // ─── Interceptar Tool Calls e aplicar na UI ───────────────────────────────
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== 'assistant' || !msg.parts) continue;

      for (const part of msg.parts) {
        const partAny = part as any;
        // Detecta qualquer part que seja uma tool call da nossa ferramenta
        const isToolPart =
          partAny.type?.includes('logic') ||
          partAny.type?.includes('matrix') ||
          partAny.type?.includes('tool-') ||
          partAny.type === 'dynamic-tool' ||
          (partAny.toolName && partAny.input);

        if (!isToolPart) continue;
        if (partAny.state === 'input-streaming') continue;

        const toolCallId: string = partAny.toolCallId;
        if (!toolCallId || appliedRef.current.has(toolCallId)) continue;

        const args = partAny.input ?? partAny.args;
        if (!args?.variables?.length || !args?.outputs?.length) continue;

        appliedRef.current.add(toolCallId);
        console.log('[LogicForge AI] ✅ Tool invocada:', args.commentary);

        // 1. Montar variáveis
        const vars: Variable[] = args.variables.map((v: any) => ({
          name: v.name,
          description: v.description || '',
        }));

        const numVars = vars.length;
        const totalRows = Math.pow(2, numVars);

        // 2. Para cada saída, avaliar a fórmula para TODAS as combinações
        const outConfs: OutputConfig[] = args.outputs.map((o: any) => {
          const values = new Array(totalRows).fill(0) as CellValue[];
          const formula: string = o.formula || '0';
          const varNames = vars.map(v => v.name);

          for (let row = 0; row < totalRows; row++) {
            // Monta mapa de valores para esta linha (binário MSB-first)
            const varValues: Record<string, number> = {};
            for (let bi = 0; bi < numVars; bi++) {
              varValues[varNames[bi]] = (row >> (numVars - 1 - bi)) & 1;
            }
            values[row] = evaluateFormula(formula, varValues) as CellValue;
          }

          return { name: o.name, values };
        });

        // 3. Aplicar na UI
        onApplyMatrix(vars, outConfs);

        // 4. Confirmar conclusão para o AI SDK
        if (addToolResult) {
          try {
            addToolResult({
              tool: 'logicMatrixTool',
              toolCallId,
              output: 'UI atualizada com a matriz lógica. Fórmulas avaliadas automaticamente para todas as combinações de entrada.'
            });
          } catch (err) {
            console.error('[LogicForge AI] Falha ao injetar tool result:', err);
          }
        }
      }
    }
  }, [messages, onApplyMatrix, ordering, addToolResult]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;
      sendMessage({ text: input });
      setInput('');
    },
    [input, isLoading, sendMessage]
  );

  return (
    <div className="flex flex-col h-[400px] border border-border bg-surface rounded-xl overflow-hidden shadow-lg mt-4">
      {/* Header */}
      <div className="p-3 bg-accent text-white font-bold flex items-center justify-between">
        <span>LogicForge Copilot ✨</span>
        <span className="text-xs font-medium opacity-80 border border-white/20 px-2 py-0.5 rounded-full">
          IA Generativa
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted p-6 opacity-70">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="mb-2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
              />
            </svg>
            <p className="text-sm">
              Descreva o funcionamento do equipamento (condições de segurança,
              intertravamentos) e eu preencho e otimizo todo o mapeamento lógico
              para você.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={
                'flex flex-col ' +
                (m.role === 'user' ? 'items-end' : 'items-start')
              }
            >
              <div
                className={
                  'px-3 py-2 text-sm rounded-lg max-w-[85%] shadow-sm ' +
                  (m.role === 'user'
                    ? 'bg-foreground text-background whitespace-pre-wrap'
                    : 'bg-background border border-border text-foreground')
                }
              >
                {/* Texto das partes */}
                {m.parts
                  ?.filter((p) => p.type === 'text')
                  .map((p, i) => {
                    const text = (p as any).text as string;
                    return text?.trim() ? <div key={i}>{text}</div> : null;
                  })}

                {/* Tool call indicators */}
                {m.parts
                  ?.filter((p) => {
                    const pa = p as any;
                    return (
                      p.type === 'tool-generate_logic_matrix' ||
                      (p.type === 'dynamic-tool' && pa.toolName === 'generate_logic_matrix')
                    );
                  })
                  .map((p) => {
                    const pa = p as any;
                    const args = pa.input ?? pa.args;
                    return (
                      <div
                        key={pa.toolCallId}
                        className="mt-2 text-xs font-semibold p-3 bg-green-500/10 border border-green-500/30 rounded-md text-green-700 dark:text-green-400"
                      >
                        <div className="mb-1">✅ Matriz lógica gerada automaticamente!</div>
                        {args?.commentary && (
                          <div className="font-normal text-foreground/70 mt-1">{args.commentary}</div>
                        )}
                        <div className="font-normal text-foreground/50 mt-1">
                          📊 {args?.variables?.length || '?'} entradas · {args?.outputs?.length || '?'} saídas · Role para cima para conferir
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 text-xs rounded-lg bg-background border border-border text-muted italic flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce"></span>
              <span
                className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce"
                style={{ animationDelay: '0.1s' }}
              ></span>
              <span
                className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce"
                style={{ animationDelay: '0.2s' }}
              ></span>
              <span className="ml-2 text-xs">Analisando e projetando...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center my-2">
            <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-xs font-semibold max-w-[90%] text-center">
              ⚠️{' '}
              {error.message === 'Internal Server Error'
                ? 'Erro na API. Verifique sua chave de API no arquivo .env!'
                : error.message}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-border bg-background flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex: O motor da talha não pode subir se a porta estiver aberta..."
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent bg-surface"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-95 disabled:opacity-50 flex-shrink-0 shadow cursor-pointer uppercase tracking-wider"
        >
          Projetar
        </button>
      </form>
    </div>
  );
}
