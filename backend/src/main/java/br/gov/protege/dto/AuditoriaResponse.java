package br.gov.protege.dto;

import br.gov.protege.model.AuditoriaLog;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * Registro de auditoria exposto pela API.
 *
 * Devolve os hashes porque a verificabilidade e o proposito da trilha:
 * o auditor precisa poder conferir a cadeia por conta propria, sem
 * depender da palavra do sistema.
 */
@Schema(description = "Registro da trilha de auditoria")
public record AuditoriaResponse(
        Long id,
        LocalDateTime dataHora,
        @Schema(example = "gestor@protege.gov.br") String usuario,
        @Schema(example = "GESTOR") String perfil,
        @Schema(example = "CONSULTA_SENSIVEL") String acao,
        @Schema(example = "Denuncia") String recurso,
        @Schema(example = "42") String recursoId,
        @Schema(example = "PERMITIDO", allowableValues = {"PERMITIDO", "NEGADO", "ERRO"}) String resultado,
        String origemIp,
        String detalhe,
        @Schema(description = "Hash do registro anterior na cadeia") String hashAnterior,
        @Schema(description = "Hash deste registro") String hash) {

    public static AuditoriaResponse de(AuditoriaLog a) {
        return new AuditoriaResponse(
                a.getId(), a.getDataHora(), a.getUsuario(), a.getPerfil(),
                a.getAcao(), a.getRecurso(), a.getRecursoId(), a.getResultado(),
                a.getOrigemIp(), a.getDetalhe(), a.getHashAnterior(), a.getHash());
    }
}
