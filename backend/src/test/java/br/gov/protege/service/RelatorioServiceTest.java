package br.gov.protege.service;

import br.gov.protege.dto.RelatorioAnaliticoResponse;
import br.gov.protege.dto.RelatorioAnaliticoResponse.Recorte;
import br.gov.protege.model.Denuncia;
import br.gov.protege.repository.DenunciaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Amostra pequena e desenhada a mao, para que cada numero do relatorio
 * possa ser conferido de cabeca. Nao usa banco: o objetivo e provar que a
 * montagem do relatorio le os campos certos e chama a estatistica certa,
 * nao que o Hibernate funciona.
 *
 * A amostra (data base: 01/04/2026, tudo as 00:00):
 *
 *   protocolo | tipo       | urgencia | score | conclusao | lead | anonima
 *   ----------|------------|----------|-------|-----------|------|--------
 *   0001      | violencia  | CRITICA  |  90   | 03/04     |  2   | sim
 *   0002      | violencia  | CRITICA  |  70   | 05/04     |  4   | sim
 *   0003      | outros     | BAIXA    |  50   | 09/04     |  8   | sim
 *   0004      | outros     | BAIXA    |  30   | 07/04     |  6   | nao
 *   0005      | assedio    | MEDIA    |  60   | em aberto |  -   | sim
 *   0006      | assedio    | MEDIA    |  40   | em aberto |  -   | nao   (criada em 05/04)
 *
 * Lead times: 2, 4, 6, 8 -> media 5, mediana 5, variancia 20/3 = 6,67
 * Correlacao score x lead: r = -160 / raiz(2000 x 20) = -0,8
 */
@DisplayName("Montagem do relatorio estatistico")
class RelatorioServiceTest {

    private static final LocalDateTime BASE = LocalDateTime.of(2026, 4, 1, 0, 0);

    private RelatorioAnaliticoResponse rel;

    private Denuncia caso(String proto, String tipo, String urgencia, int score,
                          boolean anonima, Integer diasAteConcluir, int diasAteCriar) {
        Denuncia d = new Denuncia();
        d.setProtocolo(proto);
        d.setTipo(tipo);
        d.setUrgenciaIa(urgencia);
        d.setScore(score);
        d.setAnonimo(anonima);
        d.setCriadoEm(BASE.plusDays(diasAteCriar));
        if (diasAteConcluir == null) {
            d.setStatus("recebida");
        } else {
            d.setStatus("concluida");
            d.setConcluidaEm(BASE.plusDays(diasAteCriar + diasAteConcluir));
        }
        return d;
    }

    @BeforeEach
    void montar() {
        DenunciaRepository repo = Mockito.mock(DenunciaRepository.class);
        Mockito.when(repo.findByExcluidaFalseOrderByCriadoEmDesc()).thenReturn(List.of(
                caso("#2026-00001", "violencia", "CRITICA", 90, true,  2, 0),
                caso("#2026-00002", "violencia", "CRITICA", 70, true,  4, 0),
                caso("#2026-00003", "outros",    "BAIXA",   50, true,  8, 0),
                caso("#2026-00004", "outros",    "BAIXA",   30, false, 6, 0),
                caso("#2026-00005", "assedio",   "MEDIA",   60, true,  null, 0),
                caso("#2026-00006", "assedio",   "MEDIA",   40, false, null, 4)));
        rel = new RelatorioService(repo, new EstatisticaService()).gerar();
    }

    @Test
    @DisplayName("separa concluidas de casos em aberto")
    void universo() {
        assertEquals(6, rel.universo().total());
        assertEquals(4, rel.universo().concluidas());
        assertEquals(2, rel.universo().emAberto());
        assertEquals(4, rel.universo().anonimas());
        assertEquals(2, rel.universo().identificadas());
    }

    @Test
    @DisplayName("lead time sai em dias fracionarios, sem arredondar para cima")
    void leadTime() {
        assertEquals(4, rel.leadTime().n());
        assertEquals(5.0, rel.leadTime().media(), 1e-9);
        assertEquals(5.0, rel.leadTime().mediana(), 1e-9);
        assertEquals(6.67, rel.leadTime().variancia(), 1e-9);
        assertEquals(2.0, rel.leadTime().minimo(), 1e-9);
        assertEquals(8.0, rel.leadTime().maximo(), 1e-9);
    }

