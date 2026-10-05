package com.cloudpay.infrastructure.persistence.adapter;

import com.cloudpay.domain.exception.ResourceNotFoundException;
import com.cloudpay.domain.model.BankAccount;
import com.cloudpay.domain.repository.BankAccountRepository;
import com.cloudpay.infrastructure.persistence.entity.UserEntity;
import com.cloudpay.infrastructure.persistence.mapper.BankAccountPersistenceMapper;
import com.cloudpay.infrastructure.persistence.repository.BankAccountJpaRepository;
import com.cloudpay.infrastructure.persistence.repository.UserJpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class BankAccountRepositoryAdapter implements BankAccountRepository {

    private final BankAccountJpaRepository jpaRepository;
    private final UserJpaRepository userJpaRepository;
    private final BankAccountPersistenceMapper mapper;

    public BankAccountRepositoryAdapter(
            BankAccountJpaRepository jpaRepository,
            UserJpaRepository userJpaRepository,
            BankAccountPersistenceMapper mapper) {
        this.jpaRepository = jpaRepository;
        this.userJpaRepository = userJpaRepository;
        this.mapper = mapper;
    }

    @Override
    public BankAccount save(BankAccount bankAccount) {
        UserEntity user = userJpaRepository.findById(bankAccount.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", bankAccount.getUserId()));
        return mapper.toDomain(jpaRepository.save(mapper.toEntity(bankAccount, user)));
    }

    @Override
    public Optional<BankAccount> findById(UUID id) {
        return jpaRepository.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<BankAccount> findByIdAndUserId(UUID id, UUID userId) {
        return jpaRepository.findByIdAndUser_Id(id, userId).map(mapper::toDomain);
    }

    @Override public Optional<BankAccount> findByUpiId(String upiId) { return jpaRepository.findByUpiIdIgnoreCase(upiId).map(mapper::toDomain); }
    @Override public boolean existsByUpiId(String upiId) { return jpaRepository.existsByUpiIdIgnoreCase(upiId); }
    @Override public void delete(BankAccount bankAccount) { jpaRepository.deleteById(bankAccount.getId()); }

    @Override
    public List<BankAccount> findByUserId(UUID userId) {
        return jpaRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public Optional<BankAccount> findPrimaryByUserId(UUID userId) {
        return jpaRepository.findByUser_IdAndPrimaryAccountTrue(userId).map(mapper::toDomain);
    }

    @Override
    public long countByUserId(UUID userId) {
        return jpaRepository.countByUser_Id(userId);
    }

    @Override
    @Transactional
    public void clearPrimaryForUser(UUID userId) {
        jpaRepository.clearPrimaryForUser(userId);
    }
}
