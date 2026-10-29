package com.ticketing.v3.global.service;
import org.springframework.stereotype.Service;import org.springframework.transaction.annotation.Transactional;import org.springframework.jdbc.core.JdbcTemplate;import tools.jackson.databind.ObjectMapper;import com.ticketing.v3.global.exception.ApiException;import java.security.*;import java.nio.charset.StandardCharsets;import java.util.*;import java.util.function.Supplier;
@Service public class IdempotencyService {
 private final JdbcTemplate jdbc;private final ObjectMapper json;public IdempotencyService(JdbcTemplate j,ObjectMapper o){jdbc=j;json=o;}
 @Transactional public Object execute(long user,String operation,String key,String payload,Supplier<Object> action){
  if(key==null||key.isBlank()||key.length()>128)throw ApiException.bad("Idempotency-Key must contain 1..128 characters");
  String hash;try{hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(payload.getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}
  jdbc.update("INSERT INTO idempotency(user_id,operation,idempotency_key,fingerprint) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE idempotency_key=idempotency.idempotency_key",user,operation,key,hash);
  var row=jdbc.queryForMap("SELECT fingerprint,response_json FROM idempotency WHERE user_id=? AND operation=? AND idempotency_key=? FOR UPDATE",user,operation,key);
  if(!hash.equals(row.get("fingerprint")))throw ApiException.conflict("IDEMPOTENCY_MISMATCH");
  if(row.get("response_json")!=null)return json.readTree(row.get("response_json").toString());
  Object response=action.get();jdbc.update("UPDATE idempotency SET response_json=? WHERE user_id=? AND operation=? AND idempotency_key=?",json.writeValueAsString(response),user,operation,key);return response;
 }
}
