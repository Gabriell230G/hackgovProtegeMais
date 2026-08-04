package br.gov.protege.service;

import br.gov.protege.model.Denuncia;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.PriorityQueue;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Fila de prioridade do atendimento")
class FilaAtendimentoServiceTest {

    private Denuncia denuncia(long id, String urgencia, int score, LocalDateTime criadoEm) {
        Denuncia d = new Denuncia();
        d.setId(id);
        d.setProtocolo("#2026-" + id);
        d.setUrgenciaIa(urgencia);
        d.setScore(score);
        d.setCriadoEm(criadoEm);
        d.setStatus("recebida");
        return d;
    }

    private PriorityQueue<Denuncia> filaCom(Denuncia... itens) {
        PriorityQueue<Denuncia> fila =
                new PriorityQueue<>(FilaAtendimentoService.ordemDeAtendimento());
        for (Denuncia d : itens) fila.offer(d);
        return fila;
    }

    @Test
    @DisplayName("caso critico vai ao topo mesmo com score baixo e chegada recente")
    void urgenciaVenceScore() {
        LocalDateTime antiga = LocalDateTime.of(2026, 4, 1, 9, 0);
        LocalDateTime agora  = LocalDateTime.of(2026, 4, 30, 9, 0);

        PriorityQueue<Denuncia> fila = filaCom(
                denuncia(1, "BAIXA",   95, antiga),
                denuncia(2, "MEDIA",   80, antiga),
                denuncia(3, "CRITICA", 20, agora));

        assertEquals(3L, fila.poll().getId().longValue(), "o caso CRITICA deve ser atendido primeiro");
    }

    @Test
    @DisplayName("empate de urgencia e decidido pelo maior score")
    void desempatePorScore() {
        LocalDateTime t = LocalDateTime.of(2026, 4, 10, 12, 0);
        PriorityQueue<Denuncia> fila = filaCom(
                denuncia(1, "ALTA", 40, t),
                denuncia(2, "ALTA", 90, t));

        assertEquals(2L, fila.poll().getId().longValue());
    }

    @Test
    @DisplayName("empate de urgencia e score e decidido pela denuncia mais antiga")
    void desempatePorAntiguidade() {
        PriorityQueue<Denuncia> fila = filaCom(
                denuncia(1, "ALTA", 50, LocalDateTime.of(2026, 4, 20, 8, 0)),
                denuncia(2, "ALTA", 50, LocalDateTime.of(2026, 4, 5, 8, 0)));

        assertEquals(2L, fila.poll().getId().longValue(), "sem este criterio, casos antigos ficariam em inanicao");
    }

    @Test
    @DisplayName("urgencia ausente ou desconhecida vai para o fim, nunca quebra a ordenacao")
    void urgenciaIndefinida() {
        LocalDateTime t = LocalDateTime.of(2026, 4, 10, 12, 0);
        PriorityQueue<Denuncia> fila = filaCom(
                denuncia(1, null,        99, t),
                denuncia(2, "INVENTADA", 99, t),
                denuncia(3, "BAIXA",     10, t));

        assertEquals(3L, fila.poll().getId().longValue());
        assertNotNull(fila.poll());
        assertNotNull(fila.poll());
        assertTrue(fila.isEmpty());
    }

    @Test
    @DisplayName("a fila drena na ordem correta de ponta a ponta")
    void ordemCompleta() {
        LocalDateTime t = LocalDateTime.of(2026, 4, 10, 12, 0);
        PriorityQueue<Denuncia> fila = filaCom(
                denuncia(1, "BAIXA",   10, t),
                denuncia(2, "CRITICA", 10, t),
                denuncia(3, "MEDIA",   10, t),
                denuncia(4, "ALTA",    10, t));

        assertEquals(2L, fila.poll().getId().longValue());  // CRITICA
        assertEquals(4L, fila.poll().getId().longValue());  // ALTA
        assertEquals(3L, fila.poll().getId().longValue());  // MEDIA
        assertEquals(1L, fila.poll().getId().longValue());  // BAIXA
    }

    @Test
    @DisplayName("o comparador e consistente: nao lanca excecao com muitos elementos")
    void comparadorConsistente() {
        PriorityQueue<Denuncia> fila =
                new PriorityQueue<>(FilaAtendimentoService.ordemDeAtendimento());
        String[] urgencias = {"CRITICA", "ALTA", "MEDIA", "BAIXA", null};
        for (int i = 0; i < 200; i++) {
            fila.offer(denuncia(i, urgencias[i % urgencias.length], i % 100,
                    LocalDateTime.of(2026, 1, 1, 0, 0).plusHours(i)));
        }
        assertDoesNotThrow(() -> { while (!fila.isEmpty()) fila.poll(); });
    }
}
