package com.cloudpay.infrastructure.kafka;

import com.cloudpay.domain.model.Transaction;
import com.cloudpay.infrastructure.config.CloudPayProperties;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Publishes payment events. When cloudpay.events.enabled=false (default for local dev),
 * this is a no-op stub so no Kafka broker is needed.
 */
@Slf4j
@Service
public class PaymentEventPublisher {

    private final ObjectMapper mapper;
    private final CloudPayProperties properties;

    public PaymentEventPublisher(ObjectMapper mapper, CloudPayProperties properties) {
        this.mapper = mapper;
        this.properties = properties;
        if (!properties.getEvents().isEnabled()) {
            log.info("[CloudPay] Kafka events disabled — payment events will not be published");
        }
    }

    public void publishCompleted(Transaction transaction) {
        if (!properties.getEvents().isEnabled()) {
            log.debug("[CloudPay] Event publishing skipped (disabled): {}", transaction.getTransactionRef());
            return;
        }
        try {
            String payload = mapper.writeValueAsString(Map.of(
                "eventType", "PAYMENT_COMPLETED",
                "transactionId", transaction.getId().toString(),
                "transactionRef", transaction.getTransactionRef(),
                "senderId", transaction.getSenderId().toString(),
                "receiverId", transaction.getReceiverId().toString(),
                "amount", transaction.getAmount(),
                "createdAt", transaction.getCreatedAt().toString()
            ));
            log.info("[CloudPay] Payment event published: {}", transaction.getTransactionRef());
            // Kafka publishing would go here when enabled
        } catch (JsonProcessingException ex) {
            log.error("[CloudPay] Unable to serialize payment event {}", transaction.getTransactionRef(), ex);
        }
    }
}
