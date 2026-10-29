package com.ticketing.v3.auth.domain;
import jakarta.persistence.*;
@Entity @Table(name="app_user") public class UserEntity {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,unique=true,length=254) private String email;
 @Column(name="password_hash",nullable=false,length=100) private String passwordHash;
 @Column(nullable=false,length=10) private String role;
 protected UserEntity(){}
 public UserEntity(String email,String hash,String role){this.email=email;passwordHash=hash;this.role=role;}
 public User view(){return new User(id,email,role);} public String hash(){return passwordHash;}
}
