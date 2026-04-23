'use client';

import { useMemo, useState, useCallback } from 'react';
import type { Variable } from '@/lib/engine/types';
import { tokenize, parse, ASTNode } from '@/lib/engine/expression-parser';
import { parseSequentialName } from '@/lib/utils';

// ===== Tipagem e Constantes ===== //
const GATE_W = 60;
const GATE_H = 50;
const LIT_W = 40;
const LIT_H = 30;
const NOT_W = 50;
const NOT_H = 30;
const SPACING_X = 40;
const SPACING_Y = 20;

const C = {
  wire: 'var(--foreground)',
  wireOn: '#84cc16',
  wireOff: 'var(--muted)',
  gateBg: 'var(--surface)',
  gateBorder: 'var(--foreground)',
  gateText: 'var(--foreground)',
  bg: 'var(--background)',
};

interface NodeMeta {
  w: number;
  h: number;
  outY: number; // Posição de saída em relação ao y do BoundingBox
}

interface RenderContext {
  state: Record<string, boolean>;
  onToggle: (v: string) => void;
}

// ===== Algoritmo de Medição da Árvore ===== //
function measureAST(node: ASTNode): NodeMeta {
  if (node.type === 'LITERAL') {
    return { w: LIT_W, h: LIT_H, outY: LIT_H / 2 };
  }
  if (node.type === 'UNARY') {
    const right = measureAST(node.right!);
    return { w: right.w + SPACING_X + NOT_W, h: Math.max(right.h, NOT_H), outY: Math.max(right.h, NOT_H) / 2 };
  }
  if (node.type === 'BINARY') {
    const left = measureAST(node.left!);
    const right = measureAST(node.right!);
    const h = left.h + SPACING_Y + right.h;
    const w = Math.max(left.w, right.w) + SPACING_X + GATE_W;
    return { w, h, outY: h / 2 };
  }
  return { w: 0, h: 0, outY: 0 };
}

// ===== Avaliador Interativo de Estado Dinâmico ===== //
function evaluateAST(node: ASTNode, state: Record<string, boolean>): boolean {
  if (node.type === 'LITERAL') {
    return !!state[node.value!];
  }
  if (node.type === 'UNARY') {
    return !evaluateAST(node.right!, state);
  }
  if (node.type === 'BINARY') {
    const l = evaluateAST(node.left!, state);
    const r = evaluateAST(node.right!, state);
    if (node.operator === 'AND') return l && r;
    if (node.operator === 'OR') return l || r;
    if (node.operator === 'XOR') return l !== r;
  }
  return false;
}

// ===== Renderizadores SVG ===== //

function drawWirePath(x1: number, y1: number, x2: number, y2: number, active: boolean, key: string) {
  const color = active ? C.wireOn : C.wireOff;
  const midX = x1 + (x2 - x1) / 2;
  const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  return <path key={key} d={d} fill="none" stroke={color} strokeWidth={2} />;
}

