#!/usr/bin/env node
const readline = require('readline');

function main(lexerPath, readable) {
  const lexer = require(lexerPath);

  const rl = readline.createInterface({
    input: readable,
    output: process.stdout,
    terminal: false,
  });

  let input = '';
  rl.on('line', function (line) {
    input = `${input}${line}\n`;
  });

  rl.on('close', function () {
    // once end of file, parse and dump
    const tokens = lexer.tokenize(input);
    const postProcessedTokens = tokens.map(({ type, value }) =>
      (type === 'string' || type === 'punctuator')
        ? `(${type} "${value}")`
        : `(${type} ${value})`
    );

    // tokens.forEach(token => console.log(token));

    for (let token of postProcessedTokens) {
      console.log(token);
    }
  });
}

if (process.argv.length !== 3) {
  console.log('missing parameters');
  console.log('usage: ./test-tokenize.js ../<lexer.js>');
  process.exit(1);
}

main(process.argv[2], process.stdin);

