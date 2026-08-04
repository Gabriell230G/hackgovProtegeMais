package br.gov.protege.exception;

/**
 * Lancada quando a requisicao esta sintaticamente correta mas viola
 * uma regra de negocio do dominio. Convertida em HTTP 422.
 */
public class RegraDeNegocioException extends RuntimeException {

    public RegraDeNegocioException(String mensagem) {
        super(mensagem);
    }
}
