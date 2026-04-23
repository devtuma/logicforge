// Parser e Avaliador de Expressões Booleanas
// Converte uma string (ex: "A * B' + C") em uma Abstract Syntax Tree (AST) e avalia seu resultado.

export type TokenType = 
  | 'VAR' 
  | 'AND' 
  | 'OR' 
  | 'XOR' 
  | 'NOT_PRE'  // !A
  | 'NOT_POST' // A'
  | 'LPAREN' 
  | 'RPAREN' 
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

export interface ASTNode {
  type: 'LITERAL' | 'UNARY' | 'BINARY';
  operator?: 'AND' | 'OR' | 'XOR' | 'NOT';
  value?: string;
  left?: ASTNode;
  right?: ASTNode;
}

export class ExpressionError extends Error {
  constructor(message: string, public position?: number) {
    super(message);
    this.name = 'ExpressionError';
  }
}

// ==========================================
// 1. LEXER
// ==========================================

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    // Espaços em branco
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Parênteses
    if (char === '(') { tokens.push({ type: 'LPAREN', value: char, position: i }); i++; continue; }
    if (char === ')') { tokens.push({ type: 'RPAREN', value: char, position: i }); i++; continue; }

    // NOT postfix (')
    if (char === "'") { tokens.push({ type: 'NOT_POST', value: char, position: i }); i++; continue; }

    // NOT prefix (!, ~)
    if (char === '!' || char === '~') { tokens.push({ type: 'NOT_PRE', value: char, position: i }); i++; continue; }

    // AND (*, &, ., ·)
    if (char === '*' || char === '&' || char === '.' || char === '·') { tokens.push({ type: 'AND', value: char, position: i }); i++; continue; }

    // OR (+, |)
    if (char === '+' || char === '|') { tokens.push({ type: 'OR', value: char, position: i }); i++; continue; }

    // XOR (^)
    if (char === '^') { tokens.push({ type: 'XOR', value: char, position: i }); i++; continue; }

    // Extrair Variáveis / Palavras reservadas
    if (/[a-zA-Z]/.test(char)) {
      let word = '';
      const startPos = i;
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        word += input[i];
        i++;
      }
      const upper = word.toUpperCase();
      if (upper === 'AND') {
        tokens.push({ type: 'AND', value: word, position: startPos });
      } else if (upper === 'OR') {
        tokens.push({ type: 'OR', value: word, position: startPos });
      } else if (upper === 'XOR') {
        tokens.push({ type: 'XOR', value: word, position: startPos });
      } else if (upper === 'NOT') {
        tokens.push({ type: 'NOT_PRE', value: word, position: startPos });
      } else {
        tokens.push({ type: 'VAR', value: word, position: startPos });
      }
      continue;
    }

    throw new ExpressionError(`Caractere inválido: "${char}"`, i);
  }

  tokens.push({ type: 'EOF', value: '', position: i });
  return tokens;
}

// ==========================================
// 2. PARSER (Recursive Descent)
// ==========================================
// Precedência de cima para baixo (maior primeiro):
// 4. Parênteses, Variáveis
// 3. NOT (prefixo e sufixo)
// 2. AND
// 1. OR / XOR

export function parse(tokens: Token[], validVariables: string[]): ASTNode {
  let pos = 0;

  function peek(): Token {
    return tokens[pos];
  }

  function consume(type: TokenType): Token {
    const token = tokens[pos];
    if (token.type === type) {
      pos++;
      return token;
    }
    throw new ExpressionError(`Esperado "${type}", encontrou "${token.value || 'Fim'}"`, token.position);
  }

  // Expression ::= Termo ( { OR | XOR } Termo )*
  function parseExpression(): ASTNode {
    let node = parseTerm();

    while (peek().type === 'OR' || peek().type === 'XOR') {
      const op = consume(peek().type);
      const right = parseTerm();
      node = {
        type: 'BINARY',
        operator: op.type === 'OR' ? 'OR' : 'XOR',
        left: node,
        right: right
      };
    }

    return node;
  }

  // Termo ::= Fator ( { AND } Fator )*
  function parseTerm(): ASTNode {
    let node = parseFactor();

    while (peek().type === 'AND') {
      consume('AND');
      const right = parseFactor();
      node = {
        type: 'BINARY',
        operator: 'AND',
        left: node,
        right: right
      };
    }

    // Suporte a multiplicação implícita ex: AB ou A(B+C)
    while (peek().type === 'VAR' || peek().type === 'NOT_PRE' || peek().type === 'LPAREN') {
      const right = parseFactor();
      node = {
        type: 'BINARY',
        operator: 'AND',
        left: node,
        right: right
      };
    }

    return node;
  }

  // Fator ::= NOT_PRE Fator | Primario [ NOT_POST ]
  function parseFactor(): ASTNode {
    const token = peek();

    if (token.type === 'NOT_PRE') {
      consume('NOT_PRE');
      const node = parseFactor();
      return { type: 'UNARY', operator: 'NOT', right: node };
    }

    let node = parsePrimary();

    while (peek().type === 'NOT_POST') {
      consume('NOT_POST');
      node = { type: 'UNARY', operator: 'NOT', right: node };
    }

    return node;
  }

  // Primario ::= VAR | '(' Expresso ')'
  function parsePrimary(): ASTNode {
    const token = peek();

    if (token.type === 'VAR') {
      consume('VAR');
      
      // Validação de variáveis conhecidas
      if (!validVariables.includes(token.value)) {
        throw new ExpressionError(`Variável desconhecida "${token.value}"`, token.position);
      }

      return { type: 'LITERAL', value: token.value };
    }

    if (token.type === 'LPAREN') {
      consume('LPAREN');
      const expr = parseExpression();
      consume('RPAREN');
      return expr;
    }

    throw new ExpressionError(`Sintaxe inesperada: "${token.value || 'Fim'}"`, token.position);
  }

  if (tokens.length === 1 && tokens[0].type === 'EOF') {
    throw new ExpressionError('A expressão está vazia.', 0);
  }

  const ast = parseExpression();

  if (peek().type !== 'EOF') {
    throw new ExpressionError(`Sintaxe adicional inesperada no final: "${peek().value}"`, peek().position);
  }

  return ast;
}

// ==========================================
// 3. EVALUATOR
// ==========================================

export function evaluateAST(node: ASTNode, context: Record<string, number>): number {
  if (node.type === 'LITERAL') {
    return context[node.value!] ?? 0;
  }

  if (node.type === 'UNARY') {
    if (node.operator === 'NOT') {
      return evaluateAST(node.right!, context) === 1 ? 0 : 1;
    }
  }

  if (node.type === 'BINARY') {
    const left = evaluateAST(node.left!, context);
    const right = evaluateAST(node.right!, context);

    switch (node.operator) {
      case 'AND': return (left === 1 && right === 1) ? 1 : 0;
      case 'OR': return (left === 1 || right === 1) ? 1 : 0;
      case 'XOR': return (left !== right) ? 1 : 0;
    }
  }

  return 0;
}
