package br.gov.protege.controller;

import br.gov.protege.audit.Auditavel;
import br.gov.protege.dto.AuditoriaResponse;
import br.gov.protege.dto.PageResponse;
import br.gov.protege.model.AuditoriaLog;
import br.gov.protege.repository.AuditoriaLogRepository;
import br.gov.protege.service.AuditoriaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Consulta da trilha de auditoria.
 *
 * Restrito aos perfis AUDITOR e ADMIN pelo SecurityConfig: quem opera o
 * sistema no dia a dia nao fiscaliza o proprio uso dele.
 *
 * Nao existe endpoint de alteracao nem de exclusao nesta rota, por decisao
 * de projeto - uma trilha que pode ser editada nao prova nada.
 */
@Tag(name = "Auditoria",
     description = "Trilha imutavel de acoes sensiveis, encadeada por hash")
@RestController
@RequestMapping("/api/auditoria")
public class AuditoriaController {

    private static final int TAMANHO_MAXIMO_PAGINA = 200;

    private final AuditoriaLogRepository repo;
    private final AuditoriaService auditoria;

    public AuditoriaController(AuditoriaLogRepository repo, AuditoriaService auditoria) {
        this.repo = repo;
        this.auditoria = auditoria;
    }

    @Operation(summary = "Consulta a trilha de auditoria",
               description = "Registros em ordem decrescente de data, com filtros opcionais. "
                           + "A propria consulta e registrada na trilha - inclusive o acesso "
                           + "do auditor deixa rastro.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Pagina de registros"),
        @ApiResponse(responseCode = "401", description = "Token ausente ou expirado",
                     content = @io.swagger.v3.oas.annotations.media.Content),
        @ApiResponse(responseCode = "403", description = "Perfil sem permissao de auditoria",
                     content = @io.swagger.v3.oas.annotations.media.Content)
    })
    @Auditavel(acao = AuditoriaService.ACESSO_AUDITORIA, recurso = "AuditoriaLog",
               detalhe = "Consulta a trilha de auditoria")
    @GetMapping
    public PageResponse<AuditoriaResponse> consultar(
            @Parameter(description = "Trecho do e-mail do usuario") @RequestParam(required = false) String usuario,
            @Parameter(example = "CONSULTA_SENSIVEL") @RequestParam(required = false) String acao,
            @Parameter(description = "Data e hora inicial (ISO)", example = "2026-08-01T00:00:00")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime inicio,
            @Parameter(description = "Data e hora final (ISO)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fim,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "50") int tamanho) {

        int limite = Math.min(Math.max(tamanho, 1), TAMANHO_MAXIMO_PAGINA);
        PageRequest pageable = PageRequest.of(Math.max(pagina, 0), limite,
                Sort.by(Sort.Direction.DESC, "id"));

        Page<AuditoriaLog> page = repo.buscar(
                vazioParaNulo(usuario), vazioParaNulo(acao), inicio, fim, pageable);
        return PageResponse.de(page, AuditoriaResponse::de);
    }

    @Operation(summary = "Verifica a integridade da cadeia",
               description = "Recalcula todos os hashes e confere o encadeamento. "
                           + "Aponta o primeiro registro em que a cadeia foi rompida, "
                           + "distinguindo conteudo alterado de registro removido ou inserido.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(responseCode = "200", description = "Resultado da verificacao")
    @GetMapping("/integridade")
    public Map<String, Object> integridade() {
        return auditoria.verificarIntegridade();
    }

    @Operation(summary = "Lista as acoes que geram trilha",
               description = "Catalogo das operacoes auditadas no Protege+.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(responseCode = "200", description = "Catalogo de acoes auditadas")
    @GetMapping("/acoes")
    public Map<String, String> acoes() {
        return Map.ofEntries(
            Map.entry(AuditoriaService.LOGIN,             "Autenticacao bem-sucedida de servidor"),
            Map.entry(AuditoriaService.LOGIN_NEGADO,      "Tentativa de autenticacao recusada"),
            Map.entry(AuditoriaService.CONSULTA_SENSIVEL, "Leitura do detalhe de uma denuncia, que expoe o relato"),
            Map.entry(AuditoriaService.ALTERACAO_STATUS,  "Mudanca de status no fluxo de atendimento"),
            Map.entry(AuditoriaService.ALTERACAO_DADOS,   "Alteracao dos dados descritivos da denuncia"),
            Map.entry(AuditoriaService.ATRIBUICAO,        "Atribuicao de responsavel pelo caso"),
            Map.entry(AuditoriaService.EXCLUSAO,          "Exclusao logica de denuncia, com anonimizacao do conteudo"),
            Map.entry(AuditoriaService.EXPORTACAO,        "Exportacao de dados para fora do sistema"),
            Map.entry(AuditoriaService.REANALISE_IA,      "Reanalise de denuncia por inteligencia artificial"),
            Map.entry(AuditoriaService.ALTERACAO_EQUIPE,  "Cadastro, alteracao ou remocao de membro da equipe"),
            Map.entry(AuditoriaService.ACESSO_AUDITORIA,  "Consulta a propria trilha de auditoria"));
    }

    private String vazioParaNulo(String v) {
        return (v == null || v.isBlank()) ? null : v.trim();
    }
}
