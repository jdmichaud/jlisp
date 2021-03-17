; Parses simple data from standard input and checks that the result is
; equivalent to that from the built-in read function. Requires every
; datum to be repeated twice. The | character must appear after every
; datum pair.
; Example:
;   hello hello | +3.14 +3.14 |
;   "hello world" "hello world" | #t #t | #\a #\a |

(load "test-util.scm")

(parse-all read-simple-datum)
