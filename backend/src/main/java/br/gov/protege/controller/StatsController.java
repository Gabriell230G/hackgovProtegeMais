package br.gov.protege.controller;

import br.gov.protege.model.Denuncia;
import br.gov.protege.repository.DenunciaRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Estatisticas para o painel do gestor (graficos e indicadores).
 */
@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final DenunciaRepository repo;

    public StatsController(DenunciaRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public Map<String, Object> resumo() {
        List<Denuncia> todas = repo.findAll();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("total", todas.size());
        out.put("porStatus", contarPor(todas, Denuncia::getStatus));
        out.put("porTipo", contarPor(todas, Denuncia::getTipo));
        out.put("porUrgencia", contarPor(todas, Denuncia::getUrgenciaIa));
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
                            return v == null ? "nao_definido" : v;
                        },
                        LinkedHashMap::new,
                        Collectors.counting()));
    }
}
