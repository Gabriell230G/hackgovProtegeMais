package br.gov.protege.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Higienizacao do nome de arquivo enviado")
class NomeArquivoUtilTest {

    @Test
    @DisplayName("descarta qualquer caminho, em barra normal ou invertida")
    void removeCaminho() {
        assertEquals("passwd", NomeArquivoUtil.higienizar("../../../etc/passwd"));
        assertEquals("foto.jpg", NomeArquivoUtil.higienizar("C:\\Users\\gabri\\foto.jpg"));
        assertEquals("foto.jpg", NomeArquivoUtil.higienizar("/tmp/foto.jpg"));
    }

    @Test
    @DisplayName("nao sobra sequencia de ponto-ponto")
    void semTravessia() {
        assertFalse(NomeArquivoUtil.higienizar("..\\..\\x.png").contains(".."));
        assertFalse(NomeArquivoUtil.higienizar("a..b..c.pdf").contains(".."));
    }

    @Test
    @DisplayName("acento vira equivalente ASCII em vez de sumir")
    void preservaLegibilidade() {
        assertEquals("denuncia_agressao.pdf",
                NomeArquivoUtil.higienizar("denúncia_agressão.pdf"));
    }

    @Test
    @DisplayName("caractere perigoso para exibicao e neutralizado")
    void neutralizaMarcacao() {
        String limpo = NomeArquivoUtil.higienizar("<img src=x onerror=alert(1)>.png");
        assertFalse(limpo.contains("<"));
        assertFalse(limpo.contains(">"));
        assertFalse(limpo.contains("="));
    }

    @Test
    @DisplayName("nome muito longo e truncado sem perder a extensao")
    void truncaPreservandoExtensao() {
        String longo = "a".repeat(400) + ".pdf";
        String limpo = NomeArquivoUtil.higienizar(longo);
        assertTrue(limpo.length() <= 150);
        assertTrue(limpo.endsWith(".pdf"), "a extensao ajuda quem le a tela a saber o que e");
    }

    @Test
    @DisplayName("nome ausente ou que se reduz a nada vira um rotulo neutro")
    void nomeDegenerado() {
        assertEquals("arquivo", NomeArquivoUtil.higienizar(null));
        assertEquals("arquivo", NomeArquivoUtil.higienizar("   "));
        assertEquals("arquivo", NomeArquivoUtil.higienizar("..."));
        assertEquals("arquivo", NomeArquivoUtil.higienizar("../../"));
    }

    @Test
    @DisplayName("nome oculto do Unix perde o ponto inicial")
    void naoComecaComPonto() {
        assertFalse(NomeArquivoUtil.higienizar(".htaccess").startsWith("."));
    }
}
