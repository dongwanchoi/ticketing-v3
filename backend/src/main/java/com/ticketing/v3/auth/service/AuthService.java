package com.ticketing.v3.auth.service;
import org.springframework.stereotype.Service;import org.springframework.security.crypto.password.PasswordEncoder;import org.springframework.security.core.context.SecurityContextHolder;import org.springframework.transaction.annotation.Transactional;import com.ticketing.v3.auth.domain.User;import com.ticketing.v3.auth.repository.UserRepository;import com.ticketing.v3.global.exception.ApiException;import java.util.Locale;
@Service public class AuthService {
 private final UserRepository users;private final PasswordEncoder passwords;
 public AuthService(UserRepository u,PasswordEncoder p){users=u;passwords=p;}
 private String email(String email){if(email==null||!email.matches("[^\\s@]+@[^\\s@]+[.][^\\s@]+")||email.length()>254)throw ApiException.bad("Valid email required");return email.trim().toLowerCase(Locale.ROOT);}
 private void password(String password){if(password==null||password.length()<8||password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)throw ApiException.bad("Password must be 8..72 UTF-8 bytes");}
 @Transactional public User register(String email,String password){return provision(email,password,"BUYER");}
 @Transactional public User provision(String email,String password,String role){String e=email(email);password(password);if(!java.util.Set.of("BUYER","SELLER","ADMIN").contains(role))throw ApiException.bad("Invalid role");return users.create(e,passwords.encode(password),role);}
 public User login(String email,String password){password(password);var account=users.find(email(email)).orElseThrow(()->new ApiException(401,"INVALID_CREDENTIALS","Invalid credentials"));if(password==null||!passwords.matches(password,account.hash()))throw new ApiException(401,"INVALID_CREDENTIALS","Invalid credentials");return account.user();}
 public User current(){var a=SecurityContextHolder.getContext().getAuthentication();if(a==null||!a.isAuthenticated()||"anonymousUser".equals(a.getPrincipal()))throw new ApiException(401,"UNAUTHENTICATED","Login required");return users.find(a.getName()).orElseThrow(()->new ApiException(401,"UNAUTHENTICATED","Login required")).user();}
 public User require(String role){var u=current();if(!u.role().equals(role))throw ApiException.forbidden();return u;}
}
