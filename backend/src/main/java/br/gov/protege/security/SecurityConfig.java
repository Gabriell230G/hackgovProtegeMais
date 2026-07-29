package br.gov.protege.security;

import br.gov.protege.model.Usuario;
import br.gov.protege.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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

import java.util.List;

@Configuration
public class SecurityConfig {

    private final JwtService jwtService;

    public SecurityConfig(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        JwtAuthFilter jwtAuthFilter = new JwtAuthFilter(jwtService);
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsSource()))
            .authorizeHttpRequests(auth -> auth
                // Preflight CORS
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // Cidadao registra denuncia e consulta status (publico)
                .requestMatchers(HttpMethod.POST, "/api/denuncias").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/denuncias/protocolo/**").permitAll()
                // Login e checagem de status da IA (health check do frontend)
                .requestMatchers("/api/auth/**", "/api/vigia/status").permitAll()
                // Documentacao e console do banco
                .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/h2-console/**").permitAll()
                // Demais rotas (painel do gestor) exigem token
                .anyRequest().authenticated())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        // Permite o console do H2 (usa frames)
        http.headers(h -> h.frameOptions(f -> f.disable()));
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsSource() {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOriginPatterns(List.of("*"));
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("*"));
        c.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", c);
        return src;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Cria o usuario gestor padrao na primeira execucao, se ainda nao existir.
     */
    @Bean
    public CommandLineRunner seedAdmin(UsuarioRepository repo, PasswordEncoder encoder,
                                       @Value("${app.admin.email}") String email,
                                       @Value("${app.admin.senha}") String senha,
                                       @Value("${app.admin.nome}") String nome) {
        return args -> {
            if (!repo.existsByEmail(email)) {
                repo.save(new Usuario(email, encoder.encode(senha), nome, "GESTOR"));
                System.out.println("[Protege+] Usuario gestor criado: " + email);
            }
        };
    }
}
