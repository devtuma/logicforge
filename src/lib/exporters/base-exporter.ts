// Classe base abstrata para todos os exportadores de CLP
// Define a interface comum e utilitários compartilhados

import type { Implicant, Variable, ExportFormat } from '../engine/types';

/** Configuração necessária para gerar o código de exportação */
export interface ExportConfig {
  projectName: string;
  variables: Variable[];
  outputName: string;
  implicants: Implicant[];
  sopExpression: string;
  posExpression: string;
  format: ExportFormat;
}

/** Resultado da exportação com o código gerado e metadados */
export interface ExportResult {
  code: string;
  filename: string;
  language: string; // dica para syntax highlighting
  description: string;
}

/**
 * Classe base abstrata para exportadores de lógica booleana.
 * Cada exportador converte expressões simplificadas para o formato
 * de uma plataforma CLP específica.
 */
export abstract class BaseExporter {
  abstract readonly format: ExportFormat;
  abstract readonly brandName: string;
  abstract readonly description: string;

  /** Gera o código exportado para a plataforma alvo */
  abstract export(config: ExportConfig): ExportResult;

  /**
   * Gera linhas de cabeçalho padrão com informações do projeto.
   * Subclasses formatam essas linhas com o estilo de comentário da plataforma.
   */
  protected generateHeader(config: ExportConfig): string[] {
    return [
      `Projeto: ${config.projectName}`,
      `Saída: ${config.outputName}`,
      `Expressão SOP: ${config.sopExpression}`,
      `Gerado por LogicForge`,
      `Data: ${new Date().toLocaleDateString('pt-BR')}`,
    ];
  }

  /**
   * Converte a expressão SOP (notação matemática) para a sintaxe da plataforma.
   * Notação de entrada: · (AND), + (OR), ' (NOT)
   * Cada plataforma define seus próprios operadores.
   */
  protected convertExpression(
    sopExpression: string,
    andOp: string,
    orOp: string,
    notPrefix: string,
    notSuffix: string,
    varMap?: Map<string, string>
  ): string {
    // Casos triviais
    if (sopExpression === '0') return 'FALSE';
    if (sopExpression === '1') return 'TRUE';

    let result = sopExpression;

    // Substituir variáveis complementadas: Nome' → NOT(Nome) ou prefixo/sufixo
    // Tratar nomes com múltiplos caracteres antes de caracteres simples
    result = result.replace(
      /([A-Za-z_][A-Za-z0-9_]*)'/g,
      `${notPrefix}$1${notSuffix}`
    );

    // Substituir operador AND (·)
    result = result.replace(/·/g, ` ${andOp} `);

    // Substituir operador OR (+) preservando espaçamento
    result = result.replace(/ \+ /g, ` ${orOp} `);

    // Aplicar mapeamento de nomes de variáveis, se fornecido
    if (varMap) {
      varMap.forEach((mapped, original) => {
        result = result.replace(new RegExp(`\\b${original}\\b`, 'g'), mapped);
      });
    }

    return result;
  }

  /**
   * Sanitiza um nome para uso como identificador válido na plataforma.
   * Remove caracteres especiais e substitui espaços por underscores.
   */
  protected sanitizeName(name: string): string {
    return name
      .replace(/\s+/g, '_')
      .replace(/[^A-Za-z0-9_]/g, '')
      .replace(/^(\d)/, '_$1'); // Não iniciar com número
  }

  /**
   * Gera um mapa de variáveis originais para nomes sanitizados.
   * Útil para plataformas que exigem convenções de nomenclatura específicas.
   */
  protected buildVarMap(
    variables: Variable[],
    prefix: string = '',
    suffix: string = ''
  ): Map<string, string> {
    const map = new Map<string, string>();
    for (const v of variables) {
      const sanitized = this.sanitizeName(v.name);
      map.set(v.name, `${prefix}${sanitized}${suffix}`);
    }
    return map;
  }
}
