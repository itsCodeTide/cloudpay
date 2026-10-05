package com.cloudpay.infrastructure.web.controller;
import com.cloudpay.application.dto.banking.*;
import com.cloudpay.application.service.BankAccountService;
import com.cloudpay.infrastructure.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;
@RestController @RequestMapping("/api/v1/bank-accounts") public class BankAccountController {
 private final BankAccountService service; public BankAccountController(BankAccountService service){this.service=service;}
 @PostMapping public BankAccountResponse add(@Valid @RequestBody AddBankAccountRequest r){return service.add(SecurityUtils.currentUserId(),r);}
 @GetMapping public List<BankAccountResponse> list(){return service.list(SecurityUtils.currentUserId());}
 @GetMapping("/balance") public BalanceResponse balance(){return service.balance(SecurityUtils.currentUserId());}
 @PutMapping("/{id}/primary") public BankAccountResponse primary(@PathVariable UUID id){return service.setPrimary(SecurityUtils.currentUserId(),id);}
 @DeleteMapping("/{id}") public void remove(@PathVariable UUID id){service.remove(SecurityUtils.currentUserId(),id);}
}
