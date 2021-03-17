#!/usr/bin/env node
const readline = require('readline');

function main(lexerPath, parserPath, readable) {
  const lexer = require(lexerPath);
  const { parse, prettyprint } = require(parserPath);

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
    console.log(parse(lexer.tokenize(input)).map(tree => prettyprint(tree)).join('\n'));
  });
}

if (process.argv.length !== 4) {
  console.log('missing parameters');
  console.log('usage: ./test-tokenize.js ../<lexer.js> ../<parser.js>');
  process.exit(1);
}

main(process.argv[2], process.argv[3], process.stdin);

