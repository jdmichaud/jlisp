; Tokenizes all of standard input and writes out the tokens to
; standard input, one per line.

(load "lexer.scm")

(define (write-all lst)
  (if (not (null? lst))
      (begin (write (car lst))
             (newline)
             (write-all (cdr lst))
      )
  )
)

(write-all (tokenize))
