package br.gov.protege.dto;

import br.gov.protege.model.HistoricoItem;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Resposta do canal publico: o que o cidadao ve ao consultar seu protocolo.
 *
 * Nao devolve descricao, endereco, score nem analise de IA - sao dados
 * de uso interno do orgao. O cidadao precisa saber onde seu caso esta,
 * e nada alem disso.
 */
@Schema(description = "Situacao publica de uma denuncia, consultada por protocolo")
public record DenunciaPublicaResponse(
        @Schema(example = "#2026-00451") String protocolo,
        @Schema(example = "violencia") String tipo,
        @Schema(description = "Municipio e UF", example = "Sao Paulo, SP") String local,
        @Schema(example = "analise") String status,
        LocalDateTime criadoEm,
        @Schema(description = "Linha do tempo das mudancas de status") List<HistoricoItem> historico) {
}
