'use client';

// Renderizador gráfico INTELIGENTE de Diagrama Ladder em SVG
// Otimiza ramos paralelos fatorando contatos comuns (prefixo/sufixo).
// Desenha contatos NA/NF, bobinas, Set/Reset, trilhos de potência.

import { useMemo, useState, useCallback } from 'react';
import type { Implicant, Variable } from '@/lib/engine/types';
import { parseSequentialName } from '@/lib/utils';

// ===== Tipos =====

interface LadderContact {
  variable: string;
  negated: boolean;
}

/** Árvore otimizada do diagrama Ladder */
type LadderTree =
  | { type: 'contact'; variable: string; negated: boolean }
  | { type: 'series'; nodes: LadderTree[] }
  | { type: 'parallel'; branches: LadderTree[] }
  | { type: 'wire' }; // fio direto (sem contato)

interface LadderRung {
  tree: LadderTree;
  outputName: string;
  outputType: 'coil' | 'set' | 'reset';
}

interface TreeSize {
  width: number;
  height: number;
  anchorY: number;
}

// ===== Constantes de layout =====
const CELL_W = 150;
const CELL_H = 48;
const RAIL_W = 16;
const COIL_W = 120;
const WIRE_MIN_W = 24;
const BRANCH_GAP = 2;
const RUNG_GAP = 16;
const RUNG_PAD = 14;

// ===== Cores =====
const C = {
  wire: 'var(--foreground)',
  rail: 'var(--accent)',
  contactBg: 'var(--surface)',
  contactBorder: 'var(--foreground)',
  contactText: 'var(--foreground)',
  coilBorder: 'var(--accent)',
  coilBg: 'var(--accent-soft)',
  coilText: 'var(--accent)',
  setBorder: '#16a34a',
  setBg: '#dcfce7',
  setText: '#16a34a',
  resetBorder: '#dc2626',
  resetBg: '#fee2e2',
  resetText: '#dc2626',
  slash: 'var(--danger, #dc2626)',
  label: 'var(--muted)',
  rungBg: 'var(--surface)',
  rungBorder: 'var(--border)',
};

// =============================================
// ALGORITMO DE OTIMIZAÇÃO (FATORAÇÃO)
// =============================================

function contactsEqual(a: LadderContact, b: LadderContact): boolean {
  return a.variable === b.variable && a.negated === b.negated;
}

/** Encontra o prefixo comum mais longo entre todos os ramos */
function findCommonPrefix(branches: LadderContact[][]): LadderContact[] {
  if (branches.length <= 1) return [];
  const prefix: LadderContact[] = [];
  const minLen = Math.min(...branches.map((b) => b.length));

  for (let i = 0; i < minLen; i++) {
    const ref = branches[0][i];
    if (branches.every((b) => contactsEqual(b[i], ref))) {
      prefix.push({ ...ref });
    } else {
      break;
    }
  }
  return prefix;
}

/** Encontra o sufixo comum mais longo entre todos os ramos */
function findCommonSuffix(branches: LadderContact[][]): LadderContact[] {
  if (branches.length <= 1) return [];
  const reversed = branches.map((b) => [...b].reverse());
  const prefix = findCommonPrefix(reversed);
  return prefix.reverse();
}

/**
 * Otimiza uma lista de ramos paralelos em uma árvore,
 * fatorando contatos comuns (prefixo e sufixo).
 *
 * Exemplo: [[A,B',C'], [A,B,C]] → series(A, parallel(series(B',C'), series(B,C)))
 */
