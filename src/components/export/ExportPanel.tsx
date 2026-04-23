'use client';

// Painel de exportação com seleção de formato CLP e pré-visualização de código

import { useState, useMemo, useCallback } from 'react';
import type { Variable, OutputConfig, Implicant, ExportFormat } from '@/lib/engine/types';
import type { ExportConfig, ExportResult } from '@/lib/exporters/base-exporter';
import { RockwellExporter } from '@/lib/exporters/rockwell';
import { SiemensExporter } from '@/lib/exporters/siemens';
import { ABBExporter } from '@/lib/exporters/abb';
import { SchneiderExporter } from '@/lib/exporters/schneider';
import { StructuredTextExporter } from '@/lib/exporters/structured-text';
import { LadderXMLExporter } from '@/lib/exporters/ladder-xml';
import { CSVExporter } from '@/lib/exporters/csv-exporter';
import { downloadFile } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { CodePreview } from './CodePreview';

/** Informações sobre cada formato de exportação */
interface FormatInfo {
  id: ExportFormat;
  brand: string;
  description: string;
  icon: string; // Emoji placeholder para ícone da marca
}

const FORMATS: FormatInfo[] = [
  {
    id: 'rockwell',
    brand: 'Rockwell',
    description: 'Studio 5000 / RSLogix 5000',
    icon: 'R',
  },
  {
    id: 'siemens',
    brand: 'Siemens',
    description: 'TIA Portal / Step 7 SCL',
    icon: 'S',
  },
  { id: 'abb', brand: 'ABB', description: 'Automation Builder', icon: 'A' },
  {
    id: 'schneider',
    brand: 'Schneider',
    description: 'EcoStruxure / Unity Pro',
    icon: 'E',
  },
  {
    id: 'structured-text',
    brand: 'IEC 61131-3',
    description: 'Texto Estruturado genérico',
    icon: 'I',
  },
  {
    id: 'ladder-xml',
    brand: 'Ladder XML',
    description: 'PLCopen XML para Ladder',
    icon: 'L',
  },
  { id: 'csv', brand: 'CSV', description: 'Tabela verdade em CSV', icon: 'C' },
];

/** Mapa de exportadores instanciados */
const exporters = {
  rockwell: new RockwellExporter(),
  siemens: new SiemensExporter(),
  abb: new ABBExporter(),
  schneider: new SchneiderExporter(),
  'structured-text': new StructuredTextExporter(),
  'ladder-xml': new LadderXMLExporter(),
  csv: new CSVExporter(),
} as const;

export interface OutputSimplification {
  outputName: string;
  implicants: Implicant[];
  sopExpression: string;
  posExpression: string;
}

export interface ExportPanelProps {
  projectName: string;
  variables: Variable[];
  outputs: OutputConfig[];
  simplifications: OutputSimplification[];
}

export function ExportPanel({
  projectName,
  variables,
  outputs,
  simplifications,
}: ExportPanelProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('structured-text');
  const [selectedOutput, setSelectedOutput] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  /** Gera o resultado da exportação */
  const exportResult: ExportResult | null = useMemo(() => {
    if (simplifications.length === 0) return null;

    const simp = simplifications[selectedOutput];
    if (!simp) return null;

    const exporter = exporters[selectedFormat];
    if (!exporter) return null;

    const config: ExportConfig = {
      projectName,
      variables,
      outputName: simp.outputName,
      implicants: simp.implicants,
      sopExpression: simp.sopExpression,
      posExpression: simp.posExpression,
      format: selectedFormat,
    };

    try {
      return exporter.export(config);
    } catch {
      return null;
    }
  }, [selectedFormat, selectedOutput, projectName, variables, simplifications]);

  /** Faz o download do código exportado */
  const handleExport = useCallback(() => {
    if (!exportResult) return;

    const mimeType = exportResult.language === 'xml' ? 'application/xml' : 'text/plain';
    downloadFile(exportResult.code, exportResult.filename, mimeType);
  }, [exportResult]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Exportar Projeto
      </h3>

      {/* Seleção de saída quando há múltiplas */}
      {outputs.length > 1 && (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Saída
          </label>
          <select
            value={selectedOutput}
            onChange={(e) => setSelectedOutput(Number(e.target.value))}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          >
            {outputs.map((output, i) => (
              <option key={output.name} value={i}>
                {output.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Grade de seleção de formato */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          Plataforma CLP
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {FORMATS.map((format) => {
            const isSelected = format.id === selectedFormat;
            return (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                    : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
                }`}
              >
                {/* Placeholder de ícone da marca */}
                <div
                  className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold shrink-0 ${
                    isSelected
                      ? 'bg-blue-600 text-white dark:bg-blue-500'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {format.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {format.brand}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {format.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-3">
        <Button onClick={handleExport} disabled={!exportResult}>
          Exportar
        </Button>
        <Button
          variant="secondary"
          onClick={() => setShowPreview(!showPreview)}
          disabled={!exportResult}
        >
          {showPreview ? 'Ocultar' : 'Visualizar'} Código
        </Button>
      </div>

      {/* Descrição do resultado */}
      {exportResult && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {exportResult.description} &mdash;{' '}
          <span className="font-mono">{exportResult.filename}</span>
        </p>
      )}

      {/* Pré-visualização do código */}
      {showPreview && exportResult && (
        <CodePreview
          code={exportResult.code}
          language={exportResult.language}
          filename={exportResult.filename}
        />
      )}
    </div>
  );
}
