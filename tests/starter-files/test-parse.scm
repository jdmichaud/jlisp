; Parses all of standard input and writes out the datums to standard
; input, one per line.

(load "parser.scm")

(define (parse-all-datums)
  (let ((datum (read-datum)))
    (if (not (eof-object? datum))
        (begin (write datum)
               (newline)
               (parse-all-datums)
        )
    )
  )
)

(parse-all-datums)
