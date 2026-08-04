package br.gov.protege.dto;

import br.gov.protege.model.HistoricoItem;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Resposta de DETALHE, para quando o servidor abre um caso especifico.
 *
 * Carrega o relato e o endereco. Por isso a leitura deste recurso e
 * classificada como consulta sensivel e gera registro de auditoria.
 * Campos de contato vem mascarados conforme o perfil que consulta.
 */
@Schema(description = "Detalhe completo de uma denuncia (consulta sensivel)")
public record DenunciaDetalheResponse(
        Long id,
        String protocolo,
        String tipo,
        String local,
        String estado,
        String cidade,
        @Schema(description = "Endereco exato ou marcador de protecao, conforme o perfil") String endereco,
        @Schema(description = "Relato do denunciante") String descricao,
        String status,
        boolean anonimo,
        int score,
        String scoreLabel,
        String scoreTxt,
        String urgenciaIa,
        String resumoIa,
        @Schema(description = "Origem da classificacao: GEMINI ou REGRAS", example = "REGRAS")
        String origemAnalise,
        Long responsavelId,
        LocalDateTime criadoEm,
        @Schema(description = "Momento da conclusao, usado no calculo de lead time") LocalDateTime concluidaEm,
        List<HistoricoItem> historico) {
}
