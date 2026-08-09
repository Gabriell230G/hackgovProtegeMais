package br.gov.protege.service;

import br.gov.protege.service.EstatisticaService.Correlacao;
import br.gov.protege.service.EstatisticaService.Descritiva;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Os valores esperados aqui foram calculados a mao, e nao copiados da saida
 * do proprio codigo. Um teste que confere o programa contra ele mesmo passa
 * a fingir que a estatistica esta certa exatamente quando ela deixa de estar.
 *
 * Serie de referencia: 2, 4, 4, 4, 5, 5, 7, 9  (n = 8)
 *   soma = 40                       -> media = 5
 *   mediana = (4 + 5) / 2           -> 4,5
 *   desvios ao quadrado: 9+1+1+1+0+0+4+16 = 32
 *   variancia amostral = 32 / 7     -> 4,571428...  -> 4,57
 *   desvio = raiz(4,571428)         -> 2,138089...  -> 2,14
 *   CV = 2,138089 / 5               -> 42,76 %
 *   Q1: posicao 0,25 x 7 = 1,75     -> 4 + 0,75 x (4 - 4) = 4
 *   Q3: posicao 0,75 x 7 = 5,25     -> 5 + 0,25 x (7 - 5) = 5,5
 *   IQR = 1,5 ; cercas = 1,75 e 7,75 -> o 9 e outlier
 *   assimetria = 3 x (5 - 4,5) / 2,138089 -> 0,7016 -> 0,7
 */
@DisplayName("Estatistica descritiva")
class EstatisticaServiceTest {

    private final EstatisticaService est = new EstatisticaService();
    private static final List<Double> SERIE = List.of(2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0);

    @Test
    @DisplayName("media, mediana e moda da serie de referencia")
    void tendenciaCentral() {
        Descritiva d = est.descrever(SERIE);
        assertEquals(8, d.n());
        assertEquals(5.0, d.media(), 1e-9);
        assertEquals(4.5, d.mediana(), 1e-9);
        assertEquals(4.0, d.moda(), 1e-9, "o 4 aparece tres vezes");
    }

    @Test
    @DisplayName("variancia amostral usa divisor n-1, nao n")
    void varianciaAmostral() {
        Descritiva d = est.descrever(SERIE);
        assertEquals(4.57, d.variancia(), 1e-9, "32/7 = 4,571...; com divisor n daria 4,0");
        assertEquals(2.14, d.desvio(), 1e-9);
        assertEquals(42.76, d.cv(), 1e-9);
    }

    @Test
    @DisplayName("quartis interpolam como o PERCENTILE_CONT do Oracle")
    void quartisInterpolados() {
        Descritiva d = est.descrever(SERIE);
        assertEquals(4.0, d.q1(), 1e-9);
        assertEquals(5.5, d.q3(), 1e-9);
        assertEquals(1.5, d.iqr(), 1e-9);

        // Caso classico de interpolacao: com n par a mediana cai entre dois valores.
        assertEquals(2.5, est.percentil(List.of(1.0, 2.0, 3.0, 4.0), 0.50), 1e-9);
        assertEquals(1.75, est.percentil(List.of(1.0, 2.0, 3.0, 4.0), 0.25), 1e-9);
    }

    @Test
    @DisplayName("regra de Tukey aponta o 9 como outlier")
    void outliersPorTukey() {
        Descritiva d = est.descrever(SERIE);
        assertEquals(1.75, d.cercaInf(), 1e-9);
        assertEquals(7.75, d.cercaSup(), 1e-9);
        assertEquals(List.of(9.0), d.outliers());
    }

    @Test
    @DisplayName("assimetria positiva quando a media e puxada acima da mediana")
    void assimetriaPositiva() {
        assertEquals(0.7, est.descrever(SERIE).assimetria(), 1e-9);
    }

