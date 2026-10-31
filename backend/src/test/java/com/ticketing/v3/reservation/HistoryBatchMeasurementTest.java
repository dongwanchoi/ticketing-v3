package com.ticketing.v3.reservation;

import com.ticketing.v3.auth.service.AuthService;
import com.ticketing.v3.reservation.service.ReservationService;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.core.Ordered;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.*;
import javax.sql.DataSource;
import java.io.*;
import java.lang.reflect.*;
import java.net.URI;
import java.net.http.*;
import java.nio.file.*;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static com.ticketing.v3.global.repository.Sql.*;
import static org.junit.jupiter.api.Assertions.*;

/** Opt-in measurement only. No production bean definitions or dependencies are changed. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(HistoryBatchMeasurementTest.Instrumentation.class)
@EnabledIfEnvironmentVariable(named="V3_HISTORY_BATCH", matches="true")
class HistoryBatchMeasurementTest {
 @Autowired JdbcTemplate jdbc;
 @Autowired AuthService auth;
 @Autowired ReservationService reservations;
 @Autowired ObjectMapper json;
 @LocalServerPort int port;
 static final ThreadLocal<List<String>> TRACE = new ThreadLocal<>();
 static final Map<String,CompletableFuture<List<String>>> REQUESTS = new ConcurrentHashMap<>();
 final HttpClient http=HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build();
 final List<String> rows=new ArrayList<>(List.of("mode,warmup,round,reservations,total_sql,history_sql,labels_sql,other_sql,elapsed_ns,response_bytes"));
 final String nonce=UUID.randomUUID().toString(), password=UUID.randomUUID().toString();
 final Map<Integer,Buyer> buyers=new LinkedHashMap<>();
 static boolean legacy=false;
 final Set<String> templates=new TreeSet<>();
 record Buyer(long id,String cookie){}
 record Response(int status,String body,String cookie){}

 @Test void measureRealMysqlServiceAndAuthenticatedHttp() throws Exception {
  String schema=System.getenv().getOrDefault("V3_HISTORY_SCHEMA","ticketing_v3_history_n1_20261031");
  assertTrue(schema.matches("ticketing_v3_history_n1_[a-zA-Z0-9_]+"), "Require a dedicated measurement schema");
  assertTrue(System.getenv("V3_DB_URL").contains("/"+schema+"?"), "Refuse other database bindings");
  assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM reservation",Integer.class), "Use a NEW empty measurement schema; preserve prior runs");
  try {
   // Calibration: both Statement and PreparedStatement executions must be counted.
   TRACE.set(new ArrayList<>());
   try(var c=jdbc.getDataSource().getConnection();var s=c.createStatement()) {s.executeQuery("SELECT 1").close();}
   jdbc.queryForObject("SELECT ?",Integer.class,1);jdbc.queryForObject("SELECT ?",Integer.class,2);
   assertEquals(3,TRACE.get().size());TRACE.remove();
   seed();
   for(boolean old:new boolean[]{true,false}){legacy=old;
   // Direct service calls isolate history() from authentication/controller work.
   for(int n:List.of(1,10,100)) {
    for(int w=0;w<5;w++) reservations.history(buyers.get(n).id());
    for(int rep=0;rep<3;rep++) {
     TRACE.set(new ArrayList<>());long began=System.nanoTime();
     Map<String,Object> result=reservations.history(buyers.get(n).id());long elapsed=System.nanoTime()-began;
     List<String> trace=List.copyOf(TRACE.get());TRACE.remove();
     assertEquals(n,((List<?>)result.get("items")).size());record(legacy?"SERVICE_OLD":"SERVICE_NEW",false,rep,n,trace,elapsed,0);
     assertEquals(legacy?n+1:2,trace.size());
    }
   }
   // Warm the same real HTTP/session/JDBC path; fixture/login time is excluded.
   for(int w=0;w<5;w++)for(int n:List.of(1,10,100))request(n,true,w);
   Random order=new Random(20261031L);
   for(int block=0;block<3;block++) {
    List<Integer> sizes=new ArrayList<>();for(int i=0;i<10;i++)sizes.addAll(List.of(1,10,100));
    Collections.shuffle(sizes,order);
    for(int n:sizes)request(n,false,block);
   }
   }
   verifyCorrectness();
   System.out.println("PASS history measurement: SERVICE3 + HTTP30 measured samples per size; HTTP5 warmups per size; SQL trace calibration3; real MySQL; no fixture cleanup");
  } finally {
   TRACE.remove();Path output=Path.of(System.getenv("V3_HISTORY_OUTPUT"));Files.createDirectories(output);
   Files.write(output.resolve("history-n1-raw.csv"),rows);
   Files.write(output.resolve("history-n1-sql.txt"),templates);
  }
 }
 void record(String mode,boolean warmup,int round,int n,List<String> trace,long ns,int bytes){
  long h=trace.stream().filter(s->s.startsWith("SELECT r.id,p.title AS performanceTitle")).count();
  long l=trace.stream().filter(s->(s.startsWith("SELECT s.label FROM hold_seat")||s.startsWith("SELECT hs.hold_id,s.label"))).count();
  rows.add(String.join(",",mode,String.valueOf(warmup),""+round,""+n,""+trace.size(),""+h,""+l,""+(trace.size()-h-l),""+ns,""+bytes));templates.addAll(trace);
  assertEquals(1,h);assertEquals(legacy?n:1,l);
 }
 void request(int n,boolean warmup,int block)throws Exception {
  String id=UUID.randomUUID().toString();var completed=new CompletableFuture<List<String>>();REQUESTS.put(id,completed);
  try {
   var req=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/reservations")).timeout(Duration.ofSeconds(30)).header("Cookie",buyers.get(n).cookie()).header("X-Test-Sql-Trace",id).GET().build();
   long began=System.nanoTime();var response=http.send(req,HttpResponse.BodyHandlers.ofString());long elapsed=System.nanoTime()-began;
   List<String> trace=completed.get(10,TimeUnit.SECONDS);
   assertEquals(200,response.statusCode());var items=json.readTree(response.body()).get("items");assertEquals(n,items.size());
   for(var item:items){assertEquals("CONFIRMED",item.get("status").asString());assertEquals(1,item.get("seatLabels").size());assertEquals(12000,item.get("totalKrw").asLong());}
   record(legacy?"HTTP_OLD":"HTTP_NEW",warmup,block,n,trace,elapsed,response.body().getBytes(java.nio.charset.StandardCharsets.UTF_8).length);
   assertEquals(legacy?n+2:3,trace.size(),"HTTP includes current-user lookup in addition to history()");
  } finally {REQUESTS.remove(id);}
 }
 void seed()throws Exception {
  long seller=auth.provision("n1-seller-"+nonce+"@example.test",password,"SELLER").id();
  long venue=insert(jdbc,"INSERT INTO venue(owner_id,name) VALUES(?,?)",seller,"N1 isolated fixture");
  long perf=insert(jdbc,"INSERT INTO performance(title,venue_name,min_price_krw,max_price_krw,approval_status,owner_id,venue_id,description) VALUES(?,?,12000,12000,'APPROVED',?,?,?)","N1 history fixture","N1 isolated fixture",seller,venue,"Synthetic measurement data");
  jdbc.update("INSERT INTO performance_sale(performance_id,status) VALUES(?,'OPEN')",perf);
  long session=insert(jdbc,"INSERT INTO performance_session(performance_id,starts_at) VALUES(?,?)",perf,stamp(Instant.now().plusSeconds(864000)));
  int seatNumber=0;
  for(int n:List.of(1,10,100)) {
   String email="n1-buyer-"+n+"-"+nonce+"@example.test";long user=auth.register(email,password).id();
   for(int i=0;i<n;i++) {
    int number=++seatNumber;
    long seat=insert(jdbc,"INSERT INTO seat(venue_id,label,row_label,seat_number) VALUES(?,?,'A',?)",venue,"A-"+number,number);
    long hold=insert(jdbc,"INSERT INTO seat_hold(user_id,session_id,expires_at,status,total_krw) VALUES(?,?,?,'CONFIRMED',12000)",user,session,stamp(Instant.now().plusSeconds(300)));
    jdbc.update("INSERT INTO hold_seat(hold_id,seat_id) VALUES(?,?)",hold,seat);
    jdbc.update("INSERT INTO session_seat(session_id,seat_id,price_krw,status,hold_id) VALUES(?,?,12000,'BOOKED',?)",session,seat,hold);
    long reservation=insert(jdbc,"INSERT INTO reservation(hold_id,user_id,created_at) VALUES(?,?,?)",hold,user,stamp(Instant.now()));
    jdbc.update("INSERT INTO mock_payment(hold_id,status,amount_krw,reservation_id) VALUES(?,'SUCCESS',12000,?)",hold,reservation);
   }
   Response csrf=call("GET","/api/auth/csrf",null,null,null);String token=json.readTree(csrf.body()).get("token").asString();
   Response login=call("POST","/api/auth/login",Map.of("email",email,"password",password),csrf.cookie(),token);
   assertEquals(200,login.status());assertNotNull(login.cookie());buyers.put(n,new Buyer(user,login.cookie()));
  }
  assertEquals(111,jdbc.queryForObject("SELECT COUNT(*) FROM reservation",Integer.class));
 }
 Response call(String method,String path,Object body,String cookie,String token)throws Exception {
  var b=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).timeout(Duration.ofSeconds(30));
  if(cookie!=null)b.header("Cookie",cookie);if(token!=null)b.header("X-CSRF-TOKEN",token);
  if(body!=null)b.header("Content-Type","application/json");
  b.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
  var r=http.send(b.build(),HttpResponse.BodyHandlers.ofString());return new Response(r.statusCode(),r.body(),r.headers().firstValue("set-cookie").map(c->c.split(";",2)[0]).orElse(null));
 }

 @Autowired com.ticketing.v3.reservation.repository.ReservationRepository repository;
 Map<String,Object> oldHistory(long user){return legacyHistory(repository,user);}
 static Map<String,Object> legacyHistory(com.ticketing.v3.reservation.repository.ReservationRepository r,long user){return Map.of("items",r.history(user).stream().map(row->{var out=new LinkedHashMap<String,Object>(row);long hold=((Number)out.remove("holdId")).longValue();out.put("seatLabels",r.labels(hold));out.put("startsAt",((Timestamp)row.get("startsAt")).toInstant());out.put("status","CONFIRMED");return out;}).toList());}
 void verifyCorrectness() throws Exception {
  legacy=false;
  long empty=auth.register("empty-"+nonce+"@example.test",password).id();
  TRACE.set(new ArrayList<>());assertEquals(Map.of("items",List.of()),reservations.history(empty));assertEquals(1,TRACE.get().size());TRACE.remove();
  for(var buyer:buyers.values())assertEquals(oldHistory(buyer.id()),reservations.history(buyer.id()));
  long hold=jdbc.queryForObject("SELECT hold_id FROM reservation WHERE user_id=? ORDER BY id DESC LIMIT 1",Long.class,buyers.get(100).id());
  long seat=jdbc.queryForObject("SELECT seat_id FROM hold_seat WHERE hold_id=?",Long.class,hold);
  long venue=jdbc.queryForObject("SELECT venue_id FROM seat WHERE id=?",Long.class,seat);
  for(int i=0;i<3;i++){long added=insert(jdbc,"INSERT INTO seat(venue_id,label,row_label,seat_number) VALUES(?,?,'Z',?)",venue,"Z-"+(3-i),i+1);jdbc.update("INSERT INTO hold_seat(hold_id,seat_id) VALUES(?,?)",hold,added);}
  var expected=oldHistory(buyers.get(100).id());assertEquals(expected,reservations.history(buyers.get(100).id()));
  var items=(List<Map<String,Object>>)expected.get("items");assertEquals(4,((List<?>)items.get(0).get("seatLabels")).size());
  assertEquals(List.of("A-111","Z-3","Z-2","Z-1"),items.get(0).get("seatLabels"));
  long previous=Long.MAX_VALUE;for(var item:items){long id=((Number)item.get("id")).longValue();assertTrue(id<previous);previous=id;}
  System.out.println("PASS empty SQL1; 1/10/100 exact legacy equivalence; multiseat4 labels and seat-id ordering; reservation descending ordering");
 }
 @TestConfiguration(proxyBeanMethods=false) static class Instrumentation {
  @Bean @org.springframework.context.annotation.Primary ReservationService measuredService(com.ticketing.v3.reservation.repository.ReservationRepository r,com.ticketing.v3.seat.service.InventoryService i,com.ticketing.v3.performance.service.PerformanceService p,com.ticketing.v3.global.service.IdempotencyService d,java.time.Clock c){return new ReservationService(r,i,p,d,c){@Override public Map<String,Object> history(long user){return legacy?legacyHistory(r,user):super.history(user);}};}

  @Bean static BeanPostProcessor countingDataSource(){return new BeanPostProcessor(){
   @Override public Object postProcessAfterInitialization(Object bean,String name){
    if(!(bean instanceof DataSource))return bean;
    return Proxy.newProxyInstance(DataSource.class.getClassLoader(),new Class<?>[]{DataSource.class},(p,m,a)->{
     Object value=invoke(bean,m,a);return value instanceof Connection c?connection(c):value;
    });
   }
  };}
  @Bean FilterRegistrationBean<OncePerRequestFilter> measurementFilter(){
   var registration=new FilterRegistrationBean<OncePerRequestFilter>();registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
   registration.setFilter(new OncePerRequestFilter(){
    @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException{
     var future=REQUESTS.get(req.getHeader("X-Test-Sql-Trace")==null?"":req.getHeader("X-Test-Sql-Trace"));
     if(future==null){chain.doFilter(req,res);return;}
     TRACE.set(new ArrayList<>());try{chain.doFilter(req,res);}finally{future.complete(List.copyOf(TRACE.get()));TRACE.remove();}
    }
   });return registration;
  }
 }
 static Object invoke(Object target,Method method,Object[] args)throws Throwable {try{return method.invoke(target,args);}catch(InvocationTargetException e){throw e.getCause();}}
 static Connection connection(Connection c){return (Connection)Proxy.newProxyInstance(Connection.class.getClassLoader(),new Class<?>[]{Connection.class},(p,m,a)->{
  Object value=invoke(c,m,a);if(!(value instanceof Statement s))return value;
  String sql=a!=null&&a.length>0&&a[0] instanceof String?(String)a[0]:null;
  Class<?> type=s instanceof CallableStatement?CallableStatement.class:s instanceof PreparedStatement?PreparedStatement.class:Statement.class;
  return Proxy.newProxyInstance(type.getClassLoader(),new Class<?>[]{type},(sp,sm,sa)->{
   if(sm.getName().startsWith("execute")&&TRACE.get()!=null){String executed=sql!=null?sql:sa!=null&&sa.length>0&&sa[0] instanceof String?(String)sa[0]:"<batch>";TRACE.get().add(executed.replaceAll("\\s+"," ").trim());}
   return invoke(s,sm,sa);
  });
 });}
}
