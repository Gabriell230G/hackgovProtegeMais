package br.gov.protege.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Uma denuncia registrada no canal. Os campos espelham exatamente o
 * objeto usado no frontend (main.js), para integracao direta.
 */
@Entity
@Table(name = "denuncia")
public class Denuncia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Protocolo publico exibido ao cidadao. Ex: #2026-00451 */
    @Column(unique = true, nullable = false)
    private String protocolo;

    /** violencia | assedio | abuso | discriminacao | outros */
    private String tipo;

    /** Cidade, UF. Ex: "Sao Paulo, SP". Coluna "localidade" pois LOCAL e palavra reservada no SQL. */
    @Column(name = "localidade")
    private String local;

    private String estado;
    private String cidade;
    private String endereco;

    @Column(length = 4000)
    private String descricao;

    /** recebida | analise | encaminhada | concluida */
    private String status = "recebida";

    private boolean anonimo = true;

    /** Score de confiabilidade 0-100 e sua classificacao. */
    private int score;
    private String scoreLabel;  // low | medium | high
    private String scoreTxt;    // Baixa | Media | Alta

    /** Urgencia sugerida pela IA (VigIA). Ex: CRITICA | ALTA | MEDIA | BAIXA */
    private String urgenciaIa;

    @Column(length = 2000)
    private String resumoIa;

    /** Id do membro da equipe responsavel (Kanban do gestor). */
    private Long responsavelId;

    private LocalDateTime criadoEm = LocalDateTime.now();

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

    public Long getResponsavelId() { return responsavelId; }
    public void setResponsavelId(Long responsavelId) { this.responsavelId = responsavelId; }

    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }

    public List<HistoricoItem> getHistorico() { return historico; }
    public void setHistorico(List<HistoricoItem> historico) { this.historico = historico; }
}
