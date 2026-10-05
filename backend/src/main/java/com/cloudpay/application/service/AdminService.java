package com.cloudpay.application.service;
import com.cloudpay.application.dto.admin.AdminDashboardResponse;
import com.cloudpay.domain.enums.TransactionStatus;
import com.cloudpay.domain.repository.*;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;
@Service public class AdminService {
 private final UserRepository users; private final TransactionRepository transactions;
 public AdminService(UserRepository users,TransactionRepository transactions){this.users=users;this.transactions=transactions;}
 public AdminDashboardResponse dashboard(UUID id){if(!users.findById(id).orElseThrow().isAdmin())throw new org.springframework.security.access.AccessDeniedException("Admin role required");return new AdminDashboardResponse(users.countAll(),transactions.countAll(),transactions.countByStatus(TransactionStatus.SUCCESS),transactions.countByStatus(TransactionStatus.FAILED),BigDecimal.valueOf(transactions.sumSuccessfulAmountSince(Instant.EPOCH)));}
}
