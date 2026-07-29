package br.gov.protege.controller;

import br.gov.protege.model.Denuncia;
import br.gov.protege.repository.DenunciaRepository;
import br.gov.protege.service.VigiaService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Endpoints da IA (VigIA) para o painel do gestor.
 */
@RestController
@RequestMapping("/api/vigia")
public class VigiaController {

    private final VigiaService vigia;
    private final DenunciaRepository repo;

    public VigiaController(VigiaService vigia, DenunciaRepository repo) {
        this.vigia = vigia;
        this.repo = repo;
    }

    /** Diz se a IA (Gemini) esta ativa ou se roda em modo regras. */
    @GetMapping("/status")
    public Map<String, Object> status() {
        return Map.of("iaAtiva", vigia.iaAtiva(),
                      "modo", vigia.iaAtiva() ? "Gemini" : "Regras");
    }

    /** Reanalisa uma denuncia sob demanda. */
    @PostMapping("/analisar/{id}")
    public Object analisar(@PathVariable Long id) {
        return repo.findById(id)
                .map(d -> {
                    VigiaService.Analise a = vigia.analisar(d);
                    d.setUrgenciaIa(a.urgencia());
                    d.setResumoIa(a.resumo());
                    repo.save(d);
                    return Map.of("urgencia", a.urgencia(),
                                  "resumo", a.resumo(),
                                  "origem", a.origem());
                })
                .orElse(Map.of("erro", "Denuncia nao encontrada"));
    }

    /** Chat livre do gestor com o VigIA. Body: {"pergunta":"..."} */
    @PostMapping("/perguntar")
    public Map<String, String> perguntar(@RequestBody Map<String, String> body) {
        List<Denuncia> todas = repo.findAll();
        String contexto = "Total de denuncias: " + todas.size() + ". " +
                todas.stream().limit(30)
                     .map(d -> d.getTipo() + "/" + d.getStatus() + "/" + d.getLocal())
                     .collect(Collectors.joining("; "));
        String resposta = vigia.perguntar(body.get("pergunta"), contexto);
        return Map.of("resposta", resposta);
    }
}
