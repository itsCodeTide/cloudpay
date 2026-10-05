package com.cloudpay.infrastructure.web.controller;
import com.cloudpay.application.dto.admin.AdminDashboardResponse;
import com.cloudpay.application.service.*;
import com.cloudpay.infrastructure.security.SecurityUtils;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/admin") public class AdminController {
 private final AdminService service; private final UserService users;
 public AdminController(AdminService service,UserService users){this.service=service;this.users=users;}
 @GetMapping("/dashboard") public AdminDashboardResponse dashboard(){users.requireAdmin(SecurityUtils.currentUserId());return service.dashboard(SecurityUtils.currentUserId());}
 @GetMapping("/analytics/transactions") public AdminDashboardResponse transactions(){return dashboard();}
}
