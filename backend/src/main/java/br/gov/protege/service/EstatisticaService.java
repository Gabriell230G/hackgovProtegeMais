package br.gov.protege.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * ESTATISTICA DESCRITIVA - o motor de calculo do relatorio da Parte 4.
 *
 * Esta classe nao conhece denuncia, banco nem HTTP: recebe uma lista de
 * numeros e devolve as medidas. Isso e deliberado. Estatistica errada e o
 * tipo de defeito que nao quebra o sistema - ele so passa a mentir. Manter
 * o calculo isolado permite testar cada medida contra valores conferidos a
 * mao, sem subir contexto de Spring nem popular banco.
 *
 * Convencoes adotadas, e por que
 * ------------------------------
 * VARIANCIA AMOSTRAL (divisor n-1, correcao de Bessel). As 125 denuncias
 * sao uma amostra do que o canal receberia em operacao real, nao a
 * populacao de todas as denuncias possiveis. Usar n subestimaria a
 * dispersao.
 *
 * QUARTIS POR INTERPOLACAO LINEAR, o mesmo criterio do PERCENTILE_CONT do
 * Oracle. Existem varias convencoes de quartil e elas divergem na segunda
 * casa decimal; adotar a mesma do banco garante que 03_consultas.sql e o
 * painel devolvam o numero identico. Quem avalia pode rodar o SQL e conferir.
 *
 * OUTLIERS PELA REGRA DE TUKEY (1,5 x IQR). Preferida ao criterio de
 * desvios-padrao porque nao pressupoe distribuicao normal - e o lead time
 * deste canal e assimetrico a direita, como a propria analise mostra.
 *
 * ASSIMETRIA PELO SEGUNDO COEFICIENTE DE PEARSON, 3(media - mediana)/desvio.
 * Escolhido por ser interpretavel: diz o quanto a media foi puxada para
 * longe da mediana, que e exatamente a pergunta de negocio - "a media esta
 * escondendo uma cauda de casos lentos?".
 */
@Service
public class EstatisticaService {

    /**
     * Resumo estatistico de uma serie numerica.
     *
     * @param n           tamanho da amostra
     * @param media       media aritmetica
     * @param mediana     valor central; resiste a outliers, ao contrario da media
     * @param moda        valor mais frequente apos arredondamento (null se todos unicos)
     * @param minimo      menor valor
     * @param maximo      maior valor
     * @param variancia   variancia amostral (divisor n-1)
     * @param desvio      raiz da variancia, na mesma unidade dos dados
     * @param cv          coeficiente de variacao em %, desvio/media - permite
     *                    comparar dispersao entre series de unidades diferentes
     * @param q1          primeiro quartil
     * @param q3          terceiro quartil
     * @param iqr         amplitude interquartil (q3 - q1)
     * @param cercaInf    limite inferior de Tukey
     * @param cercaSup    limite superior de Tukey
     * @param outliers    valores fora das cercas
     * @param assimetria  segundo coeficiente de Pearson
     */
    public record Descritiva(
            int n, double media, double mediana, Double moda,
            double minimo, double maximo,
            double variancia, double desvio, double cv,
            double q1, double q3, double iqr,
            double cercaInf, double cercaSup, List<Double> outliers,
            double assimetria) {}

    /** Correlacao linear entre duas series de mesmo tamanho. */
    public record Correlacao(int n, double r, double r2, String leitura) {}

    private static final Descritiva VAZIA = new Descritiva(
            0, 0, 0, null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, List.of(), 0);

