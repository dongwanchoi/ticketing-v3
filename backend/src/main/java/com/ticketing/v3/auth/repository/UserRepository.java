package com.ticketing.v3.auth.repository;
import org.springframework.stereotype.Repository;import jakarta.persistence.*;import com.ticketing.v3.auth.domain.*;import java.util.*;
@Repository public class UserRepository {
 @PersistenceContext private EntityManager entities;
 public record Account(User user,String hash){}
 public Optional<Account> find(String email){return entities.createQuery("select u from UserEntity u where u.email=:email",UserEntity.class).setParameter("email",email).getResultList().stream().findFirst().map(u->new Account(u.view(),u.hash()));}
 public User create(String email,String hash,String role){var u=new UserEntity(email,hash,role);entities.persist(u);entities.flush();return u.view();}
}
