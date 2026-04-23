// Exportador para Rockwell Automation Studio 5000 / RSLogix 5000
// Gera código em Texto Estruturado com convenções Rockwell e trecho L5X

import type { ExportFormat } from '../engine/types';
import { BaseExporter, type ExportConfig, type ExportResult } from './base-exporter';

/**
 * Exportador para plataforma Rockwell (Allen-Bradley).
 * Produz uma AOI (Add-On Instruction) em ST com tags no formato Rockwell,
 * além de um trecho XML L5X simplificado para importação direta.
 */
export class RockwellExporter extends BaseExporter {
  readonly format: ExportFormat = 'rockwell';
  readonly brandName = 'Rockwell Automation';
  readonly description = 'Studio 5000 / RSLogix 5000 — AOI em Texto Estruturado + L5X';

  export(config: ExportConfig): ExportResult {
    const aoiName = `AOI_${this.sanitizeName(config.projectName)}`;
    const outputName = this.sanitizeName(config.outputName);

    // Cabeçalho com comentários no estilo Rockwell (//)
    const headerLines = this.generateHeader(config);
    const header = headerLines.map((line) => `// ${line}`).join('\n');

    // Gerar tags de entrada no formato Rockwell
    const inputParams = config.variables
      .map((v, i) => {
        const tagName = this.sanitizeName(v.name);
        const comment = v.description || `Entrada ${i}`;
        return `    ${tagName} : BOOL; // ${comment} — Endereço sugerido: Local:1:I.Data.${i}`;
      })
      .join('\n');

    // Converter expressão para sintaxe ST Rockwell (usa AND/OR/NOT padrão)
    const expression = this.convertExpression(
      config.sopExpression,
      'AND',
      'OR',
      'NOT ',
      ''
    );

    // Gerar código da AOI em Texto Estruturado
    const stCode = `${header}
//
// Add-On Instruction (AOI) — ${aoiName}
// Plataforma: Studio 5000 / RSLogix 5000
//

// === Definição da AOI ===
// Nome: ${aoiName}
// Descrição: Lógica simplificada para saída ${outputName}

// --- Parâmetros de Entrada (InOut) ---
// Configurar como parâmetros da AOI no Studio 5000:
${inputParams}

// --- Parâmetro de Saída ---
//    ${outputName} : BOOL; // Resultado da expressão lógica

// === Lógica (corpo da AOI em ST) ===
${outputName} := ${expression};

// === Fim da AOI ===
`;

    // Gerar trecho L5X para importação direta
    const l5xSnippet = this.generateL5X(config, aoiName, outputName, expression);

    // Combinar ST e L5X no resultado final
    const fullCode = `${stCode}

// ============================================================
// TRECHO L5X PARA IMPORTAÇÃO NO STUDIO 5000
// Copie o XML abaixo para um arquivo .L5X e importe no projeto
// ============================================================

/*
${l5xSnippet}
*/
`;

    return {
      code: fullCode,
      filename: `${aoiName}.st`,
      language: 'iecst',
      description: `AOI Rockwell Studio 5000 para ${config.projectName}`,
    };
  }

  /**
   * Gera um trecho XML L5X simplificado representando a lógica em Ladder.
   * Este XML é uma versão reduzida compatível com importação no Studio 5000.
   */
  private generateL5X(
    config: ExportConfig,
    aoiName: string,
    outputName: string,
    expression: string
  ): string {
    // Gerar declarações de tags
    const tagDeclarations = config.variables
      .map((v, i) => {
        const name = this.sanitizeName(v.name);
        return `      <Tag Name="${name}" TagType="Base" DataType="BOOL" Radix="Decimal" Constant="false" ExternalAccess="Read/Write">
        <Description><![CDATA[${v.description || `Entrada ${i}`}]]></Description>
        <Data Format="Decorated"><DataValue DataType="BOOL" Value="0"/></Data>
      </Tag>`;
      })
      .join('\n');

    // Gerar rung com a expressão em texto estruturado
    const rungText = expression
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="33.00" TargetName="${aoiName}" TargetType="AddOnInstructionDefinition" ContainsContext="true" Owner="LogicForge">
  <Controller Use="Context" Name="LogicForge">
    <AddOnInstructionDefinitions Use="Context">
      <AddOnInstructionDefinition Name="${aoiName}" Revision="1.0" ExecutePrescan="false" ExecutePostscan="false" ExecuteEnableInFalse="false" CreatedDate="${new Date().toISOString()}" CreatedBy="LogicForge">
        <Description><![CDATA[Lógica simplificada gerada pelo LogicForge]]></Description>
        <Parameters>
${config.variables.map((v) => `          <Parameter Name="${this.sanitizeName(v.name)}" TagType="Base" DataType="BOOL" Usage="Input" Radix="Decimal" Required="true" Visible="true" ExternalAccess="Read Only">
            <Description><![CDATA[${v.description || v.name}]]></Description>
          </Parameter>`).join('\n')}
          <Parameter Name="${outputName}" TagType="Base" DataType="BOOL" Usage="Output" Radix="Decimal" Required="true" Visible="true" ExternalAccess="Read Only">
            <Description><![CDATA[Saída da lógica simplificada]]></Description>
          </Parameter>
        </Parameters>
        <LocalTags>
${tagDeclarations}
          <Tag Name="${outputName}" TagType="Base" DataType="BOOL" Radix="Decimal" Constant="false" ExternalAccess="Read/Write">
            <Description><![CDATA[Saída da lógica]]></Description>
            <Data Format="Decorated"><DataValue DataType="BOOL" Value="0"/></Data>
          </Tag>
        </LocalTags>
        <Routines>
          <Routine Name="Logic" Type="ST">
            <STContent>
              <Line Number="0"><![CDATA[// Expressão lógica simplificada pelo LogicForge]]></Line>
              <Line Number="1"><![CDATA[${rungText}]]></Line>
            </STContent>
          </Routine>
        </Routines>
      </AddOnInstructionDefinition>
    </AddOnInstructionDefinitions>
  </Controller>
</RSLogix5000Content>`;
  }
}
