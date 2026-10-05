package com.cloudpay.infrastructure.web.controller;
import com.cloudpay.application.dto.auth.*;
import com.cloudpay.application.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/auth") public class AuthController {
 private final AuthService service;
 public AuthController(AuthService service){this.service=service;}
 @PostMapping("/register") public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest r){return ResponseEntity.status(HttpStatus.CREATED).body(service.register(r));}
 @PostMapping("/login") public AuthResponse login(@Valid @RequestBody LoginRequest r){return service.login(r);}
 @PostMapping("/refresh") public AuthResponse refresh(@Valid @RequestBody RefreshRequest r){return service.refresh(r);}
 @PostMapping("/sync") public AuthResponse sync(@AuthenticationPrincipal Jwt jwt){return service.sync(jwt);}
}
