// Exportador para Schneider Electric EcoStruxure Control Expert / Unity Pro
// Gera código em Texto Estruturado com convenções Schneider

import type { ExportFormat } from '../engine/types';
import { BaseExporter, type ExportConfig, type ExportResult } from './base-exporter';

/**
 * Exportador para plataforma Schneider Electric (EcoStruxure / Unity Pro).
 * Produz um PROGRAM em ST com organização por seções e endereçamento
 * no formato Schneider (%M, %I, %Q).
 */
export class SchneiderExporter extends BaseExporter {
  readonly format: ExportFormat = 'schneider';
  readonly brandName = 'Schneider Electric';
  readonly description = 'EcoStruxure Control Expert / Unity Pro — Texto Estruturado';

  export(config: ExportConfig): ExportResult {
    const programName = `PRG_${this.sanitizeName(config.projectName)}`;
    const outputName = this.sanitizeName(config.outputName);

    // Cabeçalho com comentários Schneider
    const headerLines = this.generateHeader(config);
    const header = headerLines.map((line) => `// ${line}`).join('\n');

    // Gerar declaração de variáveis com endereços Schneider
    const inputVars = config.variables
      .map((v, i) => {
        const name = this.sanitizeName(v.name);
        const byte = Math.floor(i / 8);
        const bit = i % 8;
        const comment = v.description || `Entrada digital`;
        return `    ${name} AT %I${byte}.${bit} : BOOL; // ${comment}`;
      })
      .join('\n');

    // Endereço de saída
    const outByte = 0;
    const outBit = 0;

    // Converter expressão para sintaxe ST
    const expression = this.convertExpression(
      config.sopExpression,
      'AND',
      'OR',
      'NOT ',
      ''
    );

    // Montar o programa completo no formato Schneider / Unity Pro
    const code = `${header}
//
// Programa para EcoStruxure Control Expert / Unity Pro
// Linguagem: Texto Estruturado (ST)
//

PROGRAM ${programName}

// ── Seção: Declaração de Variáveis ─────────────────────────
VAR_INPUT
${inputVars}
END_VAR

VAR_OUTPUT
    ${outputName} AT %Q${outByte}.${outBit} : BOOL; // Saída da lógica
END_VAR

VAR
    // Memórias auxiliares (se necessário)
    // bAux AT %M0 : BOOL;
END_VAR

// ── Seção: Lógica Principal ────────────────────────────────
// Expressão booleana simplificada pelo LogicForge
// SOP: ${config.sopExpression}

${outputName} := ${expression};

// ── Seção: Diagnóstico ─────────────────────────────────────
// Inserir aqui lógica de diagnóstico ou alarmes, se necessário.

END_PROGRAM

// ============================================================
// MAPA DE ENDEREÇOS
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
// Memória:
//   %M0     →  disponível
// ============================================================
`;

    return {
      code,
      filename: `${programName}.st`,
      language: 'iecst',
      description: `Programa Schneider EcoStruxure / Unity Pro para ${config.projectName}`,
    };
  }
}
