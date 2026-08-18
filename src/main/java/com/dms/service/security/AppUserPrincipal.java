package com.dms.service.security;

import com.dms.service.domain.Role;
import com.dms.service.domain.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * Wraps the domain {@link User} so controllers can reach the authenticated
 * user's id via @AuthenticationPrincipal without a second database round trip.
 *
 * Spring's stock User class would work for authentication, but it carries only
 * the username — and the advisor_id on an appointment needs the id.
 */
public class AppUserPrincipal implements UserDetails {

    private final Long id;
    private final String email;
    private final String fullName;
    private final String passwordHash;
    private final Role role;
    private final boolean active;

    public AppUserPrincipal(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.fullName = user.getFullName();
        this.passwordHash = user.getPasswordHash();
        this.role = user.getRole();
        this.active = user.isActive();
    }

    public Long getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public Role getRole() {
        return role;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // hasRole('ADMIN') looks for the authority "ROLE_ADMIN", so the prefix
        // is required here.
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
