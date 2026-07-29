package br.gov.protege.service;

import br.gov.protege.model.Denuncia;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class VigiaServiceTest {

    // Sem API key -> VigIA opera no modo regras (fallback), que testamos aqui.
    private final VigiaService vigia = new VigiaService("", "gemini-1.5-flash",
            "https://generativelanguage.googleapis.com/v1beta/models");

    @Test
    void semChaveIaFicaInativa() {
        assertFalse(vigia.iaAtiva());
    }

    @Test
    void violenciaComTermosDeRiscoEhCritica() {
        Denuncia d = new Denuncia();
        d.setTipo("violencia");
        d.setLocal("Sao Paulo, SP");
        d.setDescricao("Esta acontecendo agora, ha uma arma e pedido de socorro.");

        VigiaService.Analise a = vigia.analisar(d);

        assertEquals("CRITICA", a.urgencia());
        assertEquals("regras", a.origem());
        assertNotNull(a.resumo());
    }

    @Test
    void discriminacaoSemRiscoEhMedia() {
        Denuncia d = new Denuncia();
        d.setTipo("discriminacao");
        d.setLocal("Recife, PE");
        d.setDescricao("Tratamento desigual em estabelecimento comercial.");

        assertEquals("MEDIA", vigia.analisar(d).urgencia());
    }
}
