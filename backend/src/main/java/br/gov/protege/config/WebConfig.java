package br.gov.protege.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Metadados da documentacao interativa da API (Swagger UI em /swagger-ui.html).
 * O CORS agora e tratado no SecurityConfig.
 */
@Configuration
public class WebConfig {

    @Bean
    public OpenAPI protegeOpenAPI() {
        return new OpenAPI().info(new Info()
                .title("Protege+ API")
                .description("Canal Nacional de Denuncias - HackGov / FIAP (parceria EGESP)")
                .version("1.0.0")
                .contact(new Contact().name("Equipe Protege+")));
    }
}
