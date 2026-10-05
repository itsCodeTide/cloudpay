package com.cloudpay.infrastructure.persistence.adapter;

import com.cloudpay.domain.enums.TransactionStatus;
import com.cloudpay.domain.exception.ResourceNotFoundException;
import com.cloudpay.domain.model.Transaction;
import com.cloudpay.domain.repository.TransactionRepository;
import com.cloudpay.infrastructure.persistence.entity.UserEntity;
import com.cloudpay.infrastructure.persistence.mapper.TransactionPersistenceMapper;
import com.cloudpay.infrastructure.persistence.repository.TransactionJpaRepository;
import com.cloudpay.infrastructure.persistence.repository.UserJpaRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class TransactionRepositoryAdapter implements TransactionRepository {

    private final TransactionJpaRepository jpaRepository;
    private final UserJpaRepository userJpaRepository;
    private final TransactionPersistenceMapper mapper;

    public TransactionRepositoryAdapter(
            TransactionJpaRepository jpaRepository,
            UserJpaRepository userJpaRepository,
            TransactionPersistenceMapper mapper) {
        this.jpaRepository = jpaRepository;
        this.userJpaRepository = userJpaRepository;
        this.mapper = mapper;
    }

    @Override
    public Transaction save(Transaction transaction) {
        UserEntity sender = userJpaRepository.findById(transaction.getSenderId())
                .orElseThrow(() -> new ResourceNotFoundException("User", transaction.getSenderId()));
        UserEntity receiver = userJpaRepository.findById(transaction.getReceiverId())
                .orElseThrow(() -> new ResourceNotFoundException("User", transaction.getReceiverId()));
        return mapper.toDomain(jpaRepository.save(mapper.toEntity(transaction, sender, receiver)));
    }

    @Override
    public Optional<Transaction> findById(UUID id) {
        return jpaRepository.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<Transaction> findByTransactionRef(String transactionRef) {
        return jpaRepository.findByTransactionRef(transactionRef).map(mapper::toDomain);
    }

    @Override
    public List<Transaction> findByUserId(UUID userId, int page, int size) {
        return jpaRepository.findByUserId(userId, PageRequest.of(page, size)).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public long countByUserId(UUID userId) {
        return jpaRepository.countByUserId(userId);
    }

    @Override
    public long countByStatus(TransactionStatus status) {
        return jpaRepository.countByStatus(status);
    }

    @Override
    public long countAll() {
        return jpaRepository.count();
    }

    @Override
    public List<Transaction> findAllSince(Instant since) {
        return jpaRepository.findByCreatedAtAfterOrderByCreatedAtDesc(since).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public double sumSuccessfulAmountSince(Instant since) {
        return jpaRepository.sumSuccessfulAmountSince(since).doubleValue();
    }
}
