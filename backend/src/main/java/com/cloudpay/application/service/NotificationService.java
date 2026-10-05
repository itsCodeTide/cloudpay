package com.cloudpay.application.service;

import com.cloudpay.application.dto.notification.NotificationResponse;
import com.cloudpay.infrastructure.persistence.entity.*;
import com.cloudpay.infrastructure.persistence.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class NotificationService {
    private final NotificationJpaRepository notifications;
    private final UserJpaRepository users;
    public NotificationService(NotificationJpaRepository notifications,UserJpaRepository users){this.notifications=notifications;this.users=users;}
    @Transactional public void create(UUID userId,String title,String message,String type){ NotificationEntity n=new NotificationEntity(); n.setUser(users.getReferenceById(userId)); n.setTitle(title);n.setMessage(message);n.setType(type);notifications.save(n); }
    public List<NotificationResponse> list(UUID userId){return notifications.findByUser_IdOrderByCreatedAtDesc(userId).stream().map(n->new NotificationResponse(n.getId(),n.getTitle(),n.getMessage(),n.getType(),n.isRead(),n.getCreatedAt())).toList();}
    @Transactional public void markRead(UUID userId,UUID id){if(notifications.markRead(id,userId)==0) throw new com.cloudpay.domain.exception.ResourceNotFoundException("Notification",id);}
    public long unread(UUID userId){return notifications.findByUser_IdOrderByCreatedAtDesc(userId).stream().filter(n->!n.isRead()).count();}
}
