package com.cloudpay.application.dto.qr;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
public record PayQrRequest(@NotBlank String payload,@NotNull @DecimalMin("0.01") @Digits(integer=13,fraction=2) BigDecimal amount,@Size(max=255) String remark) {}
