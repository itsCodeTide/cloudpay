package com.cloudpay.application.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record SetTransactionPinRequest(
        @NotBlank @Pattern(regexp = "\\d{4,6}", message = "PIN must be 4 to 6 digits") String pin,
        @NotBlank @Pattern(regexp = "\\d{4,6}", message = "PIN must be 4 to 6 digits") String confirmPin,
        @Pattern(regexp = "^(?:\\d{4,6})?$", message = "Current PIN must be 4 to 6 digits") String currentPin) {}
