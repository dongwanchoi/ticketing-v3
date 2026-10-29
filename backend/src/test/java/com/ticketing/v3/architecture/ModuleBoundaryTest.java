package com.ticketing.v3.architecture;
import org.junit.jupiter.api.Test;import java.nio.file.*;import java.util.*;import java.util.regex.*;import static org.junit.jupiter.api.Assertions.*;
class ModuleBoundaryTest {
 @Test void featureDependenciesUsePublicServicesAndRemainAcyclic()throws Exception{
  var root=Path.of("src/main/java/com/ticketing/v3");assertTrue(Files.isDirectory(root));
  Set<String> features=Set.of("auth","performance","venue","seat","reservation","payment");Map<String,Set<String>> graph=new HashMap<>();features.forEach(f->graph.put(f,new HashSet<>()));
  Pattern imports=Pattern.compile("import\\s+(?:static\\s+)?com\\.ticketing\\.v3\\.([a-z]+)\\.([a-z]+)[^;]*;");
  try(var files=Files.walk(root)){for(Path file:files.filter(p->p.toString().endsWith(".java")).toList()){
   String feature=root.relativize(file).getName(0).toString();if(!features.contains(feature))continue;
   var matcher=imports.matcher(Files.readString(file));while(matcher.find()){
    String target=matcher.group(1),layer=matcher.group(2);if(target.equals(feature)||target.equals("global"))continue;
    assertTrue(features.contains(target),"Unknown feature import in "+file);
    assertEquals("service",layer,"Cross-feature access must use public service, file="+file);
    graph.get(feature).add(target);
   }
  }}
  for(String f:features)visit(f,graph,new HashSet<>(),new HashSet<>());
 }
 private void visit(String node,Map<String,Set<String>> graph,Set<String> active,Set<String> done){if(done.contains(node))return;assertTrue(active.add(node),"Feature cycle at "+node);for(String next:graph.get(node))visit(next,graph,active,done);active.remove(node);done.add(node);}
}