function renderAST(
  node: ASTNode,
  x: number, // left of this subtree bounding box
  y: number, // top of this subtree bounding box
  meta: NodeMeta,
  ctx: RenderContext,
  key: string
): { el: React.ReactElement; outX: number; outY: number; val: boolean } {
  const val = evaluateAST(node, ctx.state);
  const color = val ? C.wireOn : C.wireOff;

  if (node.type === 'LITERAL') {
    const varName = node.value!;
    const el = (
      <g key={key} onClick={() => ctx.onToggle(varName)} className="cursor-pointer hover:opacity-80">
        <rect x={x} y={y + meta.outY - LIT_H / 2} width={LIT_W} height={LIT_H} rx={4}
          fill={val ? C.wireOn : C.gateBg} stroke={val ? C.wireOn : C.gateBorder} strokeWidth={2} />
        <text x={x + LIT_W / 2} y={y + meta.outY + 4} textAnchor="middle" fontSize={12} fontWeight={700}
          fill={val ? '#111827' : C.gateText}>{varName}</text>
      </g>
    );
    return { el, outX: x + LIT_W, outY: y + meta.outY, val };
  }

  if (node.type === 'UNARY') {
    const rMeta = measureAST(node.right!);
    // place child to the left
    const childX = x + meta.w - NOT_W - SPACING_X - rMeta.w;
    const childY = y + meta.h/2 - rMeta.h/2;
    const child = renderAST(node.right!, childX, childY, rMeta, ctx, `${key}-child`);

    const gateX = x + meta.w - NOT_W;
    const gateY = y + meta.h/2 - NOT_H/2;

    const el = (
      <g key={key}>
        {child.el}
        {drawWirePath(child.outX, child.outY, gateX, gateY + NOT_H/2, child.val, `${key}-wire`)}
        {/* Triângulo com bolinha */}
        <polygon points={`${gateX},${gateY} ${gateX},${gateY + NOT_H} ${gateX + NOT_W - 8},${gateY + NOT_H/2}`}
          fill={C.gateBg} stroke={C.gateBorder} strokeWidth={2} />
        <circle cx={gateX + NOT_W - 4} cy={gateY + NOT_H/2} r={4} fill={C.bg} stroke={C.gateBorder} strokeWidth={2} />
      </g>
    );
    return { el, outX: gateX + NOT_W, outY: gateY + NOT_H/2, val };
  }

  if (node.type === 'BINARY') {
    const lMeta = measureAST(node.left!);
    const rMeta = measureAST(node.right!);

    const gateX = x + meta.w - GATE_W;
    const gateY = y + meta.outY - GATE_H / 2;

    // Left child aligns to the top logic
    const lChildX = gateX - SPACING_X - lMeta.w;
    const lChildY = y;
    const leftChild = renderAST(node.left!, lChildX, lChildY, lMeta, ctx, `${key}-L`);

    // Right child sits below left child
    const rChildX = gateX - SPACING_X - rMeta.w;
    const rChildY = y + lMeta.h + SPACING_Y;
    const rightChild = renderAST(node.right!, rChildX, rChildY, rMeta, ctx, `${key}-R`);

    const inPin1Y = gateY + GATE_H * 0.25;
    const inPin2Y = gateY + GATE_H * 0.75;

    let gateSvg;
    if (node.operator === 'AND') {
      gateSvg = (
        <path d={`M ${gateX} ${gateY} h 20 a 25 25 0 0 1 0 50 h -20 Z`}
          fill={C.gateBg} stroke={val ? C.wireOn : C.gateBorder} strokeWidth={2} />
      );
    } else if (node.operator === 'OR') {
      gateSvg = (
        <path d={`M ${gateX} ${gateY} Q ${gateX+15} ${gateY+25} ${gateX} ${gateY+50} Q ${gateX+40} ${gateY+50} ${gateX+GATE_W} ${gateY+25} Q ${gateX+40} ${gateY} ${gateX} ${gateY}`}
          fill={C.gateBg} stroke={val ? C.wireOn : C.gateBorder} strokeWidth={2} />
      );
    } else if (node.operator === 'XOR') {
      // XOR: OR com dupla curva traseira
      gateSvg = (
        <g>
          <path d={`M ${gateX-6} ${gateY} Q ${gateX+9} ${gateY+25} ${gateX-6} ${gateY+50}`} fill="none" stroke={C.gateBorder} strokeWidth={2} />
          <path d={`M ${gateX} ${gateY} Q ${gateX+15} ${gateY+25} ${gateX} ${gateY+50} Q ${gateX+40} ${gateY+50} ${gateX+GATE_W} ${gateY+25} Q ${gateX+40} ${gateY} ${gateX} ${gateY}`}
            fill={C.gateBg} stroke={val ? C.wireOn : C.gateBorder} strokeWidth={2} />
        </g>
      );
    }

    const el = (
      <g key={key}>
        {leftChild.el}
        {rightChild.el}
        {/* Wires */}
        {drawWirePath(leftChild.outX, leftChild.outY, gateX + 2, inPin1Y, leftChild.val, `${key}-w1`)}
        {drawWirePath(rightChild.outX, rightChild.outY, gateX + 2, inPin2Y, rightChild.val, `${key}-w2`)}
        
        {gateSvg}
        <text x={gateX + 20} y={gateY + GATE_H/2 + 4} fontSize={10} fontWeight={700} fill={C.gateText}>{node.operator}</text>
      </g>
    );

    return { el, outX: gateX + GATE_W, outY: gateY + GATE_H / 2, val };
  }

  return { el: <g key={key} />, outX: x, outY: y, val: false };
}

// ===== Componente Principal FBD ===== //

export interface FbdDiagramProps {
  expression: string;
  outputName: string;
  variables: Variable[];
}

