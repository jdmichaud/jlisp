// Lexer for Scheme. The following is the lexical specification that it
// handles:
//
// <token> --> <identifier> | <boolean> | <number>
//     | <character> | <string> | ( | ) | #( | ' | ` | , | ,@ | .
// <delimiter> --> <whitespace> | ( | ) | " | ;
// <whitespace> --> <space or newline>
// <comment> --> ; <all subsequent characters up to a line break>
// <atmosphere> --> <whitespace> | <comment>
// <intertoken space> --> <atmosphere>*
//
// <identifier> --> <initial> <subsequent>*
//     | <peculiar identifier>
// <initial> --> <letter> | <special initial>
// <letter> --> [a-z]
//
// <special initial> --> ! | $ | % | & | * | / | : | < | =
//     | > | ? | ^ | _ | ~
// <subsequent> --> <initial> | <digit> | <special subsequent>
// <digit> --> [0-9]
// <special subsequent> --> + | - | . | @
// <peculiar identifier> --> + | - | ...
//
// <boolean> --> #t | #f
// <character> --> #\ <any character> | #\ <character name>
// <character name> --> space | newline
//
// <string> --> " <string element>* "
// <string element> --> <any character other than " or \>
//     | \" | \\
//
// <number> --> <integer> | <decimal>
// <integer> --> <sign> <digit>+
// <decimal> --> <sign> <digit>+ . <digit>*
//     | <sign> . <digit>+
//
// <sign> --> <empty> | + | -


const TokenType = Object.freeze({
  Boolean: 'boolean',
  String: 'string',
  Character: 'character',
  Number: 'number',
  Identifier: 'identifier',
  Punctuator: 'punctuator',
  Comment: 'comment',
})

function remainingChar(input, index) {
  return input.length - index;
}

function endOfToken(input, index) {
  const delimiterRe = new RegExp('[\\s|(|)|"|;]');
  return remainingChar(input, index) === 0 || delimiterRe.test(input[index]);
}

function readBoolean(input, index) {
  if (remainingChar(input, index) < 2) {
    return new Error('Unexpected end of input');
  }

  if (input[index] === '#' && ['t', 'f'].includes(input[index + 1])) {
    return { type: TokenType.Boolean, index, value: input.slice(0, 2) };
  }

  return new Error('Unexpected end of input');
}

function readString(input, index) {
  let current = index;
  if (input[current] === '"') {
    current++;
    while (!/\"/.test(input[current])) {
      if (input[current] === '\\') {
        if (input[current + 1] === '"' || input[current + 1] === '\\') {
          ++current
        } else {
          return new Error(`Unexpected escape sequence: \\${input[current + 1]}`);
        }
      }
      ++current;
    }
    return {
      type: TokenType.String,
      index,
      value: input.substr(index + 1, current - (index + 1)).replace('\n', '\\n'),
    };
  }
  return new Error('Unexpected end of input');
}

function readCharacter(input, index) {
  if (remainingChar(input, index) < 3) {
    return new Error('Unexpected end of input');
  }

  for (const namedCharacter of ['#\\space', '#\\newline']) {
    if ((remainingChar(input, index)) >= namedCharacter.length &&
        input.substr(index, namedCharacter.length) === namedCharacter) {
      return { type: TokenType.Character, index, value: namedCharacter };
    }
  };

  if (input[index] === '#' && input[index + 1] === '\\') {
    if (!endOfToken(input, index + 3)) {
      return new Error('Bad character constant');
    }
    const value = input[index + 2] === '\n' ? '#\\newline' : input.slice(0, 3);
    return { type: TokenType.Character, index, value };
  }
  return new Error('Not a character');
}

function readNumber(input, index) {
  const digit = '0-9';
  let current = index;
  if (input[current] === '+' || input[current] === '-') {
    current++;
  }
  if (/\d/.test(input[current])) {
    while (/\d/.test(input[current])) ++current;
    if (input[current] === '.') {
      current++;
      while (/\d/.test(input[current])) ++current;
    }
    if (!endOfToken(input, current + 1)) {
      return new Error('Bad number observed');
    }
    return { type: TokenType.Number, index, value: parseFloat(input.substr(index, current - index)) };
  }
  if (input[current] === '.') {
    current++;
    while (/\d/.test(input[current])) ++current;
    if (!endOfToken(input, current + 1)) {
      return new Error('Bad number observed');
    }
    return { type: TokenType.Number, index, value: parseFloat(input.substr(index, current - index)) };
  }
  return new Error('Not a number');
}

