package br.gov.protege.security;

import br.gov.protege.model.PerfilUsuario;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Le o token JWT do cabecalho Authorization e autentica a requisicao.
 *
 * Correcao importante desta fase: a versao anterior concedia ROLE_GESTOR a
 * QUALQUER token valido, ignorando a claim de perfil que o proprio
 * JwtService gravava. Na pratica nao havia segregacao de acesso - um
 * atendente recebia as mesmas autorizacoes de um administrador. Agora o
 * perfil vem do token, e um token sem perfil declarado nao autentica.
 */
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (jwtService.valido(token)) {
                String perfilNoToken = jwtService.extrairPerfil(token);
                if (perfilNoToken != null) {
                    PerfilUsuario perfil = PerfilUsuario.de(perfilNoToken);
                    String email = jwtService.extrairEmail(token);

                    var auth = new UsernamePasswordAuthenticationToken(
                            email, null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + perfil.name())));
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
        }
        chain.doFilter(request, response);
    }
}
