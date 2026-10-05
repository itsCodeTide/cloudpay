package com.cloudpay.infrastructure.supabase;

import com.cloudpay.domain.exception.DomainException;
import com.cloudpay.infrastructure.config.CloudPayProperties;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import java.util.Map;

@Component @Slf4j
public class SupabaseAuthClient {
    private final RestClient client;
    private final CloudPayProperties properties;

    public SupabaseAuthClient(RestClient.Builder builder, CloudPayProperties properties) {
        this.properties = properties;
        this.client = builder.baseUrl(properties.getSupabase().getUrl() + "/auth/v1").build();
    }

    public SupabaseAuthResponse signUp(String email, String password, String fullName, String phone) {
        String secret = properties.getSupabase().getSecretKey();
        if (secret != null && !secret.isBlank()) {
            try {
                // Use Admin API with email_confirm: true to prevent rate-limits and skipping confirmation email
                SupabaseAuthResponse adminCreated = call(() -> client.post().uri("/admin/users").contentType(MediaType.APPLICATION_JSON)
                    .header("apikey", secret)
                    .header("Authorization", "Bearer " + secret)
                    .body(Map.of(
                        "email", email,
                        "password", password,
                        "email_confirm", true,
                        "user_metadata", Map.of("full_name", fullName, "phone", phone)
                    ))
                    .retrieve().body(SupabaseAuthResponse.class));

                if (adminCreated != null && adminCreated.user() != null) {
                    try {
                        // Immediately obtain valid session
                        return passwordGrant(email, password);
                    } catch (Exception ex) {
                        return adminCreated;
                    }
                }
            } catch (Exception ex) {
                log.info("Admin signup fallback to standard signup: {}", ex.getMessage());
            }
        }

        // Standard signup
        SupabaseAuthResponse response = call(() -> client.post().uri("/signup").contentType(MediaType.APPLICATION_JSON)
            .header("apikey", key()).body(Map.of("email", email, "password", password,
                "data", Map.of("full_name", fullName, "phone", phone))).retrieve().body(SupabaseAuthResponse.class));

        // If user is returned without accessToken, try auto-signin
        if (response != null && response.accessToken() == null) {
            try {
                return passwordGrant(email, password);
            } catch (Exception ignored) {
                // Return response as-is
            }
        }
        return response;
    }

    public SupabaseAuthResponse passwordGrant(String email, String password) {
        return call(() -> client.post().uri("/token?grant_type=password").contentType(MediaType.APPLICATION_JSON)
            .header("apikey", key()).body(Map.of("email", email, "password", password)).retrieve().body(SupabaseAuthResponse.class));
    }

    public SupabaseAuthResponse refresh(String refreshToken) {
        return call(() -> client.post().uri("/token?grant_type=refresh_token").contentType(MediaType.APPLICATION_JSON)
            .header("apikey", key()).body(Map.of("refresh_token", refreshToken)).retrieve().body(SupabaseAuthResponse.class));
    }

    private String key() {
        if (properties.getSupabase().getPublishableKey() == null || properties.getSupabase().getPublishableKey().isBlank())
            throw new IllegalStateException("SUPABASE_PUBLISHABLE_KEY is required");
        return properties.getSupabase().getPublishableKey();
    }

    private SupabaseAuthResponse call(java.util.function.Supplier<SupabaseAuthResponse> request) {
        try { return request.get(); }
        catch (RestClientResponseException ex) {
            log.warn("Supabase Auth request failed with status {}", ex.getStatusCode());
            String response = ex.getResponseBodyAsString();
            if (ex.getStatusCode().value() == 429) throw new DomainException("Authentication service is temporarily rate-limited. Try again shortly.");
            if (response.contains("email_not_confirmed") || response.contains("Email not confirmed")) throw new DomainException("Please confirm your email before signing in.");
            if (response.contains("Invalid login credentials")) throw new DomainException("Invalid email or password.");
            if (response.contains("User already registered") || response.contains("already been registered")) throw new DomainException("An account with this email already exists.");
            throw new DomainException("Supabase authentication failed. Check your email, password, and Supabase Auth settings.");
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SupabaseAuthResponse(
        @JsonProperty("access_token") String accessToken,
        @JsonProperty("refresh_token") String refreshToken,
        @JsonProperty("token_type") String tokenType,
        @JsonProperty("expires_in") long expiresIn,
        @JsonProperty("user") SupabaseUser nestedUser,
        @JsonProperty("id") String rootId,
        @JsonProperty("email") String rootEmail,
        @JsonProperty("user_metadata") Map<String, Object> rootUserMetadata
    ) {
        public SupabaseUser user() {
            if (nestedUser != null) return nestedUser;
            if (rootId != null) return new SupabaseUser(rootId, rootEmail, rootUserMetadata);
            return null;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SupabaseUser(String id, String email, @JsonProperty("user_metadata") Map<String, Object> user_metadata) {}
}
