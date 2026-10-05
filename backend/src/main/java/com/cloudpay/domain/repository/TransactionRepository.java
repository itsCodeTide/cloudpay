package com.cloudpay.domain.repository;

import com.cloudpay.domain.enums.TransactionStatus;
import com.cloudpay.domain.model.Transaction;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository {

    Transaction save(Transaction transaction);

    Optional<Transaction> findById(UUID id);

    Optional<Transaction> findByTransactionRef(String transactionRef);

    List<Transaction> findByUserId(UUID userId, int page, int size);

    long countByUserId(UUID userId);

    long countByStatus(TransactionStatus status);

    long countAll();

    List<Transaction> findAllSince(Instant since);

    double sumSuccessfulAmountSince(Instant since);
}
