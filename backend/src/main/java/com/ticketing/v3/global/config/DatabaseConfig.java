package com.ticketing.v3.global.config;
import org.springframework.context.annotation.*;import java.time.Clock;
@Configuration public class DatabaseConfig { @Bean Clock clock(){return Clock.systemUTC();} }
