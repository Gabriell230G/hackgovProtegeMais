package br.gov.protege.controller;

import br.gov.protege.dto.DenunciaRequest;
import br.gov.protege.model.Denuncia;
import br.gov.protege.service.DenunciaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/denuncias")
public class DenunciaController {

    private final DenunciaService service;

    public DenunciaController(DenunciaService service) {
        this.service = service;
    }

    /** Cidadao registra uma denuncia. */
    @PostMapping
    public ResponseEntity<Denuncia> registrar(@Valid @RequestBody DenunciaRequest req) {
        return ResponseEntity.ok(service.registrar(req));
    }

    /** Lista denuncias (painel do gestor / Kanban), com filtros opcionais. */
    @GetMapping
    public List<Denuncia> listar(@RequestParam(required = false) String status,
                                 @RequestParam(required = false) String tipo) {
        return service.listar().stream()
                .filter(d -> status == null || status.equalsIgnoreCase(d.getStatus()))
                .filter(d -> tipo == null || tipo.equalsIgnoreCase(d.getTipo()))
                .toList();
    }

    /** Consulta publica por protocolo. */
    @GetMapping("/protocolo/{protocolo}")
    public ResponseEntity<Denuncia> porProtocolo(@PathVariable String protocolo) {
        String p = protocolo.startsWith("#") ? protocolo : "#" + protocolo;
        return service.buscarPorProtocolo(p)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Denuncia> porId(@PathVariable Long id) {
        return service.buscarPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Gestor muda o status. Body: {"status":"analise"} */
    @PatchMapping("/{id}/status")
    public ResponseEntity<Denuncia> mudarStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return service.atualizarStatus(id, body.get("status"))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Gestor atribui responsavel. Body: {"responsavelId":2} */
    @PatchMapping("/{id}/responsavel")
    public ResponseEntity<Denuncia> atribuir(@PathVariable Long id, @RequestBody Map<String, Long> body) {
        return service.atribuirResponsavel(id, body.get("responsavelId"))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
