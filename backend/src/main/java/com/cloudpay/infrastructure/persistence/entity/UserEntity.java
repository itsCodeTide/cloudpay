package com.cloudpay.infrastructure.persistence.entity;

import com.cloudpay.domain.enums.Role;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "users")
@Getter @Setter @NoArgsConstructor
public class UserEntity {
    @Id private UUID id;
    @Column(nullable = false, unique = true, length = 255) private String email;
    @Column(name = "password_hash", length = 255) private String passwordHash;
    @Column(name = "transaction_pin_hash", length = 255) private String transactionPinHash;
    @Column(name = "full_name", nullable = false, length = 150) private String fullName;
    @Column(unique = true, length = 20) private String phone;
    @Column(name = "upi_id", unique = true, length = 100) private String upiId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Role role;
    @Column(name = "kyc_verified", nullable = false) private boolean kycVerified;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @PrePersist void onCreate() { Instant now = Instant.now(); if (createdAt == null) createdAt = now; if (updatedAt == null) updatedAt = now; if (role == null) role = Role.USER; }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
    public String getTransactionPinHash() { return transactionPinHash; }
    public void setTransactionPinHash(String transactionPinHash) { this.transactionPinHash = transactionPinHash; }
}
