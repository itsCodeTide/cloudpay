package com.cloudpay.infrastructure.persistence.mapper;

import com.cloudpay.domain.model.Transaction;
import com.cloudpay.infrastructure.persistence.entity.TransactionEntity;
import com.cloudpay.infrastructure.persistence.entity.UserEntity;
import org.springframework.stereotype.Component;

@Component
public class TransactionPersistenceMapper {

    public Transaction toDomain(TransactionEntity entity) {
        if (entity == null) {
            return null;
        }
        return new Transaction(
                entity.getId(),
                entity.getTransactionRef(),
                entity.getSender().getId(),
                entity.getReceiver().getId(),
                entity.getSenderUpiId(),
                entity.getReceiverUpiId(),
                entity.getAmount(),
                entity.getRemark(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getCompletedAt()
        );
    }

    public TransactionEntity toEntity(Transaction domain, UserEntity sender, UserEntity receiver) {
        if (domain == null) {
            return null;
        }
        TransactionEntity entity = new TransactionEntity();
        entity.setId(domain.getId());
        entity.setTransactionRef(domain.getTransactionRef());
        entity.setSender(sender);
        entity.setReceiver(receiver);
        entity.setSenderUpiId(domain.getSenderUpiId());
        entity.setReceiverUpiId(domain.getReceiverUpiId());
        entity.setAmount(domain.getAmount());
        entity.setRemark(domain.getRemark());
        entity.setStatus(domain.getStatus());
        entity.setCreatedAt(domain.getCreatedAt());
        entity.setCompletedAt(domain.getCompletedAt());
        return entity;
    }
}
