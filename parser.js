// External Representation
//
// <datum>            −→ <simple datum> | <list> | <vector>
// <simple datum>     −→ <boolean> | <number> | <character> | <string> | <identifier>
// <boolean>          −→ #t | #f
// <number>           −→ <num 2> | <num 8> | <num 10> | <num 16>
// <character>        −→ #\ <any character> | #\newline | #\space
// <string>           −→ " <string character>* "
// <string character> −→ \" | \\ | <any character other than " or \>
// <symbol>           −→ <identifier>
// <list>             −→ (<datum>*) | (<datum>+ . <datum>) | <abbreviation>
// <abbreviation>     −→ ' <datum> | ` <datum> | , <datum> | ,@ <datum>
// <vector>           −→ #(<datum>*)
//
// <syntactic keyword>  −→ <expression keyword>
//   | else | => | define | unquote | unquote-splicing
// <expression keyword> −→ quote | lambda | if | set! | begin | cond | and | or
//   | case | let | let* | letrec | do | delay | quasiquote
// <variable> −→ <any <identifier> that isn’t also a <syntactic keyword>>
//
// Expressions
//
// <expression>         −→ <variable> | <literal> | <procedure call> | <lambda expression>
//   | <conditional> | <assignment> | <derived expression> | <macro use> | <macro block>
// <literal>            −→ <quotation> | <self-evaluating>
// <self-evaluating>    −→ <boolean> | <number> | <character> | <string>
// <quotation>          −→ ’<datum> | (quote<datum>)
// <procedure call>     −→ (<operator> <operand>*)
// <operator>           −→ <expression>
// <operand>            −→ <expression>
// <lambda expression>  −→ (lambda <formals> <body>)
// <formals>            −→ (<variable>*) | <variable> | (<variable>+.<variable>)
// <body>               −→ <definition>*<sequence>
// <sequence>           −→ <command>*<expression>
// <command>            −→ <expression>
// <conditional>        −→ (if <test> <consequent> <alternate>)
// <test>               −→ <expression>
// <consequent>         −→ <expression>
// <alternate>          −→ <expression> | <empty>
// <assignment>         −→ (set! <variable> <expression>)
// <derived expression> −→ (cond <cond clause>+)
//   | (cond <cond clause>* (else<sequence>))
//   | (case <expression> <case clause>+)
//   | (case <expression> <case clause>* (else<sequence>))
//   | (and <test>*)
//   | (or <test>*)
//   | (let (<binding spec>*) <body>)
//   | (let <variable> (<binding spec>*) <body>)
//   | (let* (<binding spec>*) <body>)
//   | (letrec (<binding spec>*) <body>)
//   | (begin <sequence>)
//   | (do (<iteration spec>*) (<test> <do result>) <command>*)
//   | (delay <expression>)
//   | <quasiquotation>
// <cond clause>        −→ (<test> <sequence>)
//   | (<test>)
//   | (<test> => <recipient>)
// <recipient>          −→ <expression>
// <case clause>        −→ ((<datum>*) <sequence>)
// <binding spec>       −→ (<variable> <expression>)
// <iteration spec>     −→ (<variable> <init> <step>)
//   | (<variable> <init>)
// <init>               −→  <expression>
// <step>               −→  <expression>
// <do result>          −→  <sequence> | <empty>
// <macro use>          −→ (<keyword> <datum>*)
// <keyword>            −→ <identifier>
// <macro block>        −→ (let-syntax (<syntax spec>*) <body>)
//   | (letrec-syntax (<syntax spec>*) <body>)
// <syntax spec>        −→ (<keyword> <transformer spec>
//
// Program and definition
//
// <program>               −→ <command or definition>
// <command or definition> −→ <command>
//   | <definition>
//   | <syntax definition>
//   | (begin <command or definition>+)
// <definition>            −→ (define <variable> <expression>)
//   | (define (<variable> <def formals>) <body>)
//   | (begin <definition> *)
// <def formals>           −→ <variable>*
//   | <variable> *. <variable>
// <syntax definition>     −→ (define-syntax <keyword> <transformer spec>)

const TokenType = Object.freeze({
  Boolean: 'boolean',
  String: 'string',
  Character: 'character',
  Number: 'number',
  Identifier: 'identifier',
  Punctuator: 'punctuator',
  Comment: 'comment',
})

