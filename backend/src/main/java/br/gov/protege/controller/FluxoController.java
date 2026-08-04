package br.gov.protege.controller;

import br.gov.protege.audit.Auditavel;
import br.gov.protege.dto.DenunciaResumoResponse;
import br.gov.protege.mapper.DenunciaMapper;
import br.gov.protege.model.AcaoReversivel;
import br.gov.protege.model.Denuncia;
import br.gov.protege.service.AuditoriaService;
import br.gov.protege.service.DenunciaService;
import br.gov.protege.service.FilaAtendimentoService;
import br.gov.protege.service.PilhaAcoesService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Fluxo de trabalho do servidor: fila de prioridade e pilha de acoes.
 *
 * Estes endpoints existem para expor, pela API, as duas estruturas de dados
 * avancadas usadas na logica do sistema - alem da lista ordenada que ja
 * sustenta a linha do tempo de cada denuncia.
 */
@Tag(name = "Fluxo de atendimento",
     description = "Fila de prioridade (heap) e pilha de acoes reversiveis (LIFO)")
@RestController
@RequestMapping("/api/fluxo")
public class FluxoController {

    private final FilaAtendimentoService fila;
    private final PilhaAcoesService pilha;
    private final DenunciaService denuncias;

    public FluxoController(FilaAtendimentoService fila, PilhaAcoesService pilha,
                           DenunciaService denuncias) {
        this.fila = fila;
        this.pilha = pilha;
        this.denuncias = denuncias;
    }

    // ------------------------------------------------------------------
    //  FILA DE PRIORIDADE
    // ------------------------------------------------------------------

    @Operation(summary = "Consulta a fila de atendimento",
               description = "Devolve os casos em aberto na ordem em que devem ser atendidos: "
                           + "urgencia do VigIA, depois score de confiabilidade e, por fim, "
                           + "antiguidade - este ultimo criterio evita que casos de baixa "
                           + "urgencia fiquem indefinidamente sem atendimento.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(responseCode = "200", description = "Proximos casos e indicadores da fila")
    @GetMapping("/fila")
    public Map<String, Object> consultarFila(
            @Parameter(description = "Quantos casos retornar (1 a 50)")
            @RequestParam(defaultValue = "10") int limite) {

        int n = Math.min(Math.max(limite, 1), 50);
        List<DenunciaResumoResponse> proximos = fila.proximos(n).stream()
                .map(DenunciaMapper::resumo)
                .toList();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("estrutura", "PriorityQueue (heap binario)");
        out.put("criterio", "urgencia VigIA > score de confiabilidade > antiguidade");
        out.put("totalNaFila", fila.tamanho());
        out.put("diasDeEsperaDoMaisAntigo", fila.diasDeEsperaDoMaisAntigo());
        out.put("proximos", proximos);
        return out;
    }

    @Operation(summary = "Atende o proximo caso da fila",
               description = "Remove o topo da fila (poll, O(log n)) e move o caso para analise. "
                           + "A acao vai para a pilha e pode ser desfeita.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Caso assumido para analise"),
        @ApiResponse(responseCode = "422", description = "Nenhum caso aguardando atendimento",
                     content = @io.swagger.v3.oas.annotations.media.Content)
    })
    @Auditavel(acao = AuditoriaService.ALTERACAO_STATUS, recurso = "Denuncia",
               detalhe = "Caso assumido a partir da fila de prioridade")
    @PostMapping("/fila/atender")
    public DenunciaResumoResponse atenderProximo(Authentication auth) {
        Denuncia proximo = fila.proximo();
        return DenunciaMapper.resumo(denuncias.atenderProximo(proximo, usuario(auth)));
    }

    // ------------------------------------------------------------------
    //  PILHA DE ACOES
    // ------------------------------------------------------------------

    @Operation(summary = "Consulta a pilha de acoes reversiveis do servidor",
               description = "Historico LIFO das mudancas de status feitas por este usuario, "
                           + "da mais recente para a mais antiga.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(responseCode = "200", description = "Estado atual da pilha")
    @GetMapping("/pilha")
    public Map<String, Object> consultarPilha(Authentication auth) {
        String usuario = usuario(auth);
        List<AcaoReversivel> historico = pilha.historico(usuario);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("estrutura", "ArrayDeque usada como pilha (LIFO)");
        out.put("profundidadeMaxima", PilhaAcoesService.LIMITE);
        out.put("tamanho", historico.size());
        out.put("topo", pilha.topo(usuario));
        out.put("acoes", historico.stream().map(a -> Map.of(
                "denunciaId", a.denunciaId(),
                "protocolo", a.protocolo(),
                "descricao", a.descricao(),
                "quando", a.quando().toString())).toList());
        return out;
    }

    @Operation(summary = "Desfaz a ultima mudanca de status deste servidor",
               description = "Desempilha (pop, O(1)) e restaura o status anterior. "
                           + "O historico da denuncia NAO e reescrito: o retorno entra como "
                           + "um evento novo na linha do tempo, preservando a rastreabilidade.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Status anterior restaurado"),
        @ApiResponse(responseCode = "422", description = "Nao ha acao recente para desfazer",
                     content = @io.swagger.v3.oas.annotations.media.Content)
    })
    @Auditavel(acao = AuditoriaService.ALTERACAO_STATUS, recurso = "Denuncia",
               detalhe = "Reversao da ultima mudanca de status pelo proprio servidor")
    @PostMapping("/desfazer")
    public DenunciaResumoResponse desfazer(Authentication auth) {
        return DenunciaMapper.resumo(denuncias.desfazerUltima(usuario(auth)));
    }

    // ------------------------------------------------------------------
    private String usuario(Authentication auth) {
        return (auth == null || auth.getName() == null) ? "anonimo" : auth.getName();
    }
}
