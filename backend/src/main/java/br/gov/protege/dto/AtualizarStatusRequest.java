package br.gov.protege.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Corpo da mudanca de status. O Pattern garante que apenas os quatro
 * status oficiais do fluxo sejam aceitos - a validacao do dominio nao
 * pode depender do front-end enviar o valor certo.
 */
@Schema(description = "Novo status da denuncia")
public class AtualizarStatusRequest {

    @NotBlank(message = "O status e obrigatorio")
    @Pattern(regexp = "recebida|analise|encaminhada|concluida",
             message = "Status deve ser: recebida, analise, encaminhada ou concluida")
    @Schema(example = "analise", allowableValues = {"recebida", "analise", "encaminhada", "concluida"})
    private String status;

    @Schema(description = "Justificativa opcional registrada na auditoria", example = "Caso encaminhado a rede de protecao")
    private String observacao;

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getObservacao() { return observacao; }
    public void setObservacao(String observacao) { this.observacao = observacao; }
}
