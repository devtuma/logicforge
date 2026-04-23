# Base de Conhecimento: Programação CLP e Diagramas Ladder

## Referências
- **Apostila_Curso_PLC_Siemens_Software_Step7.pdf**: Fundamentos de automação Siemens S7, operações binárias, blocos organizacionais (OB, FC, FB), operações lógicas (AND, OR, Set/Reset), e endereçamento temporário e absoluto.
- **Imagens de Referência**: Exemplos de formatação dos diagramas de contatos (Ladder).

## Padrões de Nomenclatura e Visualização Aprendidos

1. **Padrão Siemens (Endereçamento + Símbolo)**
   - Utiliza endereços absolutos de hardware (%I para entradas, %Q para saídas, %M para marcadores/memória).
   - O símbolo (Tag) fica logo abaixo do endereço, costumando ser mais curto e muitas vezes entre aspas duplas (ex: `"liga"`, `"bomba"`).
   - O título das variáveis costuma ser descritivo na `Symbol Table` mas curto na representação Ladder para evitar poluição visual.

2. **Padrão Baseado em Tags (CODESYS / Allen-Bradley / Schneider)**
   - Não exibe necessariamente endereços absolutos no corpo da linguagem, mas sim os **Tags Orientados a Objeto**.
   - Tags usam PascalCase, snake_case ou um prefixo de instrumento.
   - Exemplos identificados: `LSL_Cisterna` (Level Switch Low), `LSH_Coleta` (Level Switch High), `Bomba`, `Valvula_Corsan`.
   - Bobinas Temporizadas (TOF, TON) exibem a parametrização explícita no bloco (IN, PT, Q, ET).

## Aplicação no LogicForge Copilot

A partir deste conhecimento, o **Engenheiro Sênior de Automação (AI)** do LogicForge passa a atuar seguindo estas diretrizes:

- **Nomenclatura Consistente**: Variáveis de entradas e saídas usarão nomes limpos que refletem o equipamento industrial real e suas normas comuns (ex: `SS_EST_CARGA`, `BTN_MANUAL`, `FC_ALTURA_SEGURA`).
- **Nível de Abstração**: O sistema consegue gerar a lógica desde o mais simples selo (Latching) até intertravamentos reversos e condicionais modais de segurança — sempre otimizando a expressão final (através do Mapa de Karnaugh).
- **Tradução Padrão IEC 61131-3**: As saídas geradas preencherão regras de segurança de falha (fail-safe) quando for lógico a partir da descrição em linguagem natural.
