package com.cloudpay.application.dto.admin;
import java.math.BigDecimal;
public record AdminDashboardResponse(long totalUsers,long totalTransactions,long successfulTransactions,long failedTransactions,BigDecimal totalVolume) {}
