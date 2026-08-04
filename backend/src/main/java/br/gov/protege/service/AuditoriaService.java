package br.gov.protege.service;

import br.gov.protege.model.AuditoriaLog;
import br.gov.protege.repository.AuditoriaLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Gravacao e verificacao da trilha de auditoria.
 *
 * A gravacao e sincronizada porque o encadeamento por hash exige ler o
 * ultimo registro antes de escrever o proximo. Duas gravacoes simultaneas
 * poderiam apontar para o mesmo antecessor e quebrar a cadeia. Numa
 * aplicacao de maior porte isso seria resolvido com uma sequencia no banco
 * ou uma fila dedicada; aqui a serializacao e suficiente e explicita.
 */
@Service
public class AuditoriaService {

    private static final Logger log = LoggerFactory.getLogger(AuditoriaService.class);

    /** Acoes que a comanda define como geradoras de trilha. */
    public static final String ALTERACAO_STATUS  = "ALTERACAO_STATUS";
    public static final String CONSULTA_SENSIVEL = "CONSULTA_SENSIVEL";
    public static final String EXPORTACAO        = "EXPORTACAO";
    public static final String EXCLUSAO          = "EXCLUSAO";
    public static final String LOGIN             = "LOGIN";
    public static final String LOGIN_NEGADO      = "LOGIN_NEGADO";
    public static final String ATRIBUICAO        = "ATRIBUICAO";
    public static final String REANALISE_IA      = "REANALISE_IA";
    public static final String ALTERACAO_DADOS   = "ALTERACAO_DADOS";
    public static final String ALTERACAO_EQUIPE  = "ALTERACAO_EQUIPE";
    public static final String ACESSO_AUDITORIA  = "ACESSO_AUDITORIA";

    public static final String PERMITIDO = "PERMITIDO";
    public static final String NEGADO    = "NEGADO";
    public static final String ERRO      = "ERRO";

    /** Valor do hash anterior no primeiro registro da cadeia. */
    public static final String GENESE = "0".repeat(64);

    private final AuditoriaLogRepository repo;

    public AuditoriaService(AuditoriaLogRepository repo) {
        this.repo = repo;
    }

    // ------------------------------------------------------------------
    /**
     * Grava um evento na trilha.
     *
     * O carimbo de tempo e truncado a milissegundos de proposito. O relogio
     * da JVM tem precisao de nanossegundos, mas a coluna TIMESTAMP do banco
     * guarda menos casas - e o hash calculado antes de gravar deixaria de
     * bater com o recalculado na leitura, acusando adulteracao onde houve
     * apenas perda de precisao. Truncar antes de calcular resolve na origem.
     */
    public synchronized AuditoriaLog registrar(String acao, String recurso, String recursoId,
                                               String resultado, String detalhe) {
        return gravar(acao, recurso, recursoId, resultado, detalhe, null, null);
    }

    /** Atalho para o caminho feliz. */
    public AuditoriaLog registrar(String acao, String recurso, String recursoId) {
        return registrar(acao, recurso, recursoId, PERMITIDO, null);
    }

    /**
     * Registro de tentativa de autenticacao.
     *
     * Precisa de metodo proprio porque no momento do login ainda nao existe
     * usuario no contexto de seguranca - e porque a tentativa RECUSADA e
     * justamente o evento mais relevante para investigar acesso indevido.
     */
    public synchronized AuditoriaLog registrarLogin(String email, String perfil, boolean sucesso) {
        return gravar(
                sucesso ? LOGIN : LOGIN_NEGADO,
                "Usuario",
                email,
                sucesso ? PERMITIDO : NEGADO,
                sucesso ? "Autenticacao bem-sucedida" : "Credenciais invalidas",
                email,
                perfil == null ? "DESCONHECIDO" : perfil);
    }

    private AuditoriaLog gravar(String acao, String recurso, String recursoId,
                                String resultado, String detalhe,
                                String usuarioExplicito, String perfilExplicito) {

        AuditoriaLog reg = new AuditoriaLog();
        reg.setDataHora(LocalDateTime.now().truncatedTo(ChronoUnit.MILLIS));
        reg.setAcao(acao);
        reg.setRecurso(recurso);
        reg.setRecursoId(recursoId);
        reg.setResultado(resultado);
        reg.setDetalhe(truncar(detalhe, 300));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        reg.setUsuario(usuarioExplicito != null ? usuarioExplicito
                     : (auth == null ? "anonimo" : auth.getName()));
        reg.setPerfil(perfilExplicito != null ? perfilExplicito : perfilDe(auth));

        HttpServletRequest req = requisicaoAtual();
        if (req != null) {
            reg.setOrigemIp(ipDe(req));
            reg.setUserAgent(truncar(req.getHeader("User-Agent"), 200));
        }

        String anterior = repo.findFirstByOrderByIdDesc()
                .map(AuditoriaLog::getHash)
                .orElse(GENESE);
        reg.setHashAnterior(anterior);
        reg.setHash(sha256(reg.conteudoParaHash()));

        AuditoriaLog salvo = repo.save(reg);
        log.debug("Auditoria #{} {} {} por {}", salvo.getId(), acao, recursoId, salvo.getUsuario());
        return salvo;
    }

    // ------------------------------------------------------------------
    /**
     * Percorre a cadeia e aponta o primeiro elo rompido.
     *
     * Detecta dois tipos de adulteracao: campo alterado (o hash recalculado
     * nao bate com o gravado) e registro removido ou inserido no meio
     * (o hashAnterior nao corresponde ao hash do antecessor).
     */
    public Map<String, Object> verificarIntegridade() {
        List<AuditoriaLog> todos = repo.findAllByOrderByIdAsc();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("totalDeRegistros", todos.size());

        String esperado = GENESE;
        for (AuditoriaLog r : todos) {
            if (!esperado.equals(r.getHashAnterior())) {
                out.put("integra", false);
                out.put("rompidoNoRegistro", r.getId());
                out.put("motivo", "O elo anterior nao corresponde: registro removido ou inserido na cadeia");
                return out;
            }
            String recalculado = sha256(r.conteudoParaHash());
            if (!recalculado.equals(r.getHash())) {
                out.put("integra", false);
                out.put("rompidoNoRegistro", r.getId());
                out.put("motivo", "O conteudo do registro foi alterado apos a gravacao");
                return out;
            }
            esperado = r.getHash();
        }

        out.put("integra", true);
        out.put("motivo", "Cadeia intacta: todos os elos conferem");
        return out;
    }

    // ------------------------------------------------------------------
    private String perfilDe(Authentication auth) {
        if (auth == null || auth.getAuthorities() == null) return "ANONIMO";
        return auth.getAuthorities().stream()
                .map(a -> a.getAuthority().replaceFirst("^ROLE_", ""))
                .findFirst()
                .orElse("ANONIMO");
    }

    private HttpServletRequest requisicaoAtual() {
        var attrs = RequestContextHolder.getRequestAttributes();
        return (attrs instanceof ServletRequestAttributes s) ? s.getRequest() : null;
    }

    /** Respeita o cabecalho de proxy quando presente, sem confiar cegamente nele. */
    private String ipDe(HttpServletRequest req) {
        String encaminhado = req.getHeader("X-Forwarded-For");
        if (encaminhado != null && !encaminhado.isBlank()) {
            return truncar(encaminhado.split(",")[0].trim(), 45);
        }
        return truncar(req.getRemoteAddr(), 45);
    }

    private String truncar(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }

    static String sha256(String texto) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] bytes = md.digest(texto.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(64);
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 indisponivel na JVM", e);
        }
    }
}
