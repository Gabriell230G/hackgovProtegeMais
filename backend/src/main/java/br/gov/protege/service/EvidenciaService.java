package br.gov.protege.service;

import br.gov.protege.exception.ArquivoGrandeDemaisException;
import br.gov.protege.exception.FormatoNaoSuportadoException;
import br.gov.protege.exception.RecursoNaoEncontradoException;
import br.gov.protege.exception.RegraDeNegocioException;
import br.gov.protege.model.Evidencia;
import br.gov.protege.repository.EvidenciaRepository;
import br.gov.protege.util.AssinaturaArquivo;
import br.gov.protege.util.NomeArquivoUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

/**
 * Recebimento, leitura e remocao de evidencias.
 *
 * A ordem das validacoes importa
 * -------------------------------
 * Tamanho primeiro, conteudo depois. Verificar a assinatura exige carregar
 * os bytes; recusar por tamanho antes disso impede que um arquivo de 2 GB
 * seja lido para a memoria so para ser rejeitado no passo seguinte.
 *
 * Onde o arquivo vive
 * -------------------
 * Fora do diretorio servido pelo servidor web, com nome gerado. O caminho
 * final e normalizado e conferido contra o diretorio base: mesmo que algum
 * dia o nome deixe de ser um UUID, a gravacao fora da pasta nao acontece.
 */
@Service
public class EvidenciaService {

    private static final Logger log = LoggerFactory.getLogger(EvidenciaService.class);

    /** 5 MB por arquivo. */
    public static final long TAMANHO_MAXIMO = 5L * 1024 * 1024;

    /** Teto por denuncia: evita que um unico protocolo consuma o disco. */
    public static final int MAXIMO_POR_DENUNCIA = 10;

    private final EvidenciaRepository repo;
    private final Path diretorio;

    public EvidenciaService(EvidenciaRepository repo,
                            @Value("${app.evidencias.dir:./data/evidencias}") String dir) {
        this.repo = repo;
        this.diretorio = Paths.get(dir).toAbsolutePath().normalize();
    }

    /**
     * Grava uma evidencia.
     *
     * @param conteudo       bytes ja lidos do upload
     * @param nomeInformado  nome que o cliente enviou (texto sob controle dele)
     */
    @Transactional
    public Evidencia guardar(Long denunciaId, byte[] conteudo, String nomeInformado) {
        if (conteudo == null || conteudo.length == 0) {
            throw new RegraDeNegocioException("Arquivo vazio");
        }
        if (conteudo.length > TAMANHO_MAXIMO) {
            throw new ArquivoGrandeDemaisException(
                    "Arquivo acima do limite de " + (TAMANHO_MAXIMO / 1024 / 1024) + " MB");
        }
        if (repo.countByDenunciaIdAndRemovidaFalse(denunciaId) >= MAXIMO_POR_DENUNCIA) {
            throw new RegraDeNegocioException(
                    "Limite de " + MAXIMO_POR_DENUNCIA + " arquivos por denuncia atingido");
        }

        // O tipo vem do CONTEUDO. O que o cliente declarou e ignorado.
        String tipo = AssinaturaArquivo.detectar(conteudo);
        if (!AssinaturaArquivo.aceito(tipo)) {
            throw new FormatoNaoSuportadoException(
                    "Formato nao aceito. Envie: " + AssinaturaArquivo.formatosAceitos());
        }

        String armazenado = UUID.randomUUID().toString();
        Path destino = resolverDentroDoDiretorio(armazenado);
        try {
            Files.createDirectories(diretorio);
            Files.write(destino, conteudo);
        } catch (IOException e) {
            log.error("Falha ao gravar evidencia da denuncia {}", denunciaId, e);
            throw new RegraDeNegocioException("Nao foi possivel armazenar o arquivo");
        }

        Evidencia ev = new Evidencia();
        ev.setDenunciaId(denunciaId);
        ev.setNomeOriginal(NomeArquivoUtil.higienizar(nomeInformado));
        ev.setNomeArmazenado(armazenado);
        ev.setTipoConteudo(tipo);
        ev.setTamanhoBytes(conteudo.length);
        ev.setHashSha256(sha256(conteudo));
        ev.setEnviadoEm(LocalDateTime.now());
        return repo.save(ev);
    }

    public List<Evidencia> listar(Long denunciaId) {
        return repo.findByDenunciaIdAndRemovidaFalseOrderByEnviadoEmAsc(denunciaId);
    }

    public Evidencia buscar(Long id) {
        return repo.findByIdAndRemovidaFalse(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Evidencia nao encontrada"));
    }

    /**
     * Le o conteudo do disco conferindo o hash.
     *
     * Se o arquivo tiver sido trocado por fora da aplicacao, o hash nao bate
     * e a leitura e recusada. Entregar como evidencia um arquivo que nao e
     * mais o recebido seria pior do que nao entregar nada.
     */
    public byte[] conteudo(Evidencia ev) {
        Path origem = resolverDentroDoDiretorio(ev.getNomeArmazenado());
        byte[] bytes;
        try {
            bytes = Files.readAllBytes(origem);
        } catch (IOException e) {
            log.error("Evidencia {} ausente no disco", ev.getId(), e);
            throw new RecursoNaoEncontradoException("Arquivo da evidencia nao esta disponivel");
        }
        if (!sha256(bytes).equals(ev.getHashSha256())) {
            log.error("Hash divergente na evidencia {}: arquivo alterado no disco", ev.getId());
            throw new RegraDeNegocioException(
                    "O arquivo armazenado nao corresponde ao que foi recebido");
        }
        return bytes;
    }

    /**
     * Remove logicamente e apaga o binario.
     *
     * O registro permanece com motivo e data. Ao contrario da denuncia, aqui
     * o arquivo e destruido de fato: nao ha como anonimizar uma foto.
     */
    @Transactional
    public void remover(Long id, String motivo) {
        if (motivo == null || motivo.isBlank()) {
            throw new RegraDeNegocioException("A remocao exige um motivo registrado");
        }
        Evidencia ev = buscar(id);
        try {
            Files.deleteIfExists(resolverDentroDoDiretorio(ev.getNomeArmazenado()));
        } catch (IOException e) {
            log.warn("Nao foi possivel apagar o arquivo da evidencia {}", id, e);
        }
        ev.setRemovida(true);
        ev.setRemovidaEm(LocalDateTime.now());
        ev.setMotivoRemocao(motivo);
        repo.save(ev);
    }

    /**
     * Impede que qualquer nome escape do diretorio base.
     *
     * Hoje o nome e sempre um UUID gerado aqui, e a checagem parece
     * redundante. Ela existe para o dia em que alguem decidir usar o nome do
     * usuario "porque fica mais bonito no disco" - defesa que so vale quando
     * ja esta escrita antes de precisar dela.
     */
    private Path resolverDentroDoDiretorio(String nome) {
        Path alvo = diretorio.resolve(nome).normalize();
        if (!alvo.startsWith(diretorio)) {
            throw new RegraDeNegocioException("Caminho de arquivo invalido");
        }
        return alvo;
    }

    static String sha256(byte[] dados) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(dados));
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 indisponivel nesta JVM", e);
        }
    }
}
