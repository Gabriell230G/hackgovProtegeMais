package br.gov.protege.service;

import br.gov.protege.model.AcaoReversivel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Pilha de acoes reversiveis (LIFO)")
class PilhaAcoesServiceTest {

    private PilhaAcoesService pilha;

    @BeforeEach
    void setUp() {
        pilha = new PilhaAcoesService();
    }

    private AcaoReversivel acao(long id, String de, String para) {
        return new AcaoReversivel(id, "#2026-" + id, de, para, LocalDateTime.now());
    }

    @Test
    @DisplayName("desempilha sempre a acao mais recente")
    void ordemLifo() {
        pilha.empilhar("ana@gov.br", acao(1, "recebida", "analise"));
        pilha.empilhar("ana@gov.br", acao(2, "analise", "encaminhada"));
        pilha.empilhar("ana@gov.br", acao(3, "encaminhada", "concluida"));

        assertEquals(3L, pilha.desempilhar("ana@gov.br").denunciaId().longValue());
        assertEquals(2L, pilha.desempilhar("ana@gov.br").denunciaId().longValue());
        assertEquals(1L, pilha.desempilhar("ana@gov.br").denunciaId().longValue());
        assertNull(pilha.desempilhar("ana@gov.br"));
    }

    @Test
    @DisplayName("um servidor nao desfaz a acao de outro")
    void pilhaIsoladaPorUsuario() {
        pilha.empilhar("ana@gov.br", acao(1, "recebida", "analise"));
        pilha.empilhar("carlos@gov.br", acao(2, "recebida", "analise"));

        assertEquals(1, pilha.tamanho("ana@gov.br"));
        assertEquals(1, pilha.tamanho("carlos@gov.br"));
        assertEquals(1L, pilha.desempilhar("ana@gov.br").denunciaId().longValue());
        assertEquals(1, pilha.tamanho("carlos@gov.br"));
    }

    @Test
    @DisplayName("respeita o limite de profundidade descartando a acao mais antiga")
    void respeitaLimite() {
        for (int i = 1; i <= PilhaAcoesService.LIMITE + 5; i++) {
            pilha.empilhar("ana@gov.br", acao(i, "recebida", "analise"));
        }
        assertEquals(PilhaAcoesService.LIMITE, pilha.tamanho("ana@gov.br"));
        assertEquals((long) (PilhaAcoesService.LIMITE + 5), pilha.topo("ana@gov.br").denunciaId().longValue());
    }

    @Test
    @DisplayName("consultar o topo nao remove o elemento")
    void topoNaoRemove() {
        pilha.empilhar("ana@gov.br", acao(7, "recebida", "analise"));
        assertEquals(7L, pilha.topo("ana@gov.br").denunciaId().longValue());
        assertEquals(1, pilha.tamanho("ana@gov.br"));
    }

    @Test
    @DisplayName("pilha vazia devolve null em vez de lancar excecao")
    void pilhaVazia() {
        assertNull(pilha.desempilhar("ninguem@gov.br"));
        assertNull(pilha.topo("ninguem@gov.br"));
        assertEquals(0, pilha.tamanho("ninguem@gov.br"));
    }
}
