package br.gov.protege.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/**
 * Envelope de paginacao devolvido pela API.
 *
 * Existe para nao expor a serializacao interna do Page do Spring Data,
 * que muda entre versoes e vaza detalhes de implementacao no contrato.
 */
@Schema(description = "Pagina de resultados")
public record PageResponse<T>(
        @Schema(description = "Itens da pagina atual") List<T> conteudo,
        @Schema(description = "Numero da pagina, iniciando em 0", example = "0") int pagina,
        @Schema(description = "Quantidade de itens por pagina", example = "20") int tamanho,
        @Schema(description = "Total de itens encontrados", example = "137") long totalItens,
        @Schema(description = "Total de paginas", example = "7") int totalPaginas,
        @Schema(description = "Indica se existe proxima pagina") boolean temProxima) {

    public static <E, D> PageResponse<D> de(Page<E> page, Function<E, D> conversor) {
        return new PageResponse<>(
                page.getContent().stream().map(conversor).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.hasNext());
    }
}
