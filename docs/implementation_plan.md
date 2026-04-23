# LogicForge Phase 2: Function Block Diagram (FBD) Engine

> [!NOTE]
> **STATUS:** Completado e em Produção. Equipe: Leia o arquivo `walkthrough.md` para resumos de ponta-a-ponta e o arquivo `task.md` para observar a fila estrita terminada.

## Resumo do Problema
O usuário quer elevar o projeto para bater de frente com softwares gigantes desde o início ("Entregar o melhor"). O epic eleito para isso é a inclusão do motor de renderização gráfica de **Diagrama de Blocos Funcionais (FBD)**. O FBD ilustra a mesma equação booleana, mas utilizando símbolos universais de portas lógicas clássicas (`AND`, `OR`, `NOT`, `XOR`).

Temos um trunfo monumental: o motor em `expression-parser.ts` (desenvolvido na V1) já tem toda a árvore AST montada (a estrutura em memória que entende perfeitamente quem está ligado em quem na equação). Só nos falta o algoritmo SVG.

## User Review Required
Esta expansão afeta a Área de Edição e as funcionalidades visuais globais. Inserir o **FBD (Diagrama em Blocos)** exige:
1. Uma renderização estática que plote `LITERALs` (Entradas) nas extremidades esquerdas e conecte linhas poligonais com curvas até as portinholas (`AND`, `OR`, etc.), terminando na Saída.
2. Você deseja transformar esse FBD gráfico em versão animada também?
  > [!TIP]
  > Criarei a infraestrutura base do FBD idêntica à que criamos no Ladder. Assim o projeto garante mais uma Feature de Entrega, permitindo que a árvore do FBD suporte interatividade visual local no futuro.

## Proposed Changes

### 1. Novo Componente Visual: `FbdDiagram.tsx`
`src/components/fbd/FbdDiagram.tsx`
- **Algoritmo de Layout:** Como as Portas Lógicas dividem os Inputs (Ex: porta AND recebe dois fios na esquerda e joga um fio na direita), o algoritmo vai calcular o espaço vertical necessário dos "filhos esquerdos" recursivamente.
- **Renderizadores SVG:**
  - `renderAndGate`: Desenho de formato de um D.
  - `renderOrGate`: Desenho com costas curvilíneas.
  - `renderNotGate`: Pequeno triângulo terminando com a bolinha de negação.
- **Roteamento de Fios (Wires):** Desenhar as linhas que conectam a saída (`out`) de um nó esquerdo diretamente ao pino (`in`) de uma Gate da frente.

### 2. Exportação AST
- `expression-parser.ts` já exporta a função `parse()` que retorna o `ASTNode`.
- O nó será convertido na estrutura necessária para a plotagem gráfica.

### 3. Modificação no UI Principal (`ProjectEditor.tsx`)
- Modificar as Abas / Seções na parte Final do app.
- Atualmente temos "Diagrama Ladder". Vou embrulhá-lo num sistema de **Toggle/Tabs**: "Modo Ladder" ou "Modo FBD", de forma que o projeto tenha duplo renderizador visual de arquitetura!

## Verification Plan
### Manual Verification
- Preencher "Variáveis" e gerar expressões clássicas como `A AND B` na UI da Tabela Verdade.
- Alternar a visualização para a aba `Diagrama de Blocos FBD`.
- Verificar se o gate `AND` é impresso corretamente, com linhas vindo de `A` e `B` entrando à esquerda e resultando em Saída L1 à direita.
