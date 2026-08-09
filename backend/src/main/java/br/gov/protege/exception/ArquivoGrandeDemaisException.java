package br.gov.protege.exception;

/**
 * Arquivo acima do limite aceito pelo canal.
 *
 * Existe separada de RegraDeNegocioException para que a API responda
 * 413 Payload Too Large em vez de 422. A distincao nao e preciosismo: um
 * cliente que recebe 413 sabe que deve reduzir o arquivo e tentar de novo,
 * enquanto 422 sugere que o pedido esta conceitualmente errado. Codigos de
 * status sao a parte da API que o cliente le sem documentacao.
 */
public class ArquivoGrandeDemaisException extends RuntimeException {
    public ArquivoGrandeDemaisException(String mensagem) { super(mensagem); }
}
