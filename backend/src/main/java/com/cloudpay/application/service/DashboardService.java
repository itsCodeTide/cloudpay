package com.cloudpay.application.service;
import com.cloudpay.application.dto.admin.DashboardResponse;
import com.cloudpay.domain.enums.TransactionStatus;
import com.cloudpay.domain.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;
@Service public class DashboardService {
 private final BankAccountService accounts; private final TransactionRepository transactions; private final NotificationService notifications;
 public DashboardService(BankAccountService accounts,TransactionRepository transactions,NotificationService notifications){this.accounts=accounts;this.transactions=transactions;this.notifications=notifications;}
 public DashboardResponse dashboard(UUID userId){Instant since=YearMonth.now().atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();var month=transactions.findByUserId(userId,0,1000);BigDecimal sent=month.stream().filter(t->t.getSenderId().equals(userId)&&t.getStatus()==TransactionStatus.SUCCESS&&t.getCreatedAt().isAfter(since)).map(t->t.getAmount()).reduce(BigDecimal.ZERO,BigDecimal::add);BigDecimal received=month.stream().filter(t->t.getReceiverId().equals(userId)&&t.getStatus()==TransactionStatus.SUCCESS&&t.getCreatedAt().isAfter(since)).map(t->t.getAmount()).reduce(BigDecimal.ZERO,BigDecimal::add);return new DashboardResponse(accounts.balance(userId).balance(),sent,received,transactions.countByUserId(userId),notifications.unread(userId));}
}
