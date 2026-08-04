package br.gov.protege.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Respostas padronizadas das falhas de seguranca.
 *
 * Sem esta configuracao, o Spring Security devolve 403 tanto para quem nao
 * se autenticou quanto para quem se autenticou e nao tem permissao. Os dois
 * casos sao diferentes e o cliente precisa distingui-los:
 *
 *   401 Unauthorized -> "nao sei quem voce e"  -> o front leva ao login
 *   403 Forbidden    -> "sei quem voce e, mas seu perfil nao permite"
 *                       -> o front mostra mensagem, nao adianta relogar
 *
 * As duas respostas usam o mesmo formato do GlobalExceptionHandler, para
 * que o cliente tenha um unico contrato de erro em toda a API. Nenhuma
 * delas informa se o recurso existe - isso permitiria mapear a base por
 * tentativa e erro.
 */
@Component
public class RespostasDeSeguranca implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final ObjectMapper mapper = new ObjectMapper();

    /** Requisicao sem token, com token invalido ou expirado. */
    @Override
    public void commence(HttpServletRequest req, HttpServletResponse res,
                         org.springframework.security.core.AuthenticationException ex)
            throws IOException {
        escrever(res, HttpStatus.UNAUTHORIZED,
                "Autenticacao necessaria. Obtenha um token em POST /api/auth/login.");
    }

    /** Autenticado, porem sem o perfil exigido pela rota. */
    @Override
    public void handle(HttpServletRequest req, HttpServletResponse res,
                       org.springframework.security.access.AccessDeniedException ex)
            throws IOException {
        escrever(res, HttpStatus.FORBIDDEN, "Acesso negado para o seu perfil.");
    }

    private void escrever(HttpServletResponse res, HttpStatus status, String mensagem)
            throws IOException {
        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("timestamp", LocalDateTime.now().toString());
        corpo.put("status", status.value());
        corpo.put("erro", status.getReasonPhrase());
        corpo.put("mensagem", mensagem);

        res.setStatus(status.value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        mapper.writeValue(res.getOutputStream(), corpo);
    }
}