    @Test
    @DisplayName("a data de referencia e o ultimo evento da base, nao o relogio de hoje")
    void dataDeReferencia() {
        // Sem isso, a espera media dos casos em aberto cresceria um dia a cada
        // dia, e o painel deixaria de bater com o relatorio impresso.
        assertEquals(BASE.plusDays(8), rel.dataReferencia());
        assertEquals(2, rel.esperaEmAberto().n());
        assertEquals(6.0, rel.esperaEmAberto().media(), 1e-9, "esperas de 8 e 4 dias");
    }

    @Test
    @DisplayName("recorte por tipo respeita a ordem de gravidade declarada")
    void leadPorTipo() {
        List<Recorte> r = rel.leadPorTipo();
        assertEquals(2, r.size(), "assedio nao tem caso concluido e deve ser omitido");
        assertEquals("violencia", r.get(0).chave());
        assertEquals(3.0, r.get(0).media(), 1e-9);
        assertEquals("outros", r.get(1).chave());
        assertEquals(7.0, r.get(1).media(), 1e-9);
    }

    @Test
    @DisplayName("fatia com menos de dois casos nao vira estatistica")
    void fatiaPequenaEOmitida() {
        assertTrue(rel.leadPorTipo().stream().noneMatch(x -> x.chave().equals("assedio")));
        assertTrue(rel.leadPorTipo().stream().allMatch(x -> x.n() >= 2));
    }

    @Test
    @DisplayName("correlacao entre score e lead time")
    void correlacao() {
        assertEquals(4, rel.correlacaoScoreLead().n());
        assertEquals(-0.8, rel.correlacaoScoreLead().r(), 1e-9);
        assertTrue(rel.correlacaoScoreLead().leitura().contains("negativa"));
    }

    @Test
    @DisplayName("score medio separado por escolha de anonimato")
    void scorePorAnonimato() {
        List<Recorte> r = rel.scorePorAnonimato();
        assertEquals("anonimas", r.get(0).chave());
        assertEquals(67.5, r.get(0).media(), 1e-9);
        assertEquals("identificadas", r.get(1).chave());
        assertEquals(35.0, r.get(1).media(), 1e-9);
    }

    @Test
    @DisplayName("histograma cobre todos os casos, com a ultima faixa aberta")
    void histograma() {
        assertEquals(8, rel.histogramaLeadTime().size());
        assertEquals(4, rel.histogramaLeadTime().stream().mapToLong(f -> f.n()).sum());
        assertEquals("14+", rel.histogramaLeadTime().get(7).rotulo());
        assertEquals(-1, rel.histogramaLeadTime().get(7).ate(), 1e-9, "faixa sem limite superior");
    }

    @Test
    @DisplayName("cumprimento de prazo e cumulativo e chega a 100%")
    void prazos() {
        assertEquals(5, rel.cumprimentoDePrazo().size());
        assertEquals(2, rel.cumprimentoDePrazo().get(0).dias());
        assertEquals(1, rel.cumprimentoDePrazo().get(0).n());
        assertEquals(100.0, rel.cumprimentoDePrazo().get(4).percentual(), 1e-9);
    }

    @Test
    @DisplayName("dispersao nao carrega protocolo, data nem municipio")
    void dispersaoSemIdentificacao() {
        assertEquals(4, rel.dispersaoScoreLead().size());
        // O record so tem dois componentes; se alguem acrescentar um campo
        // identificador no futuro, este teste passa a falhar.
        assertEquals(2, RelatorioAnaliticoResponse.Ponto.class.getRecordComponents().length);
    }

    @Test
    @DisplayName("distribuicoes vem ordenadas da maior para a menor")
    void distribuicoesOrdenadas() {
        List<Long> valores = List.copyOf(rel.porStatus().values());
        for (int i = 1; i < valores.size(); i++) {
            assertTrue(valores.get(i - 1) >= valores.get(i), "porStatus fora de ordem");
        }
        assertEquals(4L, rel.porStatus().get("concluida"));
        assertEquals(2L, rel.porStatus().get("recebida"));
    }
}
