package com.ticketing.v3.performance;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import com.ticketing.v3.auth.service.AuthService;
import tools.jackson.databind.*;
import java.net.*;import java.net.http.*;import java.util.*;import java.util.concurrent.*;import java.time.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@EnabledIfEnvironmentVariable(named="V3_MYSQL_TEST",matches="true")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class BookingMvpIntegrationTest {
 @LocalServerPort int port;@Autowired ObjectMapper json;@Autowired JdbcTemplate jdbc;@Autowired AuthService auth;
 final HttpClient http=HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build();
 final String suffix=UUID.randomUUID().toString(); final String password=UUID.randomUUID().toString();
 class Client {
  String cookie="",token="";long user;
  Result call(String method,String path,Object body,String key,boolean csrf)throws Exception{
   var builder=HttpRequest.newBuilder(URI.create("http://localhost:"+port+path)).timeout(Duration.ofSeconds(90)).header("Content-Type","application/json");
   if(!cookie.isEmpty())builder.header("Cookie",cookie);if(csrf&&!token.isEmpty())builder.header("X-CSRF-TOKEN",token);if(key!=null)builder.header("Idempotency-Key",key);
   builder.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
   var response=http.send(builder.build(),HttpResponse.BodyHandlers.ofString());response.headers().firstValue("set-cookie").ifPresent(c->cookie=c.split(";",2)[0]);
   return new Result(response.statusCode(),response.body().isBlank()?null:json.readTree(response.body()));
  }
  void csrf()throws Exception{var r=call("GET","/api/auth/csrf",null,null,false);assertEquals(200,r.status);token=r.body.get("token").asString();}
 }
 record Result(int status,JsonNode body) {long id(){return body.get("id").asLong();}}
 Client login(String role,String name)throws Exception{
  String email=name+suffix+"@v3.test";Client c=new Client();c.csrf();
  if(role.equals("BUYER")){var created=c.call("POST","/api/auth/register",Map.of("email",email,"password",password,"role","ADMIN"),null,true);assertEquals(201,created.status,()->String.valueOf(created.body));assertEquals("BUYER",created.body.get("role").asString());c.user=created.id();}
  else c.user=auth.provision(email,password,role).id();
  String oldCookie=c.cookie;var logged=c.call("POST","/api/auth/login",Map.of("email",email,"password",password),null,true);assertEquals(200,logged.status,()->String.valueOf(logged.body));assertNotEquals(oldCookie,c.cookie,"session fixation defense");c.csrf();return c;
 }
 record Fixture(Client seller,Client admin,long performance,long session,long session2,List<Long> seats){}
 Fixture fixture(String name)throws Exception{
  Client seller=login("SELLER",name+"seller"),admin=login("ADMIN",name+"admin");
  var venue=seller.call("POST","/api/seller/venues",Map.of("name","V3 "+name,"rows",1,"seatsPerRow",6),null,true);assertEquals(201,venue.status,()->String.valueOf(venue.body));
  List<Long> seats=new ArrayList<>();venue.body.get("seats").forEach(s->seats.add(s.get("id").asLong()));
  var p=seller.call("POST","/api/seller/performances",Map.of("title","V3 "+name,"description","test","venueId",venue.id()),null,true);assertEquals(201,p.status);
  var s=seller.call("POST","/api/seller/performances/"+p.id()+"/sessions",Map.of("startsAt",Instant.now().plusSeconds(86400).toString(),"priceKrw",12000),null,true);assertEquals(201,s.status,()->String.valueOf(s.body));
  var s2=seller.call("POST","/api/seller/performances/"+p.id()+"/sessions",Map.of("startsAt",Instant.now().plusSeconds(172800).toString(),"priceKrw",15000),null,true);assertEquals(201,s2.status);
  var sale=new LinkedHashMap<String,Object>();sale.put("status","OPEN");sale.put("startsAt",null);sale.put("endsAt",null);
  assertEquals(200,seller.call("PUT","/api/seller/performances/"+p.id()+"/sale",sale,null,true).status);
  assertEquals(200,admin.call("POST","/api/admin/performances/"+p.id()+"/review",Map.of("decision","APPROVED"),null,true).status);
  return new Fixture(seller,admin,p.id(),s.id(),s2.id(),seats);
 }
 Result hold(Client c,long session,List<Long> seats,String key)throws Exception{return c.call("POST","/api/holds",Map.of("sessionId",session,"seatIds",seats),key,true);}
 @Test void fullPurchaseOwnershipIdempotencyExpiryAndRollback()throws Exception{
  Fixture f=fixture("flow");Client buyer=login("BUYER","flowbuyer"),other=login("BUYER","flowother");
  Client guest=new Client();assertEquals(401,guest.call("GET","/api/sessions/"+f.session+"/seats",null,null,false).status);
  assertEquals(403,buyer.call("POST","/api/holds",Map.of("sessionId",f.session,"seatIds",List.of(f.seats.get(0))),"nocsrf",false).status);
  assertEquals(403,buyer.call("GET","/api/seller/venues",null,null,true).status);
  assertEquals(400,f.seller.call("PUT","/api/seller/performances/"+f.performance+"/sale",Map.of("status","OPEN","startsAt",Instant.now().toString()),null,true).status);
  var h=hold(buyer,f.session,List.of(f.seats.get(0)),"hold-one");assertEquals(201,h.status,()->String.valueOf(h.body));assertEquals(12000,h.body.get("totalKrw").asLong());
  assertTrue(Math.abs(Duration.between(Instant.now(),Instant.parse(h.body.get("expiresAt").asString())).getSeconds()-300)<5);
  assertEquals(h.body,hold(buyer,f.session,List.of(f.seats.get(0)),"hold-one").body);
  assertEquals(409,hold(buyer,f.session,List.of(f.seats.get(1)),"hold-one").status);
  assertEquals(403,other.call("GET","/api/holds/"+h.id(),null,null,true).status);
  assertEquals(403,other.call("POST","/api/holds/"+h.id()+"/payments",Map.of("outcome","SUCCESS"),"steal",true).status);
  assertEquals(409,hold(other,f.session,List.of(f.seats.get(0),f.seats.get(1)),"partial").status);
  assertEquals("AVAILABLE",jdbc.queryForObject("SELECT status FROM session_seat WHERE session_id=? AND seat_id=?",String.class,f.session,f.seats.get(1)));
  assertEquals(201,hold(other,f.session2,List.of(f.seats.get(0)),"independent").status);
  var paid=buyer.call("POST","/api/holds/"+h.id()+"/payments",Map.of("outcome","SUCCESS"),"pay-one",true);assertEquals(200,paid.status,()->String.valueOf(paid.body));assertEquals("SUCCESS",paid.body.get("status").asString());
  assertEquals(paid.body,buyer.call("POST","/api/holds/"+h.id()+"/payments",Map.of("outcome","SUCCESS"),"pay-one",true).body);
  assertEquals(409,buyer.call("POST","/api/holds/"+h.id()+"/payments",Map.of("outcome","FAILURE"),"pay-one",true).status);
  assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM reservation WHERE hold_id=?",Integer.class,h.id()));
  assertEquals(409,buyer.call("DELETE","/api/holds/"+h.id(),null,null,true).status);
  assertEquals(1,buyer.call("GET","/api/reservations",null,null,true).body.get("items").size());assertEquals(0,other.call("GET","/api/reservations",null,null,true).body.get("items").size());
  var expired=hold(buyer,f.session,List.of(f.seats.get(2)),"expire");assertEquals(201,expired.status);
  jdbc.update("UPDATE seat_hold SET expires_at=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 1 SECOND) WHERE id=?",expired.id());
  var replacement=hold(other,f.session,List.of(f.seats.get(2)),"replacement");assertEquals(201,replacement.status,()->String.valueOf(replacement.body));
  assertEquals(409,buyer.call("POST","/api/holds/"+expired.id()+"/payments",Map.of("outcome","SUCCESS"),"latepay",true).status);
  assertEquals(204,buyer.call("DELETE","/api/holds/"+expired.id(),null,null,true).status);
  assertEquals(replacement.id(),jdbc.queryForObject("SELECT hold_id FROM session_seat WHERE session_id=? AND seat_id=?",Long.class,f.session,f.seats.get(2)));
  var failed=hold(buyer,f.session,List.of(f.seats.get(3)),"failhold");assertEquals(201,failed.status);
  var failure=buyer.call("POST","/api/holds/"+failed.id()+"/payments",Map.of("outcome","FAILURE"),"failpay",true);assertEquals(200,failure.status);assertEquals("FAILED",failure.body.get("status").asString());assertTrue(failure.body.get("reservationId").isNull());
  assertEquals(failure.body,buyer.call("POST","/api/holds/"+failed.id()+"/payments",Map.of("outcome","FAILURE"),"failpay",true).body);
  var retry=buyer.call("POST","/api/holds/"+failed.id()+"/payments",Map.of("outcome","SUCCESS"),"newpay",true);assertEquals(409,retry.status);assertEquals("POLICY_NOT_ENABLED",retry.body.get("code").asString());
  assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM reservation WHERE hold_id=?",Integer.class,failed.id()));
  assertEquals(204,buyer.call("DELETE","/api/holds/"+failed.id(),null,null,true).status);assertEquals(204,buyer.call("DELETE","/api/holds/"+failed.id(),null,null,true).status);
  assertEquals(400,hold(buyer,f.session,List.of(f.seats.get(0),f.seats.get(0)),"duplicate").status);assertEquals(400,hold(buyer,f.session,f.seats.subList(0,5),"max").status);
  var invalidSale=new LinkedHashMap<String,Object>();invalidSale.put("status","OPEN");invalidSale.put("startsAt",Instant.now().toString());invalidSale.put("endsAt",Instant.now().minusSeconds(10).toString());assertEquals(400,f.seller.call("PUT","/api/seller/performances/"+f.performance+"/sale",invalidSale,null,true).status);
  assertEquals(204,buyer.call("POST","/api/auth/logout",null,null,true).status);assertEquals(401,buyer.call("GET","/api/auth/me",null,null,false).status);
 }
 @Test void hundredAuthenticatedHttpCompetitorsProduceOneDatabaseWinner()throws Exception{
  Fixture f=fixture("race");List<Client> clients=new ArrayList<>();for(int n=0;n<100;n++)clients.add(login("BUYER","race"+n));
  try(var pool=Executors.newFixedThreadPool(100)){
   CountDownLatch ready=new CountDownLatch(100),start=new CountDownLatch(1);List<Future<Result>> futures=new ArrayList<>();
   for(int n=0;n<100;n++){Client c=clients.get(n);String key="race-"+n;futures.add(pool.submit(()->{ready.countDown();start.await();return hold(c,f.session,List.of(f.seats.get(0)),key);}));}
   assertTrue(ready.await(10,TimeUnit.SECONDS));long began=System.nanoTime();start.countDown();int winners=0,conflicts=0;for(var future:futures){var result=future.get(90,TimeUnit.SECONDS);if(result.status==201)winners++;else if(result.status==409)conflicts++;else fail("Unexpected status "+result.status+" "+result.body);}
   assertEquals(1,winners);assertEquals(99,conflicts);
   assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM session_seat WHERE session_id=? AND seat_id=? AND status='HELD' AND hold_id IS NOT NULL",Integer.class,f.session,f.seats.get(0)));
   assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM seat_hold WHERE session_id=? AND status='ACTIVE'",Integer.class,f.session));
   System.out.println("V3 race: actual100 distinct registered+logged-in HTTP buyers; winners="+winners+" conflicts="+conflicts+" elapsedMs="+(System.nanoTime()-began)/1_000_000+"; correctness test, not TPS guarantee");
  }
 }
 @Test void roleOwnershipApprovalAndPublicDiscovery()throws Exception{
  Fixture f=fixture("roles");Client stranger=login("SELLER","stranger"),buyer=login("BUYER","rolesbuyer");
  assertEquals(403,stranger.call("POST","/api/seller/performances/"+f.performance+"/sessions",Map.of("startsAt",Instant.now().plusSeconds(90000).toString(),"priceKrw",1),null,true).status);
  assertEquals(403,stranger.call("POST","/api/seller/performances",Map.of("title","Stolen","description","x","venueId",jdbc.queryForObject("SELECT venue_id FROM performance WHERE id=?",Long.class,f.performance)),null,true).status);
  jdbc.update("UPDATE performance SET owner_id=? WHERE id=?",f.admin.user,f.performance);
  assertEquals(403,f.admin.call("POST","/api/admin/performances/"+f.performance+"/review",Map.of("decision","APPROVED"),null,true).status);
  jdbc.update("UPDATE performance SET owner_id=? WHERE id=?",f.seller.user,f.performance);
  assertEquals(200,f.admin.call("POST","/api/admin/performances/"+f.performance+"/review",Map.of("decision","REJECTED"),null,true).status);
  assertEquals(404,buyer.call("GET","/api/performances/"+f.performance,null,null,false).status);
  assertEquals(409,hold(buyer,f.session,List.of(f.seats.get(0)),"notapproved").status);
  assertEquals(200,f.admin.call("POST","/api/admin/performances/"+f.performance+"/review",Map.of("decision","APPROVED"),null,true).status);
  var catalog=new Client().call("GET","/api/performances?q=V3%20ROLES",null,null,false);assertEquals(200,catalog.status);assertTrue(catalog.body.get("items").size()>0);
  assertEquals(2,buyer.call("GET","/api/performances/"+f.performance,null,null,false).body.get("sessions").size());
  assertEquals(6,buyer.call("GET","/api/sessions/"+f.session+"/seats",null,null,true).body.get("items").size());
 }
 @Test void concurrentIdenticalKeysReplayOneHoldAndOnePayment()throws Exception{
  Fixture f=fixture("idempotent");Client buyer=login("BUYER","idemBuyer");
  try(var pool=Executors.newFixedThreadPool(10)){
   var start=new CountDownLatch(1);List<Future<Result>> attempts=new ArrayList<>();
   for(int n=0;n<10;n++)attempts.add(pool.submit(()->{start.await();return hold(buyer,f.session,List.of(f.seats.get(0)),"samehold");}));
   start.countDown();long id=-1;for(var attempt:attempts){var result=attempt.get(30,TimeUnit.SECONDS);assertEquals(201,result.status,()->String.valueOf(result.body));if(id<0)id=result.id();else assertEquals(id,result.id());}
   assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM seat_hold WHERE session_id=?",Integer.class,f.session));
   final long holdId=id;var paymentStart=new CountDownLatch(1);attempts.clear();
   for(int n=0;n<10;n++)attempts.add(pool.submit(()->{paymentStart.await();return buyer.call("POST","/api/holds/"+holdId+"/payments",Map.of("outcome","SUCCESS"),"samepayment",true);}));
   paymentStart.countDown();long payment=-1;for(var attempt:attempts){var result=attempt.get(30,TimeUnit.SECONDS);assertEquals(200,result.status,()->String.valueOf(result.body));if(payment<0)payment=result.id();else assertEquals(payment,result.id());}
   assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM mock_payment WHERE hold_id=?",Integer.class,id));
   assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM reservation WHERE hold_id=?",Integer.class,id));
  }
 }

 @Test void legacyCatalogRowsRemainPublicAndUntouchedButNotManaged()throws Exception{
  String title="Legacy "+UUID.randomUUID();
  long id=com.ticketing.v3.global.repository.Sql.insert(jdbc,"INSERT INTO performance(title,venue_name,min_price_krw,max_price_krw,approval_status) VALUES(?,?,10000,20000,'APPROVED')",title,"Legacy V3 venue");
  Client guest=new Client();var detail=guest.call("GET","/api/performances/"+id,null,null,false);
  assertEquals(200,detail.status,()->String.valueOf(detail.body));assertEquals("",detail.body.get("description").asString());assertEquals(0,detail.body.get("sessions").size());
  var catalog=guest.call("GET","/api/performances?q="+URLEncoder.encode(title,java.nio.charset.StandardCharsets.UTF_8),null,null,false);assertEquals(200,catalog.status);assertEquals(1,catalog.body.get("items").size());
  Client admin=login("ADMIN","legacyAdmin");var managed=admin.call("GET","/api/admin/performances",null,null,true);assertEquals(200,managed.status);
  for(var p:managed.body.get("items")){assertNotEquals(id,p.get("id").asLong());assertFalse(p.get("venueId").isNull());assertFalse(p.get("description").isNull());}
  assertEquals(404,admin.call("POST","/api/admin/performances/"+id+"/review",Map.of("decision","REJECTED"),null,true).status);
  assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM performance WHERE id=? AND owner_id IS NULL AND venue_id IS NULL AND description IS NULL AND approval_status='APPROVED'",Integer.class,id));
 }
 @Test void swaggerUiUsesReviewedContractAndCredentialInputErrorsAreSafe()throws Exception{
  Client guest=new Client();assertEquals(200,guest.call("GET","/api-contract.json",null,null,false).status);
  var request=HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/swagger-ui/index.html")).GET().build();var ui=http.send(request,HttpResponse.BodyHandlers.ofString());assertEquals(200,ui.statusCode());assertTrue(ui.body().contains("swagger-ui"));
  guest.csrf();assertEquals(400,guest.call("POST","/api/auth/login",Map.of("email","bad@v3.test","password","x".repeat(73)),null,true).status);
  assertEquals(400,guest.call("POST","/api/auth/register",Map.of("password",password),null,true).status);
  assertEquals(400,guest.call("POST","/api/auth/register",Map.of("email","bad","password",password),null,true).status);
 }

}
