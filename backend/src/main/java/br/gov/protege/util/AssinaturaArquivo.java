package br.gov.protege.util;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Identifica o tipo real de um arquivo pelos primeiros bytes.
 *
 * Por que nao confiar no que o cliente diz
 * -----------------------------------------
 * O cabecalho Content-Type de um upload e escolhido por quem envia. Um
 * executavel renomeado para "foto.jpg" e declarado como "image/jpeg" passa
 * por qualquer validacao baseada em extensao ou em cabecalho. A extensao,
 * pior ainda, e apenas o texto depois do ultimo ponto no nome.
 *
 * Formatos de arquivo comecam com uma sequencia fixa - o "numero magico".
 * Ela esta no CONTEUDO, nao no rotulo, e por isso nao e escolhida por quem
 * envia sem que o arquivo deixe de ser aquele formato.
 *
 * O que isto NAO e
 * ----------------
 * Nao e antivirus. Um JPEG legitimo pode carregar carga maliciosa dirigida
 * a um leitor vulneravel, e a assinatura dele continuara sendo de JPEG. O
 * que esta verificacao garante e mais modesto e ainda assim essencial:
 * o que foi aceito como imagem e, de fato, uma imagem - e nao um binario
 * esperando ser executado.
 */
public final class AssinaturaArquivo {

    private AssinaturaArquivo() { }

    private static final int[] JPEG = {0xFF, 0xD8, 0xFF};
    private static final int[] PNG  = {0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final int[] PDF  = {0x25, 0x50, 0x44, 0x46};                 // %PDF
    private static final int[] RIFF = {0x52, 0x49, 0x46, 0x46};                 // RIFF
    private static final int[] WEBP = {0x57, 0x45, 0x42, 0x50};                 // WEBP (posicao 8)
    private static final int[] FTYP = {0x66, 0x74, 0x79, 0x70};                 // ftyp (posicao 4)
    private static final int[] MATROSKA = {0x1A, 0x45, 0xDF, 0xA3};             // WebM / MKV
    private static final int[] OGG  = {0x4F, 0x67, 0x67, 0x53};                 // OggS
    private static final int[] ID3  = {0x49, 0x44, 0x33};                       // MP3 com tag ID3
    private static final int[] MPEG_FB = {0xFF, 0xFB};                          // MP3 sem tag
    private static final int[] MPEG_F3 = {0xFF, 0xF3};
    private static final int[] MPEG_F2 = {0xFF, 0xF2};

    /**
     * Tipos aceitos pelo canal. A lista e curta de proposito: cada formato
     * a mais e um leitor a mais que pode ter vulnerabilidade, e a maioria
     * das denuncias se resolve com foto, PDF e audio.
     */
    private static final Map<String, String> ROTULO = new LinkedHashMap<>();
    static {
        ROTULO.put("image/jpeg", "imagem JPEG");
        ROTULO.put("image/png",  "imagem PNG");
        ROTULO.put("image/webp", "imagem WebP");
        ROTULO.put("application/pdf", "documento PDF");
        ROTULO.put("audio/mpeg", "audio MP3");
        ROTULO.put("audio/ogg",  "audio OGG");
        ROTULO.put("audio/webm", "audio ou video WebM");
        ROTULO.put("video/mp4",  "video MP4");
    }

    /**
     * Devolve o tipo detectado, ou null se o conteudo nao corresponder a
     * nenhum formato aceito.
     */
    public static String detectar(byte[] conteudo) {
        if (conteudo == null || conteudo.length < 4) return null;

        if (comeca(conteudo, 0, PNG))  return "image/png";
        if (comeca(conteudo, 0, JPEG)) return "image/jpeg";
        if (comeca(conteudo, 0, PDF))  return "application/pdf";
        if (comeca(conteudo, 0, OGG))  return "audio/ogg";
        if (comeca(conteudo, 0, ID3) || comeca(conteudo, 0, MPEG_FB)
                || comeca(conteudo, 0, MPEG_F3) || comeca(conteudo, 0, MPEG_F2)) return "audio/mpeg";
        if (comeca(conteudo, 0, MATROSKA)) return "audio/webm";

        // WebP e um contentor RIFF: "RIFF" nos bytes 0-3 e "WEBP" nos 8-11.
        if (comeca(conteudo, 0, RIFF) && comeca(conteudo, 8, WEBP)) return "image/webp";

        // MP4 e derivados: o tamanho da caixa ocupa os 4 primeiros bytes e
        // "ftyp" vem logo depois. E por isso que a marca comeca na posicao 4.
        if (comeca(conteudo, 4, FTYP)) return "video/mp4";

        return null;
    }

    public static boolean aceito(String tipo) {
        return tipo != null && ROTULO.containsKey(tipo);
    }

    /** Descricao legivel do tipo, para mensagem de erro e para a tela. */
    public static String rotulo(String tipo) {
        return ROTULO.getOrDefault(tipo, tipo);
    }

    /** Lista dos formatos aceitos, para a mensagem de erro e o Swagger. */
    public static String formatosAceitos() {
        return String.join(", ", ROTULO.values());
    }

    private static boolean comeca(byte[] dados, int posicao, int[] marca) {
        if (dados.length < posicao + marca.length) return false;
        for (int i = 0; i < marca.length; i++) {
            if ((dados[posicao + i] & 0xFF) != marca[i]) return false;
        }
        return true;
    }
}
