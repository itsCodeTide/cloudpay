package com.cloudpay.application.dto.auth;
import com.cloudpay.application.dto.user.UserResponse;
public record AuthResponse(String accessToken,String refreshToken,String tokenType,long expiresIn,UserResponse user) {}
