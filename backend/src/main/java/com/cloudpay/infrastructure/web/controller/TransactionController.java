package com.cloudpay.infrastructure.web.controller;
import com.cloudpay.application.dto.payment.*;
import com.cloudpay.application.service.PaymentService;
import com.cloudpay.infrastructure.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
@RestController @RequestMapping("/api/v1/transactions") public class TransactionController {
 private final PaymentService service; public TransactionController(PaymentService service){this.service=service;}
 @PostMapping("/send") public TransactionResponse send(@Valid @RequestBody SendMoneyRequest r){return service.send(SecurityUtils.currentUserId(),r);}
 @PostMapping("/receive") public TransactionResponse receive(@Valid @RequestBody ReceiveMoneyRequest r){return service.receive(SecurityUtils.currentUserId(),r);}
 @GetMapping public PageResponse<TransactionResponse> history(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return service.history(SecurityUtils.currentUserId(),page,size);}
 @GetMapping("/{id}") public TransactionResponse get(@PathVariable UUID id){return service.get(SecurityUtils.currentUserId(),id);}
}
