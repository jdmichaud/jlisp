; Distribution code for Scheme lexer and parser.

; Remove all characters from standard input up to and including the
; next newline.
(define (clear-line)
  (let ((next-char (read-char)))
    (if (not (or (eof-object? next-char) (char=? next-char #\newline)))
        (clear-line)
    )
  )
)

; Abort lexing or parsing and print out the given error message.
(define (error message)
  (error-cont message)
)

(define error-continuation
  (let ((message (call-with-current-continuation (lambda (c) c))))
    (if (string? message)
        (begin (display "Error: ")
               (display message)
               (newline)
               (clear-line)
        )
    )
    message
  )
)

(define error-cont error-continuation)

; Read a single non-eof character from standard input. Aborts and
; prints out an error message if eof is read.
(define (get-non-eof-char)
  (let ((char (read-char)))
    (if (eof-object? char)
        (error "end of file")
        char
    )
  )
)

; Determines if the given character is whitespace (i.e. a space or
; newline).
(define (whitespace? char)
  (or (char=? char #\space) (char=? char #\newline))
)

; Determines if the given character is a delimiter (i.e. whitespace,
; eof, parentheses, double quote, or semicolon).
(define (delimiter? char)
  (or (eof-object? char)
      (whitespace? char)
      (char=? char #\() (char=? char #\))
      (char=? char #\") (char=? char #\;)
  )
)

; Reads a single character from standard input. If the character read
; does not match expect, then lexing is aborted and error-message
; printed out.
(define (read-start expect error-message)
  (let ((first-char (get-non-eof-char)))
    (if (char=? first-char expect)
        #t
        (error error-message)
    )
  )
)

; token ADT

; Constructs a token of the given type with the given value.
(define (token-make type value)
  (list type value)
)

; Retrieves the type of the given token.
(define (token-type token)
  (car token)
)

; Retrieves the data value of the given token.
(define (token-data token)
  (cadr token)
)
