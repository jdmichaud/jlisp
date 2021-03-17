const fs = require('fs');
const readline = require('readline');
const lexer = require('./lexer');
const parser = require('./parser');

function toString(readable) {
  return new Promise(resolve => {
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
      resolve(input);
    });
  });
}

async function main() {
  console.dir(parser.parse(lexer.tokenize(await toString(process.stdin))), { depth: null });
}

main();
