package com.cloudpay.application.dto.notification;
import java.time.Instant;
import java.util.UUID;
public record NotificationResponse(UUID id,String title,String message,String type,boolean read,Instant createdAt) {}
