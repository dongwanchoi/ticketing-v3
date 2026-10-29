package com.ticketing.v3.performance.controller;
import com.ticketing.v3.performance.service.CatalogService;
import com.ticketing.v3.performance.dto.CatalogResponse;
import org.springframework.web.bind.annotation.*;
@RestController
public class CatalogController {
 private final CatalogService service;
 public CatalogController(CatalogService service) { this.service=service; }
 @GetMapping("/api/performances") public CatalogResponse list() { return service.list(); }
}
