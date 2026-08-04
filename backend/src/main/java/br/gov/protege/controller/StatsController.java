package br.gov.protege.controller;

import br.gov.protege.model.Denuncia;
import br.gov.protege.repository.DenunciaRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Indicadores agregados para o painel do gestor.
 *
 * Devolve apenas numeros agregados - nenhum campo desta resposta permite
 * chegar a um caso individual, o que a torna segura para alimentar
 * graficos sem gerar exposicao de dado pessoal.
 */
@Tag(name = "Estatisticas", description = "Indicadores agregados do canal")
@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final DenunciaRepository repo;

    public StatsController(DenunciaRepository repo) {
        this.repo = repo;
    }

    @Operation(summary = "Resumo do canal",
               description = "Totais por status, tipo e urgencia, casos em aberto e score medio.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(responseCode = "200", description = "Indicadores agregados")
    @GetMapping
    public Map<String, Object> resumo() {
        List<Denuncia> todas = repo.findByExcluidaFalseOrderByCriadoEmDesc();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("total", todas.size());
        out.put("porStatus", contarPor(todas, Denuncia::getStatus));
        out.put("porTipo", contarPor(todas, Denuncia::getTipo));
        out.put("porUrgencia", contarPor(todas, Denuncia::getUrgenciaIa));
        out.put("porEstado", contarPor(todas, Denuncia::getEstado));
        out.put("emAberto", todas.stream()
                .filter(d -> !"concluida".equalsIgnoreCase(String.valueOf(d.getStatus())))
                .count());
        out.put("scoreMedio", todas.stream().mapToInt(Denuncia::getScore).average().orElse(0));
        return out;
    }

    private Map<String, Long> contarPor(List<Denuncia> lista, Function<Denuncia, String> chave) {
        return lista.stream()
                .collect(Collectors.groupingBy(
                        d -> {
                            String v = chave.apply(d);
                            return (v == null || v.isBlank()) ? "nao_definido" : v;
                        },
                        LinkedHashMap::new,
                        Collectors.counting()));
    }
}
