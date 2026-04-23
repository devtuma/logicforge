// Exportador PLCopen XML para Ladder Logic (LD)
// Gera XML válido no padrão PLCopen para importação em múltiplas plataformas

import type { ExportFormat, Implicant } from '../engine/types';
import { BaseExporter, type ExportConfig, type ExportResult } from './base-exporter';

/**
 * Exportador PLCopen XML para diagrama Ladder.
 * Converte a expressão booleana em rungs de ladder:
 * - AND → contatos em série
 * - OR → ramos em paralelo
 * - NOT → contato normalmente fechado
 * - Saída → bobina
 */
export class LadderXMLExporter extends BaseExporter {
  readonly format: ExportFormat = 'ladder-xml';
  readonly brandName = 'PLCopen';
  readonly description = 'PLCopen XML — Diagrama Ladder para múltiplas plataformas';

  /** Contador global para IDs únicos de elementos no XML */
  private nextId = 1;

  /** Gera um ID único para elementos do XML */
  private uid(): number {
    return this.nextId++;
  }

  export(config: ExportConfig): ExportResult {
    // Reiniciar contador de IDs a cada exportação
    this.nextId = 1;

    const projectName = this.sanitizeName(config.projectName);
    const outputName = this.sanitizeName(config.outputName);

    // Parsear a expressão SOP em termos produto
    const productTerms = this.parseSOPTerms(config.sopExpression, config.variables.map((v) => v.name));

    // Gerar o corpo do ladder (rungs)
    const rungsXml = this.generateRungs(productTerms, outputName);

    // Montar o documento PLCopen XML completo
    const code = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Projeto: ${config.projectName}
  Saída: ${config.outputName}
  Expressão SOP: ${config.sopExpression}
  Gerado por LogicForge
  Data: ${new Date().toLocaleDateString('pt-BR')}
-->
<project xmlns="http://www.plcopen.org/xml/tc6_0201">
  <fileHeader companyName="LogicForge" productName="LogicForge" productVersion="1.0"
              creationDateTime="${new Date().toISOString()}" />
  <contentHeader name="${projectName}" version="1.0">
    <coordinateInfo>
      <fbd><scaling x="1" y="1" /></fbd>
      <ld><scaling x="1" y="1" /></ld>
      <sfc><scaling x="1" y="1" /></sfc>
    </coordinateInfo>
  </contentHeader>
  <types>
    <dataTypes />
    <pous>
      <pou name="${projectName}" pouType="program">
        <interface>
          <!-- Variáveis de entrada -->
          <localVars>
${config.variables
  .map((v) => {
    const name = this.sanitizeName(v.name);
    return `            <variable name="${name}">
              <type><BOOL /></type>${v.description ? `\n              <documentation><xhtml xmlns="http://www.w3.org/1999/xhtml">${this.escapeXml(v.description)}</xhtml></documentation>` : ''}
            </variable>`;
  })
  .join('\n')}
            <!-- Variável de saída -->
            <variable name="${outputName}">
              <type><BOOL /></type>
              <documentation><xhtml xmlns="http://www.w3.org/1999/xhtml">Saída da lógica simplificada</xhtml></documentation>
            </variable>
          </localVars>
        </interface>
        <body>
          <LD>
${rungsXml}
          </LD>
        </body>
      </pou>
    </pous>
  </types>
  <instances>
    <configurations>
      <configuration name="Config">
        <resource name="Recurso">
          <task name="Tarefa_Principal" priority="0" interval="T#20ms">
            <pouInstance name="Instancia_${projectName}" typeName="${projectName}" />
          </task>
        </resource>
      </configuration>
    </configurations>
  </instances>
</project>`;

    return {
      code,
      filename: `${projectName}_ladder.xml`,
      language: 'xml',
      description: `PLCopen XML Ladder para ${config.projectName}`,
    };
  }

  /**
   * Parseia a expressão SOP em termos produto.
   * Cada termo é um array de literais { variable, negated }.
   * Expressão de entrada usa · (AND), + (OR), ' (NOT).
   */
  private parseSOPTerms(
    sopExpression: string,
    varNames: string[]
  ): Array<Array<{ variable: string; negated: boolean }>> {
    // Casos triviais
    if (sopExpression === '0') return [];
    if (sopExpression === '1') return [[]]; // Termo vazio = sempre verdadeiro

    // Separar termos OR (split por ' + ')
    const orTerms = sopExpression.split(' + ');

    return orTerms.map((term) => {
      // Separar literais AND (split por '·')
      const literals = term.split('·');

      return literals.map((literal) => {
        const trimmed = literal.trim();
        const negated = trimmed.endsWith("'");
        const variable = negated ? trimmed.slice(0, -1) : trimmed;
        return { variable: this.sanitizeName(variable), negated };
      });
    });
  }

  /**
   * Gera os rungs de Ladder em XML.
   * Estrutura: cada termo produto = uma branch em paralelo.
   * Dentro de cada branch, contatos em série.
   * Todos convergem para a bobina de saída.
   */
  private generateRungs(
    productTerms: Array<Array<{ variable: string; negated: boolean }>>,
    outputName: string
  ): string {
    // Se não há termos, gerar rung vazio (saída sempre desligada)
    if (productTerms.length === 0) {
      return this.generateEmptyRung(outputName);
    }

    // Se há apenas um termo, gerar rung simples (série)
    if (productTerms.length === 1) {
      return this.generateSimpleRung(productTerms[0], outputName);
    }

    // Múltiplos termos: gerar rung com ramos paralelos (OR)
    return this.generateParallelRung(productTerms, outputName);
  }

  /** Gera um rung vazio — saída nunca ativada */
  private generateEmptyRung(outputName: string): string {
    const coilId = this.uid();
    return `            <!-- Rung: saída sempre desligada -->
            <rung label="Rung_0" height="1" width="2">
              <comment><xhtml xmlns="http://www.w3.org/1999/xhtml">Expressão resultou em 0 — saída desativada</xhtml></comment>
              <coil localId="${coilId}" negated="true" storage="none">
                <position x="1" y="1" />
                <variable>${outputName}</variable>
              </coil>
            </rung>`;
  }

  /**
   * Gera um rung simples com contatos em série e bobina de saída.
   * Corresponde a um único termo produto (sem OR).
   */
  private generateSimpleRung(
    literals: Array<{ variable: string; negated: boolean }>,
    outputName: string
  ): string {
    // Se o termo é vazio (tautologia), contato direto para bobina
    if (literals.length === 0) {
      const coilId = this.uid();
      return `            <!-- Rung: saída sempre ligada (tautologia) -->
            <rung label="Rung_0" height="1" width="2">
              <coil localId="${coilId}" negated="false" storage="none">
                <position x="1" y="1" />
                <variable>${outputName}</variable>
              </coil>
            </rung>`;
    }

    // Gerar contatos em série
    const contacts = literals
      .map((lit, idx) => {
        const contactId = this.uid();
        // negated=true → contato NF (normalmente fechado) = NOT
        return `              <contact localId="${contactId}" negated="${lit.negated}" edge="none">
                <position x="${idx + 1}" y="1" />
                <variable>${lit.variable}</variable>${idx > 0 ? `\n                <connectionPointIn>\n                  <connection refLocalId="${contactId - 1}" />\n                </connectionPointIn>` : ''}
              </contact>`;
      })
      .join('\n');

    const coilId = this.uid();
    const lastContactId = coilId - 1;

    return `            <!-- Rung: ${literals.map((l) => (l.negated ? `NOT ${l.variable}` : l.variable)).join(' AND ')} -->
            <rung label="Rung_0" height="1" width="${literals.length + 2}">
              <comment><xhtml xmlns="http://www.w3.org/1999/xhtml">SOP: termo produto em série</xhtml></comment>
${contacts}
              <coil localId="${coilId}" negated="false" storage="none">
                <position x="${literals.length + 1}" y="1" />
                <variable>${outputName}</variable>
                <connectionPointIn>
                  <connection refLocalId="${lastContactId}" />
                </connectionPointIn>
              </coil>
            </rung>`;
  }

  /**
   * Gera um rung com ramos paralelos (OR entre termos produto).
   * Cada ramo contém contatos em série (AND dentro do termo).
   */
  private generateParallelRung(
    productTerms: Array<Array<{ variable: string; negated: boolean }>>,
    outputName: string
  ): string {
    const maxLen = Math.max(...productTerms.map((t) => t.length));
    const height = productTerms.length;

    // Gerar cada ramo paralelo
    const branches = productTerms
      .map((term, branchIdx) => {
        const branchContacts = term
          .map((lit, contactIdx) => {
            const contactId = this.uid();
            const prevConnection =
              contactIdx > 0
                ? `\n                <connectionPointIn>\n                  <connection refLocalId="${contactId - 1}" />\n                </connectionPointIn>`
                : '';
            return `              <!-- Ramo ${branchIdx + 1}, Contato: ${lit.negated ? 'NF' : 'NA'} ${lit.variable} -->
              <contact localId="${contactId}" negated="${lit.negated}" edge="none">
                <position x="${contactIdx + 1}" y="${branchIdx + 1}" />
                <variable>${lit.variable}</variable>${prevConnection}
              </contact>`;
          })
          .join('\n');

        return branchContacts;
      })
      .join('\n');

    // Bobina de saída conectada aos últimos contatos de cada ramo
    const coilId = this.uid();

    return `            <!-- Rung: expressão OR com ${productTerms.length} ramos paralelos -->
            <rung label="Rung_0" height="${height}" width="${maxLen + 2}">
              <comment><xhtml xmlns="http://www.w3.org/1999/xhtml">Expressão SOP — ramos paralelos representam OR, contatos em série representam AND</xhtml></comment>
${branches}
              <coil localId="${coilId}" negated="false" storage="none">
                <position x="${maxLen + 1}" y="1" />
                <variable>${outputName}</variable>
              </coil>
            </rung>`;
  }

  /** Escapa caracteres especiais para uso em XML */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
