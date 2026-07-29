package br.gov.protege;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Ponto de entrada do backend Protege+.
 * Canal Nacional de Denuncias - HackGov / FIAP.
 */
@SpringBootApplication
public class ProtegeApplication {

    public static void main(String[] args) {
        SpringApplication.run(ProtegeApplication.class, args);
    }
}
