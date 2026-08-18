package com.dms.service.repository;

import com.dms.service.domain.Role;
import com.dms.service.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    /** Login lookup. Backed by uq_users_email. */
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByRole(Role role);
}
