package com.cloudpay.infrastructure.persistence.mapper;

import com.cloudpay.domain.model.BankAccount;
import com.cloudpay.infrastructure.persistence.entity.BankAccountEntity;
import com.cloudpay.infrastructure.persistence.entity.UserEntity;
import org.springframework.stereotype.Component;

@Component
public class BankAccountPersistenceMapper {

    public BankAccount toDomain(BankAccountEntity entity) {
        if (entity == null) {
            return null;
        }
        return new BankAccount(
                entity.getId(),
                entity.getUser().getId(),
                entity.getAccountNumber(),
                entity.getIfscCode(),
                entity.getBankName(),
                entity.getAccountHolderName(),
                entity.getUpiId(),
                entity.getUpiName(),
                entity.getUpiNumber(),
                entity.getBalance(),
                entity.isPrimaryAccount(),
                entity.getCreatedAt()
        );
    }

    public BankAccountEntity toEntity(BankAccount domain, UserEntity user) {
        if (domain == null) {
            return null;
        }
        BankAccountEntity entity = new BankAccountEntity();
        entity.setId(domain.getId());
        entity.setUser(user);
        entity.setAccountNumber(domain.getAccountNumber());
        entity.setIfscCode(domain.getIfscCode());
        entity.setBankName(domain.getBankName());
        entity.setAccountHolderName(domain.getAccountHolderName());
        entity.setUpiId(domain.getUpiId());
        entity.setUpiName(domain.getUpiName());
        entity.setUpiNumber(domain.getUpiNumber());
        entity.setBalance(domain.getBalance());
        entity.setPrimaryAccount(domain.isPrimary());
        entity.setCreatedAt(domain.getCreatedAt());
        return entity;
    }
}
