package br.gov.protege.controller;

import br.gov.protege.exception.ConflitoException;
import br.gov.protege.exception.RecursoNaoEncontradoException;
import br.gov.protege.exception.RegraDeNegocioException;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Padroniza as respostas de erro da API.
 *
 * Ponto de seguranca: a versao anterior devolvia ex.getMessage() no corpo
 * do erro 500. Mensagens de excecao carregam nome de tabela, coluna,
 * caminho de arquivo e trecho de SQL - material de reconhecimento para
 * quem esta sondando a aplicacao. Agora o detalhe fica no log do servidor,
 * e o cliente recebe apenas um identificador de rastreio para citar no
 * chamado de suporte.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** Erros de validacao de corpo (@Valid) -> 400 com os campos invalidos. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> validacao(MethodArgumentNotValidException ex) {
        Map<String, String> campos = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(e -> campos.put(e.getField(), e.getDefaultMessage()));
        return build(HttpStatus.BAD_REQUEST, "Dados invalidos", campos, null);
    }

    /** Erros de validacao de parametros de rota e query -> 400. */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> violacao(ConstraintViolationException ex) {
        Map<String, String> campos = new LinkedHashMap<>();
        ex.getConstraintViolations()
                .forEach(v -> campos.put(String.valueOf(v.getPropertyPath()), v.getMessage()));
        return build(HttpStatus.BAD_REQUEST, "Parametros invalidos", campos, null);
    }

    /** JSON malformado ou tipo incompativel -> 400, sem devolver o trecho recebido. */
    @ExceptionHandler({HttpMessageNotReadableException.class,
                       MethodArgumentTypeMismatchException.class,
                       MissingServletRequestParameterException.class})
    public ResponseEntity<Map<String, Object>> requisicaoMalformada(Exception ex) {
        log.warn("Requisicao malformada: {}", ex.getMessage());
        return build(HttpStatus.BAD_REQUEST, "Requisicao malformada", null, null);
    }

    /** Recurso inexistente -> 404 com corpo padronizado. */
    @ExceptionHandler(RecursoNaoEncontradoException.class)
    public ResponseEntity<Map<String, Object>> naoEncontrado(RecursoNaoEncontradoException ex) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage(), null, null);
    }

    /** Conflito com o estado atual do recurso -> 409. */
    @ExceptionHandler(ConflitoException.class)
    public ResponseEntity<Map<String, Object>> conflito(ConflitoException ex) {
        return build(HttpStatus.CONFLICT, ex.getMessage(), null, null);
    }

    /** Requisicao bem formada que viola regra de dominio -> 422. */
    @ExceptionHandler(RegraDeNegocioException.class)
    public ResponseEntity<Map<String, Object>> regra(RegraDeNegocioException ex) {
        return build(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage(), null, null);
    }

    /**
     * Acesso negado -> 403 com mensagem generica.
     * Nao informamos se o recurso existe: isso permitiria mapear a base
     * por tentativa e erro a partir das respostas.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> acessoNegado(AccessDeniedException ex) {
        return build(HttpStatus.FORBIDDEN, "Acesso negado para o seu perfil", null, null);
    }

    /** Qualquer outro erro nao tratado -> 500 sem vazar detalhe interno. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> generico(Exception ex) {
        String rastreio = UUID.randomUUID().toString().substring(0, 8);
        log.error("[{}] Erro nao tratado", rastreio, ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR,
                "Erro interno. Informe o codigo de rastreio ao suporte.", null, rastreio);
    }

    private ResponseEntity<Map<String, Object>> build(HttpStatus status, String msg,
                                                      Object detalhes, String rastreio) {
        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("timestamp", LocalDateTime.now().toString());
        corpo.put("status", status.value());
        corpo.put("erro", status.getReasonPhrase());
        corpo.put("mensagem", msg);
        if (detalhes != null) corpo.put("detalhes", detalhes);
        if (rastreio != null) corpo.put("rastreio", rastreio);
        return ResponseEntity.status(status).body(corpo);
    }
}
