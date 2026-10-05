package com.cloudpay.domain.model;

import org.junit.jupiter.api.Test;
import com.cloudpay.domain.exception.DomainException;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BankAccountTest {

    @Test
    void hasSufficientBalance_returnsTrueWhenBalanceCoversAmount() {
        BankAccount account = BankAccount.createNew(
                UUID.randomUUID(), "1234567890", "HDFC0001234", "HDFC", "Alex Mehta", true);
        account.setBalance(new BigDecimal("1000.00"));

        assertTrue(account.hasSufficientBalance(new BigDecimal("500.00")));
    }

    @Test
    void debit_throwsWhenInsufficientBalance() {
        BankAccount account = BankAccount.createNew(
                UUID.randomUUID(), "1234567890", "HDFC0001234", "HDFC", "Alex Mehta", true);
        account.setBalance(new BigDecimal("100.00"));

        assertThrows(DomainException.class,
                () -> account.debit(new BigDecimal("500.00")));
    }

    @Test
    void debit_reducesBalance() {
        BankAccount account = BankAccount.createNew(
                UUID.randomUUID(), "1234567890", "HDFC0001234", "HDFC", "Alex Mehta", true);
        account.setBalance(new BigDecimal("1000.00"));

        account.debit(new BigDecimal("250.00"));

        assertFalse(account.hasSufficientBalance(new BigDecimal("800.00")));
        assertTrue(account.hasSufficientBalance(new BigDecimal("750.00")));
    }
}
