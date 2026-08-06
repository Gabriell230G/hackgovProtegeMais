package br.gov.protege.service;

import br.gov.protege.dto.RelatorioAnaliticoResponse;
import br.gov.protege.dto.RelatorioAnaliticoResponse.Faixa;
import br.gov.protege.dto.RelatorioAnaliticoResponse.Ponto;
import br.gov.protege.dto.RelatorioAnaliticoResponse.Prazo;
import br.gov.protege.dto.RelatorioAnaliticoResponse.Recorte;
import br.gov.protege.dto.RelatorioAnaliticoResponse.Universo;
import br.gov.protege.model.Denuncia;
import br.gov.protege.repository.DenunciaRepository;
import br.gov.protege.service.EstatisticaService.Descritiva;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Monta o relatorio estatistico da Parte 4 a partir dos dados do canal.
 *
 * A divisao de responsabilidade e proposital: o {@link EstatisticaService}
 * sabe calcular e nao sabe o que e uma denuncia; esta classe sabe o que e
 * uma denuncia e nao sabe calcular. Quem le o relatorio pode conferir a
 * matematica sem entender o dominio, e vice-versa.
 *
 * Decisao de metodo: o lead time e medido em DIAS FRACIONARIOS, nao em dias
 * inteiros. Arredondar para cima transformaria um caso resolvido em sete
 * horas num caso de "um dia", e a mediana da urgencia CRITICA - que hoje
 * fica abaixo de tres dias - perderia justamente a resolucao que a torna
 * interessante.
 */
@Service
public class RelatorioService {

    /** Prazos candidatos a SLA, avaliados contra o que o canal ja entrega. */
    private static final int[] PRAZOS = {2, 3, 5, 7, 10};

    /** Largura das barras do histograma de lead time, em dias. */
    private static final int LARGURA_FAIXA = 2;
    private static final int FAIXAS = 7;   // 0-2, 2-4, ... 12-14, e a ultima aberta

    private static final List<String> TIPOS =
            List.of("violencia", "abuso", "assedio", "discriminacao", "outros");
    private static final List<String> URGENCIAS =
            List.of("CRITICA", "ALTA", "MEDIA", "BAIXA");

    private final DenunciaRepository repo;
    private final EstatisticaService est;

    public RelatorioService(DenunciaRepository repo, EstatisticaService est) {
        this.repo = repo;
        this.est = est;
    }

    public RelatorioAnaliticoResponse gerar() {
        List<Denuncia> todas = repo.findByExcluidaFalseOrderByCriadoEmDesc();

        List<Denuncia> concluidas = todas.stream()
                .filter(d -> d.getConcluidaEm() != null && d.getCriadoEm() != null)
                .toList();
        List<Denuncia> abertas = todas.stream()
                .filter(d -> d.getConcluidaEm() == null && d.getCriadoEm() != null)
                .toList();

        LocalDateTime referencia = referencia(todas);

        List<Double> leads = concluidas.stream().map(this::leadTime).sorted().toList();
        List<Double> scores = todas.stream().map(d -> (double) d.getScore()).sorted().toList();
        List<Double> esperas = abertas.stream()
                .map(d -> dias(d.getCriadoEm(), referencia)).sorted().toList();

        Descritiva lead = est.descrever(leads);

        return new RelatorioAnaliticoResponse(
                LocalDateTime.now(),
                referencia,
                new Universo(todas.size(), concluidas.size(), abertas.size(),
                        todas.stream().filter(Denuncia::isAnonimo).count(),
                        todas.stream().filter(d -> !d.isAnonimo()).count()),
                lead,
                histograma(leads),
                percentis(leads),
                prazos(leads),
                est.descrever(scores),
                recortes(concluidas, Denuncia::getTipo, TIPOS, this::leadTime),
                recortes(concluidas, Denuncia::getUrgenciaIa, URGENCIAS, this::leadTime),
                porAnonimato(todas),
                est.pearson(concluidas.stream().map(d -> (double) d.getScore()).toList(),
                            concluidas.stream().map(this::leadTime).toList()),
                concluidas.stream()
                        .map(d -> new Ponto(d.getScore(), EstatisticaService.duasCasas(leadTime(d))))
                        .toList(),
                est.descrever(esperas),
                recortes(abertas, Denuncia::getUrgenciaIa, URGENCIAS,
                         d -> dias(d.getCriadoEm(), referencia)),
                contar(todas, Denuncia::getStatus),
                contar(todas, Denuncia::getTipo),
                contar(todas, Denuncia::getUrgenciaIa),
                contar(todas, Denuncia::getEstado));
    }

