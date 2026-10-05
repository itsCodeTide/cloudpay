package com.cloudpay.infrastructure.persistence.repository;

import com.cloudpay.infrastructure.persistence.entity.NotificationEntity;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface NotificationJpaRepository extends JpaRepository<NotificationEntity, UUID> {
    List<NotificationEntity> findByUser_IdOrderByCreatedAtDesc(UUID userId);
    @Modifying @Query("update NotificationEntity n set n.read = true, n.readAt = CURRENT_TIMESTAMP where n.id = :id and n.user.id = :userId")
    int markRead(@Param("id") UUID id, @Param("userId") UUID userId);
}
