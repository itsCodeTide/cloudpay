package com.cloudpay.application.service;

import com.cloudpay.application.dto.auth.*;
import com.cloudpay.application.dto.user.UserResponse;
import com.cloudpay.application.mapper.UserDtoMapper;
import com.cloudpay.domain.exception.DomainException;
import com.cloudpay.domain.model.User;
import com.cloudpay.infrastructure.security.SecurityUtils;
import com.cloudpay.infrastructure.supabase.SupabaseAuthClient;
import com.cloudpay.infrastructure.supabase.SupabaseAuthClient.SupabaseAuthResponse;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
public class AuthService {
    private final SupabaseAuthClient auth;
    private final UserService users;
    private final UserDtoMapper mapper;
    private final com.cloudpay.infrastructure.security.JwtService jwtService;

    public AuthService(SupabaseAuthClient auth, UserService users, UserDtoMapper mapper, com.cloudpay.infrastructure.security.JwtService jwtService) {
        this.auth = auth;
        this.users = users;
        this.mapper = mapper;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        SupabaseAuthResponse result = auth.signUp(request.email().trim().toLowerCase(Locale.ROOT), request.password(), request.fullName().trim(), request.phone().trim());
        if (result == null || result.user() == null) {
            throw new DomainException("Supabase did not return a user");
        }
        User user = users.ensureProfile(UUID.fromString(result.user().id()), request.email(), request.fullName(), request.phone());
        if (result.accessToken() == null) {
            String token = jwtService.generateAccessToken(user.getEmail(), Map.of("sub", user.getId().toString(), "role", user.getRole().name()));
            String refresh = jwtService.generateRefreshToken(user.getEmail());
            return new AuthResponse(token, refresh, "bearer", 86400, mapper.toResponse(user));
        }
        return toResponse(result, mapper.toResponse(user));
    }
    @Transactional
    public AuthResponse login(LoginRequest request) {
        SupabaseAuthResponse result = auth.passwordGrant(request.email().trim().toLowerCase(Locale.ROOT), request.password());
        if (result == null || result.user() == null) throw new DomainException("Invalid credentials");
        UUID userId = UUID.fromString(result.user().id());
        User user = users.findById(userId).orElseGet(() -> {
            String fullName = result.user().userMetadata() != null && result.user().userMetadata().get("full_name") != null
                ? result.user().userMetadata().get("full_name").toString()
                : result.user().email().split("@")[0];
            String phone = result.user().userMetadata() != null && result.user().userMetadata().get("phone") != null
                ? result.user().userMetadata().get("phone").toString()
                : null;
            return users.ensureProfile(userId, result.user().email(), fullName, phone);
        });
        return toResponse(result, mapper.toResponse(user));
    }
    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        SupabaseAuthResponse result = auth.refresh(request.refreshToken());
        if (result == null || result.user() == null) throw new DomainException("Invalid refresh token");
        UUID userId = UUID.fromString(result.user().id());
        User user = users.findById(userId).orElseGet(() ->
            users.ensureProfile(userId, result.user().email(), result.user().email().split("@")[0], null)
        );
        return toResponse(result, mapper.toResponse(user));
    }
    @Transactional
    public AuthResponse sync(Jwt jwt) {
        UUID id;
        try { id = UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException ex) { throw new DomainException("Invalid authenticated user"); }

        String email = jwt.getClaimAsString("email");
        if (email == null || email.isBlank()) throw new DomainException("Authenticated user has no email");
        Map<String, Object> metadata = jwt.getClaim("user_metadata");
        String emailName = email.contains("@") ? email.substring(0, email.indexOf('@')) : "CloudPay user";
        String fullName = firstNonBlank(metadata == null ? null : metadata.get("full_name"),
                metadata == null ? null : metadata.get("name"), emailName);
        String phone = optionalString(metadata == null ? null : metadata.get("phone"));
        User user = users.ensureProfile(id, email, fullName, phone);
        long expiresIn = jwt.getExpiresAt() == null ? 0 : Math.max(0, Duration.between(Instant.now(), jwt.getExpiresAt()).getSeconds());
        return new AuthResponse(null, null, "bearer", expiresIn, mapper.toResponse(user));
    }
    private String firstNonBlank(Object... values) {
        for (Object value : values) if (value != null && !value.toString().isBlank()) return value.toString().trim();
        return "CloudPay user";
    }
    private String optionalString(Object value) {
        return value == null || value.toString().isBlank() ? null : value.toString().trim();
    }
    private AuthResponse toResponse(SupabaseAuthResponse r, UserResponse u) {
        return new AuthResponse(r.accessToken(),r.refreshToken(),r.tokenType()==null?"bearer":r.tokenType(),r.expiresIn(),u);
    }
}
