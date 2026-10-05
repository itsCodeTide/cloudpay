package com.cloudpay.application.dto.payment;
import com.cloudpay.domain.enums.TransactionStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
public record TransactionResponse(UUID id,String transactionRef,UUID senderId,UUID receiverId,String senderUpiId,String receiverUpiId,BigDecimal amount,String remark,TransactionStatus status,Instant createdAt,Instant completedAt) {}
