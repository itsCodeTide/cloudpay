package com.cloudpay.domain.repository;

import com.cloudpay.domain.model.User;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository {

    User save(User user);

    Optional<User> findById(UUID id);

    Optional<User> findByEmail(String email);

    Optional<User> findByUpiId(String upiId);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    boolean existsByUpiId(String upiId);

    long countAll();
}
