package com.cloudpay.infrastructure.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

/** Supabase Resource Server owns JWT verification; retained only for migration compatibility. */
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    @Override protected void doFilterInternal(@NonNull HttpServletRequest request,@NonNull HttpServletResponse response,@NonNull FilterChain chain) throws ServletException,IOException {
        chain.doFilter(request,response);
    }
}
