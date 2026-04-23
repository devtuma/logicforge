// Parser de Structured Text (IEC 61131-3) para o motor LogicForge
//
// Converte statements de atribuição booleana ST do tipo:
//   OUTPUT := (A AND B) OR NOT C;
// em variáveis e saídas prontas para o motor de Tabela Verdade / K-map.
//
// Reutiliza internamente o tokenize/parse/evaluateAST de expression-parser.ts.

import type { Variable, OutputConfig, CellValue } from './types';
import { tokenize, parse, evaluateAST } from './expression-parser';

// ─── Constantes ──────────────────────────────────────────────────────────────

const ST_KEYWORDS = new Set([
  'AND', 'OR', 'NOT', 'XOR', 'MOD', 'DIV',
  'IF', 'THEN', 'ELSE', 'ELSIF', 'END_IF',
  'FOR', 'TO', 'BY', 'DO', 'END_FOR',
  'WHILE', 'END_WHILE', 'REPEAT', 'UNTIL', 'END_REPEAT',
  'CASE', 'OF', 'END_CASE',
  'FUNCTION', 'FUNCTION_BLOCK', 'PROGRAM', 'END_FUNCTION',
  'END_FUNCTION_BLOCK', 'END_PROGRAM',
  'VAR', 'VAR_INPUT', 'VAR_OUTPUT', 'VAR_IN_OUT', 'VAR_GLOBAL',
  'END_VAR', 'RETAIN', 'CONSTANT', 'AT',
  'TRUE', 'FALSE',
  'BOOL', 'INT', 'DINT', 'LINT', 'UINT', 'UDINT', 'ULINT',
  'REAL', 'LREAL', 'TIME', 'DATE', 'STRING', 'BYTE', 'WORD', 'DWORD',
]);

/** Máximo de variáveis de entrada suportado pelo motor K-map */
const MAX_VARS = 4;

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface STStatement {
  /** Nome da saída normalizado (maiúsculas, sem '%' ou '.') */
  outputName: string;
  /** Expressão booleana bruta extraída do código ST */
  rawExpression: string;
}

export interface STParseResult {
  variables: Variable[];
  outputs: OutputConfig[];
  /** Erros fatais que impediram a geração de uma ou mais saídas */
  errors: string[];
  /** Avisos não-fatais (ex: variáveis truncadas, saídas ignoradas) */
  warnings: string[];
}

// ─── Utilitários internos ─────────────────────────────────────────────────────

/**
 * Remove comentários ST:
 *   (* bloco *)  e  // linha
 */
function removeComments(code: string): string {
  return code
    .replace(/\(\*[\s\S]*?\*\)/g, ' ')
    .replace(/\/\/[^\n]*/g, ' ');
}

/**
 * Normaliza nomes de variáveis ST para o formato interno (A-Z, 0-9, _):
 *   %IX0.0  →  IX0_0
 *   sensor.1 → SENSOR_1
 */
function normalizeVarName(name: string): string {
  return name
    .replace(/^%/, '')
    .replace(/\./g, '_')
    .replace(/[^A-Za-z0-9_]/g, '_')
    .toUpperCase();
}

/**
 * Extrai todos os identificadores de variável de uma string de expressão.
 * Exclui palavras reservadas ST e retorna os nomes normalizados por ordem
 * de aparição.
 */
function extractVarNamesFromExpr(expression: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const regex = /\b([A-Za-z%][A-Za-z0-9_.%]*)\b/g;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(expression)) !== null) {
    const normalized = normalizeVarName(m[1]);
    if (!ST_KEYWORDS.has(normalized) && !seen.has(normalized)) {
      seen.add(normalized);
      names.push(normalized);
    }
  }

  return names;
}

/**
 * Converte a expressão ST bruta para o dialeto aceito pelo expression-parser:
 *  - TRUE / FALSE  → 1 / 0
 *  - Nomes de variáveis normalizados
 *  - Demais operadores (AND/OR/NOT/XOR) já são aceitos nativamente
 */