export function FbdDiagram({ expression, outputName, variables }: FbdDiagramProps) {
  const [simState, setSimState] = useState<Record<string, boolean>>({});

  const handleToggle = useCallback((varName: string) => {
    setSimState(prev => ({ ...prev, [varName]: !prev[varName] }));
  }, []);

  const { ast, meta, error } = useMemo(() => {
    try {
      if (!expression || expression === '0' || expression === '1') {
        throw new Error('Expressão estática vazia');
      }
      const tokens = tokenize(expression);
      const varNames = variables.map(v => v.name);
      const parsedAst = parse(tokens, varNames);
      const computedMeta = measureAST(parsedAst);
      return { ast: parsedAst, meta: computedMeta, error: null };
    } catch (e: any) {
      return { ast: null, meta: null, error: e.message };
    }
  }, [expression, variables]);

  if (error || !ast || !meta) {
    return (
      <div className="text-center py-8 text-muted text-sm border rounded-lg bg-surface/50">
        Não foi possível gerar FBD: {error || 'Expressão muito simples'}
      </div>
    );
  }

  // Margem e Cálculo Final do Viewport
  const pad = 40;
  const isSpecialBlock = outputName.startsWith('TON') || outputName.startsWith('TOF') || outputName.startsWith('CTU');
  const extraW = isSpecialBlock ? 100 : 0;
  const totalW = meta.w + pad * 2 + 80 + extraW; // 80 extra para Output Coil Redondo + 100 para bloco sequencial inline
  const totalH = meta.h + pad * 2;

  // Renderizar a Árvore do Diagrama FBD
  const ctx: RenderContext = { state: simState, onToggle: handleToggle };
  const { el: treeSvg, outX, outY, val: finalVal } = renderAST(ast, pad, pad, meta, ctx, 'root');

  return (
    <div className="space-y-4">
      {/* Header FBD */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-bold text-foreground">Function Block Diagram (FBD)</h3>
        <div className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-md text-xs text-accent font-semibold">
          Motor Gráfico Lógico Experimental
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-background p-3 flex justify-center">
        <svg width={totalW} height={totalH} viewBox={`0 0 ${totalW} ${totalH}`} style={{ minWidth: 320 }}>
          {treeSvg}
          
          {/* Bloco de Saída (Circular padrão ou Especial Sequencial Inline + Especial Circular) */}
          {(() => {
            const seqInfo = parseSequentialName(outputName);

            if (seqInfo) {
              const bW = 60;
              const bH = 50;
              const tX = totalW - pad - bW - 60; // Desloca para trás para caber a bobina final
              const tY = outY - bH / 2;
              const labelParam = seqInfo.type === 'CTU' || seqInfo.type === 'CTD' ? 'PV' : 'PT';
              const presetText = seqInfo.preset ? `${labelParam}: ${seqInfo.preset}` : labelParam;

              return (
                <g>
                  {/* Fio até o bloco Quadrado */}
                  {drawWirePath(outX, outY, tX, outY, finalVal, 'final-wire-special')}

                  {/* Bloco Quadrado (Timer/Counter) */}
                  <rect x={tX} y={tY} width={bW} height={bH} rx={4} fill={finalVal ? '#fef08a' : C.gateBg} stroke={finalVal ? '#eab308' : C.gateBorder} strokeWidth={2} />
                  <text x={tX + bW/2} y={tY + 13} textAnchor="middle" fontSize={11} fontWeight={900} fill={finalVal ? '#854d0e' : C.gateText}>{seqInfo.type}</text>
                  <text x={tX + bW/2} y={tY + 26} textAnchor="middle" fontSize={10} fontWeight={700} fill={finalVal ? '#a16207' : C.gateText}>{seqInfo.label}</text>
                  <text x={tX + bW/2} y={tY + 39} textAnchor="middle" fontSize={9} fontWeight={600} fill={finalVal ? '#a16207' : C.gateText}>{presetText}</text>
                  <text x={tX + 4} y={outY + 4} fontSize={10} fontWeight={800} fill={finalVal ? '#854d0e' : C.gateText}>IN</text>
                  <text x={tX + bW - 4} y={outY + 4} textAnchor="end" fontSize={10} fontWeight={800} fill={finalVal ? '#854d0e' : C.gateText}>Q</text>

                  {/* Fio do Bloco até a Saída Final Circular */}
                  {drawWirePath(tX + bW, outY, totalW - pad - 40, outY, finalVal, 'final-wire-post-special')}

                  {/* Bobina de Saída Circular Final */}
                  <circle cx={totalW - pad - 20} cy={outY} r={20}
                    fill={finalVal ? '#eab308' : C.gateBg} stroke={finalVal ? '#eab308' : C.gateBorder} strokeWidth={2} />
                  <text x={totalW - pad - 20} y={outY + 4} textAnchor="middle" fontSize={12} fontWeight={800} fill={finalVal ? '#fff' : C.gateText}>
                    {seqInfo.label}
                  </text>
                </g>
              );
            }
            
            return (
              <g>
                {/* Fio até o bloco Circular */}
                {drawWirePath(outX, outY, totalW - pad - 40, outY, finalVal, 'final-wire')}
                <circle cx={totalW - pad - 20} cy={outY} r={20}
                  fill={finalVal ? '#eab308' : C.gateBg} stroke={finalVal ? '#eab308' : C.gateBorder} strokeWidth={2} />
                <text x={totalW - pad - 20} y={outY + 4} textAnchor="middle" fontSize={12} fontWeight={800} fill={finalVal ? '#fff' : C.gateText}>
                  {outputName}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
      
      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted justify-center">
        <span><strong className="text-accent">Clique</strong> nas Entradas para simular Tensão (Booleana 0/1)</span>
      </div>
    </div>
  );
}
