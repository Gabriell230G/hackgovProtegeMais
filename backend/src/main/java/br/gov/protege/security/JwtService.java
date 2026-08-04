package br.gov.protege.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Gera e valida tokens JWT para a autenticacao do gestor.
 */
@Service
public class JwtService {

    private final SecretKey key;
    private final long expiracaoMs;

    public JwtService(@Value("${jwt.secret}") String secret,
                      @Value("${jwt.expiration}") long expiracaoMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiracaoMs = expiracaoMs;
    }

    public String gerarToken(String email, String nome, String role) {
        Date agora = new Date();
        Date exp = new Date(agora.getTime() + expiracaoMs);
        return Jwts.builder()
                .subject(email)
                .claim("nome", nome)
                .claim("role", role)
                .issuedAt(agora)
                .expiration(exp)
                .signWith(key)
                .compact();
    }

    public String extrairEmail(String token) {
        return parse(token).getSubject();
    }

    /**
     * Perfil declarado no token.
     *
     * Devolve null quando a claim esta ausente: o filtro trata isso como
     * ausencia de autorizacao, e nao como um perfil padrao permissivo.
     */
    public String extrairPerfil(String token) {
        Object perfil = parse(token).get("role");
        return perfil == null ? null : String.valueOf(perfil);
    }

    public boolean valido(String token) {
        try {
            Date exp = parse(token).getExpiration();
            return exp.after(new Date());
        } catch (Exception e) {
            return false;
        }
    }

    private Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
