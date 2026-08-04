package br.gov.protege.model;

import java.time.LocalDateTime;

/**
 * Uma acao que pode ser desfeita pelo servidor que a executou.
 *
 * E o elemento empilhado na PilhaAcoesService. Guarda o estado anterior
 * porque desfazer significa restaurar o que existia antes - e nao
 * simplesmente apagar o evento.
 */
public record AcaoReversivel(
        Long denunciaId,
        String protocolo,
        String statusAnterior,
        String statusNovo,
        LocalDateTime quando) {

    public String descricao() {
        return "Denuncia " + protocolo + ": " + statusAnterior + " -> " + statusNovo;
    }
}
