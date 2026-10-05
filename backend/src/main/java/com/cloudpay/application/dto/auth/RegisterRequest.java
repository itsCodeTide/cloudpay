package com.cloudpay.application.dto.auth;
import jakarta.validation.constraints.*;
public record RegisterRequest(@NotBlank @Email String email, @NotBlank @Size(min=8,max=72) String password, @NotBlank @Size(max=150) String fullName, @NotBlank @Pattern(regexp="^[+]?[0-9 ()-]{8,20}$") String phone) {}
