package br.gov.protege.exception;

/**
 * Lancada quando um recurso solicitado nao existe.
 * O GlobalExceptionHandler a converte em HTTP 404 com corpo padronizado.
 */
public class RecursoNaoEncontradoException extends RuntimeException {

    public RecursoNaoEncontradoException(String recurso, Object identificador) {
        super(recurso + " nao encontrado: " + identificador);
    }

    public RecursoNaoEncontradoException(String mensagem) {
        super(mensagem);
    }
}
