#!/usr/bin/env node
const fs = require('fs');
const util = require('util');
const readline = require('readline');
const lexer = require('../lexer.js');
const { parse, prettyprint } = require('../parser.js');

function isSubset(superObj, subObj) {
  return Object.keys(subObj).every(ele => {
    if (typeof subObj[ele] === 'object') {
      return isSubset(superObj[ele], subObj[ele]);
    }
    return subObj[ele] === superObj[ele]
  });
};

function test(fixture) {
  let observed;
  try {
    observed = parse(lexer.tokenize(fixture.input));
    // console.log('observed', util.inspect(observed, { depth: null }));
    if (observed === undefined) {
      return observed;
    } else if (fixture.expected.Error !== undefined) {
      if (!(observed instanceof Error)) {
        return observed;
      }
    } else if (!isSubset(observed, fixture.expected)) {
      return observed;
    }
    return true;
  } catch (e) {
    console.log(`testing ${util.inspect(fixture, { depth: null })}, observed: ${util.inspect(observed, { depth: null })}`);
    throw e;
  }
}

function main(listFile) {
  const testFixtures = fs.readFileSync(listFile)
    .toString()
    .split('\n')
    .filter(s => s.length > 0 && s.match(/^\s*#/) === null)
    .map(inputFile => ({
      inputFile,
      expectFile: `${inputFile.split('.')[0]}.expect`,
    }))
    .map(({ inputFile, expectFile }) => ({
      inputFile,
      expectFile,
      input: fs.readFileSync(inputFile).toString(),
      expected: JSON.parse(fs.readFileSync(expectFile).toString()),
    }))
  ;

  const results = testFixtures
    .map((fixture, testNumber) => {
      const observed = test(fixture);
      if (observed !== true) {
        return {
          fixture,
          testNumber,
          observed,
        };
      }
    })
    .filter(x => x !== undefined)
  ;

  results.forEach(result => {
    console.log(`${result.fixture.inputFile}(${result.testNumber}):
      expected: >${util.inspect(result.fixture.expected, { depth: null })}<
      observed: >${util.inspect(result.observed, { depth: null })}<`);
  });

  if (results.length > 0) {
    console.error(`${results.length} / ${testFixtures.map(f => f.cases).flat().length} failures`);
  }

  return results.length;
}

if (process.argv.length !== 3) {
  console.log('missing parameters');
  console.log('usage: ./test-custom-parse.js test-files');
  process.exit(1);
}

main(process.argv[2]);
