package com.cloudpay.infrastructure.web.controller;
import com.cloudpay.application.dto.admin.DashboardResponse;
import com.cloudpay.application.service.DashboardService;
import com.cloudpay.infrastructure.security.SecurityUtils;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/dashboard") public class DashboardController {
 private final DashboardService service; public DashboardController(DashboardService service){this.service=service;}
 @GetMapping public DashboardResponse dashboard(){return service.dashboard(SecurityUtils.currentUserId());}
}
