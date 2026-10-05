package com.cloudpay.infrastructure.persistence.mapper;

import com.cloudpay.domain.model.User;
import com.cloudpay.infrastructure.persistence.entity.UserEntity;
import org.springframework.stereotype.Component;

@Component
public class UserPersistenceMapper {
    public User toDomain(UserEntity e) {
        return e == null ? null : new User(e.getId(), e.getEmail(), e.getPasswordHash(), e.getTransactionPinHash(), e.getFullName(), e.getPhone(), e.getUpiId(), e.getRole(), e.isKycVerified(), e.getCreatedAt(), e.getUpdatedAt());
    }
    public UserEntity toEntity(User d) {
        UserEntity e = new UserEntity();
        e.setId(d.getId()); e.setEmail(d.getEmail()); e.setPasswordHash(d.getPasswordHash()); e.setTransactionPinHash(d.getTransactionPinHash()); e.setFullName(d.getFullName()); e.setPhone(d.getPhone()); e.setUpiId(d.getUpiId()); e.setRole(d.getRole()); e.setKycVerified(d.isKycVerified()); e.setCreatedAt(d.getCreatedAt()); e.setUpdatedAt(d.getUpdatedAt());
        return e;
    }
}
