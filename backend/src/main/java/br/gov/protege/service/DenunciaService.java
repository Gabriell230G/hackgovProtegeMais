package br.gov.protege.service;

import br.gov.protege.dto.DenunciaRequest;
import br.gov.protege.model.Denuncia;
import br.gov.protege.model.HistoricoItem;
import br.gov.protege.repository.DenunciaRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.Year;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class DenunciaService {

    private final DenunciaRepository repo;
    private final ScoreService scoreService;
    private final VigiaService vigia;

    private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");

    public DenunciaService(DenunciaRepository repo, ScoreService scoreService, VigiaService vigia) {
        this.repo = repo;
        this.scoreService = scoreService;
        this.vigia = vigia;
    }

    /** Registra uma nova denuncia: gera protocolo, score, analise de IA e historico. */
    public Denuncia registrar(DenunciaRequest req) {
        Denuncia d = new Denuncia();
        d.setTipo(req.getTipo());
        d.setDescricao(req.getDescricao());
        d.setEstado(req.getEstado());
        d.setCidade(req.getCidade());
        d.setEndereco(req.getEndereco());
        d.setAnonimo(req.isAnonimo());
        d.setLocal(montarLocal(req.getCidade(), req.getEstado()));
        d.setStatus("recebida");
        d.setProtocolo(gerarProtocolo());
        d.setCriadoEm(LocalDateTime.now());

        // Score de confiabilidade
        ScoreService.Resultado sc = scoreService.calcular(req);
        d.setScore(sc.score());
        d.setScoreLabel(sc.label());
        d.setScoreTxt(sc.txt());

        // Analise de IA (VigIA)
        VigiaService.Analise ia = vigia.analisar(d);
        d.setUrgenciaIa(ia.urgencia());
        d.setResumoIa(ia.resumo());

        // Primeiro passo do historico
        d.getHistorico().add(novoPasso("recebida"));

        return repo.save(d);
    }

    public List<Denuncia> listar() {
        return repo.findAllByOrderByCriadoEmDesc();
    }

    public Optional<Denuncia> buscarPorProtocolo(String protocolo) {
        return repo.findByProtocolo(protocolo);
    }

    public Optional<Denuncia> buscarPorId(Long id) {
        return repo.findById(id);
    }

    /** Muda o status e registra o passo no historico. */
    public Optional<Denuncia> atualizarStatus(Long id, String novoStatus) {
        return repo.findById(id).map(d -> {
            d.setStatus(novoStatus);
            d.getHistorico().add(novoPasso(novoStatus));
            return repo.save(d);
        });
    }

    /** Atribui um responsavel (usado no Kanban do gestor). */
    public Optional<Denuncia> atribuirResponsavel(Long id, Long responsavelId) {
        return repo.findById(id).map(d -> {
            d.setResponsavelId(responsavelId);
            return repo.save(d);
        });
    }

    // ---------------------------------------------------------------
    private HistoricoItem novoPasso(String status) {
        LocalDateTime agora = LocalDateTime.now();
        return new HistoricoItem(status, agora.format(DATA), agora.format(HORA));
    }

    private String montarLocal(String cidade, String estado) {
        if (cidade == null || cidade.isBlank()) return estado == null ? "" : estado;
        return estado == null || estado.isBlank() ? cidade : cidade + ", " + estado;
    }

    /** Protocolo publico no formato #ANO-NNNNN. */
    private String gerarProtocolo() {
        String proto;
        do {
            int n = ThreadLocalRandom.current().nextInt(1, 99999);
            proto = String.format("#%d-%05d", Year.now().getValue(), n);
        } while (repo.findByProtocolo(proto).isPresent());
        return proto;
    }
}
