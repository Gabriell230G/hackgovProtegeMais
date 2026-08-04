package br.gov.protege.service;

import br.gov.protege.model.AuditoriaLog;
import br.gov.protege.repository.AuditoriaLogRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Verifica que o encadeamento por hash realmente detecta adulteracao.
 *
 * Um mecanismo de integridade que nunca acusa nada nao prova que funciona.
 * Estes testes adulteram a trilha de proposito e exigem que o sistema
 * aponte onde e de que tipo foi a alteracao.
 */
@DisplayName("Trilha de auditoria encadeada por hash")
class AuditoriaServiceTest {

    private List<AuditoriaLog> banco;
    private AuditoriaService servico;

    @BeforeEach
    void setUp() {
        banco = new ArrayList<>();
        AuditoriaLogRepository repo = mock(AuditoriaLogRepository.class);

        when(repo.save(any(AuditoriaLog.class))).thenAnswer(inv -> {
            AuditoriaLog a = inv.getArgument(0);
            if (a.getId() == null) {
                a.setId((long) (banco.size() + 1));
                banco.add(a);
            }
            return a;
        });
        when(repo.findFirstByOrderByIdDesc()).thenAnswer(inv ->
                banco.isEmpty() ? Optional.empty() : Optional.of(banco.get(banco.size() - 1)));
        when(repo.findAllByOrderByIdAsc()).thenAnswer(inv -> new ArrayList<>(banco));

        servico = new AuditoriaService(repo);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void tresEventos() {
        servico.registrarLogin("gestor@protege.gov.br", "GESTOR", true);
        servico.registrar(AuditoriaService.CONSULTA_SENSIVEL, "Denuncia", "42");
        servico.registrar(AuditoriaService.ALTERACAO_STATUS, "Denuncia", "42");
    }

    @Test
    @DisplayName("cadeia recem-gravada esta integra")
    void cadeiaIntacta() {
        tresEventos();
        Map<String, Object> res = servico.verificarIntegridade();

        assertEquals(3, res.get("totalDeRegistros"));
        assertEquals(true, res.get("integra"));
    }

    @Test
    @DisplayName("o primeiro registro aponta para a genese")
    void primeiroApontaParaGenese() {
        tresEventos();
        assertEquals(AuditoriaService.GENESE, banco.get(0).getHashAnterior());
    }

    @Test
    @DisplayName("cada elo aponta para o hash do antecessor")
    void elosEncadeados() {
        tresEventos();
        for (int i = 1; i < banco.size(); i++) {
            assertEquals(banco.get(i - 1).getHash(), banco.get(i).getHashAnterior(),
                    "elo rompido entre os registros " + i + " e " + (i + 1));
        }
    }

    @Test
    @DisplayName("alterar o conteudo de um registro e detectado")
    void detectaConteudoAlterado() {
        tresEventos();

        // Alguem edita a trilha direto no banco para esconder uma consulta.
        banco.get(1).setUsuario("outro@protege.gov.br");

        Map<String, Object> res = servico.verificarIntegridade();
        assertEquals(false, res.get("integra"));
        assertEquals(2L, res.get("rompidoNoRegistro"));
        assertTrue(String.valueOf(res.get("motivo")).contains("alterado"));
    }

    @Test
    @DisplayName("remover um registro do meio da cadeia e detectado")
    void detectaRegistroRemovido() {
        tresEventos();

        // Alguem apaga o registro do meio para sumir com o rastro.
        banco.remove(1);

        Map<String, Object> res = servico.verificarIntegridade();
        assertEquals(false, res.get("integra"));
        assertTrue(String.valueOf(res.get("motivo")).contains("removido"));
    }

    @Test
    @DisplayName("tentativa de login recusada tambem entra na trilha")
    void registraTentativaRecusada() {
        servico.registrarLogin("invasor@exemplo.com", null, false);

        AuditoriaLog reg = banco.get(0);
        assertEquals(AuditoriaService.LOGIN_NEGADO, reg.getAcao());
        assertEquals(AuditoriaService.NEGADO, reg.getResultado());
        assertEquals("invasor@exemplo.com", reg.getUsuario());
    }

    @Test
    @DisplayName("o carimbo de tempo e truncado, para o hash sobreviver ao banco")
    void carimboTruncado() {
        tresEventos();
        assertEquals(0, banco.get(0).getDataHora().getNano() % 1_000_000,
                "precisao acima de milissegundos se perde na coluna TIMESTAMP e quebraria o hash");
    }
}
