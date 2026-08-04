package br.gov.protege.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Registro da trilha de auditoria.
 *
 * Diferenca para o log tecnico
 * ----------------------------
 * O log tecnico responde "o sistema esta saudavel?" - e volatil, verboso,
 * escrito para quem opera a infraestrutura e pode ser descartado por
 * rotacao. Este registro responde "quem fez o que, quando e com qual
 * resultado?" - e persistente, tem valor probatorio e responde a
 * exigencias de transparencia da administracao publica.
 *
 * Encadeamento por hash
 * ---------------------
 * Cada registro guarda o hash do anterior e o proprio. Alterar um registro
 * no meio da cadeia invalida todos os hashes seguintes, e a verificacao de
 * integridade aponta exatamente onde a cadeia foi rompida. Nao impede a
 * adulteracao - impede que ela passe despercebida.
 *
 * O que NAO entra aqui
 * --------------------
 * O conteudo do relato da denuncia. A trilha registra QUE alguem consultou
 * a denuncia 42; nao copia o que estava escrito nela. Caso contrario a
 * propria auditoria viraria uma segunda base de dados sensiveis.
 */
@Entity
@Table(name = "auditoria_log")
public class AuditoriaLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime dataHora;

    /** Identificacao de quem executou a acao. */
    @Column(length = 150)
    private String usuario;

    @Column(length = 20)
    private String perfil;

    /** ALTERACAO_STATUS, CONSULTA_SENSIVEL, EXPORTACAO, EXCLUSAO, LOGIN... */
    @Column(nullable = false, length = 40)
    private String acao;

    @Column(length = 40)
    private String recurso;

    @Column(length = 60)
    private String recursoId;

    /** PERMITIDO | NEGADO | ERRO. Tentativa recusada tambem e informacao. */
    @Column(nullable = false, length = 12)
    private String resultado;

    @Column(length = 45)
    private String origemIp;

    @Column(length = 200)
    private String userAgent;

    /** Descricao curta e nao sensivel do que ocorreu. */
    @Column(length = 300)
    private String detalhe;

    @Column(length = 64)
    private String hashAnterior;

    @Column(length = 64)
    private String hash;

    public AuditoriaLog() {}

    /** Texto canonico que entra no calculo do hash. */
    public String conteudoParaHash() {
        return String.join("|",
                String.valueOf(dataHora),
                nz(usuario), nz(perfil), nz(acao), nz(recurso), nz(recursoId),
                nz(resultado), nz(origemIp), nz(detalhe), nz(hashAnterior));
    }

    private String nz(String s) { return s == null ? "" : s; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDateTime getDataHora() { return dataHora; }
    public void setDataHora(LocalDateTime dataHora) { this.dataHora = dataHora; }

    public String getUsuario() { return usuario; }
    public void setUsuario(String usuario) { this.usuario = usuario; }

    public String getPerfil() { return perfil; }
    public void setPerfil(String perfil) { this.perfil = perfil; }

    public String getAcao() { return acao; }
    public void setAcao(String acao) { this.acao = acao; }

    public String getRecurso() { return recurso; }
    public void setRecurso(String recurso) { this.recurso = recurso; }

    public String getRecursoId() { return recursoId; }
    public void setRecursoId(String recursoId) { this.recursoId = recursoId; }

    public String getResultado() { return resultado; }
    public void setResultado(String resultado) { this.resultado = resultado; }

    public String getOrigemIp() { return origemIp; }
    public void setOrigemIp(String origemIp) { this.origemIp = origemIp; }

    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }

    public String getDetalhe() { return detalhe; }
    public void setDetalhe(String detalhe) { this.detalhe = detalhe; }

    public String getHashAnterior() { return hashAnterior; }
    public void setHashAnterior(String hashAnterior) { this.hashAnterior = hashAnterior; }

    public String getHash() { return hash; }
    public void setHash(String hash) { this.hash = hash; }
}
