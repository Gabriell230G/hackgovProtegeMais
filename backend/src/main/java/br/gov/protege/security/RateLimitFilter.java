package br.gov.protege.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limite de requisicoes por origem nas rotas publicas.
 *
 * Duas rotas ficam expostas sem autenticacao, e cada uma tem um risco
 * proprio:
 *
 *   POST /api/auth/login  -> forca bruta de senha
 *   POST /api/denuncias   -> inundacao do canal com denuncias falsas,
 *                            que sobrecarrega a equipe e enterra os
 *                            casos legitimos na fila
 *
 * A janela deslizante e mantida em memoria por IP. Numa implantacao real
 * isso viveria num cache distribuido (Redis) para valer entre instancias;
 * aqui a versao em memoria cumpre o papel e mantem a dependencia zero.
 */
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long JANELA_MS = 60_000L;
    // Denuncia e mais restrita de proposito: o custo de uma denuncia falsa em
    // massa recai sobre a equipe de atendimento, nao sobre o servidor.
    private static final int LIMITE_DENUNCIA = 5;    // por minuto, por IP

    // O login e mais folgado porque a chave e o IP, nao o usuario: varios
    // servidores atras do mesmo NAT corporativo compartilham um unico endereco.
    // Um limite apertado ali barraria uma reparticao inteira por causa de
    // uma pessoa que errou a senha. Forca bruta continua contida: 20/min por IP
    // sao 28.800 tentativas por dia contra hashes BCrypt.
    private static final int LIMITE_LOGIN    = 20;   // por minuto, por IP

    // Upload e publico e grava em disco. Sem teto, um unico endereco enche o
    // volume do servidor com arquivos validos - nao e preciso explorar falha
    // nenhuma, basta repetir.
    private static final int LIMITE_UPLOAD   = 10;   // por minuto, por IP

    private final Map<String, Deque<Long>> historico = new ConcurrentHashMap<>();
    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest req,
                                    @NonNull HttpServletResponse res,
                                    @NonNull FilterChain chain)
            throws ServletException, IOException {

        int limite = limiteDaRota(req);
        if (limite > 0 && excedeu(chaveDe(req), limite)) {
            responder429(res);
            return;
        }
        chain.doFilter(req, res);
    }

    private int limiteDaRota(HttpServletRequest req) {
        if (!"POST".equalsIgnoreCase(req.getMethod())) return 0;
        String uri = req.getRequestURI();
        if ("/api/denuncias".equals(uri)) return LIMITE_DENUNCIA;
        if ("/api/auth/login".equals(uri)) return LIMITE_LOGIN;
        if (uri.startsWith("/api/denuncias/protocolo/") && uri.endsWith("/evidencias")) {
            return LIMITE_UPLOAD;
        }
        return 0;
    }

    private String chaveDe(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        String ip = (fwd != null && !fwd.isBlank()) ? fwd.split(",")[0].trim() : req.getRemoteAddr();
        return req.getRequestURI() + "@" + ip;
    }

    private boolean excedeu(String chave, int limite) {
        long agora = System.currentTimeMillis();
        Deque<Long> janela = historico.computeIfAbsent(chave, k -> new ArrayDeque<>());
        synchronized (janela) {
            while (!janela.isEmpty() && agora - janela.peekFirst() > JANELA_MS) {
                janela.pollFirst();
            }
            if (janela.size() >= limite) return true;
            janela.addLast(agora);
            return false;
        }
    }

    private void responder429(HttpServletResponse res) throws IOException {
        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("timestamp", LocalDateTime.now().toString());
        corpo.put("status", HttpStatus.TOO_MANY_REQUESTS.value());
        corpo.put("erro", HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase());
        corpo.put("mensagem", "Muitas requisicoes desta origem. Aguarde um minuto e tente novamente.");

        res.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        mapper.writeValue(res.getOutputStream(), corpo);
    }
}
