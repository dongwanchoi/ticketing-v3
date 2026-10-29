package com.ticketing.v3.global.config;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
@Configuration
public class SecurityConfig {
 @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {
  return http.authorizeHttpRequests(a -> a.requestMatchers(org.springframework.http.HttpMethod.GET,"/api/performances").permitAll().anyRequest().denyAll())
   .build();
 }
}
