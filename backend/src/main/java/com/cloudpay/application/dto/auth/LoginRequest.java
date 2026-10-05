package com.cloudpay.application.dto.auth;
import jakarta.validation.constraints.*;
public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}
