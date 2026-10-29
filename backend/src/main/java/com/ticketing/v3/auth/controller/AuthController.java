package com.ticketing.v3.auth.controller;
import com.ticketing.v3.auth.service.AuthService;import com.ticketing.v3.auth.domain.User;import org.springframework.web.bind.annotation.*;import org.springframework.http.HttpStatus;import jakarta.servlet.http.*;import org.springframework.security.web.csrf.*;import org.springframework.security.web.context.*;import org.springframework.security.core.context.*;import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;import org.springframework.security.core.authority.SimpleGrantedAuthority;import java.util.*;
@RestController @RequestMapping("/api/auth") public class AuthController {
 public record Credentials(String email,String password){}
 private final AuthService auth;private final SecurityContextRepository contexts;private final CsrfTokenRepository csrf;
 public AuthController(AuthService a,SecurityContextRepository c,CsrfTokenRepository t){auth=a;contexts=c;csrf=t;}
 @GetMapping("/csrf") Map<String,String> token(CsrfToken token){return Map.of("token",token.getToken(),"headerName",token.getHeaderName());}
 @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED) User register(@RequestBody Credentials c){return auth.register(c.email(),c.password());}
 @PostMapping("/login") User login(@RequestBody Credentials c,HttpServletRequest request,HttpServletResponse response){
  User u=auth.login(c.email(),c.password());request.getSession();request.changeSessionId();var context=SecurityContextHolder.createEmptyContext();context.setAuthentication(new UsernamePasswordAuthenticationToken(u.email(),null,List.of(new SimpleGrantedAuthority("ROLE_"+u.role()))));SecurityContextHolder.setContext(context);contexts.saveContext(context,request,response);csrf.saveToken(null,request,response);return u;
 }
 @GetMapping("/me") User me(){return auth.current();}
 @PostMapping("/logout") @ResponseStatus(HttpStatus.NO_CONTENT) void logout(HttpServletRequest request,HttpServletResponse response){auth.current();var session=request.getSession(false);if(session!=null)session.invalidate();SecurityContextHolder.clearContext();csrf.saveToken(null,request,response);}
}