const NodeType = Object.freeze({
  Terminal: 'terminal',
  Vector: 'vector',
  List: 'list',
  Quote: 'quote',
  Quasiquote: 'quasiquote',
  Unquote: 'unquote',
  UnquoteSplicing: 'unquote-splicing',
  Variable: 'variable',
  Boolean: 'boolean',
  String: 'string',
  Character: 'character',
  Number: 'number',
  Definition: 'definition',
  ProcedureCall: 'procedurecall',
  Lambda: 'lambda',
  Formals: 'formals',
  Body: 'body',
  Conditional: 'conditional',
  Assignment: 'assignment',
  Cond: 'cond',
  CondClause: 'cond-clause',
  Sequence: 'sequence',
  And: 'and',
  Or: 'or',
  Begin: 'begin',
  Delay: 'delay',
  BindingSpec: 'binding-spec',
  Let: 'let',
  LetStar: 'let*',
  LetRec: 'letrec',
  Do: 'do',
  InterationSpec: 'interation-spec',
});

const KEYWORDS = [
  'else', '=>', 'define', 'unquote', 'unquote-splicing', 'quote', 'lambda',
  'if', 'set!', 'begin', 'cond', 'and', 'or', 'case', 'let', 'let*', 'letrec',
  'do', 'delay', 'quasiquote',
];

function createError(message, pos) {
  const error = new Error(message);
  error.line = pos.line;
  error.col = pos.col;
  return error;
}

function remainingToken(tokens, index) {
  return tokens.length - index;
}

function parseToken(tokens, index, which) {
  if (remainingToken(tokens, index) <= 0) {
    throw createError('Unexpected end of input', tokens[index - 1].pos);
  }
  if (tokens[index].value !== which) {
    throw createError(`Expecting ${which}`, tokens[index].pos);
  }
  return index + 1;
}

function parseCompoundDatum(tokens, index) {
  current = index;
  if (tokens[current].type === TokenType.Punctuator && tokens[current].value === '#(') {
    // Parse vectors
    if (current++ >= tokens.length) throw createError('Unexpected end of input', tokens[current].pos);
    const datums = [];
    while (current < tokens.length &&
      !(tokens[current].type === TokenType.Punctuator && tokens[current].value === ')')) {
      const { node, nextIndex } = parseDatum(tokens, current);
      datums.push(node);
      current = nextIndex;
    }
    if (tokens[current].type !== TokenType.Punctuator || tokens[current].value !== ')') {
      throw createError('Expected closing parenthesis', tokens[current].pos);
    }
    return { node: { type: NodeType.Vector, datums }, nextIndex: current + 1 };
  }

  if (tokens[current].type === TokenType.Punctuator && tokens[current].value === '(') {
    // Parse list, including improper list
    if (current++ >= tokens.length) throw createError('Unexpected end of input', tokens[current].pos);
    const datums = [];
    while (current < tokens.length &&
      !(tokens[current].type === TokenType.Punctuator && tokens[current].value === ')') &&
      !(tokens[current].type === TokenType.Punctuator && tokens[current].value === '.')) {
      const { node, nextIndex } = parseDatum(tokens, current);
      datums.push(node);
      current = nextIndex;
    }
    if (tokens[current].type === TokenType.Punctuator && tokens[current].value === '.') {
      if (datums.length === 0) {
        throw new Error('Improper list must start with a datum');
      }
      datums.push({ type: NodeType.Terminal, content: tokens[current] });
      if (current++ >= tokens.length) throw createError('Unexpected end of input', tokens[current].pos);
      const { node, nextIndex } = parseDatum(tokens, current);
      datums.push(node);
      current = nextIndex;
      if (tokens[current].type !== TokenType.Punctuator || tokens[current].value !== ')') {
        throw createError('Expected closing parenthesis', tokens[current].pos);
      }
    }
    while (current < tokens.length &&
      !(tokens[current].type === TokenType.Punctuator && tokens[current].value === ')')) {
      const { node, nextIndex } = parseDatum(tokens, current);
      datums.push(node);
      current = nextIndex;
    }
    return { node: { type: NodeType.List, datums }, nextIndex: current + 1 };
  }

  if (tokens[current].type === TokenType.Punctuator) {
    switch (tokens[current].value) {
      case '\'': {
        const { node, nextIndex } = parseDatum(tokens, current + 1);
        return { node: { type: NodeType.Quote, datum: node }, nextIndex };
      }
      case '`': {
        const { node, nextIndex } = parseDatum(tokens, current + 1);
        return { node: { type: NodeType.Quasiquote, datum: node }, nextIndex };
      }
      case ',': {
        const { node, nextIndex } = parseDatum(tokens, current + 1);
        return { node: { type: NodeType.Unquote, datum: node }, nextIndex };
      }
      case ',@': {
        const { node, nextIndex } = parseDatum(tokens, current + 1);
        return { node: { type: NodeType.UnquoteSplicing, datum: node }, nextIndex };
      }
    }
  }

  throw createError(`Unexpected token: ${tokens[current].value}`, tokens[current].pos);
}

