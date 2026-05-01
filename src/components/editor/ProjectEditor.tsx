'use client';

// Componente principal do editor de projeto
// Orquestra todas as seções: configuração, tabela verdade, mapa de Karnaugh, expressão e exportação

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ProjectData, CellValue, Variable, OutputConfig } from '@/lib/engine/types';
import { useTruthTable } from '@/hooks/useTruthTable';
import { useSimplification } from '@/hooks/useSimplification';
import { VariableConfig } from './VariableConfig';
import { OutputTabs } from './OutputTabs';
import { TruthTable } from '@/components/truth-table/TruthTable';
import { KarnaughMap } from '@/components/karnaugh/KarnaughMap';
import { AiAssistant } from './AiAssistant';
import { StImporter } from './StImporter';
import { useProject } from '@/hooks/useProject';
import { Button } from '@/components/ui/Button';
import { ExpressionDisplay } from '@/components/expression/ExpressionDisplay';
import { ExportPanel, type OutputSimplification } from '@/components/export/ExportPanel';
import { LadderDiagram } from '@/components/ladder/LadderDiagram';
import { FbdDiagram } from '@/components/fbd/FbdDiagram';

export interface ProjectEditorProps {
  initialData?: ProjectData & { id?: string; name?: string };
}

export function ProjectEditor({ initialData }: ProjectEditorProps) {
  const { saveProject, loading: isSaving } = useProject();
  const [projectId, setProjectId] = useState<string | undefined>(initialData?.id);
  const [projectName, setProjectName] = useState(initialData?.name || 'Novo_Projeto_LF');
  const [diagramMode, setDiagramMode] = useState<'ladder' | 'fbd'>('ladder');
  const [inputTab, setInputTab] = useState<'ai' | 'st' | 'manual'>('ai');
  const [karnaughOpen, setKarnaughOpen] = useState(true);
  const [karnaughMounted, setKarnaughMounted] = useState(true);
  const [truthTableOpen, setTruthTableOpen] = useState(true);
  const [truthTableMounted, setTruthTableMounted] = useState(true);
  
  const {
    variables,
    outputs,
    ordering,
    tableGenerated,
    setVariables,
    setOutputs,
    setOrdering,
    setOutputValues,
    generateTable,
    setTableGenerated,
  } = useTruthTable();

  /** Aba ativa (nome da saída selecionada) */
  const [activeOutputTab, setActiveOutputTab] = useState(outputs[0]?.name || 'F1');

  /** Executa simplificação automática quando valores mudam */
  const { results: simplificationResults, isComputing } =
    useSimplification(variables, outputs);

  /** Carrega dados iniciais se fornecidos */
  useEffect(() => {
    if (initialData) {
      setVariables(initialData.variables);
      setOutputs(initialData.outputs);
      setOrdering(initialData.ordering);
    }
    // Executar apenas na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Sincroniza a aba ativa quando saídas mudam */
  useEffect(() => {
    if (outputs.length > 0 && !outputs.find((o) => o.name === activeOutputTab)) {
      setActiveOutputTab(outputs[0].name);
    }
  }, [outputs, activeOutputTab]);

  /** Aplicador do Output de IA na UI */
  const handleAiApply = (newVars: Variable[], newOuts: OutputConfig[]) => {
    setVariables(newVars);
    setOutputs(newOuts);
    setTableGenerated(true);
    const isLarge = newVars.length > 4;
    // Para muitas variáveis: colapsar tabela verdade (muito pesada)
    // e usar lazy-once: desmontar para não renderizar até o usuário pedir
    setTruthTableOpen(!isLarge);
    setTruthTableMounted(!isLarge); // não monta até o usuário abrir
    setKarnaughOpen(true);
    setKarnaughMounted(true);
    if (newOuts.length > 0) {
      setActiveOutputTab(newOuts[0].name);
    }
  };

  /** Índice da saída ativa */
  const activeOutputIndex = useMemo(
    () => Math.max(0, outputs.findIndex((o) => o.name === activeOutputTab)),
    [outputs, activeOutputTab]
  );

  /** Resultado da simplificação para a saída ativa */
  const activeSimplification = simplificationResults[activeOutputIndex];

  /** Nomes das variáveis para o mapa de Karnaugh */
  const varNames = useMemo(
    () => variables.map((v) => v.name),
    [variables]
  );

  /** Dados para o painel de exportação */
  const exportSimplifications: OutputSimplification[] = useMemo(
    () =>
      simplificationResults.map((sr) => ({
        outputName: sr.outputName,
        implicants: sr.result.implicants,
        sopExpression: sr.result.expression,
        posExpression: sr.result.expressionPOS,
      })),
    [simplificationResults]
  );

  /**
   * Projeção real do Karnaugh:
   * Extrai dos implicantes quais variáveis SÃO ativas (mask[i] !== '-' em pelo menos 1 implicante)
   * e constroí a tabela verdade e variáveis apenas para essas.
   * Resultado honesto: se QM reduziu 8 vars para 3, o mapa é 3-variável.
   */
  const karnaughProjection = useMemo(() => {
    const implicants = activeSimplification?.result?.implicants || [];
    const fullValues = outputs[activeOutputIndex]?.values || [];
    const numVars = variables.length;

    if (implicants.length === 0 || numVars === 0) {
      return { activeIndices: [], activeVarNames: [], projectedValues: [], projectedGroups: [] };
    }

    // Descobrir quais posições (0-indexed) são ativas em pelo menos 1 implicante
    const activeSet = new Set<number>();
    for (const imp of implicants) {
      for (let i = 0; i < imp.mask.length; i++) {
        if (imp.mask[i] !== '-') activeSet.add(i);
      }
    }

    const activeIndices = Array.from(activeSet).sort((a, b) => a - b);
    const activeVarNames = activeIndices.map(i => variables[i]?.name || `x${i}`);
    const n = activeIndices.length;

    if (n === 0 || n > 4) {
      // 0 ativas = constante; >4 = não cabe no mapa 2D
      return { activeIndices, activeVarNames, projectedValues: fullValues, projectedGroups: [] };
    }

    // Construir valores projetados: para cada combinação das vars ativas,
    // o valor é 1 se QUALQUER linha da tabela completa com essas vars valendo aquela
    // combinação retorna 1 (OR projection - correto para funções que não dependem das vars inativas)
    const totalRows = Math.pow(2, numVars);
    const projSize = Math.pow(2, n);
    const projected: (0 | 1)[] = new Array(projSize).fill(0);

    for (let row = 0; row < totalRows; row++) {
      const val = fullValues[row];
      if (val !== 1) continue;
      // Extrair bits das vars ativas nessa linha
      let projIdx = 0;
      for (let bi = 0; bi < n; bi++) {
        const bit = (row >> (numVars - 1 - activeIndices[bi])) & 1;
        projIdx = (projIdx << 1) | bit;
      }
      projected[projIdx] = 1;
    }

    return { activeIndices, activeVarNames, projectedValues: projected, projectedGroups: activeSimplification?.groups || [] };
  }, [activeSimplification, outputs, activeOutputIndex, variables]);

  /** Callback para alteração de valores na tabela verdade */
  function handleOutputChange(outputIndex: number, values: CellValue[]) {
    setOutputValues(outputIndex, values);
  }
  const handleSave = async () => {
    const savedId = await saveProject({
      id: projectId,
      name: projectName,
      variables,
      outputs,
      ordering,
    });
    if (savedId) setProjectId(savedId);
  };

  const INPUT_TABS = [
    { id: 'ai' as const,     icon: '✨', label: 'Copilot AI',     desc: 'Descreva em linguagem natural' },
    { id: 'st' as const,     icon: '🎓', label: 'Eng. Reversa',   desc: 'Importar Structured Text' },
    { id: 'manual' as const, icon: '⚙️', label: 'Manual',         desc: 'Configurar variáveis' },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Projeto */}
      <div className="flex items-end gap-3 flex-wrap bg-surface border border-border p-4 rounded-xl shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-muted mb-1">Nome do Projeto</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full bg-background border border-border text-foreground px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent font-semibold transition-colors"
            placeholder="Ex: Bomba_Agua_Automatica"
          />
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="shrink-0 font-bold bg-accent hover:opacity-90 text-white">
          {isSaving ? 'Salvando...' : '💾 Salvar Projeto'}
        </Button>
      </div>

      {/* === Seção Unificada: Construir Lógica === */}
      <section className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        {/* Tab Bar */}
        <div className="border-b border-border bg-surface px-4 pt-4 pb-0 flex items-end gap-1">
          <span className="text-xs font-semibold text-muted pb-3 pr-3 border-r border-border mr-1 hidden sm:block">
            Construir Lógica
          </span>
          {INPUT_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setInputTab(tab.id)}
              title={tab.desc}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all focus:outline-none ${
                inputTab === tab.id
                  ? 'border-accent text-accent bg-accent/5'
                  : 'border-transparent text-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Conteúdo da tab ativa */}
        <div className="p-6">
          {inputTab === 'ai' && (
            <AiAssistant onApplyMatrix={handleAiApply} ordering={ordering} />
          )}
          {inputTab === 'st' && (
            <StImporter onApplyMatrix={handleAiApply} hideToggle />
          )}
          {inputTab === 'manual' && (
            <VariableConfig
              variables={variables}
              outputs={outputs}
              ordering={ordering}
              onVariablesChange={setVariables}
              onOutputsChange={setOutputs}
              onOrderingChange={setOrdering}
              onGenerate={generateTable}
            />
          )}
        </div>
      </section>

      {/* === Resultados (visíveis após gerar tabela) === */}
      {tableGenerated && outputs[0]?.values.length > 0 && (
        <>
          {/* Diagramas: Ladder + FBD — mais importante, aparece primeiro */}
          {exportSimplifications.length > 0 && (
            <section className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
              {/* Tab bar dos diagramas */}
              <div className="border-b border-border px-4 pt-4 pb-0 flex items-end gap-1">
                <span className="text-xs font-semibold text-muted pb-3 pr-3 border-r border-border mr-1 hidden sm:block">
                  Diagrama
                </span>
                {[
                  { id: 'ladder' as const, label: '⚡ Ladder' },
                  { id: 'fbd'    as const, label: '⬡ Blocos Funcionais' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDiagramMode(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all focus:outline-none ${
                      diagramMode === tab.id
                        ? 'border-accent text-accent bg-accent/5'
                        : 'border-transparent text-muted hover:text-foreground hover:bg-surface-hover'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {diagramMode === 'ladder' && (
                  <LadderDiagram
                    variables={variables}
                    outputs={exportSimplifications.map(s => ({
                      outputName: s.outputName,
                      implicants: s.implicants,
                    }))}
                  />
                )}
                {diagramMode === 'fbd' && (
                  <div className="flex flex-col gap-8">
                    {exportSimplifications.map((s, idx) => {
                      if (activeOutputIndex !== idx) return null;
                      return (
                        <FbdDiagram
                          key={idx}
                          expression={s.sopExpression || '0'}
                          outputName={s.outputName}
                          variables={variables}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Expressão simplificada */}
          <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            {isComputing ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Calculando simplificação...
              </div>
            ) : (
              <ExpressionDisplay
                sopExpression={activeSimplification?.result.expression || '0'}
                posExpression={activeSimplification?.result.expressionPOS || '0'}
                outputName={outputs[activeOutputIndex]?.name || ''}
              />
            )}
          </section>

          {/* Mapa de Karnaugh -- lazy-once: monta na primeira abertura, depois CSS hidden */}
          <section className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
            <button
              onClick={() => {
                const next = !karnaughOpen;
                setKarnaughOpen(next);
                if (next) setKarnaughMounted(true); // monta na primeira vez
              }}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-hover transition-colors"
            >
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-accent inline-block" />
                Mapa de Karnaugh
                {karnaughProjection.activeVarNames.length > 0 && karnaughProjection.activeVarNames.length <= 4 && variables.length > karnaughProjection.activeVarNames.length && (
                  <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                    ✓ {variables.length} → {karnaughProjection.activeVarNames.length} variáveis
                  </span>
                )}
                {karnaughProjection.activeIndices.length > 4 && (
                  <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                    ⚠️ {karnaughProjection.activeIndices.length} vars ativas — mapa 2D requer ≤4
                  </span>
                )}
              </h2>
              <span className="text-muted text-lg select-none" style={{ transform: karnaughOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s' }}>
                ∨
              </span>
            </button>
            {karnaughMounted && (
              <div className={karnaughOpen ? 'px-6 pb-6' : 'hidden'}>
                {karnaughProjection.activeIndices.length === 0 ? (
                  <p className="text-sm text-muted text-center py-6">
                    Expressão constante — nenhuma variável ativa após simplificação.
                  </p>
                ) : karnaughProjection.activeIndices.length > 4 ? (
                  <div className="text-center py-8 space-y-2 text-muted">
                    <p className="text-sm font-medium">
                      Após simplificação: {karnaughProjection.activeIndices.length} variáveis ativas
                      ({karnaughProjection.activeVarNames.join(', ')})
                    </p>
                    <p className="text-xs">
                      Mapa de Karnaugh 2D suporta no máximo 4 variáveis.<br/>
                      Use as expressões booleanas acima para a lógica completa.
                    </p>
                  </div>
                ) : (
                  <>
                    {karnaughProjection.activeVarNames.length < variables.length && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg px-3 py-2 mb-4">
                        ✓ Mapa real com <strong>{karnaughProjection.activeVarNames.length} variáveis ativas</strong>: {karnaughProjection.activeVarNames.join(', ')}.
                        As outras {variables.length - karnaughProjection.activeVarNames.length} variáveis foram eliminadas pela simplificação booleana.
                      </p>
                    )}
                    <KarnaughMap
                      numVars={karnaughProjection.activeVarNames.length}
                      varNames={karnaughProjection.activeVarNames}
                      values={karnaughProjection.projectedValues as import('@/lib/engine/types').CellValue[]}
                      groups={variables.length <= 4 ? (activeSimplification?.groups || []) : []}
                      outputName={outputs[activeOutputIndex]?.name || ''}
                    />
                  </>
                )}
              </div>
            )}
          </section>

          {/* Abas de saída (só quando múltiplas) */}
          {outputs.length > 1 && (
            <OutputTabs
              outputs={outputs}
              activeTab={activeOutputTab}
              onChange={setActiveOutputTab}
            />
          )}

          {/* Tabela Verdade -- lazy-once: monta na primeira abertura, depois CSS hidden */}
          <section className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
            <button
              onClick={() => {
                const next = !truthTableOpen;
                setTruthTableOpen(next);
                if (next) setTruthTableMounted(true); // monta na primeira vez
              }}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-hover transition-colors"
            >
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-accent inline-block" />
                Tabela Verdade
                <span className="text-xs font-normal text-muted">
                  ({Math.pow(2, variables.length).toLocaleString()} linhas × {outputs.length} saídas)
                </span>
              </h2>
              <span className="text-muted text-lg select-none" style={{ transform: truthTableOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s' }}>
                ∨
              </span>
            </button>
            {truthTableMounted && (
              <div className={truthTableOpen ? 'px-6 pb-6' : 'hidden'}>
                <TruthTable
                  variables={variables}
                  outputs={outputs}
                  ordering={ordering}
                  onOutputChange={handleOutputChange}
                />
              </div>
            )}
          </section>

          {/* Exportação */}
          <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <ExportPanel
              projectName="LogicForge"
              variables={variables}
              outputs={outputs}
              simplifications={exportSimplifications}
            />
          </section>
        </>
      )}
    </div>
  );
}
