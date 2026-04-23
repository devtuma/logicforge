// Exportador para Siemens TIA Portal / Step 7 SCL
// Gera código em SCL (Structured Control Language) com endereçamento Siemens

import type { ExportFormat } from '../engine/types';
import { BaseExporter, type ExportConfig, type ExportResult } from './base-exporter';

/**
 * Exportador para plataforma Siemens (TIA Portal / Step 7).
 * Produz uma FC (Function) em SCL com endereços simbólicos no formato Siemens
 * e organização por blocos REGION.
 */
export class SiemensExporter extends BaseExporter {
  readonly format: ExportFormat = 'siemens';
  readonly brandName = 'Siemens';
  readonly description = 'TIA Portal / Step 7 — SCL (Structured Control Language)';

  export(config: ExportConfig): ExportResult {
    const fcName = `FC_${this.sanitizeName(config.projectName)}`;
    const outputName = this.sanitizeName(config.outputName);

    // Cabeçalho com comentários SCL
    const headerLines = this.generateHeader(config);
    const header = headerLines.map((line) => `// ${line}`).join('\n');

    // Gerar declaração de variáveis de entrada com endereços Siemens
    const inputVars = config.variables
      .map((v, i) => {
        const name = this.sanitizeName(v.name);
        const byte = Math.floor(i / 8);
        const bit = i % 8;
        const comment = v.description || `Entrada digital`;
        return `        ${name} : BOOL; // %I${byte}.${bit} — ${comment}`;
      })
      .join('\n');

    // Endereço de saída sugerido
    const outByte = 0;
    const outBit = 0;

    // Converter expressão para sintaxe SCL
    // SCL usa AND, OR, NOT como operadores
    const expression = this.convertExpression(
      config.sopExpression,
      'AND',
      'OR',
      'NOT ',
      ''
    );

    // Montar a FC completa em SCL
    const code = `${header}
//
// Function (FC) para TIA Portal / Step 7
// Linguagem: SCL (Structured Control Language)
//

FUNCTION "${fcName}" : VOID
TITLE = '${config.projectName}'
VERSION : '1.0'
AUTHOR : 'LogicForge'

REGION Declaração de Variáveis
    VAR_INPUT
${inputVars}
    END_VAR

    VAR_OUTPUT
        ${outputName} : BOOL; // %Q${outByte}.${outBit} — Saída da lógica
    END_VAR

    VAR_TEMP
        // Variáveis temporárias (se necessário)
    END_VAR
END_REGION

REGION Lógica Principal
    // Expressão booleana simplificada
    // SOP: ${config.sopExpression}
    ${outputName} := ${expression};
END_REGION

END_FUNCTION

// ============================================================
// TABELA DE ENDEREÇOS SUGERIDOS
// ============================================================
// Entradas:
${config.variables
  .map((v, i) => {
    const byte = Math.floor(i / 8);
    const bit = i % 8;
    return `//   %I${byte}.${bit}  →  ${this.sanitizeName(v.name)}`;
  })
  .join('\n')}
// Saída:
//   %Q${outByte}.${outBit}  →  ${outputName}
// Memória auxiliar (se necessário):
//   %M0.0  →  disponível para flags intermediárias
// ============================================================
`;

    return {
      code,
      filename: `${fcName}.scl`,
      language: 'iecst',
      description: `FC Siemens TIA Portal / Step 7 SCL para ${config.projectName}`,
    };
  }
}
