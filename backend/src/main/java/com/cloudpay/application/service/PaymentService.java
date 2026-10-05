package com.cloudpay.application.service;

import com.cloudpay.application.dto.payment.*;
import com.cloudpay.domain.exception.*;
import com.cloudpay.domain.model.*;
import com.cloudpay.domain.repository.*;
import com.cloudpay.infrastructure.kafka.PaymentEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
public class PaymentService {
    private final UserRepository users;
    private final BankAccountRepository accounts;
    private final TransactionRepository transactions;
    private final NotificationService notifications;
    private final PaymentEventPublisher events;
    private final PasswordEncoder passwordEncoder;
    private final MeterRegistry meterRegistry;

    public PaymentService(UserRepository users, BankAccountRepository accounts, TransactionRepository transactions,
                          NotificationService notifications, PaymentEventPublisher events, PasswordEncoder passwordEncoder, MeterRegistry meterRegistry) {
        this.users = users;
        this.accounts = accounts;
        this.transactions = transactions;
        this.notifications = notifications;
        this.events = events;
        this.passwordEncoder = passwordEncoder;
        this.meterRegistry = meterRegistry;
    }

    @Transactional
    public TransactionResponse send(UUID senderId, SendMoneyRequest request) {
        User sender = users.findById(senderId).orElseThrow(() -> new ResourceNotFoundException("User", senderId));
        if (!sender.hasTransactionPin()) throw new DomainException("Set a transaction PIN before sending money");
        if (!passwordEncoder.matches(request.pin(), sender.getTransactionPinHash())) {
            meterRegistry.counter("cloudpay.transfer.attempts", "status", "pin_failed").increment();
            throw new DomainException("Incorrect transaction PIN");
        }
        BankAccount source = request.sourceBankAccountId() == null
                ? accounts.findPrimaryByUserId(senderId).orElseThrow(() -> new DomainException("Select or add a bank account before sending money"))
                : accounts.findByIdAndUserId(request.sourceBankAccountId(), senderId).orElseThrow(() -> new DomainException("Selected bank account was not found"));
        return transfer(senderId, request.receiverUpiId(), request.amount(), request.remark(), source);
    }

    @Transactional
    public TransactionResponse receive(UUID receiverId, ReceiveMoneyRequest request) {
        User source = users.findByUpiId(request.senderUpiId()).orElseThrow(() -> new ResourceNotFoundException("Sender UPI ID", request.senderUpiId()));
        User receiver = users.findById(receiverId).orElseThrow(() -> new ResourceNotFoundException("User", receiverId));
        if (!receiver.hasUpiId()) throw new DomainException("Generate a UPI ID before receiving money");
        return transfer(source.getId(), receiver.getUpiId(), request.amount(), request.remark(), null);
    }

    @Transactional
    public TransactionResponse transfer(UUID senderId, String receiverUpiId, BigDecimal amount, String remark, BankAccount selectedSource) {
        User sender = users.findById(senderId).orElseThrow(() -> new ResourceNotFoundException("User", senderId));
        BankAccount selectedReceiver = accounts.findByUpiId(receiverUpiId).orElse(null);
        User receiver = selectedReceiver == null
                ? users.findByUpiId(receiverUpiId).orElseThrow(() -> new ResourceNotFoundException("Receiver UPI ID", receiverUpiId))
                : users.findById(selectedReceiver.getUserId()).orElseThrow(() -> new ResourceNotFoundException("Receiver", selectedReceiver.getUserId()));
        if (senderId.equals(receiver.getId())) throw new DomainException("Sender and receiver must be different");

        BankAccount from = selectedSource != null ? selectedSource : accounts.findPrimaryByUserId(senderId).orElseThrow(() -> new DomainException("Sender has no primary bank account"));
        BankAccount to = selectedReceiver != null ? selectedReceiver : accounts.findPrimaryByUserId(receiver.getId()).orElseThrow(() -> new DomainException("Receiver has no primary bank account"));
        if (!from.hasSufficientBalance(amount)) throw new DomainException("Insufficient balance");
        from.debit(amount);
        to.credit(amount);
        accounts.save(from);
        accounts.save(to);

        String senderUpi = from.getUpiId() != null ? from.getUpiId() : sender.getUpiId();
        String receiverUpi = to.getUpiId() != null ? to.getUpiId() : receiver.getUpiId();
        Transaction tx = Transaction.createPending(ref(), senderId, receiver.getId(), senderUpi, receiverUpi, amount, remark);
        tx.markSuccess();
        Transaction saved = transactions.save(tx);
        notifications.create(senderId, "Payment sent", "You sent money to " + receiverUpi, "PAYMENT_SENT");
        notifications.create(receiver.getId(), "Payment received", "You received money from " + senderUpi, "PAYMENT_RECEIVED");
        events.publishCompleted(saved);
        meterRegistry.counter("cloudpay.transfer.attempts", "status", "success").increment();
        meterRegistry.counter("cloudpay.transfer.amount", "currency", "INR").increment(amount.doubleValue());
        return map(saved);
    }

    public PageResponse<TransactionResponse> history(UUID userId, int page, int size) {
        int safePage = Math.max(page, 0), safeSize = Math.min(Math.max(size, 1), 100);
        var content = transactions.findByUserId(userId, safePage, safeSize).stream().map(this::map).toList();
        long total = transactions.countByUserId(userId);
        return new PageResponse<>(content, safePage, safeSize, total, (int) Math.ceil((double) total / safeSize));
    }

    public TransactionResponse get(UUID userId, UUID id) {
        Transaction transaction = transactions.findById(id).orElseThrow(() -> new ResourceNotFoundException("Transaction", id));
        if (!transaction.getSenderId().equals(userId) && !transaction.getReceiverId().equals(userId)) throw new org.springframework.security.access.AccessDeniedException("Transaction does not belong to the current user");
        return map(transaction);
    }

    private String ref() { return "CP-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase(Locale.ROOT); }
    private TransactionResponse map(Transaction transaction) { return new TransactionResponse(transaction.getId(), transaction.getTransactionRef(), transaction.getSenderId(), transaction.getReceiverId(), transaction.getSenderUpiId(), transaction.getReceiverUpiId(), transaction.getAmount(), transaction.getRemark(), transaction.getStatus(), transaction.getCreatedAt(), transaction.getCompletedAt()); }
}
