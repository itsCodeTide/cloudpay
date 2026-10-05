package com.cloudpay.application.dto.payment;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;
public record SendMoneyRequest(
        @NotBlank String receiverUpiId,
        @NotNull @DecimalMin("0.01") @Digits(integer=13,fraction=2) BigDecimal amount,
        @Size(max=255) String remark,
        UUID sourceBankAccountId,
        @NotBlank @Pattern(regexp="\\d{4,6}", message="Transaction PIN must be 4 to 6 digits") String pin) {}
