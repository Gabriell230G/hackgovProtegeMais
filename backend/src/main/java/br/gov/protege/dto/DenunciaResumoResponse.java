package br.gov.protege.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * Resposta de LISTAGEM para o painel do gestor.
 *
 * Deliberadamente sem descricao e sem endereco: uma listagem carrega
 * dezenas de casos de uma vez e nao ha justificativa para trafegar o
 * relato completo de todos eles apenas para desenhar um Kanban.
 * O relato so aparece no detalhe, e essa leitura e auditada.
 */
@Schema(description = "Resumo de denuncia para listagens e Kanban")
public record DenunciaResumoResponse(
        Long id,
        @Schema(example = "#2026-00451") String protocolo,
        @Schema(example = "violencia") String tipo,
        @Schema(example = "Sao Paulo, SP") String local,
        @Schema(example = "recebida") String status,
        boolean anonimo,
        @Schema(description = "Score de confiabilidade (0-100)", example = "65") int score,
        @Schema(example = "Media") String scoreTxt,
        @Schema(description = "Urgencia sugerida pelo VigIA", example = "ALTA") String urgenciaIa,
        Long responsavelId,
        LocalDateTime criadoEm) {
}
