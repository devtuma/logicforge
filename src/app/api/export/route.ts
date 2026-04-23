// Rota de exportação para formatos de CLP
// POST /api/export — gera código exportado (não requer autenticação)

import { NextResponse } from 'next/server';
import type { ExportFormat } from '@/lib/engine/types';
import { type ExportConfig, BaseExporter } from '@/lib/exporters/base-exporter';
import { StructuredTextExporter } from '@/lib/exporters/structured-text';
import { RockwellExporter } from '@/lib/exporters/rockwell';
import { SiemensExporter } from '@/lib/exporters/siemens';
import { ABBExporter } from '@/lib/exporters/abb';
import { SchneiderExporter } from '@/lib/exporters/schneider';
import { LadderXMLExporter } from '@/lib/exporters/ladder-xml';
import { CSVExporter } from '@/lib/exporters/csv-exporter';

// Mapa de exportadores indexado pelo formato
const exporters: Record<ExportFormat, BaseExporter> = {
  'structured-text': new StructuredTextExporter(),
  rockwell: new RockwellExporter(),
  siemens: new SiemensExporter(),
  abb: new ABBExporter(),
  schneider: new SchneiderExporter(),
  'ladder-xml': new LadderXMLExporter(),
  csv: new CSVExporter(),
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { format, projectName, variables, outputName, implicants, sopExpression, posExpression } = body;

    // Validação do formato solicitado
    if (!format || !(format in exporters)) {
      return NextResponse.json(
        { error: `Formato de exportação inválido: ${format}` },
        { status: 400 }
      );
    }

    // Validação dos campos obrigatórios
    if (!projectName || !variables || !outputName) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: projectName, variables, outputName' },
        { status: 400 }
      );
    }

    // Montar configuração de exportação
    const config: ExportConfig = {
      projectName,
      variables,
      outputName,
      implicants: implicants || [],
      sopExpression: sopExpression || '0',
      posExpression: posExpression || '1',
      format: format as ExportFormat,
    };

    // Executar exportação com o exportador correspondente
    const exporter = exporters[format as ExportFormat];
    const result = exporter.export(config);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao exportar projeto:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar exportação' },
      { status: 500 }
    );
  }
}
