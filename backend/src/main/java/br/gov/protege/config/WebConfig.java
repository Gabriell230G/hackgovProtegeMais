package br.gov.protege.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Documentacao interativa da API (Swagger UI em /swagger-ui.html).
 *
 * O esquema de seguranca declarado aqui e o que faz aparecer o botao
 * "Authorize" no Swagger: o avaliador cola o token devolvido pelo login
 * e passa a executar as rotas protegidas direto do navegador.
 */
@Configuration
public class WebConfig {

    @Bean
    public OpenAPI protegeOpenAPI() {
        SecurityScheme bearer = new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .description("Token obtido em POST /api/auth/login. Informe apenas o token, sem o prefixo Bearer.");

        return new OpenAPI()
                .info(new Info()
                        .title("Protege+ API")
                        .description("""
                                Canal Nacional de Denuncias - HackGov / FIAP (parceria EGESP).

                                O canal do cidadao (registro e consulta por protocolo) e publico,
                                por definicao: exigir identificacao para denunciar anularia o
                                proprio objetivo do sistema. As rotas do painel do orgao exigem
                                token JWT, e as operacoes sensiveis geram trilha de auditoria.
                                """)
                        .version("1.1.0")
                        .contact(new Contact().name("Gabriel Vasconcellos Gomes - RM 561601"))
                        .license(new License().name("Uso academico - FIAP")))
                .servers(List.of(new Server().url("/").description("Servidor atual")))
                .components(new Components().addSecuritySchemes("bearerAuth", bearer));
    }
}
