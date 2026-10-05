package com.cloudpay.application.dto.admin;
import java.math.BigDecimal;
public record DashboardResponse(BigDecimal availableBalance,BigDecimal monthlySpending,BigDecimal monthlyIncome,long totalTransactions,long unreadNotifications) {}
