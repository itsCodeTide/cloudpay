package com.cloudpay.domain.model;

import com.cloudpay.domain.exception.DomainException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class BankAccount {

    private UUID id;
    private UUID userId;
    private String accountNumber;
    private String ifscCode;
    private String bankName;
    private String accountHolderName;
    private String upiId;
    private String upiName;
    private String upiNumber;
    private BigDecimal balance;
    private boolean primary;
    private Instant createdAt;

    public BankAccount() {
    }

    public BankAccount(UUID id, UUID userId, String accountNumber, String ifscCode, String bankName,
                       String accountHolderName, BigDecimal balance, boolean primary, Instant createdAt) {
        this.id = id;
        this.userId = userId;
        this.accountNumber = accountNumber;
        this.ifscCode = ifscCode;
        this.bankName = bankName;
        this.accountHolderName = accountHolderName;
        this.balance = balance;
        this.primary = primary;
        this.createdAt = createdAt;
    }

    public BankAccount(UUID id, UUID userId, String accountNumber, String ifscCode, String bankName,
                       String accountHolderName, String upiId, String upiName, String upiNumber,
                       BigDecimal balance, boolean primary, Instant createdAt) {
        this(id, userId, accountNumber, ifscCode, bankName, accountHolderName, balance, primary, createdAt);
        this.upiId = upiId; this.upiName = upiName; this.upiNumber = upiNumber;
    }

    public static BankAccount createNew(UUID userId, String accountNumber, String ifscCode,
                                        String bankName, String accountHolderName, boolean primary) {
        return new BankAccount(
                null,
                userId,
                accountNumber,
                ifscCode,
                bankName,
                accountHolderName,
                BigDecimal.ZERO,
                primary,
                Instant.now()
        );
    }

    public boolean hasSufficientBalance(BigDecimal amount) {
        return balance.compareTo(amount) >= 0;
    }

    public void debit(BigDecimal amount) {
        if (!hasSufficientBalance(amount)) {
            throw new DomainException("Insufficient balance");
        }
        balance = balance.subtract(amount);
    }

    public void credit(BigDecimal amount) {
        balance = balance.add(amount);
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public String getIfscCode() {
        return ifscCode;
    }

    public void setIfscCode(String ifscCode) {
        this.ifscCode = ifscCode;
    }

    public String getBankName() {
        return bankName;
    }

    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    public String getAccountHolderName() {
        return accountHolderName;
    }

    public String getUpiId() { return upiId; }
    public void setUpiId(String upiId) { this.upiId = upiId; }
    public String getUpiName() { return upiName; }
    public void setUpiName(String upiName) { this.upiName = upiName; }
    public String getUpiNumber() { return upiNumber; }
    public void setUpiNumber(String upiNumber) { this.upiNumber = upiNumber; }

    public void setAccountHolderName(String accountHolderName) {
        this.accountHolderName = accountHolderName;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }

    public boolean isPrimary() {
        return primary;
    }

    public void setPrimary(boolean primary) {
        this.primary = primary;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