function readIdentifier(input, index) {
  const letter = 'a-zA-Z';
  const special_initial = '!|$|%|&|*|/|:|<|=|>|?|^|_|~';
  const initial = `${letter}|${special_initial}`;
  if (new RegExp(`[${initial}]`).test(input[index])) {
    current = index + 1;
    const digit = `0-9`;
    const special_subsequent = '+|-|.|@';
    const subsequent = `${initial}|${digit}|${special_subsequent}`;
    const subsequentRe = new RegExp(`[${subsequent}]`);
    while (subsequentRe.test(input[current])) ++current;
    if (!endOfToken(input, current)) {
      return new Error('Bad identifier observed');
    }
    return { type: TokenType.Identifier, index, value: input.substr(index, current - index).toLowerCase() };
  } else if (input[index] === '+' || input[index] === '-') {
    if (!endOfToken(input, index + 1)) {
      return new Error('Bad identifier observed');
    }
    return { type: TokenType.Identifier, index, value: input[index] };
  } else if (remainingChar(input, index) > 2 && input.substr(index, 3) === '...') {
    if (!endOfToken(input, index + 4)) {
      return new Error('Bad identifier observed');
    }
    return { type: TokenType.Identifier, index, value: input.substr(index, 3) };
  }
  return new Error('Unexpected end of input');
}

function readPunctuator(input, index) {
  if (['(', ')', '.', '\'', '`'].includes(input[index])) {
    return { type: TokenType.Punctuator, index, value: input[index] };
  }
  if (input[index] === ',') {
    if (input[index + 1] === '@') {
      return { type: TokenType.Punctuator, index, value: ',@' };
    } else {
      return { type: TokenType.Punctuator, index, value: ',' };
    }
  }
  if (input[index] === '#' && input[index + 1] === '(') {
    return { type: TokenType.Punctuator, index, value: '#(' };
  }
  return new Error('Not a punctuator');
}

function readComment(input, index) {
  if (input[index] === ';') {
    const current = index + 1;
    while (input[current] !== '\n') current++;
  }
  return new Error('Not a comment');
}

function updatePos(char, pos) {
  if (/\n/.test(char)) {
    ++pos.line;
    pos.col = 0;
  } else {
    ++pos.col;
  }
}

function createError(message, pos) {
  const error = new Error(message);
  error.line = pos.line;
  error.col = pos.col;
  return error;
}