    /** Arredonda para duas casas; usado so na saida, nunca no meio do calculo. */
    public static double duasCasas(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    public Descritiva descrever(List<Double> valores) {
        if (valores == null || valores.isEmpty()) return VAZIA;

        List<Double> s = new ArrayList<>(valores);
        s.sort(Comparator.naturalOrder());
        int n = s.size();

        double soma = 0;
        for (double v : s) soma += v;
        double media = soma / n;

        double mediana = (n % 2 == 1)
                ? s.get(n / 2)
                : (s.get(n / 2 - 1) + s.get(n / 2)) / 2.0;

        // Com um unico elemento nao ha dispersao a estimar: n-1 seria divisao
        // por zero. Devolver zero e correto e evita NaN se propagando ate a tela.
        double variancia = 0;
        if (n > 1) {
            double acc = 0;
            for (double v : s) acc += (v - media) * (v - media);
            variancia = acc / (n - 1);
        }
        double desvio = Math.sqrt(variancia);

        double q1 = percentil(s, 0.25);
        double q3 = percentil(s, 0.75);
        double iqr = q3 - q1;
        double cercaInf = q1 - 1.5 * iqr;
        double cercaSup = q3 + 1.5 * iqr;

        List<Double> fora = new ArrayList<>();
        for (double v : s) if (v < cercaInf || v > cercaSup) fora.add(duasCasas(v));

        return new Descritiva(
                n, duasCasas(media), duasCasas(mediana), moda(s),
                duasCasas(s.get(0)), duasCasas(s.get(n - 1)),
                duasCasas(variancia), duasCasas(desvio),
                media == 0 ? 0 : duasCasas(desvio / Math.abs(media) * 100),
                duasCasas(q1), duasCasas(q3), duasCasas(iqr),
                duasCasas(cercaInf), duasCasas(cercaSup), fora,
                desvio == 0 ? 0 : duasCasas(3 * (media - mediana) / desvio));
    }

    /**
     * Percentil por interpolacao linear entre valores adjacentes - mesmo
     * resultado de PERCENTILE_CONT(p) WITHIN GROUP (ORDER BY x) no Oracle.
     *
     * @param ordenada lista JA ordenada de forma crescente
     * @param p        fracao entre 0 e 1
     */
    public double percentil(List<Double> ordenada, double p) {
        int n = ordenada.size();
        if (n == 0) return 0;
        if (n == 1) return ordenada.get(0);
        double pos = p * (n - 1);
        int abaixo = (int) Math.floor(pos);
        int acima = (int) Math.ceil(pos);
        if (abaixo == acima) return ordenada.get(abaixo);
        return ordenada.get(abaixo) + (pos - abaixo) * (ordenada.get(acima) - ordenada.get(abaixo));
    }

    /**
     * Valor mais frequente depois de arredondar para o inteiro mais proximo.
     *
     * Sem o arredondamento a moda seria inutil para dados continuos como o
     * lead time: com precisao de segundos, praticamente todo valor aparece
     * uma vez so. Arredondar para o dia responde a pergunta que interessa -
     * "em quantos dias a maioria dos casos costuma fechar?".
     *
     * Devolve null quando nenhum valor se repete: nesse caso a moda existe
     * matematicamente, mas nao informa nada, e exibi-la enganaria.
     */
    public Double moda(List<Double> valores) {
        Map<Long, Integer> freq = new LinkedHashMap<>();
        for (double v : valores) freq.merge(Math.round(v), 1, Integer::sum);
        long melhor = 0;
        int max = 0;
        for (Map.Entry<Long, Integer> e : freq.entrySet()) {
            if (e.getValue() > max) { max = e.getValue(); melhor = e.getKey(); }
        }
        return max <= 1 ? null : (double) melhor;
    }

    /**
     * Correlacao linear de Pearson. Mede se duas grandezas variam juntas -
     * nao se uma causa a outra, distincao que a interpretacao do relatorio
     * precisa respeitar.
     */
    public Correlacao pearson(List<Double> x, List<Double> y) {
        int n = Math.min(x.size(), y.size());
        if (n < 2) return new Correlacao(n, 0, 0, "amostra insuficiente");

        double mx = 0, my = 0;
        for (int i = 0; i < n; i++) { mx += x.get(i); my += y.get(i); }
        mx /= n; my /= n;

        double cov = 0, vx = 0, vy = 0;
        for (int i = 0; i < n; i++) {
            double dx = x.get(i) - mx, dy = y.get(i) - my;
            cov += dx * dy; vx += dx * dx; vy += dy * dy;
        }
        // Serie constante: sem variacao nao ha o que correlacionar.
        if (vx == 0 || vy == 0) return new Correlacao(n, 0, 0, "serie sem variacao");

        double r = cov / Math.sqrt(vx * vy);
        return new Correlacao(n, duasCasas(r * 100) / 100, duasCasas(r * r * 100) / 100, ler(r));
    }

    private String ler(double r) {
        double a = Math.abs(r);
        String forca = a < 0.10 ? "praticamente nula"
                     : a < 0.30 ? "fraca"
                     : a < 0.50 ? "moderada"
                     : a < 0.70 ? "forte"
                     : "muito forte";
        if (a < 0.10) return "correlacao " + forca;
        return "correlacao " + forca + (r > 0 ? " e positiva" : " e negativa");
    }
}
