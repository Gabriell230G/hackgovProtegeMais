package br.gov.protege.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/**
 * Corpo da atribuicao de responsavel pelo caso.
 */
@Schema(description = "Responsavel a ser atribuido a denuncia")
public class AtribuirResponsavelRequest {

    @NotNull(message = "O identificador do responsavel e obrigatorio")
    @Schema(example = "2")
    private Long responsavelId;

    public Long getResponsavelId() { return responsavelId; }
    public void setResponsavelId(Long responsavelId) { this.responsavelId = responsavelId; }
}
