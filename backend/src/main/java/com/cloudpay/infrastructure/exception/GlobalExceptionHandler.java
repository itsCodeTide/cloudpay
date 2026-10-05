package com.cloudpay.infrastructure.exception;
import com.cloudpay.domain.exception.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import java.time.Instant;
import java.util.stream.Collectors;
@RestControllerAdvice public class GlobalExceptionHandler {
 @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<ApiError> validation(MethodArgumentNotValidException e,HttpServletRequest r){String msg=e.getBindingResult().getFieldErrors().stream().map(x->x.getField()+": "+x.getDefaultMessage()).collect(Collectors.joining(", "));return error(HttpStatus.BAD_REQUEST,msg,r);}
 @ExceptionHandler({ResourceNotFoundException.class}) ResponseEntity<ApiError> notFound(ResourceNotFoundException e,HttpServletRequest r){return error(HttpStatus.NOT_FOUND,e.getMessage(),r);}
 @ExceptionHandler(DuplicateResourceException.class) ResponseEntity<ApiError> duplicate(DuplicateResourceException e,HttpServletRequest r){return error(HttpStatus.CONFLICT,e.getMessage(),r);}
 @ExceptionHandler({DomainException.class,ConstraintViolationException.class}) ResponseEntity<ApiError> domain(RuntimeException e,HttpServletRequest r){return error(HttpStatus.BAD_REQUEST,e.getMessage(),r);}
 @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<ApiError> integrity(DataIntegrityViolationException e,HttpServletRequest r){return error(HttpStatus.CONFLICT,"Resource conflicts with an existing record",r);}
 @ExceptionHandler(AccessDeniedException.class) ResponseEntity<ApiError> denied(AccessDeniedException e,HttpServletRequest r){return error(HttpStatus.FORBIDDEN,e.getMessage(),r);}
 @ExceptionHandler(MethodArgumentTypeMismatchException.class) ResponseEntity<ApiError> mismatch(Exception e,HttpServletRequest r){return error(HttpStatus.BAD_REQUEST,"Invalid request parameter",r);}
 @ExceptionHandler(Exception.class) ResponseEntity<ApiError> other(Exception e,HttpServletRequest r){return error(HttpStatus.INTERNAL_SERVER_ERROR,"Unexpected server error",r);}
 private ResponseEntity<ApiError> error(HttpStatus s,String m,HttpServletRequest r){return ResponseEntity.status(s).body(new ApiError(Instant.now(),s.value(),s.getReasonPhrase(),m,r.getRequestURI()));}
}