function parseSimpleDatum(tokens, index) {
  if ([
    TokenType.Boolean, TokenType.Number, TokenType.Character, TokenType.String,
    TokenType.Identifier].includes(tokens[index].type)) {
    return { node: { type: NodeType.Terminal, content: tokens[index] }, nextIndex: index + 1 };
  }
}

function parseDatum(tokens, index) {
  return parseSimpleDatum(tokens, index) ?? parseCompoundDatum(tokens, index);
}


function parseVariable(tokens, index) {
  if (tokens[index].type === TokenType.Identifier && !KEYWORDS.includes(tokens[index].value)) {
    return { node: { type: NodeType.Variable, value: tokens[index].value }, nextIndex: index + 1 };
  }
}

function parseLiteral(tokens, index) {
  switch (tokens[index].type) {
    case TokenType.Boolean: {
      return { node: { type: NodeType.Boolean, value: tokens[index].value === '#t' }, nextIndex: index + 1 };
    }
    case TokenType.Number: {
      return { node: { type: NodeType.Number, value: parseFloat(tokens[index].value) }, nextIndex: index + 1 };
    }
    case TokenType.String:
    case TokenType.Character: {
      return { node: { type: tokens[index].type, value: tokens[index].value }, nextIndex: index + 1 };
    }
    default: return undefined;
  }
}

function parseProcedureCall(tokens, index) {
  let current = index;
  if (remainingToken(tokens, current) > 2 && tokens[current].value === '(' &&
    !KEYWORDS.includes(tokens[current + 1].value)) {
    ++current;
    const expression = parseExpression(tokens, current);
    if (expression !== undefined) {
      const { node: operator, nextIndex } = expression;
      current = expression.nextIndex;
      const operands = [];
      while (remainingToken(tokens, current) > 0 && tokens[current].value !== ')') {
        const expressionOperand = parseExpression(tokens, current);
        if (expressionOperand === undefined) {
          // Not sure if we should just bail here. Throw for now.
          throw createError('Expecting operand expression', tokens[current].pos);
        }
        operands.push(expressionOperand.node);
        current = expressionOperand.nextIndex;
      }
      if (remainingToken(tokens, current) === 0) {
        throw createError('Unexpected end of input', tokens[current - 1].pos);
      }
      return {
        node: {
          type: NodeType.ProcedureCall,
          operator,
          operands,
        },
        nextIndex: current + 1,
      };
    }
  }
}

function parseLambdaExpression(tokens, index) {
  let current = index;
  if (remainingToken(tokens, current) > 2 && tokens[current].value === '(' &&
    tokens[current + 1].value === 'lambda') {
    current += 2;
    const { node: formals, nextIndex: ni1 } = parseFormals(tokens, current);
    current = ni1;
    const { node: body, nextIndex: ni2 } = parseBody(tokens, current);
    current = ni2;
    if (remainingToken(tokens, current) === 0) {
      throw createError('Unexpected end of input', tokens[current - 1].pos);
    }
    if (tokens[current].value !== ')') {
      throw createError('Expected )', tokens[current].pos);
    }

    return {
      node: {
        type: NodeType.Lambda,
        formals,
        body,
      },
      nextIndex: current + 1,
    };
  }
}

