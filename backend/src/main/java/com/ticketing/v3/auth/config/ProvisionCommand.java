package com.ticketing.v3.auth.config;
import org.springframework.context.annotation.Profile;import org.springframework.stereotype.Component;import org.springframework.boot.ApplicationRunner;import org.springframework.boot.ApplicationArguments;import com.ticketing.v3.auth.service.AuthService;
@Component @Profile("provision") public class ProvisionCommand implements ApplicationRunner {
 private final AuthService auth;public ProvisionCommand(AuthService a){auth=a;}
 public void run(ApplicationArguments ignored){String role=System.getenv("V3_PROVISION_ROLE");if(!java.util.Set.of("SELLER","ADMIN").contains(role==null?"":role))throw new IllegalArgumentException("V3_PROVISION_ROLE must be SELLER or ADMIN");auth.provision(System.getenv("V3_PROVISION_EMAIL"),System.getenv("V3_PROVISION_PASSWORD"),role);System.out.println("V3 trusted account provisioned; no existing role changed");}
}
