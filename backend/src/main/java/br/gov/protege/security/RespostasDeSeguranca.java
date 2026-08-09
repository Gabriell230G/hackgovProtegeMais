package br.gov.protege.security;

import br.gov.protege.service.AuditoriaService;
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
 *
 * O 403 GRAVA AUDITORIA, e essa e a parte menos obvia desta classe.
 * O interceptador @Auditavel roda em torno do METODO do controlador; quando
 * a recusa acontece na regra de ROTA do SecurityConfig, o metodo nunca e
 * chamado e o aspecto nunca dispara. Sem o registro aqui, exatamente as
 * rotas mais protegidas - auditoria e exportacao - seriam as unicas cujas
 * tentativas recusadas nao deixariam rastro. Um sistema que so registra o
 * que deu certo nao serve para investigar abuso.
 */
@Component
public class RespostasDeSeguranca implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final ObjectMapper mapper = new ObjectMapper();
    private final AuditoriaService auditoria;

    public RespostasDeSeguranca(AuditoriaService auditoria) {
        this.auditoria = auditoria;
    }

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
        registrarRecusa(req);
        escrever(res, HttpStatus.FORBIDDEN, "Acesso negado para o seu perfil.");
    }

    /**
     * Deduz do caminho qual acao foi tentada e grava a recusa.
     *
     * A falha ao auditar NUNCA pode virar erro para o cliente: a resposta
     * 403 e a decisao de seguranca, e ela precisa sair mesmo que o registro
     * falhe. Por isso a excecao e engolida aqui - e a unica vez no sistema
     * em que isso e aceitavel.
     */
    private void registrarRecusa(HttpServletRequest req) {
        try {
            String uri = req.getRequestURI();
            String acao;
            String recurso;
            if (uri.startsWith("/api/auditoria")) {
                acao = AuditoriaService.ACESSO_AUDITORIA; recurso = "AuditoriaLog";
            } else if (uri.startsWith("/api/exportacao")) {
                acao = AuditoriaService.EXPORTACAO; recurso = "Denuncia";
            } else if (uri.startsWith("/api/equipe")) {
                acao = AuditoriaService.ALTERACAO_EQUIPE; recurso = "Membro";
            } else if (uri.startsWith("/api/evidencias")) {
                acao = AuditoriaService.EXCLUSAO; recurso = "Evidencia";
            } else {
                acao = AuditoriaService.EXCLUSAO; recurso = "Denuncia";
            }
            auditoria.registrar(acao, recurso, null, AuditoriaService.NEGADO,
                    "Recusado pela regra de rota: " + req.getMethod() + " " + uri);
        } catch (RuntimeException e) {
            // Auditar e importante; negar o acesso e mais.
        }
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
