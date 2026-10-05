package com.cloudpay.infrastructure.persistence.repository;

import com.cloudpay.domain.enums.TransactionStatus;
import com.cloudpay.infrastructure.persistence.entity.TransactionEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransactionJpaRepository extends JpaRepository<TransactionEntity, UUID> {

    Optional<TransactionEntity> findByTransactionRef(String transactionRef);

    @Query("""
            SELECT t FROM TransactionEntity t
            WHERE t.sender.id = :userId OR t.receiver.id = :userId
            ORDER BY t.createdAt DESC
            """)
    List<TransactionEntity> findByUserId(@Param("userId") UUID userId, Pageable pageable);

    @Query("""
            SELECT COUNT(t) FROM TransactionEntity t
            WHERE t.sender.id = :userId OR t.receiver.id = :userId
            """)
    long countByUserId(@Param("userId") UUID userId);

    long countByStatus(TransactionStatus status);

    List<TransactionEntity> findByCreatedAtAfterOrderByCreatedAtDesc(Instant since);

    @Query("""
            SELECT COALESCE(SUM(t.amount), 0) FROM TransactionEntity t
            WHERE t.status = com.cloudpay.domain.enums.TransactionStatus.SUCCESS
            AND t.createdAt >= :since
            """)
    BigDecimal sumSuccessfulAmountSince(@Param("since") Instant since);
}
