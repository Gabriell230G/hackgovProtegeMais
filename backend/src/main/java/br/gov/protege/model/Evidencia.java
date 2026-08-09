package br.gov.protege.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Arquivo anexado a uma denuncia: foto, documento, audio ou video.
 *
 * O que esta tabela guarda e o que NAO guarda
 * -------------------------------------------
 * Guarda apenas METADADO. O conteudo do arquivo fica no disco, fora da
 * pasta servida pelo servidor web, com um nome gerado. Duas razoes:
 *
 *   1. Um arquivo dentro do diretorio publico e um arquivo que qualquer
 *      pessoa baixa adivinhando a URL. Evidencia de denuncia e o conteudo
 *      mais sensivel do sistema - e o unico que pode conter o rosto da
 *      vitima ou a assinatura de quem denunciou.
 *
 *   2. Gravar bytes dentro do banco incha o backup, atrasa toda consulta
 *      a tabela e transforma o dump do banco num vazamento completo.
 *
 * O nome original NUNCA e usado no disco
 * ---------------------------------------
 * O que o usuario envia como nome de arquivo e texto sob controle dele.
 * "../../etc/passwd", "foto.png.exe" ou 300 caracteres de lixo sao entradas
 * validas do ponto de vista do navegador. O nome original e higienizado e
 * guardado como METADADO, para exibir na tela; o arquivo no disco recebe um
 * UUID sem extensao. Assim nem travessia de diretorio nem execucao por
 * extensao sao possiveis - nao porque foram bloqueadas, mas porque o nome
 * do usuario nunca chega ao sistema de arquivos.
 */
@Entity
@Table(name = "evidencia")
public class Evidencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "denuncia_id", nullable = false)
    private Long denunciaId;

    /** Nome que o usuario enviou, ja higienizado. Serve so para exibir. */
    @Column(name = "nome_original", length = 160, nullable = false)
    private String nomeOriginal;

    /** UUID sem extensao. E o nome real no disco. */
    @Column(name = "nome_armazenado", length = 64, nullable = false, unique = true)
    private String nomeArmazenado;

    /** Tipo confirmado pela assinatura do arquivo, nao pelo que o cliente declarou. */
    @Column(name = "tipo_conteudo", length = 60, nullable = false)
    private String tipoConteudo;

    @Column(name = "tamanho_bytes", nullable = false)
    private long tamanhoBytes;

    /**
     * SHA-256 do conteudo. Permite detectar que o arquivo no disco foi
     * trocado depois de recebido, e identificar reenvios do mesmo arquivo
     * sem precisar compara-lo byte a byte.
     */
    @Column(name = "hash_sha256", length = 64, nullable = false)
    private String hashSha256;

    @Column(name = "enviado_em", nullable = false)
    private LocalDateTime enviadoEm = LocalDateTime.now();

    /**
     * Remocao logica. O arquivo fisico e apagado, mas o registro fica:
     * saber que existiu uma evidencia e quem a removeu faz parte da
     * rastreabilidade que a Parte 5 exige.
     */
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean removida = false;

    @Column(name = "removida_em")
    private LocalDateTime removidaEm;

    @Column(name = "motivo_remocao", length = 300)
    private String motivoRemocao;

    public Evidencia() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getDenunciaId() { return denunciaId; }
    public void setDenunciaId(Long denunciaId) { this.denunciaId = denunciaId; }

    public String getNomeOriginal() { return nomeOriginal; }
    public void setNomeOriginal(String nomeOriginal) { this.nomeOriginal = nomeOriginal; }

    public String getNomeArmazenado() { return nomeArmazenado; }
    public void setNomeArmazenado(String nomeArmazenado) { this.nomeArmazenado = nomeArmazenado; }

    public String getTipoConteudo() { return tipoConteudo; }
    public void setTipoConteudo(String tipoConteudo) { this.tipoConteudo = tipoConteudo; }

    public long getTamanhoBytes() { return tamanhoBytes; }
    public void setTamanhoBytes(long tamanhoBytes) { this.tamanhoBytes = tamanhoBytes; }

    public String getHashSha256() { return hashSha256; }
    public void setHashSha256(String hashSha256) { this.hashSha256 = hashSha256; }

    public LocalDateTime getEnviadoEm() { return enviadoEm; }
    public void setEnviadoEm(LocalDateTime enviadoEm) { this.enviadoEm = enviadoEm; }

    public boolean isRemovida() { return removida; }
    public void setRemovida(boolean removida) { this.removida = removida; }

    public LocalDateTime getRemovidaEm() { return removidaEm; }
    public void setRemovidaEm(LocalDateTime removidaEm) { this.removidaEm = removidaEm; }

    public String getMotivoRemocao() { return motivoRemocao; }
    public void setMotivoRemocao(String motivoRemocao) { this.motivoRemocao = motivoRemocao; }
}
