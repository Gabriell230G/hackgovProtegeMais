package br.gov.protege.service;

import br.gov.protege.exception.ArquivoGrandeDemaisException;
import br.gov.protege.exception.FormatoNaoSuportadoException;
import br.gov.protege.exception.RegraDeNegocioException;
import br.gov.protege.model.Evidencia;
import br.gov.protege.repository.EvidenciaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mockito;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Grava em diretorio temporario de verdade, e nao num mock de sistema de
 * arquivos: metade das garantias aqui - nome gerado, arquivo fora da pasta
 * publica, hash conferido na leitura - so existem quando ha disco envolvido.
 */
@DisplayName("Armazenamento de evidencias")
class EvidenciaServiceTest {

    @TempDir
    Path diretorio;

    private EvidenciaRepository repo;
    private EvidenciaService svc;
    private final List<Evidencia> gravadas = new ArrayList<>();

    /** PNG minimo valido: assinatura correta seguida de conteudo qualquer. */
    private byte[] png(int tamanho) {
        byte[] b = new byte[Math.max(tamanho, 8)];
        int[] marca = {0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        for (int i = 0; i < marca.length; i++) b[i] = (byte) marca[i];
        return b;
    }

    @BeforeEach
    void preparar() {
        gravadas.clear();
        repo = Mockito.mock(EvidenciaRepository.class);
        Mockito.when(repo.save(Mockito.any(Evidencia.class))).thenAnswer(inv -> {
            Evidencia e = inv.getArgument(0);
            if (e.getId() == null) e.setId((long) (gravadas.size() + 1));
            gravadas.removeIf(x -> x.getId().equals(e.getId()));
            gravadas.add(e);
            return e;
        });
        Mockito.when(repo.countByDenunciaIdAndRemovidaFalse(Mockito.anyLong()))
               .thenAnswer(inv -> (long) gravadas.size());
        Mockito.when(repo.findByIdAndRemovidaFalse(Mockito.anyLong()))
               .thenAnswer(inv -> gravadas.stream()
                       .filter(e -> e.getId().equals(inv.getArgument(0))).findFirst());

        svc = new EvidenciaService(repo, diretorio.toString());
    }

    @Test
    @DisplayName("o arquivo no disco recebe UUID, e nao o nome enviado pelo usuario")
    void nomeDoUsuarioNaoChegaAoDisco() throws Exception {
        Evidencia ev = svc.guardar(1L, png(64), "../../etc/passwd.png");

        assertEquals("passwd.png", ev.getNomeOriginal(), "o nome exibido perde o caminho");
        assertNotEquals("passwd.png", ev.getNomeArmazenado());
        assertTrue(ev.getNomeArmazenado().matches("[0-9a-f-]{36}"), "deve ser um UUID");

        List<Path> noDisco = Files.list(diretorio).toList();
        assertEquals(1, noDisco.size());
        assertEquals(ev.getNomeArmazenado(), noDisco.get(0).getFileName().toString(),
                "nenhum arquivo com nome do usuario aparece na pasta");
    }

    @Test
    @DisplayName("arquivo acima do limite dá 413, e não 422")
    void arquivoGrandeDemais() {
        byte[] gigante = png((int) EvidenciaService.TAMANHO_MAXIMO + 1);
        assertThrows(ArquivoGrandeDemaisException.class, () -> svc.guardar(1L, gigante, "foto.png"));
        assertEquals(0, gravadas.size(), "nada e gravado quando o arquivo e recusado");
    }

    @Test
    @DisplayName("executável renomeado para .png dá 415")
    void formatoRecusado() {
        byte[] exe = {0x4D, 0x5A, (byte) 0x90, 0x00, 0x03, 0x00, 0x00, 0x00};
        assertThrows(FormatoNaoSuportadoException.class, () -> svc.guardar(1L, exe, "foto.png"));
    }

    @Test
    @DisplayName("arquivo vazio é recusado antes de tocar no disco")
    void arquivoVazio() {
        assertThrows(RegraDeNegocioException.class, () -> svc.guardar(1L, new byte[0], "x.png"));
        assertThrows(RegraDeNegocioException.class, () -> svc.guardar(1L, null, "x.png"));
    }

    @Test
    @DisplayName("o hash grava o SHA-256 do conteúdo recebido")
    void hashDoConteudo() {
        Evidencia ev = svc.guardar(1L, png(32), "a.png");
        assertEquals(64, ev.getHashSha256().length());
        assertEquals(EvidenciaService.sha256(png(32)), ev.getHashSha256());
    }

    @Test
    @DisplayName("arquivo trocado no disco tem a leitura recusada")
    void detectaTrocaNoDisco() throws Exception {
        Evidencia ev = svc.guardar(1L, png(64), "a.png");
        assertArrayEquals(png(64), svc.conteudo(ev), "antes da adulteracao, le normalmente");

        // Alguem com acesso ao disco substitui o arquivo por outro PNG valido.
        Files.write(diretorio.resolve(ev.getNomeArmazenado()), png(128));

        assertThrows(RegraDeNegocioException.class, () -> svc.conteudo(ev),
                "entregar como evidencia um arquivo que nao e mais o recebido "
                + "seria pior do que nao entregar nada");
    }

    @Test
    @DisplayName("teto de arquivos por denúncia é respeitado")
    void limitePorDenuncia() {
        for (int i = 0; i < EvidenciaService.MAXIMO_POR_DENUNCIA; i++) {
            svc.guardar(1L, png(16 + i), "f" + i + ".png");
        }
        assertThrows(RegraDeNegocioException.class, () -> svc.guardar(1L, png(99), "extra.png"));
    }

    @Test
    @DisplayName("remoção apaga o binário e mantém o registro")
    void remocaoLogica() throws Exception {
        Evidencia ev = svc.guardar(1L, png(64), "a.png");
        Path arquivo = diretorio.resolve(ev.getNomeArmazenado());
        assertTrue(Files.exists(arquivo));

        svc.remover(ev.getId(), "duplicado");

        assertFalse(Files.exists(arquivo), "nao ha como anonimizar uma foto: o binario e destruido");
        assertTrue(ev.isRemovida());
        assertEquals("duplicado", ev.getMotivoRemocao());
        assertNotNull(ev.getRemovidaEm(), "o registro fica, com motivo e data");
    }

    @Test
    @DisplayName("remoção sem motivo é recusada")
    void remocaoExigeMotivo() {
        Evidencia ev = svc.guardar(1L, png(32), "a.png");
        assertThrows(RegraDeNegocioException.class, () -> svc.remover(ev.getId(), "  "));
        assertFalse(ev.isRemovida());
    }
}
