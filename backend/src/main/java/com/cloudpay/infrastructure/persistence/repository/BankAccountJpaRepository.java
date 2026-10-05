package com.cloudpay.infrastructure.persistence.repository;

import com.cloudpay.infrastructure.persistence.entity.BankAccountEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface BankAccountJpaRepository extends JpaRepository<BankAccountEntity, UUID> {
    List<BankAccountEntity> findByUser_IdOrderByCreatedAtDesc(UUID userId);
    Optional<BankAccountEntity> findByIdAndUser_Id(UUID id, UUID userId);
    Optional<BankAccountEntity> findByUpiIdIgnoreCase(String upiId);
    boolean existsByUpiIdIgnoreCase(String upiId);
    @Lock(LockModeType.PESSIMISTIC_WRITE) Optional<BankAccountEntity> findByUser_IdAndPrimaryAccountTrue(UUID userId);
    long countByUser_Id(UUID userId);
    @Modifying @Query("update BankAccountEntity b set b.primaryAccount = false where b.user.id = :userId")
    void clearPrimaryForUser(@Param("userId") UUID userId);
}
