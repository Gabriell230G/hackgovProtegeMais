package br.gov.protege.service;

import br.gov.protege.dto.DenunciaRequest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ScoreServiceTest {

    private final ScoreService service = new ScoreService();

    @Test
    void denunciaCompletaEIdentificadaTemScoreAlto() {
        DenunciaRequest d = new DenunciaRequest();
        d.setTipo("violencia");
        d.setDescricao("Relato detalhado de violencia domestica com data, local e nomes envolvidos, "
                + "descrevendo a situacao com muitos detalhes para verificacao pela equipe responsavel.");
        d.setEstado("SP");
        d.setCidade("Sao Paulo");
        d.setEndereco("Rua Exemplo, 100");
        d.setAnonimo(false);

        ScoreService.Resultado r = service.calcular(d);

        assertTrue(r.score() >= 70, "Esperado score alto, veio " + r.score());
        assertEquals("high", r.label());
        assertEquals("Alta", r.txt());
    }

    @Test
    void denunciaMinimaAnonimaTemScoreBaixo() {
        DenunciaRequest d = new DenunciaRequest();
        d.setTipo("outros");
        d.setDescricao("algo");
        d.setAnonimo(true);

        ScoreService.Resultado r = service.calcular(d);

        assertTrue(r.score() < 40, "Esperado score baixo, veio " + r.score());
        assertEquals("low", r.label());
    }

    @Test
    void scoreNuncaPassaDe100() {
        DenunciaRequest d = new DenunciaRequest();
        d.setTipo("abuso");
        d.setDescricao("x".repeat(500));
        d.setEstado("RJ");
        d.setCidade("Rio");
        d.setEndereco("Av. Teste, 1");
        d.setAnonimo(false);

        assertTrue(service.calcular(d).score() <= 100);
    }
}
