package com.dms.service.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

/**
 * Turns a valid "Authorization: Bearer &lt;jwt&gt;" header into an authenticated
 * SecurityContext.
 *
 * The filter never rejects a request itself. It either populates the context or
 * leaves it empty and delegates; the authorization rules in SecurityConfig then
 * decide whether anonymous access is acceptable for that endpoint. That keeps
 * permitAll endpoints working even when a stale token is presented.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String HEADER = "Authorization";
    private static final String PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final AppUserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService, AppUserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        // Already authenticated by an earlier filter: leave it alone.
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        Optional<String> token = extractToken(request);
        if (token.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }

        Optional<Claims> claims = jwtService.parse(token.get());
        if (claims.isEmpty()) {
            // Signature invalid or expired. Stay anonymous; SecurityConfig 401s.
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // Reloading from the database on each request costs a query, but it
            // means deactivating a user takes effect immediately rather than at
            // token expiry. For a dealership admin revoking access, that matters.
            UserDetails user = userDetailsService.loadUserByUsername(claims.get().getSubject());

            if (user.isEnabled()) {
                var authentication = new UsernamePasswordAuthenticationToken(
                        user, null, user.getAuthorities());
                authentication.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (UsernameNotFoundException ex) {
            // Token references a user that has since been deleted.
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

    private Optional<String> extractToken(HttpServletRequest request) {
        String header = request.getHeader(HEADER);
        if (header == null || !header.startsWith(PREFIX)) {
            return Optional.empty();
        }
        String value = header.substring(PREFIX.length()).trim();
        return value.isEmpty() ? Optional.empty() : Optional.of(value);
    }
}
