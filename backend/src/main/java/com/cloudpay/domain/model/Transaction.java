package com.cloudpay.domain.model;

import com.cloudpay.domain.enums.TransactionStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class Transaction {

    private UUID id;
    private String transactionRef;
    private UUID senderId;
    private UUID receiverId;
    private String senderUpiId;
    private String receiverUpiId;
    private BigDecimal amount;
    private String remark;
    private TransactionStatus status;
    private Instant createdAt;
    private Instant completedAt;

    public Transaction() {
    }

    public Transaction(UUID id, String transactionRef, UUID senderId, UUID receiverId,
                       String senderUpiId, String receiverUpiId, BigDecimal amount, String remark,
                       TransactionStatus status, Instant createdAt, Instant completedAt) {
        this.id = id;
        this.transactionRef = transactionRef;
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.senderUpiId = senderUpiId;
        this.receiverUpiId = receiverUpiId;
        this.amount = amount;
        this.remark = remark;
        this.status = status;
        this.createdAt = createdAt;
        this.completedAt = completedAt;
    }

    public static Transaction createPending(String transactionRef, UUID senderId, UUID receiverId,
                                            String senderUpiId, String receiverUpiId,
                                            BigDecimal amount, String remark) {
        return new Transaction(
                null,
                transactionRef,
                senderId,
                receiverId,
                senderUpiId,
                receiverUpiId,
                amount,
                remark,
                TransactionStatus.PENDING,
                Instant.now(),
                null
        );
    }

    public void markSuccess() {
        status = TransactionStatus.SUCCESS;
        completedAt = Instant.now();
    }

    public void markFailed() {
        status = TransactionStatus.FAILED;
        completedAt = Instant.now();
    }

    public boolean isPending() {
        return status == TransactionStatus.PENDING;
    }

    public boolean isSuccess() {
        return status == TransactionStatus.SUCCESS;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getTransactionRef() {
        return transactionRef;
    }

    public void setTransactionRef(String transactionRef) {
        this.transactionRef = transactionRef;
    }

    public UUID getSenderId() {
        return senderId;
    }

    public void setSenderId(UUID senderId) {
        this.senderId = senderId;
    }

    public UUID getReceiverId() {
        return receiverId;
    }

    public void setReceiverId(UUID receiverId) {
        this.receiverId = receiverId;
    }

    public String getSenderUpiId() {
        return senderUpiId;
    }

    public void setSenderUpiId(String senderUpiId) {
        this.senderUpiId = senderUpiId;
    }

    public String getReceiverUpiId() {
        return receiverUpiId;
    }

    public void setReceiverUpiId(String receiverUpiId) {
        this.receiverUpiId = receiverUpiId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getRemark() {
        return remark;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public TransactionStatus getStatus() {
        return status;
    }

    public void setStatus(TransactionStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }
}
