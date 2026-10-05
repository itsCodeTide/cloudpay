package com.cloudpay.application.dto.banking;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
public record BankAccountResponse(UUID id,UUID userId,String accountNumber,String ifscCode,String bankName,String accountHolderName,String upiId,String upiName,String upiNumber,BigDecimal balance,boolean primary,Instant createdAt) {}
