package com.cloudpay.application.dto.banking;
import java.math.BigDecimal;
public record BalanceResponse(BigDecimal balance,String currency) {}