function parseFormals(tokens, index) {
  let current = index;
  if (remainingToken(tokens, current) > 1 && tokens[current].value === '(') {
    ++current;
    const variables = [];
    while (remainingToken(tokens, current) > 1 && tokens[current].value !== ')'
      && tokens[current].value !== '.') {
      const { node: variable, nextIndex } = parseVariable(tokens, current);
      variables.push(variable);
      current = nextIndex;
    }
    if (remainingToken(tokens, current) > 1 && tokens[current].value === '.') {
      ++current;
    }
    if (remainingToken(tokens, current) > 1 && tokens[current].value !== ')') {
      const { node: variable, nextIndex } = parseVariable(tokens, current);
      variables.push(variable);
      current = nextIndex;
    }
    if (remainingToken(tokens, current) === 0) {
      throw createError('Unexpected end of input', tokens[current - 1].pos);
    }

    return {
      node: {
        type: NodeType.Formals,
        variables,
      },
      nextIndex: current + 1,
    };
  } else {
    const { node: variable, nextIndex } = parseVariable(tokens, current);

    return {
      node: {
        type: NodeType.Formals,
        variables: [variable],
      },
      nextIndex,
    };
  }
}

function parseBody(tokens, index) {
  let result;
  let current = index;
  const definitions = [];
  while ((result = parseDefinition(tokens, current)) !== undefined) {
    const { node: definition, nextIndex } = result;
    current = nextIndex;
    definitions.push(definition);
  }
  const expressions = [];
  while ((result = parseExpression(tokens, current)) !== undefined) {
    const { node: expression, nextIndex } = result;
    current = nextIndex;
    expressions.push(expression);
  }

  return {
    node: {
      type: NodeType.Body,
      definitions,
      expressions,
    },
    nextIndex: current,
  };
}

function parseConditional(tokens, index) {
  let current = index;
  if (remainingToken(tokens, current) > 2 && tokens[current].value === '(' &&
    tokens[current + 1].value === 'set!') {
    current += 2;
    const { node: variable, nextIndex: ni1 } = parseVariable(tokens, current);
    current = ni1;
    const { node: expression, nextIndex: ni2 } = parseExpression(tokens, current);
    current = ni2;
    if (remainingToken(tokens, current) === 0) {
      throw createError('Unexpected end of input', tokens[current - 1].pos);
    }
    if (remainingToken(tokens, current) > 0 && tokens[current].value !== ')') {
      throw createError('Unexpected end of input', tokens[current].pos);
    }

    return {
      node: {
        type: NodeType.Assignment,
        variable,
        expression,
      },
      nextIndex: current + 1,
    };
  }
}

// (set! <variable> <expression>)
function parseAssignment(tokens, index) {
  let current = index;
  if (remainingToken(tokens, current) > 2 && tokens[current].value === '(' &&
    tokens[current + 1].value === 'if') {
    current += 2;
    const { node: test, nextIndex: ni1 } = parseExpression(tokens, current);
    current = ni1;
    const { node: consequent, nextIndex: ni2 } = parseExpression(tokens, current);
    current = ni2;
    if (remainingToken(tokens, current) === 0) {
      throw createError('Unexpected end of input', tokens[current - 1].pos);
    }
    if (remainingToken(tokens, current) > 0 && tokens[current].value === ')') {
      return {
        node: {
          type: NodeType.Conditional,
          test,
          consequent,
        },
        nextIndex: current + 1,
      };
    }
    const { node: alternate, nextIndex: ni3 } = parseExpression(tokens, current);
    current = ni3;
    if (remainingToken(tokens, current) > 0 && tokens[current].value !== ')') {
      throw createError('Unexpected end of input', tokens[current].pos);
    }

    return {
      node: {
        type: NodeType.Conditional,
        test,
        consequent,
        alternate,
      },
      nextIndex: current + 1,
    };
  }
}

function parseCondClause(tokens, index) {
  let current = index;
  if (remainingToken(tokens, current) > 2 && tokens[current].value === '(') {
    ++current;
    if (tokens[current].value === 'else') return ; // TODO: Find a better way than this special case.
    const { node: test, nextIndex } = parseExpression(tokens, current);
    current = nextIndex;

    if (remainingToken(tokens, current) === 0) {
      throw createError('Unexpected end of input', tokens[current - 1].pos);
    }

    if (tokens[current].value === ')') {
      return {
        node: {
          NodeType: NodeType.CondClause,
          test,
        },
        nextIndex: current + 1,
      }
    }

    if (tokens[current].value === '=>') {
      ++current;
      const { node: recipient, nextIndex: ni2 } = parseExpression(tokens, current);
      current = ni2;

      return {
        node: {
          NodeType: NodeType.CondClause,
          test,
          recipient,
        },
        nextIndex: current + 1,
      }
    }

    const { node: sequence, nextIndex: ni2 } = parseSequence(tokens, current);
    current = ni2;

    if (remainingToken(tokens, current) <= 0 || tokens[current].value !== ')') {
      throw createError('Unexpected end of input', tokens[current].pos);
    }

    return {
      node: {
        NodeType: NodeType.CondClause,
        test,
        sequence,
      },
      nextIndex: current + 1,
    }
  }
}

