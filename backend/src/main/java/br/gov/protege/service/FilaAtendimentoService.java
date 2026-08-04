package br.gov.protege.service;

import br.gov.protege.model.Denuncia;
import br.gov.protege.repository.DenunciaRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;

/**
 * FILA DE PRIORIDADE - ordem de atendimento das denuncias em aberto.
 *
 * Por que fila de prioridade e nao fila comum
 * -------------------------------------------
 * Num canal de denuncias, atender por ordem de chegada seria injusto e
 * perigoso: uma denuncia de violencia em curso registrada agora nao pode
 * esperar atras de uma reclamacao administrativa de tres dias atras.
 * A fila de prioridade resolve isso mantendo sempre no topo o caso mais
 * grave, sem precisar reordenar toda a colecao a cada insercao.
 *
 * Criterio de desempate, nesta ordem:
 *   1. Urgencia atribuida pelo VigIA  (CRITICA > ALTA > MEDIA > BAIXA)
 *   2. Score de confiabilidade        (maior primeiro)
 *   3. Antiguidade                    (mais antiga primeiro)
 *
 * O terceiro criterio existe para evitar inanicao: sem ele, um caso de
 * urgencia baixa poderia ficar indefinidamente no fim da fila enquanto
 * casos graves continuam chegando.
 *
 * Complexidade (PriorityQueue = heap binario)
 * -------------------------------------------
 *   construir a fila com n casos -> O(n log n)
 *   consultar o proximo  peek()  -> O(1)
 *   remover o proximo    poll()  -> O(log n)
 *   inserir um caso novo offer() -> O(log n)
 *
 * Comparado a ordenar uma lista a cada consulta, que seria O(n log n)
 * toda vez, o heap paga o custo uma vez e responde em tempo constante.
 */
@Service
public class FilaAtendimentoService {

    private static final Map<String, Integer> PESO_URGENCIA = Map.of(
            "CRITICA", 0,
            "ALTA",    1,
            "MEDIA",   2,
            "BAIXA",   3);

    private static final int PESO_INDEFINIDO = 4;

    /** Casos ja concluidos saem da fila de atendimento. */
    private static final String STATUS_FINAL = "concluida";

    private final DenunciaRepository repo;

    public FilaAtendimentoService(DenunciaRepository repo) {
        this.repo = repo;
    }

    /** Ordem de atendimento aplicada pelo heap. */
    public static Comparator<Denuncia> ordemDeAtendimento() {
        return Comparator
                .<Denuncia>comparingInt(d -> peso(d.getUrgenciaIa()))
                .thenComparing(Denuncia::getScore, Comparator.reverseOrder())
                .thenComparing(Denuncia::getCriadoEm,
                               Comparator.nullsLast(Comparator.naturalOrder()));
    }

    private static int peso(String urgencia) {
        if (urgencia == null) return PESO_INDEFINIDO;
        return PESO_URGENCIA.getOrDefault(urgencia.trim().toUpperCase(), PESO_INDEFINIDO);
    }

    /** Monta a fila de prioridade a partir dos casos em aberto. */
    public PriorityQueue<Denuncia> montar() {
        PriorityQueue<Denuncia> fila = new PriorityQueue<>(ordemDeAtendimento());
        for (Denuncia d : repo.findByExcluidaFalseOrderByCriadoEmDesc()) {
            if (!STATUS_FINAL.equalsIgnoreCase(String.valueOf(d.getStatus()))) {
                fila.offer(d);
            }
        }
        return fila;
    }

    /** Os n proximos casos, na ordem em que devem ser atendidos. */
    public List<Denuncia> proximos(int n) {
        PriorityQueue<Denuncia> fila = montar();
        List<Denuncia> saida = new ArrayList<>();
        for (int i = 0; i < n && !fila.isEmpty(); i++) {
            saida.add(fila.poll());
        }
        return saida;
    }

    /** O proximo caso a ser atendido, ou null se a fila estiver vazia. */
    public Denuncia proximo() {
        return montar().peek();
    }

    public int tamanho() {
        return montar().size();
    }

    /**
     * Ha quantos dias o caso mais antigo da fila espera atendimento.
     * Indicador usado no painel para sinalizar represamento.
     */
    public long diasDeEsperaDoMaisAntigo() {
        return repo.findByExcluidaFalseOrderByCriadoEmDesc().stream()
                .filter(d -> !STATUS_FINAL.equalsIgnoreCase(String.valueOf(d.getStatus())))
                .map(Denuncia::getCriadoEm)
                .filter(java.util.Objects::nonNull)
                .min(Comparator.naturalOrder())
                .map(inicio -> java.time.Duration.between(inicio, LocalDateTime.now()).toDays())
                .orElse(0L);
    }
}
