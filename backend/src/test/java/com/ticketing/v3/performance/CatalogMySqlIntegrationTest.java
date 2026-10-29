package com.ticketing.v3.performance;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import java.net.URI;
import java.net.http.*;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@EnabledIfEnvironmentVariable(named="V3_MYSQL_TEST", matches="true")
class CatalogMySqlIntegrationTest {
 @LocalServerPort int port;
 @Autowired JdbcTemplate jdbc;
 @Test void approvedCatalogIsPublicAndPendingRowsStayPrivate() throws Exception {
  jdbc.update("INSERT INTO performance(title,venue_name,min_price_krw,max_price_krw,approval_status) VALUES ('Approved test','V3 venue',10000,20000,'APPROVED'),('Hidden test','V3 venue',10000,20000,'PENDING'),('Rejected test','V3 venue',10000,20000,'REJECTED')");
  try {
   var client=HttpClient.newHttpClient();
   var response=client.send(HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/performances?q=Approved%20test")).GET().build(),HttpResponse.BodyHandlers.ofString());
   assertEquals(200,response.statusCode());
   assertTrue(response.body().contains("Approved test"));
   assertTrue(response.body().contains("\"minPriceKrw\":10000"));
   assertFalse(response.body().contains("Hidden test"));
   assertFalse(response.body().contains("Rejected test"));
   var denied=client.send(HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/private")).GET().build(),HttpResponse.BodyHandlers.ofString());
   assertEquals(401,denied.statusCode());
   var mutation=client.send(HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/performances")).POST(HttpRequest.BodyPublishers.noBody()).build(),HttpResponse.BodyHandlers.ofString());
   assertEquals(403,mutation.statusCode());
   jdbc.update("DELETE FROM performance WHERE title IN ('Approved test','Hidden test','Rejected test')");
   var empty=client.send(HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/performances?q=Approved%20test")).GET().build(),HttpResponse.BodyHandlers.ofString());
   assertEquals(200,empty.statusCode());
   assertEquals("{\"items\":[]}",empty.body());
  } finally { jdbc.update("DELETE FROM performance WHERE title IN ('Approved test','Hidden test','Rejected test')"); }
 }
}
