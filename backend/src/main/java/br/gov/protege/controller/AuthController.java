package br.gov.protege.controller;

import br.gov.protege.dto.LoginRequest;
import br.gov.protege.model.Usuario;
import br.gov.protege.repository.UsuarioRepository;
import br.gov.protege.security.JwtService;
import br.gov.protege.service.AuditoriaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@Tag(name = "Autenticacao", description = "Login do servidor publico e emissao de token JWT")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioRepository repo;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AuditoriaService auditoria;

    public AuthController(UsuarioRepository repo, PasswordEncoder encoder,
                          JwtService jwt, AuditoriaService auditoria) {
        this.repo = repo;
        this.encoder = encoder;
        this.jwt = jwt;
        this.auditoria = auditoria;
    }

    @Operation(summary = "Autentica o servidor e devolve o token",
               description = "A resposta de credencial invalida e deliberadamente igual para "
                           + "e-mail inexistente e senha errada: diferenciar as duas permitiria "
                           + "descobrir quais contas existem no orgao. Tanto o sucesso quanto a "
                           + "recusa geram registro na trilha de auditoria. A rota tem limite de "
                           + "10 tentativas por minuto por origem.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Token, nome e perfil do usuario"),
        @ApiResponse(responseCode = "400", description = "Corpo invalido",
                     content = @io.swagger.v3.oas.annotations.media.Content),
        @ApiResponse(responseCode = "401", description = "Credenciais invalidas",
                     content = @io.swagger.v3.oas.annotations.media.Content),
        @ApiResponse(responseCode = "429", description = "Tentativas em excesso desta origem",
                     content = @io.swagger.v3.oas.annotations.media.Content)
    })
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {

        Optional<Usuario> encontrado = repo.findByEmail(req.getEmail())
                .filter(u -> encoder.matches(req.getSenha(), u.getSenhaHash()));

        if (encontrado.isEmpty()) {
            auditoria.registrarLogin(req.getEmail(), null, false);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("erro", "Credenciais invalidas"));
        }

        Usuario u = encontrado.get();
        auditoria.registrarLogin(u.getEmail(), u.getRole(), true);

        String token = jwt.gerarToken(u.getEmail(), u.getNome(), u.getRole());
        return ResponseEntity.ok(Map.of(
                "token", token,
                "nome", u.getNome(),
                "role", u.getRole()));
    }
}
