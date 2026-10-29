package com.ticketing.v3.global.repository;
import org.springframework.jdbc.core.JdbcTemplate;import org.springframework.jdbc.support.*;import java.sql.*;
public final class Sql {
 private Sql(){}
 public static long insert(JdbcTemplate jdbc,String sql,Object...args){
  KeyHolder key=new GeneratedKeyHolder();jdbc.update(c->{var p=c.prepareStatement(sql,Statement.RETURN_GENERATED_KEYS);for(int i=0;i<args.length;i++)p.setObject(i+1,args[i]);return p;},key);return key.getKey().longValue();
 }
 public static Timestamp stamp(java.time.Instant instant){return instant==null?null:Timestamp.from(instant);}
}
