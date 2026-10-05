package com.cloudpay.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "notifications")
@Getter @Setter @NoArgsConstructor
public class NotificationEntity {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private UserEntity user;
    @Column(nullable = false, length = 150) private String title;
    @Column(nullable = false, length = 500) private String message;
    @Column(nullable = false, length = 40) private String type;
    @Column(name = "is_read", nullable = false) private boolean read;
    @Column(name = "read_at") private Instant readAt;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    @PrePersist void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
}
