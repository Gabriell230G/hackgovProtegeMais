package br.gov.protege.dto;

import br.gov.protege.service.EstatisticaService.Correlacao;
import br.gov.protege.service.EstatisticaService.Descritiva;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Relatorio estatistico do canal (Parte 4).
 *
 * Contem exclusivamente numeros agregados. Nenhum campo desta resposta
 * permite chegar a um caso individual - nem protocolo, nem cidade isolada,
 * nem data de um registro especifico. Por isso ela pode alimentar graficos
 * sem que a tela do gestor vire uma porta lateral de acesso a dado pessoal.
 *
 * A unica serie que desce ao nivel do registro e {@code dispersaoScoreLead},
 * e ainda assim despida de identificacao: e um par (score, dias), sem
 * protocolo, sem data e sem municipio. Dois pontos identicos no grafico
 * podem ser qualquer par de casos do pais inteiro.
 */
public record RelatorioAnaliticoResponse(

        /** Instante em que o relatorio foi calculado. */
        LocalDateTime geradoEm,

        /**
         * Ultimo evento registrado na base. As medidas de espera dos casos
         * em aberto sao contadas a partir daqui, e nao do relogio de quem
         * abre a tela: assim o painel, o script SQL e o PDF devolvem o mesmo
         * numero em qualquer dia em que forem consultados.
         */
        LocalDateTime dataReferencia,

        Universo universo,

        /** Tempo entre registro e conclusao, em dias, dos casos encerrados. */
        Descritiva leadTime,
        List<Faixa> histogramaLeadTime,
        Map<String, Double> percentisLeadTime,
        List<Prazo> cumprimentoDePrazo,

        /** Score de confiabilidade de todos os casos. */
        Descritiva score,

        List<Recorte> leadPorTipo,
        List<Recorte> leadPorUrgencia,
        List<Recorte> scorePorAnonimato,
        Correlacao correlacaoScoreLead,
        List<Ponto> dispersaoScoreLead,

        /** Quanto os casos ainda nao concluidos ja esperaram. */
        Descritiva esperaEmAberto,
        List<Recorte> esperaEmAbertoPorUrgencia,

        Map<String, Long> porStatus,
        Map<String, Long> porTipo,
        Map<String, Long> porUrgencia,
        Map<String, Long> porUf
) {

    public record Universo(long total, long concluidas, long emAberto,
                           long anonimas, long identificadas) {}

    /** Barra do histograma. {@code ate} negativo significa "sem limite". */
    public record Faixa(String rotulo, double de, double ate, long n) {}

    /** Quantos casos fecharam dentro de um prazo candidato a SLA. */
    public record Prazo(int dias, long n, double percentual) {}

    /** Uma fatia da analise: um tipo, uma urgencia, um grupo. */
    public record Recorte(String chave, int n, double media, double mediana,
                          double desvio, double maximo) {}

    /** Ponto do grafico de dispersao, sem qualquer identificacao. */
    public record Ponto(int score, double dias) {}
}