function normalizeExpression(
  expression: string,
  knownVars: Set<string>
): string {
  return expression
    // literais booleanos ST
    .replace(/\bTRUE\b/gi, '1')
    .replace(/\bFALSE\b/gi, '0')
    // normaliza cada token identificador que seja variável conhecida
    .replace(/\b([A-Za-z%][A-Za-z0-9_.%]*)\b/g, (match) => {
      const norm = normalizeVarName(match);
      return knownVars.has(norm) ? norm : match;
    });
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Parseia código Structured Text (IEC 61131-3) simples e devolve
 * `Variable[]` + `OutputConfig[]` prontos para injetar no ProjectEditor.
 *
 * Suporta statements combinacionais puros:
 *   SAIDA := EXPRESSAO_BOOLEANA ;
 *
 * Limitações:
 *  - Máximo 4 variáveis de entrada (limite do motor K-map 4 variáveis)
 *  - Máximo 4 saídas
 *  - Não suporta blocos sequenciais (timers, contadores, máquinas de estado)
 *
 * @example
 * parseSTCode(`
 *   MOTOR_ON := (BTN_START AND NOT EMERGENCY) OR AUTO;
 *   LAMP_ERR := EMERGENCY;
 * `)
 */
export function parseSTCode(stCode: string): STParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Remover comentários
  const cleanCode = removeComments(stCode);

  // 2. Extrair todos os statements  IDENT := EXPR ;
  const stmtRegex = /([A-Za-z%][A-Za-z0-9_.%]*)\s*:=\s*([^;]+);/g;
  const statements: STStatement[] = [];
  let m: RegExpExecArray | null;

  while ((m = stmtRegex.exec(cleanCode)) !== null) {
    const outputName = normalizeVarName(m[1].trim());
    const rawExpression = m[2].trim();
    if (rawExpression.length > 0) {
      statements.push({ outputName, rawExpression });
    }
  }

  if (statements.length === 0) {
    errors.push(
      'Nenhum statement de atribuição encontrado. ' +
      'Use o formato: SAIDA := EXPRESSAO;'
    );
    return { variables: [], outputs: [], errors, warnings };
  }

  // 3. Limitar saídas
  const MAX_OUTPUTS = 4;
  if (statements.length > MAX_OUTPUTS) {
    warnings.push(
      `${statements.length} saídas encontradas; usando as primeiras ${MAX_OUTPUTS}.`
    );
    statements.splice(MAX_OUTPUTS);
  }

  // 4. Coletar variáveis de entrada únicas (excluir nomes de saída)
  const outputNameSet = new Set(statements.map(s => s.outputName));
  const allInputVars: string[] = [];
  const seenVars = new Set<string>();

  for (const stmt of statements) {
    for (const v of extractVarNamesFromExpr(stmt.rawExpression)) {
      if (!outputNameSet.has(v) && !seenVars.has(v)) {
        seenVars.add(v);
        allInputVars.push(v);
      }
    }
  }

  if (allInputVars.length === 0) {
    errors.push(
      'Nenhuma variável de entrada identificada. ' +
      'Verifique se as expressões contêm identificadores válidos.'
    );
    return { variables: [], outputs: [], errors, warnings };
  }

  // 5. Truncar para MAX_VARS
  let inputVars = allInputVars;
  if (allInputVars.length > MAX_VARS) {
    warnings.push(
      `${allInputVars.length} variáveis de entrada detectadas. ` +
      `O motor K-map suporta até ${MAX_VARS}. ` +
      `Usando: ${allInputVars.slice(0, MAX_VARS).join(', ')}.`
    );
    inputVars = allInputVars.slice(0, MAX_VARS);
  }

  const knownVarSet = new Set(inputVars);
  const variables: Variable[] = inputVars.map(name => ({ name, description: '' }));
  const numVars = variables.length;
  const totalRows = Math.pow(2, numVars);

  // 6. Para cada saída: normalizar expressão → parsear → avaliar
  const outputs: OutputConfig[] = [];

  for (const stmt of statements) {
    const normalizedExpr = normalizeExpression(stmt.rawExpression, knownVarSet);

    try {
      const tokens = tokenize(normalizedExpr);
      const ast = parse(tokens, inputVars);

      // Avaliar todas as 2^n combinações em ordem binária estrita
      const values: CellValue[] = new Array(totalRows).fill(0) as CellValue[];

      for (let i = 0; i < totalRows; i++) {
        const context: Record<string, number> = {};
        for (let j = 0; j < numVars; j++) {
          // bit mais significativo = variável índice 0
          context[inputVars[j]] = (i >> (numVars - 1 - j)) & 1;
        }
        values[i] = evaluateAST(ast, context) as CellValue;
      }

      outputs.push({ name: stmt.outputName, values });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(
        `Erro ao parsear "${stmt.outputName}": ${message} ` +
        `(expressão normalizada: "${normalizedExpr}")`
      );
    }
  }

  if (outputs.length === 0) {
    return { variables: [], outputs: [], errors, warnings };
  }

  return { variables, outputs, errors, warnings };
}
