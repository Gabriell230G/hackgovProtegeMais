package br.gov.protege;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

/**
 * Ponto de entrada do backend Protege+.
 * Canal Nacional de Denuncias - HackGov / FIAP.
 *
 * UserDetailsServiceAutoConfiguration e excluida de proposito: sem isso o
 * Spring Security cria um usuario "user" com senha aleatoria a cada
 * inicializacao e a imprime no console. Neste sistema a autenticacao e
 * feita exclusivamente por JWT contra a tabela de usuarios - uma conta
 * paralela em memoria seria uma porta de entrada nao auditada.
 */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class ProtegeApplication {

    public static void main(String[] args) {
        SpringApplication.run(ProtegeApplication.class, args);
    }
}
