; Read-eval-print loop that uses read-datum for parsing input.

(load "parser.scm")

(define (read-eval-print-loop env)
  (display "scm> ")
  (flush-output)     ; non-standard plt-r5rs procedure
  (let ((datum (read-datum)))               ; read
    (if (not (eof-object? datum))
        (let ((result (eval datum env)))    ; eval
          (if (printable? result)
              (begin (write result)         ; print
                     (newline)
              )
          )
          (read-eval-print-loop env)
        )
        (newline)
    )
  )
)

(define (printable? obj)
  (or (boolean? obj)
      (pair? obj)
      (symbol? obj)
      (number? obj)
      (char? obj)
      (string? obj)
      (vector? obj)
      (input-port? obj)
      (output-port? obj)
      (procedure? obj)
      (null? obj)
  )
)

(read-eval-print-loop (interaction-environment))