function parseSequence(tokens, index) {
  let result;
  let current = index;
  const expressions = [];
  while ((result = parseExpression(tokens, current))) {
    const { node: expression, nextIndex } = result;
    expressions.push(expression);
    current = nextIndex;
  }

  return {
    node: {
      type: NodeType.Sequence,
      expressions,
    },
    nextIndex: current,
  };
}

function parseCond(tokens, index) {
  let current = index;
  if (remainingToken(tokens, current) > 2 && tokens[current].value === '(' &&
    tokens[current + 1].value === 'cond') {
    current += 2;
    const condClauses = [];
    while (remainingToken(tokens, current) > 0 && tokens[current].value !== 'else') {
      const result = parseCondClause(tokens, current);
      if (result === undefined) break;
      condClauses.push(result.node);
      current = result.nextIndex;
    }
    let elseClause;
    if (remainingToken(tokens, current) > 1 && tokens[current].value === '(' &&
      tokens[current + 1].value === 'else') {
      current += 2;
      const result = parseSequence(tokens, current);
      if (result === undefined) {
        throw createError('Expected else clause', tokens[current].pos);
      }
      elseClause = result.node;
      current = result.nextIndex;
    }
    if (elseClause === undefined && condClauses.length === 0) {
      throw createError('No cond clause and not else specified', tokens[current].pos);
    }
    if (remainingToken(tokens, current) <= 0 || tokens[current].value !== ')') {
      throw createError('Unexpected end of input', tokens[current].pos);
    }
    ++current;

    return {
      node: elseClause !== undefined ? {
        type: NodeType.Cond,
        condClauses,
        elseClause,
      } : {
        type: NodeType.Cond,
        condClauses,
      },
      nextIndex: current + 1,
    };
  }
}

function parseCase(tokens, index) {

}

function parseBinOp(tokens, index, keyword, nodeType) {
  let current = index;
  const tests = [];
  if (remainingToken(tokens, current) > 1 && tokens[current].value === '(' &&
    tokens[current + 1].value === keyword) {
    current += 2;
    let result;
    while ((result = parseExpression(tokens, current))) {
      const { node: test, nextIndex} = result;
      tests.push(test);
      current = nextIndex;
    }
    if (remainingToken(tokens, current) <= 0 || tokens[current].value !== ')') {
      throw createError('Unexpected end of input', tokens[current].pos);
    }
    ++current;

    return {
      node: {
        NodeType: nodeType,
        tests,
      },
      nextIndex: current,
    };
  }
}

function parseAnd(tokens, index) {
  return parseBinOp(tokens, index, 'and', NodeType.And);
}

function parseOr(tokens, index) {
  return parseBinOp(tokens, index, 'or', NodeType.Or);
}

function parseBindingSpec(tokens, index) {
 let current = index;
  if (remainingToken(tokens, current) > 0 && tokens[current].value === '(') {
    ++current;
    const { node: variable, nextIndex: ni1 } = parseVariable(tokens, current);
    current = ni1;
    const { node: expression, nextIndex: ni2 } = parseExpression(tokens, current);
    current = ni2;

    if (remainingToken(tokens, current) <= 0 || tokens[current].value !== ')') {
      throw createError('Unexpected end of input', tokens[current].pos);
    }
    ++current;

    return {
      node: {
        type: NodeType.BindingSpec,
        variable,
        expression,
      },
      nextIndex: current,
    };
  }
}

