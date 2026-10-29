package com.ticketing.v3.global.exception;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.dao.DataIntegrityViolationException;
@RestControllerAdvice
public class ApiErrors {
 public record Error(String code,String message) {}
 @ExceptionHandler(ApiException.class) ResponseEntity<Error> expected(ApiException e){return ResponseEntity.status(e.status).body(new Error(e.code,e.getMessage()));}
 @ExceptionHandler({org.springframework.http.converter.HttpMessageNotReadableException.class,org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,org.springframework.web.bind.MissingRequestHeaderException.class}) ResponseEntity<Error> invalid(Exception e){return ResponseEntity.badRequest().body(new Error("INVALID_REQUEST","Invalid request"));}
 @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<Error> integrity(Exception e){return ResponseEntity.status(409).body(new Error("CONFLICT","Operation conflicts with existing data"));}
 @ExceptionHandler(Exception.class) public ResponseEntity<Error> unexpected(Exception ignored){return ResponseEntity.status(500).body(new Error("INTERNAL_ERROR","An internal error occurred"));}
}
