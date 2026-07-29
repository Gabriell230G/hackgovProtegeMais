package br.gov.protege.controller;

import br.gov.protege.model.Membro;
import br.gov.protege.repository.MembroRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/equipe")
public class MembroController {

    private final MembroRepository repo;

    public MembroController(MembroRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<Membro> listar() {
        return repo.findAll();
    }

    @PostMapping
    public Membro adicionar(@RequestBody Membro membro) {
        return repo.save(membro);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
