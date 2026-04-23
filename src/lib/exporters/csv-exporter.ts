// Exportador CSV da tabela verdade
// Gera arquivo CSV com separador ponto-e-vírgula e BOM UTF-8 para compatibilidade com Excel

import type { ExportFormat } from '../engine/types';
import { BaseExporter, type ExportConfig, type ExportResult } from './base-exporter';

/**
 * Exportador CSV da tabela verdade completa.
 * Gera todas as combinações de entrada com o valor da saída,
 * usando ponto-e-vírgula como separador (padrão brasileiro/europeu)
 * e BOM UTF-8 para abertura correta no Excel.
 */
export class CSVExporter extends BaseExporter {
  readonly format: ExportFormat = 'csv';
  readonly brandName = 'CSV';
  readonly description = 'Tabela verdade em CSV (separador ponto-e-vírgula)';

  /** BOM UTF-8 para compatibilidade com Excel */
  private readonly UTF8_BOM = '\uFEFF';

  /** Separador padrão brasileiro/europeu */
  private readonly SEPARATOR = ';';

  export(config: ExportConfig): ExportResult {
    const numVars = config.variables.length;
    const totalRows = Math.pow(2, numVars);
    const sep = this.SEPARATOR;
    const outputName = this.sanitizeName(config.outputName);

    // Calcular quais mintermos estão cobertos pelos implicantes (saída = 1)
    const activeMinterms = new Set<number>();
    for (const imp of config.implicants) {
      for (const m of imp.minterms) {
        activeMinterms.add(m);
      }
    }

    // Cabeçalho do CSV: índice do mintermo + variáveis + saída
    const headerCols = [
      'Mintermo',
      ...config.variables.map((v) => v.name),
      outputName,
    ];
    const headerLine = headerCols.join(sep);

    // Gerar linhas da tabela verdade
    const dataLines: string[] = [];
    for (let i = 0; i < totalRows; i++) {
      const cols: string[] = [];

      // Índice do mintermo
      cols.push(String(i));

      // Valores das variáveis (bits do índice, MSB primeiro)
      for (let bit = numVars - 1; bit >= 0; bit--) {
        cols.push(String((i >> bit) & 1));
      }

      // Valor da saída
      const outputValue = activeMinterms.has(i) ? '1' : '0';
      cols.push(outputValue);

      dataLines.push(cols.join(sep));
    }

    // Montar o CSV completo com BOM
    const csvContent = [headerLine, ...dataLines].join('\n');
    const code = `${this.UTF8_BOM}${csvContent}\n`;

    return {
      code,
      filename: `${this.sanitizeName(config.projectName)}_tabela_verdade.csv`,
      language: 'csv',
      description: `Tabela verdade CSV para ${config.projectName} (${totalRows} combinações)`,
    };
  }
}
