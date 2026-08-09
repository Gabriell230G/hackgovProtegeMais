package br.gov.protege.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * Metadado de uma evidencia. Nunca carrega o conteudo do arquivo.
 *
 * O binario so sai pelo endpoint de download, uma requisicao por vez e com
 * registro de auditoria. Embutir o arquivo aqui faria a listagem de um caso
 * baixar todas as evidencias de uma vez, sem que nenhuma leitura ficasse
 * registrada - o mesmo raciocinio que mantem o relato fora das listagens.
 */
@Schema(description = "Metadado de um arquivo anexado a denuncia")
public record EvidenciaResponse(
        Long id,
        @Schema(example = "foto_da_lesao.jpg") String nomeOriginal,
        @Schema(description = "Tipo confirmado pela assinatura do arquivo", example = "image/jpeg")
        String tipoConteudo,
        @Schema(example = "184320") long tamanhoBytes,
        @Schema(description = "SHA-256 do conteudo recebido") String hashSha256,
        LocalDateTime enviadoEm) {
}
