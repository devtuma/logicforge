'use client';

// Painel de Engenharia Reversa ST → Tabela Verdade
// O usuário cola um trecho de Structured Text (IEC 61131-3) e o motor
// extrai automaticamente as variáveis e preenche a tabela verdade.

import { useState, useCallback } from 'react';
import type { Variable, OutputConfig } from '@/lib/engine/types';
import { parseSTCode } from '@/lib/engine/st-parser';

// ─── Exemplos de código para o placeholder ───────────────────────────────────

const PLACEHOLDER = `(* Cole aqui o código ST do CLP antigo *)
(* Exemplo: lógica de controle de motor *)

MOTOR_ON := (BTN_START AND NOT EMERGENCY) OR (AUTO_MODE AND SENSOR_OK);
LAMP_ERR := EMERGENCY OR (MOTOR_ON AND NOT SENSOR_OK);`;

const EXAMPLE_SIMPLE = `(* Exemplo simples: porta E com inversão *)
L1 := (A AND B) OR NOT C;`;

const EXAMPLE_MOTOR = `(* Controle de talha industrial *)
(* Entradas: BTN_SUB, BTN_DESCE, SS_ALTO, SS_BAIXO *)
SOBE   := BTN_SUB AND NOT SS_ALTO AND NOT DESCE;
DESCE  := BTN_DESCE AND NOT SS_BAIXO AND NOT SOBE;`;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface StImporterProps {
  onApplyMatrix: (variables: Variable[], outputs: OutputConfig[]) => void;
  /** Quando true, oculta o botão de colapso e exibe o conteúdo sempre aberto */
  hideToggle?: boolean;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function StImporter({ onApplyMatrix, hideToggle = false }: StImporterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // Quando hideToggle = true, sempre aberto; caso contrário usa estado local
  const isOpen = hideToggle ? true : isExpanded;
  const [code, setCode] = useState('');
  const [result, setResult] = useState<ReturnType<typeof parseSTCode> | null>(null);
  const [applied, setApplied] = useState(false);

  const handleParse = useCallback(() => {
    const parsed = parseSTCode(code);
    setResult(parsed);
    setApplied(false);
  }, [code]);

  const handleApply = useCallback(() => {
    if (!result || result.outputs.length === 0) return;
    onApplyMatrix(result.variables, result.outputs);
    setApplied(true);
    // Fechar o painel após aplicar com pequeno delay para feedback visual
    if (!hideToggle) setTimeout(() => setIsExpanded(false), 800);
  }, [result, onApplyMatrix]);

  const handleExample = useCallback((example: string) => {
    setCode(example);
    setResult(null);
    setApplied(false);
  }, []);

  const canApply =
    result !== null &&
    result.errors.length === 0 &&
    result.outputs.length > 0;

  return (
    <div className={hideToggle ? '' : 'mt-4'}>
      {/* Botão de abertura — oculto quando hideToggle = true */}
      {!hideToggle && (
        <button
          onClick={() => { setIsExpanded(v => !v); setResult(null); setApplied(false); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface hover:bg-accent/10 hover:border-accent transition-colors text-sm font-semibold text-foreground"
        >
          <span className="text-base">🎓</span>
          <span>Engenharia Reversa — Importar ST</span>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {/* Painel — sempre aberto quando hideToggle = true */}
      {isOpen && (
        <div className={hideToggle ? 'rounded-xl border border-border bg-surface overflow-hidden' : 'mt-3 rounded-xl border border-border bg-surface overflow-hidden shadow-lg'}>
          {/* Header */}
          <div className="px-4 py-3 bg-accent/10 border-b border-border flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="font-bold text-foreground text-sm">
                Engenharia Reversa: ST → Tabela Verdade
              </p>
              <p className="text-xs text-muted mt-0.5">
                Cole código Structured Text (IEC 61131-3) — o motor extrai variáveis e preenche o K-map automaticamente.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs text-muted font-semibold">Exemplos:</span>
              <button
                onClick={() => handleExample(EXAMPLE_SIMPLE)}
                className="text-xs px-2 py-1 rounded border border-border hover:border-accent hover:text-accent transition-colors"
              >
                Porta simples
              </button>
              <button
                onClick={() => handleExample(EXAMPLE_MOTOR)}
                className="text-xs px-2 py-1 rounded border border-border hover:border-accent hover:text-accent transition-colors"
              >
                Talha industrial
              </button>
            </div>
          </div>

          {/* Editor de código */}
          <div className="p-4 space-y-3">
            <textarea
              value={code}
              onChange={e => { setCode(e.target.value); setResult(null); setApplied(false); }}
              placeholder={PLACEHOLDER}
              rows={6}
              spellCheck={false}
              className="w-full font-mono text-sm rounded-lg border border-border bg-background text-foreground px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted"
            />

            {/* Ações */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleParse}
                disabled={!code.trim()}
                className="px-4 py-2 rounded-lg bg-accent text-white font-bold text-sm hover:opacity-90 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                🔍 Analisar Código
              </button>

              {canApply && (
                <button
                  onClick={handleApply}
                  disabled={applied}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white font-bold text-sm hover:opacity-90 active:scale-95 transition disabled:opacity-60"
                >
                  {applied ? '✅ Aplicado!' : '⚡ Aplicar na Tabela Verdade'}
                </button>
              )}

              {code && (
                <button
                  onClick={() => { setCode(''); setResult(null); setApplied(false); }}
                  className="text-xs text-muted hover:text-foreground transition"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Resultado da análise */}
            {result && (
              <div className="space-y-3 pt-1">
                {/* Erros */}
                {result.errors.length > 0 && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 space-y-1">
                    <p className="text-xs font-bold text-red-600 dark:text-red-400">
                      Erros de análise:
                    </p>
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-xs font-mono text-red-600 dark:text-red-400">
                        • {e}
                      </p>
                    ))}
                  </div>
                )}

                {/* Avisos */}
                {result.warnings.length > 0 && (
                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-1">
                    <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400">
                      Avisos:
                    </p>
                    {result.warnings.map((w, i) => (
                      <p key={i} className="text-xs font-mono text-yellow-700 dark:text-yellow-400">
                        • {w}
                      </p>
                    ))}
                  </div>
                )}

                {/* Preview do resultado */}
                {result.outputs.length > 0 && (
                  <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 space-y-3">
                    <p className="text-xs font-bold text-green-700 dark:text-green-400">
                      ✅ Análise concluída — pronto para aplicar:
                    </p>

                    {/* Variáveis de entrada */}
                    <div>
                      <p className="text-xs text-muted font-semibold mb-1">
                        Entradas ({result.variables.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {result.variables.map(v => (
                          <span
                            key={v.name}
                            className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-xs font-mono font-semibold text-accent"
                          >
                            {v.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Saídas com preview da tabela */}
                    <div>
                      <p className="text-xs text-muted font-semibold mb-2">
                        Saídas ({result.outputs.length}):
                      </p>
                      <div className="space-y-2">
                        {result.outputs.map(out => {
                          const ones = out.values.filter(v => v === 1).length;
                          const total = out.values.length;
                          return (
                            <div key={out.name} className="flex items-center gap-3">
                              <span className="font-mono font-bold text-xs text-foreground w-24 truncate">
                                {out.name}
                              </span>
                              <div className="flex gap-0.5 flex-wrap">
                                {out.values.map((v, i) => (
                                  <span
                                    key={i}
                                    className={`w-5 h-5 rounded text-xs font-bold flex items-center justify-center ${
                                      v === 1
                                        ? 'bg-accent text-white'
                                        : 'bg-surface border border-border text-muted'
                                    }`}
                                  >
                                    {v}
                                  </span>
                                ))}
                              </div>
                              <span className="text-xs text-muted">
                                {ones}/{total} ativos
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rodapé informativo */}
          <div className="px-4 py-2 border-t border-border bg-background/50 text-xs text-muted flex flex-wrap gap-x-4 gap-y-1">
            <span>Suporta: <code className="font-mono">AND · OR · NOT · XOR · ( )</code></span>
            <span>Comentários: <code className="font-mono">(* bloco *)</code> e <code className="font-mono">// linha</code></span>
            <span>Máx. {4} entradas · {4} saídas</span>
          </div>
        </div>
      )}
    </div>
  );
}
