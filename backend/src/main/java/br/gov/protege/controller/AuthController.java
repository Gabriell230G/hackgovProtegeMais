package br.gov.protege.controller;

import br.gov.protege.dto.LoginRequest;
import br.gov.protege.repository.UsuarioRepository;
import br.gov.protege.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioRepository repo;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthController(UsuarioRepository repo, PasswordEncoder encoder, JwtService jwt) {
        this.repo = repo;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    /** Login do gestor. Body: {"email":"...","senha":"..."} -> {token, nome, role} */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        return repo.findByEmail(req.getEmail())
                .filter(u -> encoder.matches(req.getSenha(), u.getSenhaHash()))
                .<ResponseEntity<?>>map(u -> {
                    String token = jwt.gerarToken(u.getEmail(), u.getNome(), u.getRole());
                    return ResponseEntity.ok(Map.of(
                            "token", token,
                            "nome", u.getNome(),
                            "role", u.getRole()));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("erro", "Credenciais invalidas")));
    }
}
