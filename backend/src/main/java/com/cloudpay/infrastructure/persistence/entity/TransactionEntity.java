package com.cloudpay.infrastructure.persistence.entity;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.cloudpay.domain.enums.TransactionStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "transactions")
public class TransactionEntity {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "transaction_ref", nullable = false, unique = true, length = 50) private String transactionRef;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "sender_id", nullable = false) private UserEntity sender;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "receiver_id", nullable = false) private UserEntity receiver;
    @Column(name = "sender_upi_id", nullable = false, length = 100) private String senderUpiId;
    @Column(name = "receiver_upi_id", nullable = false, length = 100) private String receiverUpiId;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal amount;
    @JdbcTypeCode(SqlTypes.CHAR) @Column(nullable = false, columnDefinition = "char(3)") private String currency = "INR";
    @Column(name = "transaction_type", nullable = false, length = 30) private String transactionType = "UPI_TRANSFER";
    @Column(name = "idempotency_key", length = 100) private String idempotencyKey;
    @Column(length = 255) private String remark;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private TransactionStatus status;
    @Column(name = "failure_reason", length = 255) private String failureReason;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Column(name = "completed_at") private Instant completedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (currency == null) currency = "INR";
        if (transactionType == null) transactionType = "UPI_TRANSFER";
    }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }

    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public String getTransactionRef() { return transactionRef; } public void setTransactionRef(String v) { transactionRef = v; }
    public UserEntity getSender() { return sender; } public void setSender(UserEntity v) { sender = v; }
    public UserEntity getReceiver() { return receiver; } public void setReceiver(UserEntity v) { receiver = v; }
    public String getSenderUpiId() { return senderUpiId; } public void setSenderUpiId(String v) { senderUpiId = v; }
    public String getReceiverUpiId() { return receiverUpiId; } public void setReceiverUpiId(String v) { receiverUpiId = v; }
    public BigDecimal getAmount() { return amount; } public void setAmount(BigDecimal v) { amount = v; }
    public String getCurrency() { return currency; } public void setCurrency(String v) { currency = v; }
    public String getTransactionType() { return transactionType; } public void setTransactionType(String v) { transactionType = v; }
    public String getIdempotencyKey() { return idempotencyKey; } public void setIdempotencyKey(String v) { idempotencyKey = v; }
    public String getRemark() { return remark; } public void setRemark(String v) { remark = v; }
    public TransactionStatus getStatus() { return status; } public void setStatus(TransactionStatus v) { status = v; }
    public String getFailureReason() { return failureReason; } public void setFailureReason(String v) { failureReason = v; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant v) { createdAt = v; }
    public Instant getUpdatedAt() { return updatedAt; } public void setUpdatedAt(Instant v) { updatedAt = v; }
    public Instant getCompletedAt() { return completedAt; } public void setCompletedAt(Instant v) { completedAt = v; }
}
