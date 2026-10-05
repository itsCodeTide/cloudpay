package com.cloudpay.application.dto.banking;
import jakarta.validation.constraints.*;
public record AddBankAccountRequest(@NotBlank @Size(max=30) String accountNumber,@NotBlank @Pattern(regexp="^[A-Za-z]{4}0[A-Za-z0-9]{6}$") String ifscCode,@NotBlank @Size(max=100) String bankName,@NotBlank @Size(max=150) String accountHolderName,@Size(max=150) String upiName,@Pattern(regexp="^$|^[0-9]{10,15}$", message="UPI number must contain 10 to 15 digits") String upiNumber,boolean primary) {}
