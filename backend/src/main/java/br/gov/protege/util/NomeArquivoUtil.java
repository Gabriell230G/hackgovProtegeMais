package br.gov.protege.util;

import java.text.Normalizer;

/**
 * Higieniza o nome de arquivo enviado pelo usuario.
 *
 * O nome nunca chega ao sistema de arquivos - o arquivo no disco recebe um
 * UUID. Ainda assim o nome e higienizado, porque ele volta para a tela do
 * servidor publico: um nome com script embutido seria armazenado hoje e
 * executado amanha, quando alguem o renderizasse sem escapar.
 *
 * Defesa em profundidade: a limpeza aqui e o escape na exibicao protegem
 * contra o mesmo ataque, e nenhuma das duas confia na outra.
 */
public final class NomeArquivoUtil {

    private NomeArquivoUtil() { }

    private static final int MAXIMO = 150;

    public static String higienizar(String bruto) {
        if (bruto == null || bruto.isBlank()) return "arquivo";

        // Remove qualquer caminho: o navegador do Internet Explorer chegava a
        // enviar "C:\Users\...\foto.jpg" no lugar do nome simples.
        String nome = bruto.replace('\\', '/');
        int barra = nome.lastIndexOf('/');
        if (barra >= 0) nome = nome.substring(barra + 1);

        // Acentos viram equivalentes ASCII em vez de serem descartados:
        // "denúncia.pdf" deve continuar legivel como "denuncia.pdf".
        nome = Normalizer.normalize(nome, Normalizer.Form.NFD)
                         .replaceAll("\\p{M}", "");

        // Sobra apenas o que e seguro exibir e guardar.
        nome = nome.replaceAll("[^A-Za-z0-9._ -]", "_")
                   .replaceAll("_{2,}", "_")
                   .replaceAll("\\.{2,}", ".")   // impede "..", base da travessia de diretorio
                   .trim();

        while (nome.startsWith(".") || nome.startsWith("-")) {
            nome = nome.substring(1);
        }
        if (nome.isBlank()) return "arquivo";
        if (nome.length() > MAXIMO) {
            // Preserva a extensao ao truncar: "relatorio_muito_longo....pdf"
            // continua sendo reconhecivel como PDF na tela.
            int ponto = nome.lastIndexOf('.');
            String ext = (ponto > 0 && nome.length() - ponto <= 6) ? nome.substring(ponto) : "";
            nome = nome.substring(0, MAXIMO - ext.length()) + ext;
        }
        return nome;
    }
}
