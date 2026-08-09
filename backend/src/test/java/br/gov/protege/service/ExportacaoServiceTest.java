package br.gov.protege.service;

import br.gov.protege.model.Denuncia;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * A injecao de formula em CSV e traicoeira porque nao acontece na API: ela
 * acontece dias depois, na maquina de quem abre a planilha. Um relato que
 * comece com "=" vira formula no Excel, e a planilha do orgao publico passa
 * a executar o que o denunciante escreveu.
 */
@DisplayName("Exportacao em CSV")
class ExportacaoServiceTest {

    private final ExportacaoService svc = new ExportacaoService();

    private Denuncia caso(String protocolo, String endereco) {
        Denuncia d = new Denuncia();
        d.setProtocolo(protocolo);
        d.setTipo("violencia");
        d.setStatus("concluida");
        d.setEstado("SP");
        d.setCidade("Sao Paulo");
        d.setEndereco(endereco);
        d.setAnonimo(false);
        d.setScore(80);
        d.setScoreTxt("Alta");
        d.setUrgenciaIa("ALTA");
        d.setOrigemAnalise("REGRAS");
        d.setCriadoEm(LocalDateTime.of(2026, 4, 1, 0, 0));
        d.setConcluidaEm(LocalDateTime.of(2026, 4, 3, 12, 0));
        return d;
    }

    @Test
    @DisplayName("valor iniciado por = e prefixado para nao virar formula")
    void neutralizaFormula() {
        assertEquals("\"'=HYPERLINK(\"\"http://x\"\")\"",
                ExportacaoService.campo("=HYPERLINK(\"http://x\")"));
    }

    @Test
    @DisplayName("os quatro gatilhos de formula sao cobertos")
    void todosOsGatilhos() {
        for (String g : List.of("=", "+", "-", "@")) {
            assertTrue(ExportacaoService.campo(g + "cmd").startsWith("\"'"),
                    "nao neutralizou o gatilho " + g);
        }
    }

    @Test
    @DisplayName("aspas sao duplicadas e o campo vai entre aspas")
    void escapaAspas() {
        assertEquals("\"rua \"\"das flores\"\"\"", ExportacaoService.campo("rua \"das flores\""));
    }

    @Test
    @DisplayName("quebra de linha nao desalinha o arquivo")
    void removeQuebraDeLinha() {
        String saida = ExportacaoService.campo("linha1\nlinha2\r\nlinha3");
        assertFalse(saida.contains("\n"));
        assertFalse(saida.contains("\r"));
    }

    @Test
    @DisplayName("perfil sem direito a identidade recebe o endereco mascarado")
    void mascaraEnderecoNoArquivo() {
        String csv = svc.gerarCsv(List.of(caso("#2026-00001", "Rua Goias, 800")), false);
        assertFalse(csv.contains("Rua Goias"),
                "negar o endereco na tela e entrega-lo na planilha seria contradicao");
        assertTrue(csv.contains("[endereco protegido]"));
    }

    @Test
    @DisplayName("perfil autorizado recebe o endereco real")
    void enderecoVisivelParaQuemPode() {
        String csv = svc.gerarCsv(List.of(caso("#2026-00001", "Rua Goias, 800")), true);
        assertTrue(csv.contains("Rua Goias, 800"));
    }

    @Test
    @DisplayName("o relato nunca entra no arquivo")
    void semRelato() {
        Denuncia d = caso("#2026-00001", "Rua X");
        d.setDescricao("relato sensivel que nao pode circular em planilha");
        String csv = svc.gerarCsv(List.of(d), true);
        assertFalse(csv.contains("relato sensivel"));
        assertFalse(csv.toLowerCase().contains("descricao"));
    }

    @Test
    @DisplayName("cabecalho, uma linha por denuncia e lead time calculado")
    void estruturaDoArquivo() {
        String csv = svc.gerarCsv(List.of(caso("#2026-00001", null), caso("#2026-00002", null)), true);
        String[] linhas = csv.split("\r\n");
        assertEquals(3, linhas.length, "cabecalho + duas denuncias");
        assertTrue(linhas[0].contains("protocolo"));
        assertTrue(csv.contains("2,50"), "de 01/04 00:00 a 03/04 12:00 sao 2,5 dias");
    }
}
