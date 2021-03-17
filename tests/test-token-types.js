#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function test(readFn, c/*ase*/, expected) {
  const [ tokenType, input ] = c;

  if (!(tokenType in readFn)) {
    throw new Error(`${tokenType} unknown token type`);
  }

  const result = readFn[tokenType](input, 0);
  if (result instanceof Error) {
    if (!expected.startsWith('Error:')) {
      return result;
    }
    return true;
  }
  // console.log(c, result);
  const { type, value } = result;
  const observedResult = (type === 'string' || type === 'punctuator')
    ? `(${type} "${value}")`
    : `(${type} ${value})`;
  if (expected !== observedResult) {
    return observedResult;
  }
  return true;
}

function main(listFile, lexerPath) {
  const lexer = require(lexerPath);
  const readFn = {
    // boolean: lexer.readBoolean,
    // string: lexer.readString,
    // character: lexer.readCharacter,
    // number: lexer.readNumber,
    // identifier: lexer.readIdentifier,
    // punctuator: lexer.readPunctuator,
    boolean: lexer.readToken,
    string: lexer.readToken,
    character: lexer.readToken,
    number: lexer.readToken,
    identifier: lexer.readToken,
    punctuator: lexer.readToken,
  };

  const testFixtures = fs.readFileSync(listFile)
    .toString()
    .split('\n')
    .filter(s => s.length > 0 && s.match(/^\s*#/) === null)
    .map(testFile => ({
      inputFile: testFile,
      expectFile: `${testFile.split('.')[0]}.expect`,
    }))
    .map(({ inputFile, expectFile }) => ({
      inputFile,
      expectFile,
      cases: fs.readFileSync(inputFile)
        .toString()
        .split('|')
        .filter(l => l.length > 1)
        .map(l => {
          const type = [];
          let i = 0;
          while (/\s/.test(l[i])) ++i;
          while (i < l.length && l[i] !== '\n') {
            type.push(l[i++]);
          }
          i++;
          return [type.join(''), l.slice(i)];
        })
        ,
      expectedOutcomes: fs.readFileSync(expectFile)
        .toString()
        .split('\n')
        .filter(s => s.length > 0),
    }));

  const results = testFixtures.map(fixture =>
    fixture.cases.map((c/*ase*/, index) => {
      const observed = test(readFn, c, fixture.expectedOutcomes[index]);
      if (observed !== true) {
        return {
          inputFile: fixture.inputFile,
          testNumber: index,
          input: c,
          expected: fixture.expectedOutcomes[index],
          observed,
        };
      }
    }).filter(x => x)
  ).flat();

  results.forEach(result => {
    console.error(`${result.inputFile}(${result.testNumber}): expected: ${result.expected} observed: ${result.observed}`);
  });

  if (results.length > 0) {
    console.log(`${results.length} / ${testFixtures.map(f => f.cases).flat().length} failures`);
  }

  return results.length;
}

if (process.argv.length !== 4) {
  console.log('missing parameters');
  console.log('usage: ./test-token-types.js <list-file> ../<lexer.js>');
  console.log('<list-file> must contain a list of test lexer files (https://eecs490.github.io/project-scheme-parser/)');
  process.exit(1);
}

process.exit(main(process.argv[2], process.argv[3]));
