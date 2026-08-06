package br.gov.protege.dto;

import br.gov.protege.model.HistoricoItem;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Resposta do canal publico: o que o cidadao ve ao consultar seu protocolo.
 *
 * Nao devolve descricao, endereco nem analise de IA - sao dados de uso
 * interno do orgao.
 *
 * O score de confiabilidade E devolvido, de proposito: ele mede o quanto o
 * relato esta completo, e mostra-lo ao cidadao no momento do registro e o
 * que o incentiva a detalhar melhor. Mais importante, faz o formulario React
 * e o formulario HTML exibirem O MESMO numero - o calculado pelo servidor -
 * em vez de cada um rodar a sua propria versao do algoritmo.
 */
@Schema(description = "Situacao publica de uma denuncia, consultada por protocolo")
public record DenunciaPublicaResponse(
        @Schema(example = "#2026-00451") String protocolo,
        @Schema(example = "violencia") String tipo,
        @Schema(description = "Municipio e UF", example = "Sao Paulo, SP") String local,
        @Schema(example = "analise") String status,
        @Schema(description = "Score de confiabilidade calculado pelo servidor", example = "65") int score,
        @Schema(description = "Classificacao do score", example = "Media") String scoreTxt,
        LocalDateTime criadoEm,
        @Schema(description = "Linha do tempo das mudancas de status") List<HistoricoItem> historico) {
}
