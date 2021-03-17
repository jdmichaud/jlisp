#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function test(lex, { parse, prettyprint }, c/*ase*/, expected) {
  // console.log(`>>${c}<<`);
  // console.log(c);
  // console.log(lex(c));

  const result = parse(lex(c));

  if (result instanceof Error) {
    if (!expected.startsWith('Error:')) {
      return result;
    }
    return true;
  }
  // For some reason the test files repeat themselves. Just take the first one.
  const output = prettyprint(result[0]);

  if (output !== expected) {
    return output;
  }

  return true;
}

function main(listFile, lexerPath, parserPath) {
  const { tokenize } = require(lexerPath);
  const { parse, prettyprint } = require(parserPath);

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
        .filter((_, i, array) => i !== (array.length - 1)) // remote last empty entry
        .map(s => s.trim())
        ,
      expectedOutcomes: fs.readFileSync(expectFile)
        .toString()
        .split('\n')
        .filter((_, i, array) => i !== (array.length - 1)) // remote last empty entry
        .map(s => s.startsWith('Correct result: ') ? s.slice(16) : s)
        ,
    }));

  // console.dir(testFixtures, { depth: null });
  const results = testFixtures.map(fixture =>
    fixture.cases.map((c/*ase*/, index) => {
      const observed = test(tokenize, { parse, prettyprint }, c, fixture.expectedOutcomes[index]);
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
    console.error(`${result.inputFile}(${result.testNumber}): expected: >${result.expected}< observed: >${result.observed}<`);
  });

  if (results.length > 0) {
    console.log(`${results.length} / ${testFixtures.map(f => f.cases).flat().length} failures`);
  }

  return results.length;
}

if (process.argv.length !== 5) {
  console.log('missing parameters');
  console.log('usage: ./test-datum.js <list-file> ../lexer.js ../<parser.js>');
  console.log('<list-file> must contain a list of test parser files (https://eecs490.github.io/project-scheme-parser/)');
  process.exit(1);
}

process.exit(main(process.argv[2], process.argv[3], process.argv[4]));
