package com.cloudpay.infrastructure.security;

import com.cloudpay.infrastructure.config.CloudPayProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    private static final String TOKEN_TYPE = "type";
    private static final String ACCESS = "access";
    private static final String REFRESH = "refresh";

    private final CloudPayProperties properties;
    private final SecretKey secretKey;

    public JwtService(CloudPayProperties properties) {
        this.properties = properties;
        this.secretKey = Keys.hmacShaKeyFor(resolveSecretBytes(properties.getJwt().getSecret()));
    }

    public String generateAccessToken(String email, Map<String, Object> extraClaims) {
        return buildToken(extraClaims, email, properties.getJwt().getExpirationMs(), ACCESS);
    }

    public String generateRefreshToken(String email) {
        return buildToken(Map.of(), email, properties.getJwt().getRefreshExpirationMs(), REFRESH);
    }

    public boolean isTokenValid(String token, String expectedEmail) {
        String email = extractEmail(token);
        return email.equals(expectedEmail) && !isTokenExpired(token);
    }

    public boolean isRefreshToken(String token) {
        return REFRESH.equals(extractClaim(token, claims -> claims.get(TOKEN_TYPE, String.class)));
    }

    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> resolver) {
        return resolver.apply(extractAllClaims(token));
    }

    private String buildToken(Map<String, Object> extraClaims, String email, long expirationMs, String type) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);
        return Jwts.builder()
                .claims(extraClaims)
                .subject(email)
                .claim(TOKEN_TYPE, type)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private byte[] resolveSecretBytes(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT secret must be configured");
        }
        try {
            return Decoders.BASE64.decode(secret);
        } catch (Exception ignored) {
            return secret.getBytes(StandardCharsets.UTF_8);
        }
    }
}