    // ── apoio ────────────────────────────────────────────────────────────

    private double leadTime(Denuncia d) {
        return dias(d.getCriadoEm(), d.getConcluidaEm());
    }

    private double dias(LocalDateTime de, LocalDateTime ate) {
        return Duration.between(de, ate).toSeconds() / 86400.0;
    }

    /**
     * Ultimo evento presente na base. Serve de "hoje" para as medidas de
     * espera: uma base de demonstracao congelada no tempo faria a espera
     * media crescer um dia a cada dia que passasse, e o numero do painel
     * deixaria de bater com o do relatorio impresso.
     */
    private LocalDateTime referencia(List<Denuncia> todas) {
        LocalDateTime maior = null;
        for (Denuncia d : todas) {
            for (LocalDateTime t : new LocalDateTime[]{d.getCriadoEm(), d.getConcluidaEm()}) {
                if (t != null && (maior == null || t.isAfter(maior))) maior = t;
            }
        }
        return maior == null ? LocalDateTime.now() : maior;
    }

    private List<Faixa> histograma(List<Double> valores) {
        List<Faixa> out = new ArrayList<>();
        for (int i = 0; i < FAIXAS; i++) {
            double de = i * LARGURA_FAIXA;
            double ate = de + LARGURA_FAIXA;
            long n = valores.stream().filter(v -> v >= de && v < ate).count();
            out.add(new Faixa((int) de + "-" + (int) ate, de, ate, n));
        }
        double corte = FAIXAS * LARGURA_FAIXA;
        out.add(new Faixa((int) corte + "+", corte, -1,
                valores.stream().filter(v -> v >= corte).count()));
        return out;
    }

    private Map<String, Double> percentis(List<Double> ordenada) {
        Map<String, Double> out = new LinkedHashMap<>();
        for (int p : new int[]{50, 75, 90, 95}) {
            out.put("p" + p, EstatisticaService.duasCasas(est.percentil(ordenada, p / 100.0)));
        }
        return out;
    }

    private List<Prazo> prazos(List<Double> leads) {
        List<Prazo> out = new ArrayList<>();
        for (int p : PRAZOS) {
            long n = leads.stream().filter(v -> v <= p).count();
            out.add(new Prazo(p, n, leads.isEmpty() ? 0
                    : EstatisticaService.duasCasas(n * 100.0 / leads.size())));
        }
        return out;
    }

    /**
     * Quebra a amostra por uma chave (tipo, urgencia) e descreve cada fatia.
     * Fatias com menos de dois casos sao omitidas: media de um elemento nao
     * e media, e publicar desvio de amostra unitaria seria dar aparencia de
     * medida a um numero que nao mede nada.
     */
    private List<Recorte> recortes(List<Denuncia> base, Function<Denuncia, String> chave,
                                   List<String> ordem, Function<Denuncia, Double> valor) {
        List<Recorte> out = new ArrayList<>();
        for (String k : ordem) {
            List<Double> xs = base.stream()
                    .filter(d -> k.equalsIgnoreCase(String.valueOf(chave.apply(d))))
                    .map(valor).sorted().toList();
            if (xs.size() < 2) continue;
            Descritiva d = est.descrever(xs);
            out.add(new Recorte(k, d.n(), d.media(), d.mediana(), d.desvio(), d.maximo()));
        }
        return out;
    }

    private List<Recorte> porAnonimato(List<Denuncia> todas) {
        List<Recorte> out = new ArrayList<>();
        for (boolean anonima : new boolean[]{true, false}) {
            List<Double> xs = todas.stream()
                    .filter(d -> d.isAnonimo() == anonima)
                    .map(d -> (double) d.getScore()).sorted().toList();
            if (xs.size() < 2) continue;
            Descritiva d = est.descrever(xs);
            out.add(new Recorte(anonima ? "anonimas" : "identificadas",
                    d.n(), d.media(), d.mediana(), d.desvio(), d.maximo()));
        }
        return out;
    }

    private Map<String, Long> contar(List<Denuncia> base, Function<Denuncia, String> chave) {
        Map<String, Long> bruto = new LinkedHashMap<>();
        for (Denuncia d : base) {
            String v = chave.apply(d);
            bruto.merge((v == null || v.isBlank()) ? "nao_definido" : v, 1L, Long::sum);
        }
        // Maior primeiro: o grafico de barras fica legivel sem ordenar no cliente.
        Map<String, Long> out = new LinkedHashMap<>();
        bruto.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .forEach(e -> out.put(e.getKey(), e.getValue()));
        return out;
    }
}
