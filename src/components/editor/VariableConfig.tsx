'use client';

// Painel de configuração de variáveis, saídas e ordenação
// Permite definir a quantidade e nomes das variáveis/saídas antes de gerar a tabela

import { cn } from '@/lib/utils';
import type { Variable, OutputConfig } from '@/lib/engine/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export interface VariableConfigProps {
  variables: Variable[];
  outputs: OutputConfig[];
  ordering: 'binary' | 'gray';
  onVariablesChange: (variables: Variable[]) => void;
  onOutputsChange: (outputs: OutputConfig[]) => void;
  onOrderingChange: (ordering: 'binary' | 'gray') => void;
  onGenerate: () => void;
}

export function VariableConfig({
  variables,
  outputs,
  ordering,
  onVariablesChange,
  onOutputsChange,
  onOrderingChange,
  onGenerate,
}: VariableConfigProps) {
  const numVars = variables.length;
  const numOutputs = outputs.length;

  // Validação: nomes são obrigatórios
  const hasEmptyVarName = variables.some((v) => !v.name.trim());
  const hasEmptyOutputName = outputs.some((o) => !o.name.trim());
  const isValid = !hasEmptyVarName && !hasEmptyOutputName && numVars >= 2 && numOutputs >= 1;

  /** Altera a quantidade de variáveis (2-12) */
  function handleVarCountChange(delta: number) {
    const newCount = Math.max(2, Math.min(12, numVars + delta));
    if (newCount === numVars) return;

    if (newCount > numVars) {
      // Adicionar variáveis com nomes padrão A-L
      const defaults = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
      const newVars = [...variables];
      for (let i = numVars; i < newCount; i++) {
        newVars.push({ name: defaults[i] || `X${i}`, description: '' });
      }
      onVariablesChange(newVars);
    } else {
      // Remover do final
      onVariablesChange(variables.slice(0, newCount));
    }
  }

  /** Altera a quantidade de saídas (1-12) */
  function handleOutputCountChange(delta: number) {
    const newCount = Math.max(1, Math.min(12, numOutputs + delta));
    if (newCount === numOutputs) return;

    if (newCount > numOutputs) {
      const newOutputs = [...outputs];
      for (let i = numOutputs; i < newCount; i++) {
        newOutputs.push({ name: `F${i + 1}`, values: [] });
      }
      onOutputsChange(newOutputs);
    } else {
      onOutputsChange(outputs.slice(0, newCount));
    }
  }

  /** Atualiza o nome de uma variável */
  function handleVarNameChange(index: number, name: string) {
    const newVars = [...variables];
    newVars[index] = { ...newVars[index], name };
    onVariablesChange(newVars);
  }

  /** Atualiza a descrição de uma variável */
  function handleVarDescChange(index: number, description: string) {
    const newVars = [...variables];
    newVars[index] = { ...newVars[index], description };
    onVariablesChange(newVars);
  }

  /** Atualiza o nome de uma saída */
  function handleOutputNameChange(index: number, name: string) {
    const newOutputs = [...outputs];
    newOutputs[index] = { ...newOutputs[index], name };
    onOutputsChange(newOutputs);
  }

  return (
    <div className="space-y-6">
      {/* Configuração de variáveis */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Variáveis de Entrada
          </h3>

          {/* Controle de quantidade com +/- */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleVarCountChange(-1)}
              disabled={numVars <= 2}
              aria-label="Remover variável"
            >
              -
            </Button>
            <span className="text-sm font-mono font-semibold text-foreground w-6 text-center">
              {numVars}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleVarCountChange(1)}
              disabled={numVars >= 12}
              aria-label="Adicionar variável"
            >
              +
            </Button>
            {numVars > 4 && (
              <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ Karnaugh colapsado (&gt;4 vars)
              </span>
            )}
          </div>
        </div>

        {/* Campos de nome e descrição para cada variável */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {variables.map((variable, i) => (
            <div
              key={i}
              className="flex gap-2 items-start p-3 rounded-md bg-surface-hover border border-border"
            >
              <Input
                label={`Var ${i + 1}`}
                value={variable.name}
                onChange={(e) => handleVarNameChange(i, e.target.value)}
                placeholder="Nome"
                className="w-20"
                error={!variable.name.trim() ? 'Obrigatório' : undefined}
              />
              <Input
                label="Descrição"
                value={variable.description || ''}
                onChange={(e) => handleVarDescChange(i, e.target.value)}
                placeholder="Opcional"
                className="flex-1"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Configuração de saídas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Saídas
          </h3>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOutputCountChange(-1)}
              disabled={numOutputs <= 1}
              aria-label="Remover saída"
            >
              -
            </Button>
            <span className="text-sm font-mono font-semibold text-foreground w-6 text-center">
              {numOutputs}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOutputCountChange(1)}
              disabled={numOutputs >= 12}
              aria-label="Adicionar saída"
            >
              +
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {outputs.map((output, i) => (
            <Input
              key={i}
              label={`Saída ${i + 1}`}
              value={output.name}
              onChange={(e) => handleOutputNameChange(i, e.target.value)}
              placeholder="Nome"
              error={!output.name.trim() ? 'Obrigatório' : undefined}
            />
          ))}
        </div>
      </div>

      {/* Ordenação e botão de gerar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Alternador de ordenação */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">
            Ordenação:
          </span>
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => onOrderingChange('binary')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                ordering === 'binary'
                  ? 'bg-accent text-white'
                  : 'bg-surface text-muted hover:bg-surface-hover hover:text-foreground'
              )}
            >
              Binária
            </button>
            <button
              onClick={() => onOrderingChange('gray')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors border-l border-border',
                ordering === 'gray'
                  ? 'bg-accent text-white'
                  : 'bg-surface text-muted hover:bg-surface-hover hover:text-foreground'
              )}
            >
              Código Gray
            </button>
          </div>
        </div>

        {/* Botão principal */}
        <Button onClick={onGenerate} disabled={!isValid} size="lg">
          Gerar Tabela
        </Button>
      </div>

      {/* Mensagens de validação */}
      {(hasEmptyVarName || hasEmptyOutputName) && (
        <p className="text-xs text-orange-500 dark:text-orange-400">
          Preencha todos os nomes de variáveis e saídas antes de gerar a tabela.
        </p>
      )}
    </div>
  );
}