    @Test
    @DisplayName("assimetria negativa quando a cauda esta a esquerda")
    void assimetriaNegativa() {
        // 1, 8, 9, 10, 10 -> media 7,6 ; mediana 9 ; a media ficou abaixo
        Descritiva d = est.descrever(List.of(1.0, 8.0, 9.0, 10.0, 10.0));
        assertTrue(d.assimetria() < 0, "media abaixo da mediana deve dar assimetria negativa");
    }

    @Test
    @DisplayName("lista vazia devolve zeros em vez de estourar")
    void listaVazia() {
        Descritiva d = est.descrever(List.of());
        assertEquals(0, d.n());
        assertEquals(0.0, d.media(), 1e-9);
        assertTrue(d.outliers().isEmpty());
        assertNull(d.moda());
    }

    @Test
    @DisplayName("amostra de um elemento nao tem dispersao a estimar")
    void umElemento() {
        Descritiva d = est.descrever(List.of(7.0));
        assertEquals(1, d.n());
        assertEquals(7.0, d.media(), 1e-9);
        assertEquals(7.0, d.mediana(), 1e-9);
        assertEquals(0.0, d.variancia(), 1e-9, "n-1 seria divisao por zero");
        assertEquals(0.0, d.desvio(), 1e-9);
        assertFalse(Double.isNaN(d.cv()), "o CV nao pode virar NaN e chegar assim na tela");
    }

    @Test
    @DisplayName("serie constante tem dispersao zero e assimetria zero")
    void serieConstante() {
        Descritiva d = est.descrever(List.of(5.0, 5.0, 5.0, 5.0));
        assertEquals(0.0, d.desvio(), 1e-9);
        assertEquals(0.0, d.cv(), 1e-9);
        assertEquals(0.0, d.assimetria(), 1e-9, "sem desvio nao ha como dividir; deve devolver 0");
        assertEquals(5.0, d.moda(), 1e-9);
    }

    @Test
    @DisplayName("moda e nula quando nenhum valor se repete")
    void modaInexistente() {
        assertNull(est.descrever(List.of(1.0, 2.0, 3.0, 4.0)).moda(),
                "publicar uma moda que nao informa nada enganaria quem le");
    }

    @Test
    @DisplayName("moda arredonda para o dia inteiro em dados continuos")
    void modaArredondaParaODia() {
        // Tres casos que fecharam em pouco mais de dois dias e um em cinco.
        Double moda = est.moda(List.of(2.1, 2.3, 1.9, 5.4));
        assertEquals(2.0, moda, 1e-9);
    }

    @Test
    @DisplayName("Pearson devolve +1 e -1 nas relacoes lineares perfeitas")
    void correlacaoPerfeita() {
        assertEquals(1.0, est.pearson(List.of(1.0, 2.0, 3.0), List.of(2.0, 4.0, 6.0)).r(), 1e-9);
        assertEquals(-1.0, est.pearson(List.of(1.0, 2.0, 3.0), List.of(6.0, 4.0, 2.0)).r(), 1e-9);
    }

    @Test
    @DisplayName("Pearson nao divide por zero quando uma das series e constante")
    void correlacaoSemVariacao() {
        Correlacao c = est.pearson(List.of(1.0, 1.0, 1.0), List.of(3.0, 5.0, 9.0));
        assertEquals(0.0, c.r(), 1e-9);
        assertEquals("corr.sem_variacao", c.leitura());
    }

    @Test
    @DisplayName("correlacao proxima de zero e descrita como praticamente nula")
    void leituraDaCorrelacao() {
        // Serie deliberadamente sem relacao: o texto precisa desencorajar
        // que se leia causalidade onde nao ha nem associacao.
        Correlacao c = est.pearson(List.of(1.0, 2.0, 3.0, 4.0), List.of(3.0, 1.0, 4.0, 2.0));
        assertTrue(Math.abs(c.r()) < 0.30);
        assertTrue(c.leitura().equals("corr.nula") || c.leitura().startsWith("corr.fraca"),
                "leitura obtida: " + c.leitura());
    }
}
