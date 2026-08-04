package br.gov.protege.security;

import br.gov.protege.model.PerfilUsuario;
import br.gov.protege.model.Usuario;
import br.gov.protege.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    private final JwtService jwtService;
    private final RespostasDeSeguranca respostas;

    public SecurityConfig(JwtService jwtService, RespostasDeSeguranca respostas) {
        this.jwtService = jwtService;
        this.respostas = respostas;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        JwtAuthFilter jwtAuthFilter = new JwtAuthFilter(jwtService);

        http
            .csrf(AbstractHttpConfigurer::disable)
            // Usa o bean corsConfigurationSource declarado abaixo.
            .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                // Preflight CORS
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // ---- CANAL DO CIDADAO (publico por definicao) ----
                // Exigir identificacao para denunciar anularia o anonimato,
                // que e a razao de existir do canal.
                .requestMatchers(HttpMethod.POST, "/api/denuncias").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/denuncias/protocolo/**").permitAll()
                .requestMatchers("/api/auth/**", "/api/vigia/status").permitAll()

                // ---- Documentacao e console do banco de demonstracao ----
                .requestMatchers("/swagger-ui/**", "/swagger-ui.html",
                                 "/v3/api-docs/**", "/h2-console/**").permitAll()

                // ---- TRILHA DE AUDITORIA ----
                // Quem opera o sistema nao fiscaliza o proprio uso dele.
                .requestMatchers("/api/auditoria/**")
                    .hasAnyRole(PerfilUsuario.AUDITOR.name(), PerfilUsuario.ADMIN.name())

                // ---- EXCLUSAO DE DENUNCIA ----
                .requestMatchers(HttpMethod.DELETE, "/api/denuncias/**")
                    .hasAnyRole(PerfilUsuario.GESTOR.name(), PerfilUsuario.ADMIN.name())

                // ---- GESTAO DA EQUIPE ----
                .requestMatchers(HttpMethod.POST,   "/api/equipe/**")
                    .hasAnyRole(PerfilUsuario.GESTOR.name(), PerfilUsuario.ADMIN.name())
                .requestMatchers(HttpMethod.PUT,    "/api/equipe/**")
                    .hasAnyRole(PerfilUsuario.GESTOR.name(), PerfilUsuario.ADMIN.name())
                .requestMatchers(HttpMethod.DELETE, "/api/equipe/**")
                    .hasAnyRole(PerfilUsuario.GESTOR.name(), PerfilUsuario.ADMIN.name())

                // ---- Demais rotas do painel ----
                .anyRequest().authenticated())

            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // Sem isto, requisicao sem token devolve 403 em vez de 401.
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(respostas)
                .accessDeniedHandler(respostas))

            // O limite por origem vem antes da autenticacao: forca bruta de
            // senha precisa ser barrada ANTES de chegar na verificacao dela.
            .addFilterBefore(new RateLimitFilter(), UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        // Permite o console do H2, que usa frames
        http.headers(h -> h.frameOptions(f -> f.disable()));
        return http.build();
    }

    /**
     * CORS restrito por lista de origens.
     *
     * A configuracao anterior usava allowedOriginPatterns("*") junto com
     * allowCredentials(true): qualquer site na internet podia disparar
     * requisicoes autenticadas contra esta API a partir do navegador de um
     * servidor logado. Para um sistema de dados sensiveis isso e
     * inaceitavel, e por isso as origens agora sao declaradas.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.origens}") String origens) {

        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(Arrays.stream(origens.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList());
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        c.setExposedHeaders(List.of("Location"));
        c.setAllowCredentials(true);
        c.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", c);
        return src;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Cria os usuarios de demonstracao, um por perfil, para que a segregacao
     * de acesso possa ser verificada de verdade - e nao apenas descrita.
     */
    @Bean
    public CommandLineRunner seedUsuarios(UsuarioRepository repo, PasswordEncoder encoder,
                                          @Value("${app.admin.email}") String emailAdmin,
                                          @Value("${app.admin.senha}") String senhaAdmin,
                                          @Value("${app.admin.nome}") String nomeAdmin) {
        return args -> {
            criar(repo, encoder, emailAdmin, senhaAdmin, nomeAdmin, PerfilUsuario.ADMIN);
            criar(repo, encoder, "gestor@protege.gov.br",    "gestor123",    "Carlos Lima - Coordenador", PerfilUsuario.GESTOR);
            criar(repo, encoder, "atendente@protege.gov.br", "atendente123", "Ana Souza - Atendente",     PerfilUsuario.ATENDENTE);
            criar(repo, encoder, "auditor@protege.gov.br",   "auditor123",   "Controladoria Interna",     PerfilUsuario.AUDITOR);
        };
    }

    private void criar(UsuarioRepository repo, PasswordEncoder encoder,
                       String email, String senha, String nome, PerfilUsuario perfil) {
        repo.findByEmail(email).ifPresentOrElse(
            u -> {
                if (!perfil.name().equals(u.getRole())) {
                    u.setRole(perfil.name());
                    repo.save(u);
                    log.info("[Protege+] Perfil atualizado: {} -> {}", email, perfil);
                }
            },
            () -> {
                repo.save(new Usuario(email, encoder.encode(senha), nome, perfil.name()));
                log.info("[Protege+] Usuario criado: {} ({})", email, perfil);
            });
    }
}
