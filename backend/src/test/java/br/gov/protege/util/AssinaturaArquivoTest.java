package br.gov.protege.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * O ataque que estes testes descrevem e o mais banal que existe num upload:
 * renomear um executavel para "foto.jpg" e declara-lo como "image/jpeg".
 * Extensao e Content-Type sao escolhidos por quem envia; a assinatura, nao.
 */
@DisplayName("Deteccao de tipo pela assinatura do arquivo")
class AssinaturaArquivoTest {

    private byte[] comBytes(int... valores) {
        byte[] b = new byte[Math.max(valores.length, 16)];
        for (int i = 0; i < valores.length; i++) b[i] = (byte) valores[i];
        return b;
    }

    @Test
    @DisplayName("reconhece JPEG, PNG e PDF pelos primeiros bytes")
    void reconheceFormatosComuns() {
        assertEquals("image/jpeg", AssinaturaArquivo.detectar(comBytes(0xFF, 0xD8, 0xFF, 0xE0)));
        assertEquals("image/png",
                AssinaturaArquivo.detectar(comBytes(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)));
        assertEquals("application/pdf", AssinaturaArquivo.detectar(comBytes(0x25, 0x50, 0x44, 0x46)));
    }

    @Test
    @DisplayName("reconhece WebP, que precisa de duas marcas em posicoes diferentes")
    void reconheceWebp() {
        // "RIFF" nos bytes 0-3 e "WEBP" nos bytes 8-11
        byte[] b = comBytes(0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
                            0x57, 0x45, 0x42, 0x50);
        assertEquals("image/webp", AssinaturaArquivo.detectar(b));
    }

    @Test
    @DisplayName("RIFF sem WEBP nao e imagem: um .wav nao passa por foto")
    void riffSemWebpNaoEAceito() {
        // RIFF seguido de "WAVE" - contentor certo, formato diferente
        byte[] b = comBytes(0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
                            0x57, 0x41, 0x56, 0x45);
        assertNull(AssinaturaArquivo.detectar(b));
    }

    @Test
    @DisplayName("reconhece MP4, cuja marca comeca no byte 4")
    void reconheceMp4() {
        byte[] b = comBytes(0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70);
        assertEquals("video/mp4", AssinaturaArquivo.detectar(b));
    }

    @Test
    @DisplayName("executavel renomeado para .jpg e recusado")
    void executavelDisfarcadoDeImagem() {
        // "MZ" - cabecalho de executavel do Windows
        byte[] exe = comBytes(0x4D, 0x5A, 0x90, 0x00);
        assertNull(AssinaturaArquivo.detectar(exe),
                "o nome do arquivo pode dizer .jpg; o conteudo diz o que ele e");
        assertFalse(AssinaturaArquivo.aceito(AssinaturaArquivo.detectar(exe)));
    }

    @Test
    @DisplayName("script e HTML sao recusados")
    void textoExecutavelERecusado() {
        byte[] html = "<script>alert(1)</script>".getBytes();
        byte[] sh = "#!/bin/sh\nrm -rf /".getBytes();
        assertNull(AssinaturaArquivo.detectar(html));
        assertNull(AssinaturaArquivo.detectar(sh));
    }

    @Test
    @DisplayName("arquivo vazio ou curto demais nao trava a deteccao")
    void entradasDegeneradas() {
        assertNull(AssinaturaArquivo.detectar(null));
        assertNull(AssinaturaArquivo.detectar(new byte[0]));
        assertNull(AssinaturaArquivo.detectar(new byte[]{0x25, 0x50}),
                "dois bytes nao bastam nem para o menor cabecalho aceito");
    }

    @Test
    @DisplayName("aceito() rejeita null e tipos fora da lista")
    void listaBranca() {
        assertTrue(AssinaturaArquivo.aceito("image/png"));
        assertFalse(AssinaturaArquivo.aceito(null));
        assertFalse(AssinaturaArquivo.aceito("application/x-msdownload"));
        assertFalse(AssinaturaArquivo.aceito("image/svg+xml"),
                "SVG e XML e pode carregar script; fica de fora de proposito");
    }
}
