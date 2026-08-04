package br.gov.protege.controller;

import br.gov.protege.audit.Auditavel;
import br.gov.protege.exception.RecursoNaoEncontradoException;
import br.gov.protege.model.Denuncia;
import br.gov.protege.repository.DenunciaRepository;
import br.gov.protege.service.AuditoriaService;
import br.gov.protege.service.VigiaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Endpoints do VigIA, o copiloto de IA do gestor.
 *
 * Toda resposta declara a sua origem (Gemini ou regras). Decisao
 * automatizada em servico publico precisa ser explicavel: o servidor
 * tem de saber se aquela classificacao veio de um modelo ou de uma
 * regra escrita, e poder justifica-la ao cidadao.
 */
@Tag(name = "VigIA", description = "Analise assistida por IA, com fallback explicavel por regras")
@RestController
@RequestMapping("/api/vigia")
public class VigiaController {

    private final VigiaService vigia;
    private final DenunciaRepository repo;

    public VigiaController(VigiaService vigia, DenunciaRepository repo) {
        this.vigia = vigia;
        this.repo = repo;
    }

    @Operation(summary = "Informa o modo de operacao da IA",
               description = "Rota publica, usada pelo front como health check do backend.")
    @ApiResponse(responseCode = "200", description = "Modo atual: Gemini ou Regras")
    @GetMapping("/status")
    public Map<String, Object> status() {
        return Map.of("iaAtiva", vigia.iaAtiva(),
                      "modo", vigia.iaAtiva() ? "Gemini" : "Regras");
    }

    @Operation(summary = "Reanalisa uma denuncia sob demanda",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(responseCode = "200", description = "Urgencia, resumo e origem da analise")
    @Auditavel(acao = AuditoriaService.REANALISE_IA, recurso = "Denuncia",
               detalhe = "Reclassificacao de urgencia por IA")
    @PostMapping("/analisar/{id}")
    public Map<String, String> analisar(@PathVariable Long id) {
        Denuncia d = repo.findByIdAndExcluidaFalse(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Denuncia", id));

        VigiaService.Analise a = vigia.analisar(d);
        d.setUrgenciaIa(a.urgencia());
        d.setResumoIa(a.resumo());
        d.setOrigemAnalise(a.origem() == null ? null : a.origem().toUpperCase());
        repo.save(d);

        return Map.of("urgencia", a.urgencia(),
                      "resumo", a.resumo() == null ? "" : a.resumo(),
                      "origem", a.origem());
    }

    @Operation(summary = "Pergunta livre do gestor ao VigIA",
               description = "O contexto enviado ao modelo contem apenas tipo, status e "
                           + "municipio dos casos - nunca o relato do denunciante.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(responseCode = "200", description = "Resposta do copiloto")
    @PostMapping("/perguntar")
    public Map<String, String> perguntar(@RequestBody Map<String, String> body) {
        List<Denuncia> todas = repo.findByExcluidaFalseOrderByCriadoEmDesc();
        String contexto = "Total de denuncias: " + todas.size() + ". " +
                todas.stream().limit(30)
                     .map(d -> d.getTipo() + "/" + d.getStatus() + "/" + d.getLocal())
                     .collect(Collectors.joining("; "));
        String resposta = vigia.perguntar(body.get("pergunta"), contexto);
        return Map.of("resposta", resposta);
    }
}
