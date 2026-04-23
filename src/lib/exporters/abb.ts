// Exportador para ABB Automation Builder
// Gera código em Texto Estruturado IEC 61131-3 com convenções ABB

import type { ExportFormat } from '../engine/types';
import { BaseExporter, type ExportConfig, type ExportResult } from './base-exporter';

/**
 * Exportador para plataforma ABB (Automation Builder).
 * Produz um PROGRAM em ST padrão IEC 61131-3 com prefixos de tipo ABB
 * (ex: 'b' para BOOL, 'i' para INT).
 */
export class ABBExporter extends BaseExporter {
  readonly format: ExportFormat = 'abb';
  readonly brandName = 'ABB';
  readonly description = 'Automation Builder — Texto Estruturado IEC 61131-3';

  export(config: ExportConfig): ExportResult {
    const programName = `PRG_${this.sanitizeName(config.projectName)}`;
    const outputName = `b${this.sanitizeName(config.outputName)}`;

    // Cabeçalho com convenção ABB de comentários
    const headerLines = this.generateHeader(config);
    const header = [
      '(************************************************************)',
      ...headerLines.map((line) => ` * ${line}`),
      ' * Plataforma: ABB Automation Builder',
      ' * Padrão: IEC 61131-3 Texto Estruturado',
      '(************************************************************)',
    ].join('\n');

    // Construir mapa de variáveis com prefixo 'b' para BOOL (convenção ABB)
    const varMap = this.buildVarMap(config.variables, 'b');

    // Gerar declaração de variáveis de entrada com prefixo de tipo
    const inputVars = config.variables
      .map((v) => {
        const mappedName = varMap.get(v.name)!;
        const comment = v.description ? ` (* ${v.description} *)` : '';
        return `    ${mappedName} : BOOL;${comment}`;
      })
      .join('\n');

    // Converter expressão para sintaxe ST com nomes mapeados
    const expression = this.convertExpression(
      config.sopExpression,
      'AND',
      'OR',
      'NOT ',
      '',
      varMap
    );

    // Montar o programa completo no formato ABB
    const code = `${header}

PROGRAM ${programName}

VAR_INPUT
${inputVars}
END_VAR

VAR_OUTPUT
    ${outputName} : BOOL; (* Saída da lógica simplificada *)
END_VAR

VAR
    (* Variáveis internas, se necessário *)
END_VAR

(* Lógica principal — expressão booleana simplificada *)
(* SOP original: ${config.sopExpression} *)
${outputName} := ${expression};

END_PROGRAM
`;

    return {
      code,
      filename: `${programName}.st`,
      language: 'iecst',
      description: `Programa ABB Automation Builder para ${config.projectName}`,
    };
  }
}