function parseLetAll(tokens, index, keyword, nodeType) {
  let current = index;
  if (remainingToken(tokens, current) > 1 && tokens[current].value === '(' &&
    tokens[current + 1].value === keyword) {
    current += 2;

    let variable;
    if (keyword === 'let' && remainingToken(tokens, current) > 0 && tokens[current].value !== '(') {
      // Only for `let`` construct
      const { node, nextIndex } = parseVariable(tokens, current);
      variable = node;
      current = nextIndex;
    }

    if (remainingToken(tokens, current) > 0 && tokens[current].value !== '(') {
      const tokenIndex = remainingToken(tokens, current) > 0 ? current : current - 1;
      throw createError('Expecting (binding-spec)', tokens[tokenIndex].pos);
    }
    ++current;

    const bindingSpecs = [];
    while ((result = parseBindingSpec(tokens, current))) {
      const { node: bindingSpec, nextIndex } = result;
      bindingSpecs.push(bindingSpec);
      current = nextIndex;
    }

    if (remainingToken(tokens, current) <= 0 || tokens[current].value !== ')') {
      throw createError('Unexpected end of input', tokens[current].pos);
    }
    ++current;

    const { node: body, nextIndex: ni2 } = parseBody(tokens, current);
    current = ni2;

    if (remainingToken(tokens, current) <= 0 || tokens[current].value !== ')') {
      throw createError('Unexpected end of input', tokens[current].pos);
    }
    ++current;

    return {
      node: variable !== undefined ? {
        variable,
        type: nodeType,
        bindingSpecs,
        body,
      } : {
        type: nodeType,
        bindingSpecs,
        body,
      },
      nextIndex: current,
    };
  }
}

function parseLet(tokens, index) {
  return parseLetAll(tokens, index, 'let', NodeType.Let)
}

function parseLetStar(tokens, index) {
  return parseLetAll(tokens, index, 'let*', NodeType.LetStar)
}

function parseLetRec(tokens, index) {
  return parseLetAll(tokens, index, 'letrec', NodeType.LetRec)
}

function parseBegin(tokens, index) {
  let current = index;
  if (remainingToken(tokens, current) > 1 && tokens[current].value === '(' &&
    tokens[current + 1].value === 'begin') {
    current += 2;
    const { node: sequence, nextIndex } = parseSequence(tokens, current);
    current = nextIndex;

    if (remainingToken(tokens, current) <= 0 || tokens[current].value !== ')') {
      throw createError('Unexpected end of input', tokens[current].pos);
    }
    ++current;

    return {
      node: {
        type: NodeType.Begin,
        sequence,
      },
      nextIndex: current,
    }
  }
}

function parseIterationSpec(tokens, index) {
  let current = index;
  if (remainingToken(tokens, current) > 0 && tokens[current].value === '(') {
    ++current;
    const { node: variable, nextIndex: ni1 } = parseVariable(tokens, current);
    current = ni1;
    const { node: init, nextIndex: ni2 } = parseExpression(tokens, current);
    current = ni2;

    let step;
    const result = parseExpression(tokens, current);
    if (result !== undefined) {
      step = result.node;
      current = result.nextIndex;
    }

    current = parseToken(tokens, current, ')');

    return {
      node: step !== undefined ? {
        type: NodeType.InterationSpec,
        variable,
        init,
        step,
      } : {
        type: NodeType.InterationSpec,
        variable,
        init,
      },
      nextIndex: current,
    };
  }
}

function parseDo(tokens, index) {
  let current = index;
  if (remainingToken(tokens, current) > 1 && tokens[current].value === '(' &&
    tokens[current + 1].value === 'do') {
    current += 2;

    current = parseToken(tokens, current, '(');

    const iterationSpecs = [];
    while ((result = parseIterationSpec(tokens, current))) {
      const { node: iterationSpec, nextIndex } = result;
      iterationSpecs.push(iterationSpec);
      current = nextIndex;
    }

    current = parseToken(tokens, current, ')');
    current = parseToken(tokens, current, '(');

    const { node: test, nextIndex: ni1 } = parseExpression(tokens, current);
    current = ni1;
    const { node: doResult, nextIndex: ni2 } = parseSequence(tokens, current);
    current = ni2;

    current = parseToken(tokens, current, ')');

    commands = []
    while ((result = parseExpression(tokens, current))) {
      const { node: command, nextIndex } = result;
      commands.push(command);
      current = nextIndex;
    }
    current = parseToken(tokens, current, ')');

    return {
      node: {
        type: NodeType.Do,
        iterationSpecs,
        test,
        doResult,
        commands,
      },
      nextIndex: current,
    }
  }
}

