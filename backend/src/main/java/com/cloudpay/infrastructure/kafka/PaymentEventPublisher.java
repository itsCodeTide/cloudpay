package com.cloudpay.infrastructure.kafka;

import com.cloudpay.domain.model.Transaction;
import org.springframework.stereotype.Service;

/**
 * Keeps the payment service contract stable while event streaming is disabled.
 */
@Service
public class PaymentEventPublisher {

    public void publishCompleted(Transaction transaction) {
        // Event streaming is intentionally disabled for the simple deployment.
    }
}
