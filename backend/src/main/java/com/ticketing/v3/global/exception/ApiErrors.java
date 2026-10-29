package com.ticketing.v3.global.exception;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
@RestControllerAdvice
public class ApiErrors {
 public record Error(String code,String message) {}
 @ExceptionHandler(Exception.class)
 public ResponseEntity<Error> unexpected(Exception ignored) {
  return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new Error("INTERNAL_ERROR","An internal error occurred"));
 }
}
