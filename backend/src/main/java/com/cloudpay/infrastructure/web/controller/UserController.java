package com.cloudpay.infrastructure.web.controller;
import com.cloudpay.application.dto.user.*;
import com.cloudpay.application.service.UserService;
import com.cloudpay.infrastructure.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/users") public class UserController {
 private final UserService service; public UserController(UserService service){this.service=service;}
 @GetMapping("/me") public UserResponse me(){return service.me(SecurityUtils.currentUserId());}
 @GetMapping("/transaction-pin") public PinStatusResponse pinStatus(){return service.pinStatus(SecurityUtils.currentUserId());}
 @PostMapping("/transaction-pin") public PinStatusResponse setPin(@Valid @RequestBody SetTransactionPinRequest r){return service.setTransactionPin(SecurityUtils.currentUserId(),r);}
 @PutMapping("/me") public UserResponse update(@Valid @RequestBody UpdateProfileRequest r){return service.update(SecurityUtils.currentUserId(),r);}
 @PostMapping("/upi-id") public UserResponse generateUpi(){return service.generateUpi(SecurityUtils.currentUserId());}
}
