package com.cloudpay.domain.repository;

import com.cloudpay.domain.model.BankAccount;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BankAccountRepository {

    BankAccount save(BankAccount bankAccount);

    Optional<BankAccount> findById(UUID id);

    Optional<BankAccount> findByIdAndUserId(UUID id, UUID userId);

    List<BankAccount> findByUserId(UUID userId);

    Optional<BankAccount> findPrimaryByUserId(UUID userId);

    Optional<BankAccount> findByUpiId(String upiId);

    boolean existsByUpiId(String upiId);

    void delete(BankAccount bankAccount);

    long countByUserId(UUID userId);

    void clearPrimaryForUser(UUID userId);
}
