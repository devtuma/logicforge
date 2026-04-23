// Utilitários gerais da aplicação

/** Combina classes CSS condicionalmente (substituto leve do clsx) */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Gera um ID único simples */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/** Faz download de um arquivo no navegador */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Cores para grupos do Mapa de Karnaugh */
export const KMAP_GROUP_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9',
] as const;

/** Nomes padrão para variáveis e saídas */
export const DEFAULT_VAR_NAMES = ['A', 'B', 'C', 'D'];
export const DEFAULT_OUTPUT_NAMES = ['F1', 'F2', 'F3', 'F4'];

// ─── Parser de blocos sequenciais ────────────────────────────────────────────

/** Tipos de blocos sequenciais suportados */
export type SequentialBlockType = 'TON' | 'TOF' | 'CTU' | 'CTD';

/**
 * Resultado do parse de um nome de saída sequencial.
 * Ex: "TON_MOTOR_3s"  → { type: 'TON', label: 'MOTOR', preset: '3s',  raw: 'T#3S' }
 *     "TOF_VALVULA"   → { type: 'TOF', label: 'VALVULA', preset: null, raw: null }
 *     "CTU_CAIXAS_50" → { type: 'CTU', label: 'CAIXAS', preset: '50', raw: '50' }
 */
export interface SequentialBlockInfo {
  type: SequentialBlockType;
  /** Nome do atuador (sem tipo e sem tempo) */
  label: string;
  /** Texto de preset para exibição no bloco: "3s", "500ms", "50" */
  preset: string | null;
  /** Valor formatado IEC 61131-3: "T#3S", "T#500MS", "50" */
  iecValue: string | null;
}

/** Regex para detectar segmento de tempo no final do nome: _3s / _500ms / _2m / _100 */
const TIME_SUFFIX_RE = /^(\d+)(s|ms|m)?$/i;

/**
 * Parseia o nome de uma saída e devolve informações do bloco sequencial.
 * Retorna `null` se o nome não começa com prefixo sequencial conhecido.
 *
 * @example
 * parseSequentialName("TON_MOTOR_3s")   // { type:'TON', label:'MOTOR', preset:'3s',   iecValue:'T#3S' }
 * parseSequentialName("TOF_VALVULA")    // { type:'TOF', label:'VALVULA', preset:null,  iecValue:null }
 * parseSequentialName("CTU_CAIXAS_100") // { type:'CTU', label:'CAIXAS', preset:'50',   iecValue:'100' }
 * parseSequentialName("MOTOR_ON")       // null
 */
export function parseSequentialName(outputName: string): SequentialBlockInfo | null {
  const SEQ_TYPES: SequentialBlockType[] = ['TON', 'TOF', 'CTU', 'CTD'];

  for (const type of SEQ_TYPES) {
    if (!outputName.startsWith(`${type}_`)) continue;

    // Remove o prefixo "TYPE_"
    const rest = outputName.slice(type.length + 1);
    const parts = rest.split('_');

    // Verificar se o último segmento é um sufixo de tempo/contagem
    const lastPart = parts[parts.length - 1];
    const timeMatch = TIME_SUFFIX_RE.exec(lastPart);

    let label: string;
    let preset: string | null = null;
    let iecValue: string | null = null;

    if (timeMatch && parts.length > 1) {
      // Último segmento é tempo/contagem → label = tudo antes
      label = parts.slice(0, -1).join('_');
      const num = timeMatch[1];
      const unit = (timeMatch[2] || '').toLowerCase();

      if (type === 'CTU' || type === 'CTD') {
        // Contador: sem unidade de tempo
        preset = num;
        iecValue = num;
      } else {
        // Timer: formatar em IEC T#
        if (unit === 'ms') {
          preset = `${num}ms`;
          iecValue = `T#${num}MS`;
        } else if (unit === 'm') {
          preset = `${num}min`;
          iecValue = `T#${num}M`;
        } else {
          // segundos (padrão)
          preset = `${num}s`;
          iecValue = `T#${num}S`;
        }
      }
    } else {
      // Sem sufixo de tempo — label = tudo
      label = rest;
    }

    return { type, label, preset, iecValue };
  }

  return null;
}
