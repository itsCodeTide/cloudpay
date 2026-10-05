package com.cloudpay.domain.model;

import com.cloudpay.domain.enums.Role;

import java.time.Instant;
import java.util.UUID;

public class User {

    private UUID id;
    private String email;
    private String passwordHash;
    private String transactionPinHash;
    private String fullName;
    private String phone;
    private String upiId;
    private Role role;
    private boolean kycVerified;
    private Instant createdAt;
    private Instant updatedAt;

    public User() {
    }

    public User(UUID id, String email, String passwordHash, String fullName, String phone,
                String upiId, Role role, boolean kycVerified, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.phone = phone;
        this.upiId = upiId;
        this.role = role;
        this.kycVerified = kycVerified;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public User(UUID id, String email, String passwordHash, String transactionPinHash, String fullName, String phone,
                String upiId, Role role, boolean kycVerified, Instant createdAt, Instant updatedAt) {
        this(id, email, passwordHash, fullName, phone, upiId, role, kycVerified, createdAt, updatedAt);
        this.transactionPinHash = transactionPinHash;
    }

    public static User createNew(String email, String passwordHash, String fullName, String phone) {
        Instant now = Instant.now();
        return new User(null, email, passwordHash, fullName, phone, null, Role.USER, false, now, now);
    }

    public boolean hasUpiId() {
        return upiId != null && !upiId.isBlank();
    }

    public boolean hasTransactionPin() { return transactionPinHash != null && !transactionPinHash.isBlank(); }

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getTransactionPinHash() { return transactionPinHash; }
    public void setTransactionPinHash(String transactionPinHash) { this.transactionPinHash = transactionPinHash; }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getUpiId() {
        return upiId;
    }

    public void setUpiId(String upiId) {
        this.upiId = upiId;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public boolean isKycVerified() {
        return kycVerified;
    }

    public void setKycVerified(boolean kycVerified) {
        this.kycVerified = kycVerified;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
