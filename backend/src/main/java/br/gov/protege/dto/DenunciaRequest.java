package br.gov.protege.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Dados recebidos do formulario do cidadao ao registrar uma denuncia.
 *
 * A validacao esta declarada aqui, no servidor, e nao apenas no front:
 * o front-end pode ser contornado, a API nao. Esta e a fronteira real
 * de confianca do sistema (US18).
 */
@Schema(description = "Dados para registro de uma nova denuncia")
public class DenunciaRequest {

    @NotBlank(message = "O tipo da denuncia e obrigatorio")
    @Pattern(regexp = "violencia|assedio|abuso|discriminacao|outros",
             message = "Tipo deve ser: violencia, assedio, abuso, discriminacao ou outros")
    @Schema(example = "violencia",
            allowableValues = {"violencia", "assedio", "abuso", "discriminacao", "outros"})
    private String tipo;

    @NotBlank(message = "A descricao e obrigatoria")
    @Size(min = 10, max = 4000, message = "Descreva melhor o ocorrido (entre 10 e 4000 caracteres)")
    @Schema(example = "Relato de violencia domestica recorrente no bairro, com ameacas.")
    private String descricao;

    @Pattern(regexp = "^$|^[A-Za-z]{2}$", message = "Estado deve ser a sigla de duas letras da UF")
    @Schema(example = "SP")
    private String estado;

    @Size(max = 80, message = "A cidade deve ter no maximo 80 caracteres")
    @Schema(example = "Sao Paulo")
    private String cidade;

    @Size(max = 200, message = "O endereco deve ter no maximo 200 caracteres")
    @Schema(example = "Rua Paulista, 100 - Jardim Paulista")
    private String endereco;

    @Schema(description = "Registro anonimo. Verdadeiro por padrao.", example = "true")
    private boolean anonimo = true;

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }

    public String getEndereco() { return endereco; }
    public void setEndereco(String endereco) { this.endereco = endereco; }

    public boolean isAnonimo() { return anonimo; }
    public void setAnonimo(boolean anonimo) { this.anonimo = anonimo; }
}