function optimizeBranches(branches: LadderContact[][]): LadderTree {
  // Separar ramos vazios (fio direto)
  const nonEmpty = branches.filter((b) => b.length > 0);
  const emptyCount = branches.length - nonEmpty.length;

  // Todos vazios
  if (nonEmpty.length === 0) {
    return { type: 'wire' };
  }

  // Único ramo
  if (nonEmpty.length === 1 && emptyCount === 0) {
    if (nonEmpty[0].length === 1) {
      return { type: 'contact', ...nonEmpty[0][0] };
    }
    return {
      type: 'series',
      nodes: nonEmpty[0].map((c) => ({ type: 'contact' as const, ...c })),
    };
  }

  // --- Tentar extrair prefixo comum ---
  const prefix = findCommonPrefix(nonEmpty);
  if (prefix.length > 0) {
    const tails = nonEmpty.map((b) => b.slice(prefix.length));
    // Adicionar ramos vazios de volta
    const allTails = [...tails, ...Array(emptyCount).fill([])];

    const prefixNodes: LadderTree[] = prefix.map((c) => ({
      type: 'contact' as const,
      ...c,
    }));
    const tailTree = optimizeBranches(allTails);

    return {
      type: 'series',
      nodes: [...prefixNodes, tailTree],
    };
  }

  // --- Tentar extrair sufixo comum ---
  const suffix = findCommonSuffix(nonEmpty);
  if (suffix.length > 0) {
    const heads = nonEmpty.map((b) => b.slice(0, b.length - suffix.length));
    const allHeads = [...heads, ...Array(emptyCount).fill([])];

    const suffixNodes: LadderTree[] = suffix.map((c) => ({
      type: 'contact' as const,
      ...c,
    }));
    const headTree = optimizeBranches(allHeads);

    return {
      type: 'series',
      nodes: [headTree, ...suffixNodes],
    };
  }

  // --- Agrupar por primeiro contato ---
  const groups = new Map<string, LadderContact[][]>();
  for (const branch of nonEmpty) {
    const key = `${branch[0].variable}:${branch[0].negated}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(branch);
  }

  const parallelBranches: LadderTree[] = [];

  for (const [, groupBranches] of groups) {
    if (groupBranches.length === 1) {
      // Ramo único — série simples
      const b = groupBranches[0];
      if (b.length === 1) {
        parallelBranches.push({ type: 'contact', ...b[0] });
      } else {
        parallelBranches.push({
          type: 'series',
          nodes: b.map((c) => ({ type: 'contact' as const, ...c })),
        });
      }
    } else {
      // Múltiplos ramos com mesmo primeiro contato — FAT ORAR
      const first = groupBranches[0][0];
      const tails = groupBranches.map((b) => b.slice(1));
      const tailTree = optimizeBranches(tails);

      parallelBranches.push({
        type: 'series',
        nodes: [{ type: 'contact', ...first }, tailTree],
      });
    }
  }

  // Adicionar fios diretos (ramos vazios)
  for (let i = 0; i < emptyCount; i++) {
    parallelBranches.push({ type: 'wire' });
  }

  if (parallelBranches.length === 1) return parallelBranches[0];

  return { type: 'parallel', branches: parallelBranches };
}

// =============================================
// MEDIÇÃO DA ÁRVORE
// =============================================

function measureTree(tree: LadderTree): TreeSize {
  switch (tree.type) {
    case 'contact':
      return { width: CELL_W, height: CELL_H, anchorY: CELL_H / 2 };

    case 'wire':
      return { width: WIRE_MIN_W, height: CELL_H, anchorY: CELL_H / 2 };

    case 'series': {
      let w = 0;
      let maxAnchor = 0;
      let maxBottom = 0;
      for (const node of tree.nodes) {
        const m = measureTree(node);
        w += m.width;
        maxAnchor = Math.max(maxAnchor, m.anchorY);
        maxBottom = Math.max(maxBottom, m.height - m.anchorY);
      }
      return { width: w, height: maxAnchor + maxBottom, anchorY: maxAnchor };
    }

    case 'parallel': {
      let maxW = 0;
      let totalH = 0;
      let anchorY = 0;
      for (let i = 0; i < tree.branches.length; i++) {
        const m = measureTree(tree.branches[i]);
        maxW = Math.max(maxW, m.width);
        if (i === 0) anchorY = m.anchorY; // Fio principal se alinha com o primeiro ramo
        totalH += m.height;
        if (i > 0) totalH += BRANCH_GAP;
      }
      return { width: maxW + 16, height: totalH, anchorY };
    }
  }
}

// =============================================
// MOTOR DE SIMULAÇÃO VISUAL E RENDERIZAÇÃO
// =============================================

function getFlow(tree: LadderTree, state: Record<string, boolean>): boolean {
  switch (tree.type) {
    case 'wire': return true;
    case 'contact': return tree.negated ? !state[tree.variable] : !!state[tree.variable];
    case 'series': return tree.nodes.every(n => getFlow(n, state));
    case 'parallel': return tree.branches.some(b => getFlow(b, state));
  }
}

/** Renderiza um contato NA */
function renderContactNO(
  x: number, y: number, w: number, h: number, label: string,
  powerIn: boolean, passes: boolean, onToggle: (v: string) => void
): React.ReactElement {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const cw = 16;
  const ch = 24;
  const powerOut = powerIn && passes;
  const cIn = powerIn ? '#84cc16' : C.wire;
  const cOut = powerOut ? '#84cc16' : C.wire;
  const cActive = passes ? '#84cc16' : C.contactBorder;

  return (
    <g onClick={() => onToggle(label)} className="cursor-pointer hover:opacity-75 transition-opacity">
      <line x1={x} y1={cy} x2={cx - cw / 2} y2={cy} stroke={cIn} strokeWidth={2} />
      <line x1={cx + cw / 2} y1={cy} x2={x + w} y2={cy} stroke={cOut} strokeWidth={2} />
      <line x1={cx - cw / 2} y1={cy - ch / 2} x2={cx - cw / 2} y2={cy + ch / 2} stroke={cActive} strokeWidth={2.5} />
      <line x1={cx + cw / 2} y1={cy - ch / 2} x2={cx + cw / 2} y2={cy + ch / 2} stroke={cActive} strokeWidth={2.5} />
      <text x={cx} y={cy - ch / 2 - 8} textAnchor="middle" dominantBaseline="auto"
        fontSize={12} fontWeight={700} fontFamily="var(--font-geist-mono), monospace"
        fill={passes ? '#84cc16' : C.contactText}>
        {label}
      </text>
    </g>
  );
}

/** Renderiza um contato NF */
function renderContactNC(
  x: number, y: number, w: number, h: number, label: string,
  powerIn: boolean, passes: boolean, onToggle: (v: string) => void
): React.ReactElement {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const cw = 16;
  const ch = 24;
  const powerOut = powerIn && passes;
  const cIn = powerIn ? '#84cc16' : C.wire;
  const cOut = powerOut ? '#84cc16' : C.wire;
  const cActive = passes ? '#84cc16' : C.contactBorder;

  return (
    <g onClick={() => onToggle(label)} className="cursor-pointer hover:opacity-75 transition-opacity">
      <line x1={x} y1={cy} x2={cx - cw / 2} y2={cy} stroke={cIn} strokeWidth={2} />
      <line x1={cx + cw / 2} y1={cy} x2={x + w} y2={cy} stroke={cOut} strokeWidth={2} />
      <line x1={cx - cw / 2} y1={cy - ch / 2} x2={cx - cw / 2} y2={cy + ch / 2} stroke={cActive} strokeWidth={2.5} />
      <line x1={cx + cw / 2} y1={cy - ch / 2} x2={cx + cw / 2} y2={cy + ch / 2} stroke={cActive} strokeWidth={2.5} />
      <line x1={cx - cw / 2 - 4} y1={cy + ch / 2 + 4} x2={cx + cw / 2 + 4} y2={cy - ch / 2 - 4} stroke={cActive} strokeWidth={2} />
      <text x={cx} y={cy - ch / 2 - 8} textAnchor="middle" dominantBaseline="auto"
        fontSize={12} fontWeight={700} fontFamily="var(--font-geist-mono), monospace"
        fill={passes ? '#84cc16' : C.contactText}>
        {label}
      </text>
    </g>
  );
}

/** Renderiza um fio direto (wire) */
function renderWire(
  x: number, y: number, w: number, h: number, powerIn: boolean
): React.ReactElement {
  const cy = y + h / 2;
  return (
    <line x1={x} y1={cy} x2={x + w} y2={cy}
      stroke={powerIn ? '#84cc16' : C.wire} strokeWidth={2} strokeDasharray="4 3" />
  );
}

/**
 * Renderiza recursivamente a árvore ladder.
 */
function renderTree(
  tree: LadderTree,
  x: number,
  yAnchor: number,
  allocatedWidth: number,
  key: string,
  powerIn: boolean,
  state: Record<string, boolean>,
  onToggle: (v: string) => void
): React.ReactElement {
  switch (tree.type) {
    case 'contact': {
      const yTop = yAnchor - CELL_H / 2;
      const passes = tree.negated ? !state[tree.variable] : !!state[tree.variable];
      const el = tree.negated
        ? renderContactNC(x, yTop, allocatedWidth, CELL_H, tree.variable, powerIn, passes, onToggle)
        : renderContactNO(x, yTop, allocatedWidth, CELL_H, tree.variable, powerIn, passes, onToggle);
      return <g key={key}>{el}</g>;
    }

    case 'wire': {
      const yTop = yAnchor - CELL_H / 2;
      const el = renderWire(x, yTop, allocatedWidth, CELL_H, powerIn);
      return <g key={key}>{el}</g>;
    }

    case 'series': {
      const childSizes = tree.nodes.map((n) => measureTree(n));
      const totalChildW = childSizes.reduce((s, c) => s + c.width, 0);
      const scale = totalChildW > 0 ? allocatedWidth / totalChildW : 1;

      const elements: React.ReactElement[] = [];
      let curX = x;
      let curPower = powerIn;

      for (let i = 0; i < tree.nodes.length; i++) {
        const childNode = tree.nodes[i];
        const childW = childSizes[i].width * scale;
        elements.push(
          renderTree(childNode, curX, yAnchor, childW, `${key}-s${i}`, curPower, state, onToggle)
        );
        curX += childW;
        curPower = curPower && getFlow(childNode, state);
      }

      return <g key={key}>{elements}</g>;
    }

    case 'parallel': {
      const junctionL = 8;
      const junctionR = 0;
      const innerW = allocatedWidth - junctionL - junctionR;
      const elements: React.ReactElement[] = [];
      const wireYs: number[] = [];
      
      const pSize = measureTree(tree);
      let curTop = yAnchor - pSize.anchorY;

      let anyPassed = false;

      for (let i = 0; i < tree.branches.length; i++) {
        const bTree = tree.branches[i];
        const bSize = measureTree(bTree);
        const bAnchor = curTop + bSize.anchorY;
        wireYs.push(bAnchor);
        
        elements.push(
          renderTree(bTree, x + junctionL, bAnchor, innerW, `${key}-p${i}`, powerIn, state, onToggle)
        );
        curTop += bSize.height + BRANCH_GAP;
        if (getFlow(bTree, state)) anyPassed = true;
      }

      const powerOut = powerIn && anyPassed;
      const cIn = powerIn ? '#84cc16' : C.wire;
      const cOut = powerOut ? '#84cc16' : C.wire;

      const firstWireY = wireYs[0];
      const lastWireY = wireYs[wireYs.length - 1];

      for (let i = 0; i < wireYs.length; i++) {
        elements.push(
          <line key={`${key}-jl${i}`}
            x1={x} y1={wireYs[i]} x2={x + junctionL} y2={wireYs[i]}
            stroke={cIn} strokeWidth={2} />
        );
      }

      if (wireYs.length > 1) {
        elements.push(
          <line key={`${key}-vl`}
            x1={x} y1={firstWireY} x2={x} y2={lastWireY}
            stroke={cIn} strokeWidth={2} />
        );
        elements.push(
          <line key={`${key}-vr`}
            x1={x + allocatedWidth} y1={firstWireY}
            x2={x + allocatedWidth} y2={lastWireY}
            stroke={cOut} strokeWidth={2} />
        );
        for (const wy of wireYs) {
          elements.push(
            <circle key={`${key}-dl-${wy}`} cx={x} cy={wy} r={3} fill={cIn} />,
            <circle key={`${key}-dr-${wy}`} cx={x + allocatedWidth} cy={wy} r={3} fill={cOut} />
          );
        }
      }

      return <g key={key}>{elements}</g>;
    }
  }
}

// ===== Bobinas de saída =====

function OutputCoil({ x, y, label, type, powerIn }: {
  x: number; y: number; label: string; type: 'coil' | 'set' | 'reset'; powerIn: boolean;
}) {
  const cy = y;
  const cx = x + COIL_W / 2;

  const cIn = powerIn ? '#84cc16' : C.wire;
  const cActive = powerIn ? '#eab308' : C.coilBorder; // Yellow if active
  const tActive = powerIn ? '#eab308' : C.coilText;

  if (type === 'coil') {
    return (
      <g>
        <line x1={x} y1={cy} x2={cx - 16} y2={cy} stroke={cIn} strokeWidth={2} />
        <line x1={cx + 16} y1={cy} x2={x + COIL_W} y2={cy} stroke={cIn} strokeWidth={2} />
        <path d={`M ${cx - 8} ${cy - 12} Q ${cx - 16} ${cy} ${cx - 8} ${cy + 12}`} fill="none" stroke={cActive} strokeWidth={2} />
        <path d={`M ${cx + 8} ${cy - 12} Q ${cx + 16} ${cy} ${cx + 8} ${cy + 12}`} fill="none" stroke={cActive} strokeWidth={2} />
        <text x={cx} y={cy - 20} textAnchor="middle" dominantBaseline="auto"
          fontSize={12} fontWeight={700} fontFamily="var(--font-geist-mono), monospace"
          fill={tActive}>{label}</text>
      </g>
    );
  }

  const borderC = type === 'set' ? C.setBorder : C.resetBorder;
  const textC = type === 'set' ? C.setText : C.resetText;
  const bActive = powerIn ? textC : borderC;
  const letter = type === 'set' ? 'S' : 'R';

  return (
    <g>
      <line x1={x} y1={cy} x2={cx - 16} y2={cy} stroke={cIn} strokeWidth={2} />
      <line x1={cx + 16} y1={cy} x2={x + COIL_W} y2={cy} stroke={cIn} strokeWidth={2} />
      <path d={`M ${cx - 8} ${cy - 12} Q ${cx - 16} ${cy} ${cx - 8} ${cy + 12}`} fill="none" stroke={bActive} strokeWidth={2} />
      <path d={`M ${cx + 8} ${cy - 12} Q ${cx + 16} ${cy} ${cx + 8} ${cy + 12}`} fill="none" stroke={bActive} strokeWidth={2} />
      
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize={12} fontWeight={900} fill={powerIn ? textC : C.label}>{letter}</text>
        
      <text x={cx} y={cy - 20} textAnchor="middle" dominantBaseline="auto"
        fontSize={12} fontWeight={700} fontFamily="var(--font-geist-mono), monospace"
        fill={bActive}>{label}</text>
    </g>
  );
}

// ===== Conversão implicantes → árvore otimizada =====

function implicantsToOptimizedRung(
  implicants: Implicant[],
  variables: Variable[],
  outputName: string,
  outputType: 'coil' | 'set' | 'reset'
): LadderRung {
  if (implicants.length === 0) {
    return { tree: { type: 'wire' }, outputName, outputType };
  }

  const branches: LadderContact[][] = implicants.map((imp) => {
    const contacts: LadderContact[] = [];
    for (let i = 0; i < imp.mask.length; i++) {
      if (imp.mask[i] === '-') continue;
      const varName = imp.variables?.[i] || variables[i]?.name || `X${i}`;
      contacts.push({ variable: varName, negated: imp.mask[i] === '0' });
    }
    return contacts;
  });

  const tree = branches.length === 1
    ? (branches[0].length === 1
        ? { type: 'contact' as const, ...branches[0][0] }
        : { type: 'series' as const, nodes: branches[0].map(c => ({ type: 'contact' as const, ...c })) })
    : optimizeBranches(branches);

  return { tree, outputName, outputType };
}

// ===== Descrição textual de um rung =====

function describeTree(tree: LadderTree): string {
  switch (tree.type) {
    case 'wire':
      return '—';
    case 'contact':
      return tree.negated ? `/${tree.variable}` : tree.variable;
    case 'series':
      return tree.nodes.map(describeTree).join(' · ');
    case 'parallel':
      return '(' + tree.branches.map(describeTree).join(' + ') + ')';
  }
}

// ===== Componente principal =====

export interface LadderDiagramProps {
  variables: Variable[];
  outputs: Array<{
    outputName: string;
    implicants: Implicant[];
  }>;
  outputType?: 'coil' | 'set' | 'reset';
}

export function LadderDiagram({
  variables,
  outputs,
  outputType = 'coil',
}: LadderDiagramProps) {
  const [selectedType, setSelectedType] = useState<'coil' | 'set' | 'reset'>(outputType);
  const [simState, setSimState] = useState<Record<string, boolean>>({});

  const handleToggle = useCallback((varName: string) => {
    setSimState(prev => ({ ...prev, [varName]: !prev[varName] }));
  }, []);

  const rungs = useMemo(() => {
    return outputs.map((o) =>
      implicantsToOptimizedRung(o.implicants, variables, o.outputName, selectedType)
    );
  }, [outputs, variables, selectedType]);

  // Calcular dimensões do SVG
  const { totalHeight, rungMetas, totalWidth } = useMemo(() => {
    const metas: Array<{ y: number; treeSize: TreeSize; contentW: number }> = [];
    let currentY = 24; // espaço para label do programa
    let maxW = 0;

    for (const rung of rungs) {
      const isSpecialBlock = parseSequentialName(rung.outputName) !== null;
      const extraW = isSpecialBlock ? 100 : 0; // 100px para garantir a geometria do SVG e wire paddings

      const treeSize = measureTree(rung.tree);
      const contentW = RAIL_W + treeSize.width + extraW + COIL_W + RAIL_W;
      maxW = Math.max(maxW, contentW);
      metas.push({ y: currentY, treeSize, contentW });
      currentY += treeSize.height + RUNG_PAD * 2 + RUNG_GAP;
    }

    return {
      totalHeight: currentY,
      rungMetas: metas,
      totalWidth: Math.max(maxW + RUNG_PAD * 2, 380),
    };
  }, [rungs]);

  if (outputs.length === 0 || outputs.every((o) => o.implicants.length === 0)) {
    return (
      <div className="text-center py-8 text-muted text-sm">
        Preencha a tabela verdade para gerar o diagrama Ladder.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-bold text-foreground">Diagrama Ladder</h3>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          {(['coil', 'set', 'reset'] as const).map((t) => {
            const labels = { coil: '( ) Bobina', set: '(S) Set', reset: '(R) Reset' };
            const colors = { coil: 'bg-accent', set: 'bg-success', reset: 'bg-danger' };
            return (
              <button key={t} onClick={() => setSelectedType(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  selectedType === t
                    ? `${colors[t]} text-white`
                    : 'text-muted hover:text-foreground'
                }`}>
                {labels[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <svg width="24" height="16" viewBox="0 0 24 16">
            <rect x="1" y="1" width="22" height="14" rx="2" fill={C.contactBg} stroke={C.contactBorder} strokeWidth={1} />
            <line x1="6" y1="3" x2="6" y2="13" stroke={C.contactBorder} strokeWidth={2} />
            <line x1="18" y1="3" x2="18" y2="13" stroke={C.contactBorder} strokeWidth={2} />
          </svg>
          NA
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="24" height="16" viewBox="0 0 24 16">
            <rect x="1" y="1" width="22" height="14" rx="2" fill={C.contactBg} stroke={C.contactBorder} strokeWidth={1} />
            <line x1="6" y1="3" x2="6" y2="13" stroke={C.contactBorder} strokeWidth={2} />
            <line x1="18" y1="3" x2="18" y2="13" stroke={C.contactBorder} strokeWidth={2} />
            <line x1="8" y1="13" x2="16" y2="3" stroke={C.slash} strokeWidth={1.5} />
          </svg>
          NF
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="24" height="16" viewBox="0 0 24 16">
            <ellipse cx="12" cy="8" rx="9" ry="6" fill={C.coilBg} stroke={C.coilBorder} strokeWidth={1.5} />
          </svg>
          Bobina
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="24" height="16" viewBox="0 0 24 16">
            <rect x="1" y="1" width="22" height="14" rx="3" fill={C.setBg} stroke={C.setBorder} strokeWidth={1.5} />
            <text x="12" y="11" textAnchor="middle" fontSize="9" fontWeight="800" fill={C.setText}>S</text>
          </svg>
          Set
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="24" height="16" viewBox="0 0 24 16">
            <rect x="1" y="1" width="22" height="14" rx="3" fill={C.resetBg} stroke={C.resetBorder} strokeWidth={1.5} />
            <text x="12" y="11" textAnchor="middle" fontSize="9" fontWeight="800" fill={C.resetText}>R</text>
          </svg>
          Reset
        </span>
      </div>

      {/* SVG do diagrama */}
      <div className="overflow-x-auto rounded-lg border border-border bg-background p-3">
        <svg width={totalWidth} height={totalHeight}
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
          className="mx-auto" style={{ minWidth: 340 }}>

          {/* Título do programa */}
          <text x={totalWidth / 2} y={14} textAnchor="middle"
            fontSize={10} fontWeight={600} fill={C.label}
            fontFamily="var(--font-geist-mono), monospace">
            PROGRAM: LogicForge_Ladder
          </text>

          {/* Rungs */}
          {rungs.map((rung, idx) => {
            const meta = rungMetas[idx];
            const rungH = meta.treeSize.height;
            const ry = meta.y;

            // Posições horizontais fixas para trilhos uniformes
            const leftRailX = Math.max(RUNG_PAD, 16);
            const rightRailX = totalWidth - RUNG_PAD;
            const treeX = leftRailX + RAIL_W;
            const coilX = rightRailX - COIL_W;

            // Renderizar a árvore otimizada
            const wireY = ry + meta.treeSize.anchorY; // A linha principal alinha com anchorY
            const treeEl = renderTree(
              rung.tree, treeX, wireY, meta.treeSize.width, `r${idx}`, true, simState, handleToggle
            );
            
            const rungPowerOut = getFlow(rung.tree, simState);
            const powerColor = rungPowerOut ? '#84cc16' : C.wire;

            return (
              <g key={idx}>
                {/* Fundo do rung */}
                <rect x={0} y={ry - RUNG_PAD}
                  width={totalWidth}
                  height={rungH + RUNG_PAD * 2}
                  rx={8} fill={C.rungBg} stroke={C.rungBorder} strokeWidth={1}
                  opacity={0.5} />

                {/* Trilho L+ */}
                <line x1={leftRailX + RAIL_W / 2} y1={ry - 4}
                  x2={leftRailX + RAIL_W / 2} y2={ry + rungH + 4}
                  stroke={'#84cc16'} strokeWidth={4} strokeLinecap="round" />
                <text x={leftRailX + RAIL_W / 2} y={ry - 8}
                  textAnchor="middle" fontSize={8} fontWeight={700} fill={'#84cc16'}>L+</text>

                {/* Trilho L- */}
                <line x1={rightRailX + RAIL_W / 2} y1={ry - 4}
                  x2={rightRailX + RAIL_W / 2} y2={ry + rungH + 4}
                  stroke={C.rail} strokeWidth={4} strokeLinecap="round" />
                <text x={rightRailX + RAIL_W / 2} y={ry - 8}
                  textAnchor="middle" fontSize={8} fontWeight={700} fill={C.label}>L-</text>

                {/* Fio do trilho esquerdo ao início da árvore */}
                <line x1={leftRailX + RAIL_W} y1={wireY}
                  x2={treeX} y2={wireY}
                  stroke={'#84cc16'} strokeWidth={2} />

                {/* Árvore de contatos */}
                {treeEl}

                {/* Elementos Finais (Fios, Blocos Sequenciais Inline e Bobina) */}
                {(() => {
                  const seqInfo = parseSequentialName(rung.outputName);

                  if (seqInfo) {
                    const bW = 72; // largura extra para caber PT/PV
                    const bH = 54;
                    const preBlockEnd = coilX - 20 - bW;
                    const labelParam = seqInfo.type === 'CTU' || seqInfo.type === 'CTD' ? 'PV' : 'PT';
                    const active = rungPowerOut;
                    const fillC  = active ? '#fef08a' : C.coilBg;
                    const borderC = active ? '#eab308' : C.coilBorder;
                    const textC  = active ? '#854d0e' : C.coilText;
                    const subC   = active ? '#a16207' : C.label;
                    return (
                      <g>
                        {/* Fio até o bloco */}
                        <line x1={treeX + meta.treeSize.width} y1={wireY} x2={preBlockEnd} y2={wireY} stroke={powerColor} strokeWidth={2} />

                        {/* Bloco funcional quadrado */}
                        <rect x={preBlockEnd} y={wireY - bH/2} width={bW} height={bH} rx={4}
                          fill={fillC} stroke={borderC} strokeWidth={2} />

                        {/* Tipo (TON / TOF / CTU) */}
                        <text x={preBlockEnd + bW/2} y={wireY - bH/2 + 14}
                          textAnchor="middle" fontSize={11} fontWeight={900} fill={textC}>
                          {seqInfo.type}
                        </text>

                        {/* Nome do atuador */}
                        <text x={preBlockEnd + bW/2} y={wireY - bH/2 + 26}
                          textAnchor="middle" fontSize={9} fontWeight={700} fill={subC}>
                          {seqInfo.label || 'BLOCK'}
                        </text>

                        {/* PT / PV com valor */}
                        {seqInfo.preset && (
                          <text x={preBlockEnd + bW/2} y={wireY - bH/2 + 38}
                            textAnchor="middle" fontSize={8} fontWeight={600} fill={subC}>
                            {labelParam}: {seqInfo.preset}
                          </text>
                        )}

                        {/* Pinos IN / Q */}
                        <text x={preBlockEnd + 4} y={wireY + bH/2 - 4}
                          fontSize={9} fontWeight={800} fill={textC}>IN</text>
                        <text x={preBlockEnd + bW - 4} y={wireY + bH/2 - 4}
                          textAnchor="end" fontSize={9} fontWeight={800} fill={textC}>Q</text>

                        {/* Fio do bloco até a bobina */}
                        <line x1={preBlockEnd + bW} y1={wireY} x2={coilX} y2={wireY} stroke={powerColor} strokeWidth={2} />

                        {/* Bobina com nome do atuador */}
                        <OutputCoil x={coilX} y={wireY} label={seqInfo.label || 'Q'} type={rung.outputType} powerIn={rungPowerOut} />
                      </g>
                    );
                  }

                  return (
                    <g>
                      {/* Fio da árvore à bobina */}
                      <line x1={treeX + meta.treeSize.width} y1={wireY} x2={coilX} y2={wireY} stroke={powerColor} strokeWidth={2} />
                      {/* Bobina padrão */}
                      <OutputCoil x={coilX} y={wireY} label={rung.outputName} type={rung.outputType} powerIn={rungPowerOut} />
                    </g>
                  );
                })()}

                {/* Fio da bobina ao trilho direito */}
                <line x1={coilX + COIL_W} y1={wireY}
                  x2={rightRailX} y2={wireY}
                  stroke={C.wire} strokeWidth={2} />

                {/* Número do rung */}
                <text x={leftRailX - 4} y={wireY + 1}
                  textAnchor="end" dominantBaseline="middle"
                  fontSize={9} fontWeight={700} fill={C.label}>
                  {idx + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Descrição textual */}
      <div className="text-xs text-muted space-y-1 font-mono">
        {rungs.map((rung, idx) => (
          <div key={idx} className="flex gap-2">
            <span className="text-foreground font-bold">Rung {idx + 1}:</span>
            <span>
              {describeTree(rung.tree)} → {rung.outputName}
              {rung.outputType === 'set' && ' (SET)'}
              {rung.outputType === 'reset' && ' (RESET)'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
