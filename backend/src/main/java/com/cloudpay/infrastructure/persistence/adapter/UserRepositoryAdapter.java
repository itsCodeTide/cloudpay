package com.cloudpay.infrastructure.persistence.adapter;

import com.cloudpay.domain.model.User;
import com.cloudpay.domain.repository.UserRepository;
import com.cloudpay.infrastructure.persistence.mapper.UserPersistenceMapper;
import com.cloudpay.infrastructure.persistence.repository.UserJpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class UserRepositoryAdapter implements UserRepository {
    private final UserJpaRepository repo;
    private final UserPersistenceMapper mapper;
    public UserRepositoryAdapter(UserJpaRepository repo, UserPersistenceMapper mapper) { this.repo = repo; this.mapper = mapper; }
    public User save(User user) { return mapper.toDomain(repo.save(mapper.toEntity(user))); }
    public Optional<User> findById(UUID id) { return repo.findById(id).map(mapper::toDomain); }
    public Optional<User> findByEmail(String email) { return repo.findByEmailIgnoreCase(email).map(mapper::toDomain); }
    public Optional<User> findByUpiId(String upiId) { return repo.findByUpiIdIgnoreCase(upiId).map(mapper::toDomain); }
    public boolean existsByEmail(String email) { return repo.existsByEmailIgnoreCase(email); }
    public boolean existsByPhone(String phone) { return repo.existsByPhone(phone); }
    public boolean existsByUpiId(String upiId) { return repo.existsByUpiIdIgnoreCase(upiId); }
    public long countAll() { return repo.count(); }
}
