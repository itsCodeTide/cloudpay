package com.cloudpay.infrastructure.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.*;

@Configuration
public class OpenApiConfig {
    @Bean
    OpenAPI cloudPayOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("CloudPay API")
                .version("v1")
                .description("Secure UPI Payment System API with Supabase Auth, PostgreSQL, Redis, and Kafka event streaming.")
                .contact(new Contact().name("CloudPay Team").email("support@cloudpay.dev")))
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
            .components(new io.swagger.v3.oas.models.Components().addSecuritySchemes("bearerAuth",
                new SecurityScheme()
                    .name("bearerAuth")
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
                    .description("Enter your Supabase or CloudPay JWT token. Example: Bearer eyJhbGciOi...")));
    }
}
