package br.gov.protege.exception;

/**
 * Lancada quando a operacao conflita com o estado atual do recurso
 * (por exemplo, protocolo ja existente). Convertida em HTTP 409.
 */
public class ConflitoException extends RuntimeException {

    public ConflitoException(String mensagem) {
        super(mensagem);
    }
}
