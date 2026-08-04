package br.gov.protege.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Uma denuncia registrada no canal.
 */
/*
 * Os indices desta tabela (status, tipo, estado, data) nao sao declarados
 * aqui: eles vivem no script DDL do Oracle, que e o artefato de modelagem
 * fisica entregue e explicado na documentacao. Declara-los tambem na
 * entidade duplicaria a definicao em dois lugares e faria o Hibernate
 * tentar recria-los a cada inicializacao no banco de demonstracao.
 */
@Entity
@Table(name = "denuncia")
public class Denuncia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Protocolo publico exibido ao cidadao. Ex: #2026-00451 */
    @Column(unique = true, nullable = false, length = 20)
    private String protocolo;

    /** violencia | assedio | abuso | discriminacao | outros */
    @Column(length = 20)
    private String tipo;

    /** Cidade, UF. Coluna "localidade" pois LOCAL e palavra reservada no SQL. */
    @Column(name = "localidade", length = 120)
    private String local;

    @Column(length = 2)
    private String estado;

    @Column(length = 80)
    private String cidade;

    @Column(length = 200)
    private String endereco;

    @Column(length = 4000)
    private String descricao;

    /** recebida | analise | encaminhada | concluida */
    @Column(length = 20)
    private String status = "recebida";

    private boolean anonimo = true;

    /** Score de confiabilidade 0-100 e sua classificacao. */
    private int score;

    @Column(length = 10)
    private String scoreLabel;  // low | medium | high

    @Column(length = 10)
    private String scoreTxt;    // Baixa | Media | Alta

    /** Urgencia sugerida pela IA (VigIA): CRITICA | ALTA | MEDIA | BAIXA */
    @Column(length = 10)
    private String urgenciaIa;

    @Column(length = 2000)
    private String resumoIa;

    /**
     * Declara se a urgencia veio do modelo de IA ou das regras explicaveis.
     * Decisao automatizada em servico publico precisa poder ser justificada:
     * sem este campo, nao haveria como saber depois o que classificou o caso.
     */
    @Column(name = "origem_analise", length = 10)
    private String origemAnalise;

    /** Id do membro da equipe responsavel (Kanban do gestor). */
    @Column(name = "responsavel_id")
    private Long responsavelId;

    private LocalDateTime criadoEm = LocalDateTime.now();

    /**
     * Momento em que o caso foi concluido. Guardado explicitamente para
     * que o lead time (Parte 4) seja calculado por consulta ao banco e
     * nao por varredura da linha do tempo em memoria.
     */
    @Column(name = "concluida_em")
    private LocalDateTime concluidaEm;

    /**
     * Exclusao logica. O registro nunca e removido fisicamente: a LGPD
     * exige poder eliminar o dado, mas a administracao publica exige
     * poder provar o que aconteceu. Guardamos o fato da exclusao e o
     * motivo, e o conteudo sensivel e anonimizado no momento da exclusao.
     */
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean excluida = false;

    @Column(length = 300)
    private String motivoExclusao;

    private LocalDateTime excluidaEm;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "denuncia_historico", joinColumns = @JoinColumn(name = "denuncia_id"))
    @OrderColumn(name = "ordem")
    private List<HistoricoItem> historico = new ArrayList<>();

    public Denuncia() {}

    // Getters e setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getProtocolo() { return protocolo; }
    public void setProtocolo(String protocolo) { this.protocolo = protocolo; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getLocal() { return local; }
    public void setLocal(String local) { this.local = local; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }

    public String getEndereco() { return endereco; }
    public void setEndereco(String endereco) { this.endereco = endereco; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isAnonimo() { return anonimo; }
    public void setAnonimo(boolean anonimo) { this.anonimo = anonimo; }

    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }

    public String getScoreLabel() { return scoreLabel; }
    public void setScoreLabel(String scoreLabel) { this.scoreLabel = scoreLabel; }

    public String getScoreTxt() { return scoreTxt; }
    public void setScoreTxt(String scoreTxt) { this.scoreTxt = scoreTxt; }

    public String getUrgenciaIa() { return urgenciaIa; }
    public void setUrgenciaIa(String urgenciaIa) { this.urgenciaIa = urgenciaIa; }

    public String getResumoIa() { return resumoIa; }
    public void setResumoIa(String resumoIa) { this.resumoIa = resumoIa; }

    public String getOrigemAnalise() { return origemAnalise; }
    public void setOrigemAnalise(String origemAnalise) { this.origemAnalise = origemAnalise; }

    public Long getResponsavelId() { return responsavelId; }
    public void setResponsavelId(Long responsavelId) { this.responsavelId = responsavelId; }

    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }

    public LocalDateTime getConcluidaEm() { return concluidaEm; }
    public void setConcluidaEm(LocalDateTime concluidaEm) { this.concluidaEm = concluidaEm; }

    public boolean isExcluida() { return excluida; }
    public void setExcluida(boolean excluida) { this.excluida = excluida; }

    public String getMotivoExclusao() { return motivoExclusao; }
    public void setMotivoExclusao(String motivoExclusao) { this.motivoExclusao = motivoExclusao; }

    public LocalDateTime getExcluidaEm() { return excluidaEm; }
    public void setExcluidaEm(LocalDateTime excluidaEm) { this.excluidaEm = excluidaEm; }

    public List<HistoricoItem> getHistorico() { return historico; }
    public void setHistorico(List<HistoricoItem> historico) { this.historico = historico; }
}
