package com.ticketing.v3.global.config;
import org.springframework.context.annotation.*;import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;import org.springframework.security.config.annotation.web.builders.HttpSecurity;import org.springframework.security.web.SecurityFilterChain;import org.springframework.security.web.context.*;import org.springframework.security.web.csrf.*;import org.springframework.security.crypto.password.*;import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
@Configuration public class SecurityConfig {
 @Bean PasswordEncoder passwords(){return new BCryptPasswordEncoder();}
 @Bean SecurityContextRepository contexts(){return new HttpSessionSecurityContextRepository();}
 @Bean CsrfTokenRepository csrfTokens(){return new HttpSessionCsrfTokenRepository();}
 @Bean @ConditionalOnWebApplication SecurityFilterChain security(HttpSecurity http,SecurityContextRepository contexts,CsrfTokenRepository csrf) throws Exception {
  return http.securityContext(c->c.securityContextRepository(contexts))
   .csrf(c->c.csrfTokenRepository(csrf))
   .authorizeHttpRequests(a->a.requestMatchers(org.springframework.http.HttpMethod.GET,"/api/auth/csrf","/api/performances","/api/performances/*","/swagger-ui.html","/swagger-ui/**","/v3/api-docs/**","/api-contract.json").permitAll().requestMatchers("/api/auth/register","/api/auth/login").permitAll().requestMatchers("/api/seller/**").hasRole("SELLER").requestMatchers("/api/admin/**").hasRole("ADMIN").anyRequest().authenticated())
   .exceptionHandling(e->e.authenticationEntryPoint((r,s,x)->{s.setStatus(401);s.setContentType("application/json");s.getWriter().write("{\"code\":\"UNAUTHENTICATED\",\"message\":\"Login required\"}");}).accessDeniedHandler((r,s,x)->{s.setStatus(403);s.setContentType("application/json");s.getWriter().write("{\"code\":\"FORBIDDEN\",\"message\":\"Access denied or CSRF missing\"}");}))
   .logout(l->l.disable()).build();
 }
}
