package com.cloudpay.infrastructure.security;

import com.cloudpay.infrastructure.config.CloudPayProperties;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.*;
import java.util.*;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private static final String[] PUBLIC_PATHS = {
        "/api/v1/auth/register",
        "/api/v1/auth/login",
        "/api/v1/auth/refresh",
        "/api/v1/docs",
        "/api/v1/docs/**",
        "/swagger-ui.html",
        "/swagger-ui/**",
        "/v3/api-docs",
        "/v3/api-docs/**",
        "/actuator/health",
        "/actuator/health/**",
        "/error"
    };

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(PUBLIC_PATHS).permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth -> oauth
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
            )
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> {
                    res.setContentType("application/json");
                    res.setStatus(401);
                    res.getWriter().write("{\"error\":\"Authentication required\",\"status\":401}");
                })
                .accessDeniedHandler((req, res, ex) -> {
                    res.setContentType("application/json");
                    res.setStatus(403);
                    res.getWriter().write("{\"error\":\"Access denied\",\"status\":403}");
                })
            );
        return http.build();
    }

    @Bean
    JwtDecoder jwtDecoder(CloudPayProperties properties) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder
            .withJwkSetUri(properties.getSupabase().getJwksUrl())
            .build();
        // Validate issuer matches Supabase project
        decoder.setJwtValidator(
            JwtValidators.createDefaultWithIssuer(
                properties.getSupabase().getUrl() + "/auth/v1"
            )
        );
        return decoder;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    private JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter c = new JwtAuthenticationConverter();
        c.setPrincipalClaimName("sub");
        return c;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(CloudPayProperties properties) {
        CorsConfiguration config = new CorsConfiguration();
        String origins = properties.getCors().getAllowedOrigins();
        List<String> allowedOrigins = Arrays.stream(origins.split(","))
            .map(String::trim)
            .filter(o -> !o.isBlank())
            .toList();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"));
        config.setExposedHeaders(List.of("Location", "Content-Disposition"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
