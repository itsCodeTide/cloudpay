package com.cloudpay.infrastructure.security;

import com.cloudpay.domain.repository.UserRepository;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;
@Service
public class CloudPayUserDetailsService implements UserDetailsService {
    private final UserRepository users;
    public CloudPayUserDetailsService(UserRepository users) { this.users = users; }
    public UserDetails loadUserByUsername(String username) {
        return users.findByEmail(username).map(CloudPayUserDetails::new).orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
