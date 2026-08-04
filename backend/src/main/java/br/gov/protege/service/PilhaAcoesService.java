package br.gov.protege.service;

import br.gov.protege.model.AcaoReversivel;
import org.springframework.stereotype.Service;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * PILHA (LIFO) - historico reversivel de acoes por servidor.
 *
 * Por que pilha e nao lista
 * -------------------------
 * Desfazer e, por definicao, uma operacao LIFO: a proxima acao a ser
 * revertida e sempre a mais recente. Uma lista permitiria remover
 * qualquer elemento, o que abriria espaco para desfazer uma acao do meio
 * do historico e deixar o caso num estado que nunca existiu de verdade.
 * A pilha torna esse erro impossivel por construcao.
 *
 * Implementada com ArrayDeque, que e a estrutura recomendada em Java para
 * pilha (a classe Stack e legada e sincronizada em todos os metodos).
 *
 * Complexidade
 * ------------
 *   empilhar  push()  -> O(1) amortizado
 *   desempilhar pop() -> O(1)
 *   consultar topo    -> O(1)
 *
 * A pilha e por usuario: um servidor nunca desfaz a acao de outro. E
 * limitada a LIMITE acoes para nao crescer indefinidamente numa sessao
 * longa - ao estourar, a acao mais antiga e descartada da base.
 */
@Service
public class PilhaAcoesService {

    /** Profundidade maxima do historico reversivel por usuario. */
    public static final int LIMITE = 20;

    private final Map<String, Deque<AcaoReversivel>> pilhas = new ConcurrentHashMap<>();

    private Deque<AcaoReversivel> pilhaDe(String usuario) {
        return pilhas.computeIfAbsent(chave(usuario), k -> new ArrayDeque<>());
    }

    /** Empilha uma acao executada. */
    public void empilhar(String usuario, AcaoReversivel acao) {
        Deque<AcaoReversivel> pilha = pilhaDe(usuario);
        synchronized (pilha) {
            pilha.push(acao);
            while (pilha.size() > LIMITE) {
                pilha.removeLast();   // descarta a mais antiga
            }
        }
    }

    /** Desempilha a acao mais recente, ou null se nao houver nenhuma. */
    public AcaoReversivel desempilhar(String usuario) {
        Deque<AcaoReversivel> pilha = pilhaDe(usuario);
        synchronized (pilha) {
            return pilha.poll();
        }
    }

    /** Consulta o topo sem remover. */
    public AcaoReversivel topo(String usuario) {
        Deque<AcaoReversivel> pilha = pilhaDe(usuario);
        synchronized (pilha) {
            return pilha.peek();
        }
    }

    /** Historico reversivel do usuario, do mais recente para o mais antigo. */
    public List<AcaoReversivel> historico(String usuario) {
        Deque<AcaoReversivel> pilha = pilhaDe(usuario);
        synchronized (pilha) {
            return List.copyOf(pilha);
        }
    }

    public int tamanho(String usuario) {
        Deque<AcaoReversivel> pilha = pilhaDe(usuario);
        synchronized (pilha) {
            return pilha.size();
        }
    }

    public void limpar(String usuario) {
        Deque<AcaoReversivel> pilha = pilhaDe(usuario);
        synchronized (pilha) {
            pilha.clear();
        }
    }

    private String chave(String usuario) {
        return (usuario == null || usuario.isBlank()) ? "anonimo" : usuario;
    }
}