function parseDelay(tokens, index) {
  let current = index;
  if (remainingToken(tokens, current) > 1 && tokens[current].value === '(' &&
    tokens[current + 1].value === 'delay') {
    current += 2;

    const { node: expression, nextIndex } = parseExpression(tokens, current);
    current = nextIndex;

    if (remainingToken(tokens, current) <= 0 || tokens[current].value !== ')') {
      throw createError('Unexpected end of input', tokens[current].pos);
    }
    ++current;

    return {
      node: {
        type: NodeType.Delay,
        expression,
      },
      nextIndex: current,
    }
  }
}

function parseQuasiQuotation(tokens, index) {

}

function parseDerivedExpression(tokens, index) {
  return parseCond(tokens, index)
    ?? parseCase(tokens, index)
    ?? parseAnd(tokens, index)
    ?? parseOr(tokens, index)
    ?? parseLet(tokens, index)
    ?? parseLetStar(tokens, index)
    ?? parseLetRec(tokens, index)
    ?? parseBegin(tokens, index)
    ?? parseDo(tokens, index)
    ?? parseDelay(tokens, index)
    ?? parseQuasiQuotation(tokens, index);
}

function parseMacroUse(tokens, index) {

}

function parseMacroBlock(tokens, index) {

}

function parseDefinition(tokens, index) {
  let current = index;
  if (remainingToken(tokens, index) > 2 &&
    tokens[current].type === TokenType.Punctuator && tokens[current].value === '(' &&
    tokens[current + 1].type === TokenType.Identifier) {
    ++current;
    switch (tokens[current].value) {
      case 'define': {
        ++current;
        const variable = parseVariable(tokens, current);
        if (variable !== undefined) {
          const expression = parseExpression(tokens, variable.nextIndex);
          const finalToken = tokens[expression.nextIndex];
          if (finalToken.type !== TokenType.Punctuator ||
            finalToken.value !== ')') {
            throw createError(`Expecting ')' found ${finalToken}`, finalToken.pos);
          }
          return {
            node: {
              type: NodeType.Definition,
              variable: variable.node,
              expression: expression.node,
            },
            nextIndex: finalToken.nextIndex,
          }
        } else {
          // (define (<variable> <def formals>) <body>)
          throw new Error('not implemented');
        }
        break;
      }
      case 'begin': {
        throw new Error('not implemented');
        break;
      }
    }
  }
}

function parseExpression(tokens, index) {
  return parseVariable(tokens, index)
    ?? parseLiteral(tokens, index)
    ?? parseProcedureCall(tokens, index)
    ?? parseLambdaExpression(tokens, index)
    ?? parseConditional(tokens, index)
    ?? parseAssignment(tokens, index)
    ?? parseDerivedExpression(tokens, index);
}

function parseProgram(tokens, index) {
  return parseExpression(tokens, index) ?? parseDefinition(tokens, index);
}

function parse(tokens, index = 0) {
  const sexpr = [];
  try {
    while (index < tokens.length) {
      expr = parseProgram(tokens, index);
      sexpr.push(expr.node);
      index = expr.nextIndex;
    }
    return sexpr;
  } catch (e) {
    return e;
  }
}

function prettyprint(tree) {
  // console.dir(tree, { depth: null });
  let result = '';
  switch (tree.type) {
    case 'list': {
      result += '(';
      for (const [index, node] of tree.datums.entries()) {
        result += prettyprint(node, result);
        if (index < tree.datums.length - 1) {
          result += ' ';
        }
      }
      result += ')';
      break;
    }
    case 'vector': {
      result += '#(';
      for (const [index, node] of tree.datums.entries()) {
        result += prettyprint(node, result);
        if (index < tree.datums.length - 1) {
          result += ' ';
        }
      }
      result += ')';
      break;
    }
    case 'quote':
    case 'quasiquote':
    case 'unquote':
    case 'unquote-splicing':
    {
      result += `(${tree.type} ${prettyprint(tree.datum, result)})`;
      break;
    }
    case 'terminal': {
      switch (tree.content.type) {
        case 'string': {
          return `"${tree.content.value}"`;
          break;
        }
        default:
          return `${tree.content.value}`;
      }
    }
    default: throw new Error(`Unknown node type: ${tree.type}`);
  }

  return result;
}

module.exports = {
  parse,
  prettyprint,
}