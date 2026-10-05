package com.cloudpay.application.service;

import com.cloudpay.application.dto.user.*;
import com.cloudpay.application.mapper.UserDtoMapper;
import com.cloudpay.domain.enums.Role;
import com.cloudpay.domain.exception.*;
import com.cloudpay.domain.model.User;
import com.cloudpay.domain.repository.UserRepository;
import com.cloudpay.infrastructure.config.CloudPayProperties;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class UserService {
    private final UserRepository users;
    private final UserDtoMapper mapper;
    private final CloudPayProperties properties;
    private final PasswordEncoder passwordEncoder;
    public UserService(UserRepository users, UserDtoMapper mapper, CloudPayProperties properties, PasswordEncoder passwordEncoder) { this.users=users; this.mapper=mapper; this.properties=properties; this.passwordEncoder=passwordEncoder; }

    @Transactional
    public User ensureProfile(UUID id, String email, String fullName, String phone) {
        return users.findById(id).orElseGet(() -> {
            if (phone != null && !phone.isBlank() && users.existsByPhone(phone)) throw new DuplicateResourceException("Phone number is already registered");
            Instant now = Instant.now();
            return users.save(new User(id, email.toLowerCase(Locale.ROOT), null, fullName, phone, null, Role.USER, false, now, now));
        });
    }
    public User require(UUID id) { return users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User", id)); }
    public PinStatusResponse pinStatus(UUID id) { return new PinStatusResponse(require(id).hasTransactionPin()); }
    @Transactional public PinStatusResponse setTransactionPin(UUID id, SetTransactionPinRequest request) {
        if (!Objects.equals(request.pin(), request.confirmPin())) throw new DomainException("PIN and confirmation PIN do not match");
        User user = require(id);
        if (user.hasTransactionPin() && (request.currentPin() == null || request.currentPin().isBlank() || !passwordEncoder.matches(request.currentPin(), user.getTransactionPinHash()))) {
            throw new DomainException("Enter your current PIN to replace it");
        }
        user.setTransactionPinHash(passwordEncoder.encode(request.pin()));
        users.save(user);
        return new PinStatusResponse(true);
    }
    public UserResponse me(UUID id) { return mapper.toResponse(require(id)); }
    @Transactional public UserResponse update(UUID id, UpdateProfileRequest request) {
        User user=require(id);
        if (!Objects.equals(user.getPhone(), request.phone()) && users.existsByPhone(request.phone())) throw new DuplicateResourceException("Phone number is already registered");
        user.setFullName(request.fullName().trim()); user.setPhone(request.phone().trim());
        return mapper.toResponse(users.save(user));
    }
    @Transactional public UserResponse generateUpi(UUID id) {
        User user=require(id);
        if (user.hasUpiId()) return mapper.toResponse(user);
        String base=Pattern.compile("[^a-z0-9]").matcher(user.getFullName().toLowerCase(Locale.ROOT).replace(" ","")).replaceAll("");
        if (base.isBlank()) base="user";
        String handle=properties.getUpiHandle();
        if (!handle.startsWith("@")) handle="@"+handle;
        String candidate=base+handle; int suffix=1;
        while(users.existsByUpiId(candidate)) candidate=base+suffix++ + handle;
        user.setUpiId(candidate);
        return mapper.toResponse(users.save(user));
    }
    public User requireAdmin(UUID id) { User user=require(id); if (!user.isAdmin()) throw new org.springframework.security.access.AccessDeniedException("Admin role required"); return user; }
}
