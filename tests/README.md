# Run the tests

```bash
cd tests
./test-token-types.js lexer-test-files ../lexer.js
diff <(./test-tokenize.js ../lexer.js < starter-files/distribution.scm) starter-files/distribution.tokens.expect
./test-datum.js parser-test-files ../lexer.js ../parser.js
diff <(./test-parse.js ../lexer.js ../parser.js < starter-files/distribution.scm) starter-files/distribution.datums.expect
./test-custom-parse.js parser-custom-test-files
```