// See grammar.dot
function readToken(input, index, pos = { line: 0, col: 0 }) {
  let current = index;
  const startPos = { ...pos }; // Stored with the token
  while (remainingChar(input, current) > 0) {
    while (remainingChar(input, current) > 0 && /\s/.test(input[current])) {
      updatePos(input[current++], pos);
    }
    if (remainingChar(input, current) === 0) {
      return undefined;
    }
    index = current;
    startPos.line = pos.line;
    startPos.col = pos.col;
    // begin <comment>
    if (input[current] === ';') {
      while (remainingChar(input, current) > 0 && input[current] !== '\n') {
        updatePos(input[current++], pos);
      }
      continue;
    }
    // end <comment>
    // begin <punctuator>
    else if (['(', ')', '.', '\'', '`'].includes(input[current])) {
      // Special escape for '...' or '.14'
      if (input[current] === '.') {
        if (endOfToken(input, current + 1)) {
          updatePos(input[current++], pos);
          return {
            type: TokenType.Punctuator,
            endIndex: current, value: input[current - 1],
            pos: startPos,
          };
        } else { /* either '...'' or a number */ }
      } else {
        updatePos(input[current++], pos);
        return {
          type: TokenType.Punctuator,
          endIndex: current, value: input[current - 1],
          pos: startPos,
        };
      }
    }
    else if (input[current] === ',') {
      updatePos(input[current++], pos);
      if (input[current] === '@') {
        updatePos(input[current++], pos);
        return { type: TokenType.Punctuator, endIndex: current, value: ',@', pos: startPos };
      } else {
        return { type: TokenType.Punctuator, endIndex: current, value: ',', pos: startPos };
      }
    }
    else if (input[current] === '#' && input[current + 1] === '(') {
      updatePos(input[current++], pos);
      updatePos(input[current++], pos);
      return { type: TokenType.Punctuator, endIndex: current, value: '#(', pos: startPos };
    }
    // end <punctuator>
    // begin <string>
    if (input[current] === '"') {
      updatePos(input[current++], pos);
      while (remainingChar(input, current) > 0 && !/\"/.test(input[current])) {
        if (input[current] === '\\') {
          if (remainingChar(input, current) > 2) {
            if (input[current + 1] === '"' || input[current + 1] === '\\') {
              updatePos(input[current++], pos);
            } else {
              return createError(`Unexpected escape sequence: \\${input[current + 1]}`, pos);
            }
          } else {
            return createError('Unexpected end of string', pos);
          }
        }
        updatePos(input[current++], pos);
      }
      updatePos(input[current++], pos);
      return {
        type: TokenType.String,
        endIndex: current,
        value: input.substr(index + 1, (current - 1) - (index + 1)).replace('\n', '\\n'),
        pos: startPos,
      };
    }
    // end <string>
    // begin <boolean> | <character>
    else if (input[current] === '#') {
      if (remainingChar(input, current) > 1) {
        updatePos(input[current++], pos);
        if (['t', 'f'].includes(input[current])) {
          updatePos(input[current++], pos);
          return {
            type: TokenType.Boolean,
            endIndex: current, value: `#${input[current - 1]}`,
            pos: startPos,
          };
        } else if (input[current] === '\\') {
          updatePos(input[current++], pos);
          if (remainingChar(input, current) > 0) {
            // <character name>
            for (const namedCharacter of ['space', 'newline']) {
              if ((remainingChar(input, current)) >= namedCharacter.length &&
                  input.substr(current, namedCharacter.length) === namedCharacter) {
                let length = namedCharacter.length;
                while (length) {
                  updatePos(input[current], pos);
                  ++current;
                  --length;
                }

                if (!endOfToken(input, current)) {
                  return createError('Bad character constant', pos);
                }

                return {
                  type: TokenType.Character,
                  endIndex: current,
                  value: `#\\${namedCharacter}`,
                  pos: startPos,
                };
              }
            };

            // <any characater>
            const value = input[current] === '\n' ? '#\\newline' : `#\\${input[current]}`;
            updatePos(input[current++], pos);
            if (!endOfToken(input, current)) {
              return createError('Bad character constant', pos);
            }
            return { type: TokenType.Character, endIndex: current, value, pos: startPos };
          } else {
            return createError('Unexpected end of input', pos);
          }
        } else {
          updatePos(input[current++], pos);
          return createError(`Unexpected character: ${input[current]}`, pos);
        }
      } else {
        return createError('Unexpected end of input', pos);
      }
    }
    // end <boolean | <character>
    // begin <number>
    else if ((input[current] === '+' || input[current] === '-') || /\d/.test(input[current]) ||
      input[current] === '.') {
      // Checking numbers
      if (input[current] === '+' || input[current] === '-') {
        updatePos(input[current++], pos);
      }
      if (input[current] === '.') {
        updatePos(input[current++], pos);
        while (remainingChar(input, current) > 0 && /\d/.test(input[current])) {
          updatePos(input[current++], pos);
        }
        if (endOfToken(input, current + 1)) {
          updatePos(input[current++], pos);
          return {
            type: TokenType.Number,
            endIndex: current,
            value: parseFloat(input.substr(index, (current - 1) - index)),
            pos: startPos,
          };
        } else {
          current--; /* Could still be an identifier */
          pos.col--; // We are coming from a '.' so we can safely decrement col.
        }
      } else if (/\d/.test(input[current])) {
        while (remainingChar(input, current) > 0 && /\d/.test(input[current])) {
          updatePos(input[current++], pos);
        }
        if (input[current] === '.') {
          updatePos(input[current++], pos);
          while (remainingChar(input, current) > 0 && /\d/.test(input[current])) {
            updatePos(input[current++], pos);
          }
        }
        if (!endOfToken(input, current)) {
          return createError('Bad number observed', pos);
        }

        return {
          type: TokenType.Number,
          endIndex: current,
          value: parseFloat(input.substr(index, current - index)),
          pos: startPos,
        };
      } else {
        current--; /* Could still be an identifier */
        pos.col--; // We are coming from a '+' or '-' so we can safely decrement col.
      }
    }
    // end <number>
    // begin <identifier>
    const letter = 'a-zA-Z';
    const special_initial = '!|$|%|&|*|/|:|<|=|>|?|^|_|~';
    const initial = `${letter}|${special_initial}`;
    const initialRe = new RegExp(`[${initial}]`);
    if (initialRe.test(input[current])) {
      const digit = `0-9`;
      const special_subsequent = '+|\\-|.|@';
      const subsequent = `${initial}|${digit}|${special_subsequent}`;
      const subsequentRe = new RegExp(`[${subsequent}]`);
      // In this look we look ahead to make sure we don't update pos too far.
      while (remainingChar(input, current) > 0 && subsequentRe.test(input[current])) {
        updatePos(input[current++], pos);
      }
      if (!endOfToken(input, current)) {
        return createError('Bad identifier observed', pos);
      }
      return {
        type: TokenType.Identifier,
        endIndex: current,
        value: input.substr(index, current - index).toLowerCase(),
        pos: startPos,
      };
    } else if (input[current] === '+' || input[current] === '-') {
      updatePos(input[current++], pos);
      if (!endOfToken(input, current)) {
        return createError('Bad identifier observed', pos);
      }
      return { type: TokenType.Identifier, endIndex: current, value: input[current - 1] };
    } else if (remainingChar(input, current) > 2 && input.substr(current, 3) === '...') {
      pos.col += 3;
      current += 3;
      if (!endOfToken(input, current)) {
        return createError('Bad identifier observed', pos);
      }
      return {
        type: TokenType.Identifier,
        endIndex: current,
        value: input.substr(current - 3, 3),
        pos: startPos,
      };
    }
    // end <identifier>
    return createError(`Unexpected character: ${input[current]}`, pos);
  }
}

// Converts a string to a list of tokens.
function tokenize(input) {
  const tokens = [];
  let index = 0;
  let pos = { line: 0, col: 0 };
  while (index < input.length) {
    const token = readToken(input, index, pos);
    if (token === undefined) break;
    index = token.endIndex;
    tokens.push(token);
  }
  return tokens;
}

module.exports = {
  readBoolean,
  readString,
  readCharacter,
  readNumber,
  readIdentifier,
  readPunctuator,
  readComment,
  readToken,
  tokenize,
};
