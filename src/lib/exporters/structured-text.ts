// Exportador IEC 61131-3 Structured Text (ST) genérico
// Gera código compatível com qualquer CLP que suporte o padrão IEC 61131-3

import type { ExportFormat } from '../engine/types';
import { BaseExporter, type ExportConfig, type ExportResult } from './base-exporter';

/**
 * Exportador para Texto Estruturado IEC 61131-3.
 * Produz um FUNCTION_BLOCK com entradas BOOL e a expressão lógica simplificada.
 */
export class StructuredTextExporter extends BaseExporter {
  readonly format: ExportFormat = 'structured-text';
  readonly brandName = 'IEC 61131-3';
  readonly description = 'Texto Estruturado (ST) padrão IEC 61131-3';

  export(config: ExportConfig): ExportResult {
    const fbName = `FB_${this.sanitizeName(config.projectName)}`;
    const outputName = this.sanitizeName(config.outputName);

    // Gerar cabeçalho como comentários ST
    const headerLines = this.generateHeader(config);
    const header = headerLines.map((line) => `(* ${line} *)`).join('\n');

    // Gerar declaração de variáveis de entrada
    const inputVars = config.variables
      .map((v) => {
        const name = this.sanitizeName(v.name);
        const comment = v.description ? ` (* ${v.description} *)` : '';
        return `    ${name} : BOOL;${comment}`;
      })
      .join('\n');

    // Converter expressão SOP para sintaxe ST
    const expression = this.convertExpression(
      config.sopExpression,
      'AND',
      'OR',
      'NOT ',
      ''
    );

    // Montar o bloco funcional completo
    const code = `${header}

FUNCTION_BLOCK ${fbName}
VAR_INPUT
${inputVars}
END_VAR
VAR_OUTPUT
    ${outputName} : BOOL;
END_VAR

${outputName} := ${expression};

END_FUNCTION_BLOCK
`;

    return {
      code,
      filename: `${fbName}.st`,
      language: 'iecst',
      description: `Bloco funcional IEC 61131-3 ST para ${config.projectName}`,
    };
  }
}
