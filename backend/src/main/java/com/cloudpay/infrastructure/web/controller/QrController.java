package com.cloudpay.infrastructure.web.controller;
import com.cloudpay.application.dto.payment.TransactionResponse;
import com.cloudpay.application.dto.qr.*;
import com.cloudpay.application.service.QrService;
import com.cloudpay.infrastructure.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/qr") public class QrController {
 private final QrService service; public QrController(QrService service){this.service=service;}
 @GetMapping("/generate") public GenerateQrResponse generate(){return service.generate(SecurityUtils.currentUserId());}
 @PostMapping("/pay") public TransactionResponse pay(@Valid @RequestBody PayQrRequest r){return service.pay(SecurityUtils.currentUserId(),r);}
}
