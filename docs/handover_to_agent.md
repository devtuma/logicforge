# 🤖 MANIFESTO DE HANDOVER: DE AGENTE SÊNIOR PARA OUTRO AGENTE DE IA

**Atenção IA Auxiliar/Paralela:** Se você está lendo isso, nosso usuário humano solicitou que trabalhemos em conjunto na aplicação **LogicForge**. Eu estabeleci a fundação arquitetônica e sou o responsável pelo layout gráfico responsivo de simulação. Sua tarefa agora é continuar as funcionalidades lógicas de Engine.

Siga estritamente minhas diretrizes de como este projeto funciona antes de codificar.

## 1. O Estado da Arte Atual
- O app é um avaliador Booleano, de Karnaugh e Motor Gráfico para Automação Industrial (Next.js, Tailwind, TypeScript).
- **LadderDiagram.tsx** contém uma estrutura revolucionária (`renderTree`, `getFlow`, `simState`) que não só plota SVGs como *realiza simulação de condutividade magnética na hora*, baseada na `AST` originada pelo algoritmo de *Quine-McCluskey*.
- **FbdDiagram.tsx** (Fase 2 finalizada) plota FBD (Diagrama de Blocos) interativos.

## 2. A Sua Missão Prioritária (O que fazer agora)
Você deve iniciar a **FASE 3: Engenharia Reversa (Text-to-Logic ou ST-to-Logic)**.
 O usuário quer colar um trecho de código "Texto Estruturado (ST)" de CLPs antigos, e usar Engenharia Reversa para jogar as portas na Tabela Verdade do sistema.

**Instruções de Implementação para você:**
1. Escreva um Módulo Parser em `src/lib/engine/`. A função deverá aceitar strings de ST como `L1 := (A AND B) OR NOT C;`.
2. Sua função deve explodir isso em Variáveis, invocar nosso motor de Truth Table interno vazio e calcular cada linha `[A, B, C]` via substituição (você pode usar o `evaluateAST` do meu arquivo `expression-parser.ts` para ser cirúrgico).
3. Adicione no `ProjectEditor.tsx` um Botão "🎓 IA Engenharia Reversa (Importar ST)" ao lado de configurar as tabelas verdade manualmente.

## 3. Padrões de Código Exigidos
- **NÃO** altere os arquivos SVGs sob NENHUMA hipótese se não tiver testado o bounding-box antes. Nosso painel foi ajustado no nível subpixel para simular L+ e L-.
- Use Tailwind nativo e as Variáveis CSS do `globals.css` (ex: `var(--accent)`, `var(--foreground)`). NUNCA injete cores genéricas "hardcoded" a não ser para os fluxos elétricos virtuais como `#84cc16`.
- Documente tudo rigorosamente com o paradigma de TypeScript puro e interfaces unidas.

**Mande bala! O usuário depende da sua eficiência agora.**
