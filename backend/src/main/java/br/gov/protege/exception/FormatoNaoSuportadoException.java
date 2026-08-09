package br.gov.protege.exception;

/**
 * Conteudo em formato que o canal nao aceita.
 *
 * Convertida em 415 Unsupported Media Type. Vale registrar que a recusa
 * ocorre pela ASSINATURA do arquivo, nao pela extensao nem pelo cabecalho
 * Content-Type - um executavel renomeado para foto.jpg e declarado como
 * image/jpeg cai aqui, ainda que os dois rotulos digam o contrario.
 */
public class FormatoNaoSuportadoException extends RuntimeException {
    public FormatoNaoSuportadoException(String mensagem) { super(mensagem); }
}
