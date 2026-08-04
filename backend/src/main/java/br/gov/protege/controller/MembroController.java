package br.gov.protege.controller;

import br.gov.protege.audit.Auditavel;
import br.gov.protege.dto.MembroRequest;
import br.gov.protege.exception.RecursoNaoEncontradoException;
import br.gov.protege.model.Membro;
import br.gov.protege.service.AuditoriaService;
import br.gov.protege.repository.MembroRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@Tag(name = "Equipe", description = "Membros do orgao que podem ser responsaveis por um caso")
@RestController
@RequestMapping("/api/equipe")
public class MembroController {

    private final MembroRepository repo;

    public MembroController(MembroRepository repo) {
        this.repo = repo;
    }

    @Operation(summary = "Lista os membros da equipe",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(responseCode = "200", description = "Lista de membros")
    @GetMapping
    public List<Membro> listar() {
        return repo.findAll();
    }

    @Operation(summary = "Busca um membro pelo identificador",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Membro encontrado"),
        @ApiResponse(responseCode = "404", description = "Membro inexistente", content = @io.swagger.v3.oas.annotations.media.Content)
    })
    @GetMapping("/{id}")
    public Membro porId(@PathVariable Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Membro", id));
    }

    @Operation(summary = "Cadastra um novo membro",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Membro criado"),
        @ApiResponse(responseCode = "400", description = "Dados invalidos", content = @io.swagger.v3.oas.annotations.media.Content)
    })
    @Auditavel(acao = AuditoriaService.ALTERACAO_EQUIPE, recurso = "Membro",
               detalhe = "Cadastro de membro da equipe")
    @PostMapping
    public ResponseEntity<Membro> adicionar(@Valid @RequestBody MembroRequest req) {
        Membro salvo = repo.save(new Membro(req.getNome(), req.getCargo(), req.getEmail()));
        URI local = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(salvo.getId()).toUri();
        return ResponseEntity.created(local).body(salvo);
    }

    @Operation(summary = "Atualiza um membro existente",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Membro atualizado"),
        @ApiResponse(responseCode = "404", description = "Membro inexistente", content = @io.swagger.v3.oas.annotations.media.Content)
    })
    @Auditavel(acao = AuditoriaService.ALTERACAO_EQUIPE, recurso = "Membro",
               detalhe = "Alteracao de membro da equipe")
    @PutMapping("/{id}")
    public Membro atualizar(@PathVariable Long id, @Valid @RequestBody MembroRequest req) {
        Membro m = repo.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Membro", id));
        m.setNome(req.getNome());
        m.setCargo(req.getCargo());
        m.setEmail(req.getEmail());
        return repo.save(m);
    }

    @Operation(summary = "Remove um membro da equipe",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Membro removido"),
        @ApiResponse(responseCode = "404", description = "Membro inexistente", content = @io.swagger.v3.oas.annotations.media.Content)
    })
    @Auditavel(acao = AuditoriaService.ALTERACAO_EQUIPE, recurso = "Membro",
               detalhe = "Remocao de membro da equipe")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        if (!repo.existsById(id)) {
            throw new RecursoNaoEncontradoException("Membro", id);
        }
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
