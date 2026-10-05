package com.cloudpay.infrastructure.web.controller;
import com.cloudpay.application.dto.notification.NotificationResponse;
import com.cloudpay.application.service.NotificationService;
import com.cloudpay.infrastructure.security.SecurityUtils;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/v1/notifications") public class NotificationController {
 private final NotificationService service; public NotificationController(NotificationService service){this.service=service;}
 @GetMapping public List<NotificationResponse> list(){return service.list(SecurityUtils.currentUserId());}
 @PatchMapping("/{id}/read") public void read(@PathVariable UUID id){service.markRead(SecurityUtils.currentUserId(),id);}
}
