package com.cloudpay.infrastructure.persistence.repository;

import com.cloudpay.infrastructure.persistence.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface UserJpaRepository extends JpaRepository<UserEntity, UUID> {
    Optional<UserEntity> findByEmailIgnoreCase(String email);
    Optional<UserEntity> findByUpiIdIgnoreCase(String upiId);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByPhone(String phone);
    boolean existsByUpiIdIgnoreCase(String upiId);
}
