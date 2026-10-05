package com.cloudpay.application.dto.user;
import com.cloudpay.domain.enums.Role;
import java.time.Instant;
import java.util.UUID;
public record UserResponse(UUID id,String email,String fullName,String phone,String upiId,Role role,boolean kycVerified,Instant createdAt) {}
