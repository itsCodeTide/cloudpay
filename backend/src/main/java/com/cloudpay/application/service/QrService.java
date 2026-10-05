package com.cloudpay.application.service;

import com.cloudpay.application.dto.payment.TransactionResponse;
import com.cloudpay.application.dto.qr.*;
import com.cloudpay.domain.exception.DomainException;
import org.springframework.stereotype.Service;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class QrService {
    private final UserService users; private final PaymentService payments;
    public QrService(UserService users,PaymentService payments){this.users=users;this.payments=payments;}
    public GenerateQrResponse generate(UUID userId){var user=users.require(userId);if(!user.hasUpiId()) users.generateUpi(userId);user=users.require(userId);String payload="cloudpay://pay?upiId="+URLEncoder.encode(user.getUpiId(),StandardCharsets.UTF_8);return new GenerateQrResponse(user.getUpiId(),payload,"UPI_DEEP_LINK");}
    public TransactionResponse pay(UUID userId,PayQrRequest r){try{URI uri=URI.create(r.payload());if(!"cloudpay".equals(uri.getScheme())||uri.getQuery()==null)throw new IllegalArgumentException();String upi=Arrays.stream(uri.getQuery().split("&")).map(x->x.split("=",2)).filter(x->x.length==2&&x[0].equals("upiId")).findFirst().map(x->URLDecoder.decode(x[1],StandardCharsets.UTF_8)).orElseThrow();return payments.transfer(userId,upi,r.amount(),r.remark());}catch(Exception ex){if(ex instanceof DomainException d)throw d;throw new DomainException("Invalid CloudPay QR payload");}}
}
