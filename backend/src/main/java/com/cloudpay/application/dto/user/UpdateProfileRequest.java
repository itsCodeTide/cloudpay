package com.cloudpay.application.dto.user;
import jakarta.validation.constraints.*;
public record UpdateProfileRequest(@NotBlank @Size(max=150) String fullName,@NotBlank @Pattern(regexp="^[+]?[0-9 ()-]{8,20}$") String phone) {}
