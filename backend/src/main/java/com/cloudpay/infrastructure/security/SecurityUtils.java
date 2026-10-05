package com.cloudpay.infrastructure.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import java.util.UUID;

public final class SecurityUtils {
    private SecurityUtils() {}
    public static UUID currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) throw new AccessDeniedException("Authentication required");
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException ex) { throw new AccessDeniedException("Invalid authentication subject"); }
    }
}
