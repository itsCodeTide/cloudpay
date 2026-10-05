package com.cloudpay.application.service;

import com.cloudpay.application.dto.banking.*;
import com.cloudpay.domain.model.BankAccount;
import com.cloudpay.domain.repository.BankAccountRepository;
import com.cloudpay.infrastructure.config.CloudPayProperties;
import com.cloudpay.domain.exception.DomainException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.*;

@Service
public class BankAccountService {
    private final BankAccountRepository accounts; private final UserService users; private final CloudPayProperties properties;
    public BankAccountService(BankAccountRepository accounts, UserService users, CloudPayProperties properties) { this.accounts=accounts; this.users=users; this.properties=properties; }
    @Transactional public BankAccountResponse add(UUID userId, AddBankAccountRequest r) {
        users.require(userId); boolean primary=r.primary() || accounts.countByUserId(userId)==0;
        if(primary) accounts.clearPrimaryForUser(userId);
        String accountNumber = r.accountNumber().trim();
        String upiName = r.upiName() == null || r.upiName().isBlank() ? r.accountHolderName().trim() : r.upiName().trim();
        String upiNumber = r.upiNumber() == null || r.upiNumber().isBlank() ? null : r.upiNumber().trim();
        BankAccount a=BankAccount.createNew(userId,accountNumber,r.ifscCode().toUpperCase(Locale.ROOT),r.bankName().trim(),r.accountHolderName().trim(),primary);
        a.setUpiName(upiName); a.setUpiNumber(upiNumber); a.setUpiId(generateUpiId(upiName, accountNumber));
        a = accounts.save(a);
        return map(a);
    }
    public List<BankAccountResponse> list(UUID userId) { users.require(userId); return accounts.findByUserId(userId).stream().map(this::map).toList(); }
    @Transactional(readOnly=true) public BalanceResponse balance(UUID userId) { users.require(userId); return new BalanceResponse(accounts.findPrimaryByUserId(userId).map(BankAccount::getBalance).orElse(BigDecimal.ZERO),"INR"); }
    @Transactional public BankAccountResponse setPrimary(UUID userId, UUID accountId) {
        BankAccount account = accounts.findByIdAndUserId(accountId, userId).orElseThrow(() -> new DomainException("Bank account not found"));
        accounts.clearPrimaryForUser(userId); account.setPrimary(true); return map(accounts.save(account));
    }
    @Transactional public void remove(UUID userId, UUID accountId) {
        BankAccount account = accounts.findByIdAndUserId(accountId, userId).orElseThrow(() -> new DomainException("Bank account not found"));
        if (account.isPrimary() && accounts.countByUserId(userId) > 1) throw new DomainException("Choose another primary account before removing this account");
        accounts.delete(account);
    }
    private String generateUpiId(String name, String accountNumber) {
        String base = name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", ""); if (base.isBlank()) base = "user";
        String handle = properties.getUpiHandle(); if (!handle.startsWith("@")) handle = "@" + handle;
        String suffix = accountNumber.substring(Math.max(0, accountNumber.length() - 4));
        String candidate = base + suffix + handle; int index = 1;
        while (accounts.existsByUpiId(candidate)) candidate = base + suffix + index++ + handle;
        return candidate;
    }
    private BankAccountResponse map(BankAccount a) { return new BankAccountResponse(a.getId(),a.getUserId(),mask(a.getAccountNumber()),a.getIfscCode(),a.getBankName(),a.getAccountHolderName(),a.getUpiId(),a.getUpiName(),a.getUpiNumber(),a.getBalance(),a.isPrimary(),a.getCreatedAt()); }
    private String mask(String n) { return n.length()<=4?n:"*".repeat(n.length()-4)+n.substring(n.length()-4); }
}
