package br.gov.protege.controller;

import br.gov.protege.audit.Auditavel;
import br.gov.protege.dto.*;
import br.gov.protege.mapper.DenunciaMapper;
import br.gov.protege.model.Denuncia;
import br.gov.protege.model.PerfilUsuario;
import br.gov.protege.service.AuditoriaService;
import br.gov.protege.service.DenunciaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@Tag(name = "Denuncias", description = "Registro, acompanhamento e tratamento das denuncias")
@Validated
@RestController
@RequestMapping("/api/denuncias")
public class DenunciaController {

    private static final int TAMANHO_MAXIMO_PAGINA = 100;

    private final DenunciaService service;

    public DenunciaController(DenunciaService service) {
        this.service = service;
    }

    // ------------------------------------------------------------------
    //  CANAL PUBLICO
    // ------------------------------------------------------------------

    @Operation(summary = "Registra uma nova denuncia",
               description = "Canal publico. Gera o protocolo, calcula o score de confiabilidade "
                           + "e submete o relato a analise do VigIA. Nao exige autenticacao: "
                           + "exigir login do denunciante inviabilizaria o anonimato.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Denuncia registrada; protocolo no corpo e no cabecalho Location"),
        @ApiResponse(responseCode = "400", description = "Dados invalidos", content = @io.swagger.v3.oas.annotations.media.Content),
        @ApiResponse(responseCode = "429", description = "Limite de envios por origem excedido", content = @io.swagger.v3.oas.annotations.media.Content)
    })
    @PostMapping
    public ResponseEntity<DenunciaPublicaResponse> registrar(@Valid @RequestBody DenunciaRequest req) {
        Denuncia criada = service.registrar(req);
        URI local = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/protocolo/{protocolo}")
                .buildAndExpand(criada.getProtocolo().replace("#", ""))
                .toUri();
        return ResponseEntity.created(local).body(DenunciaMapper.publica(criada));
    }

    @Operation(summary = "Consulta o andamento por protocolo",
               description = "Canal publico. Devolve apenas situacao e linha do tempo. "
                           + "Relato, endereco e analise interna nao sao expostos aqui.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Situacao encontrada"),
        @ApiResponse(responseCode = "404", description = "Protocolo inexistente", content = @io.swagger.v3.oas.annotations.media.Content)
    })
    @GetMapping("/protocolo/{protocolo}")
    public DenunciaPublicaResponse porProtocolo(
            @Parameter(description = "Protocolo com ou sem o caractere #", example = "2026-00451")
            @PathVariable @NotBlank @Size(max = 20) String protocolo) {
        return DenunciaMapper.publica(service.buscarPorProtocolo(protocolo));
    }

    // ------------------------------------------------------------------
    //  PAINEL DO ORGAO (exige token)
    // ------------------------------------------------------------------

    @Operation(summary = "Lista denuncias com filtros e paginacao",
               description = "Painel do orgao. Os filtros sao resolvidos no banco. "
                           + "A listagem NAO devolve relato nem endereco.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Pagina de resultados"),
        @ApiResponse(responseCode = "401", description = "Token ausente ou expirado", content = @io.swagger.v3.oas.annotations.media.Content)
    })
    @GetMapping
    public PageResponse<DenunciaResumoResponse> listar(
            @Parameter(example = "analise") @RequestParam(required = false) String status,
            @Parameter(example = "violencia") @RequestParam(required = false) String tipo,
            @Parameter(example = "SP") @RequestParam(required = false) String estado,
            @Parameter(description = "Pagina, iniciando em 0") @RequestParam(defaultValue = "0") int pagina,
            @Parameter(description = "Itens por pagina (maximo 100)") @RequestParam(defaultValue = "20") int tamanho) {

        int limite = Math.min(Math.max(tamanho, 1), TAMANHO_MAXIMO_PAGINA);
        PageRequest pageable = PageRequest.of(Math.max(pagina, 0), limite,
                Sort.by(Sort.Direction.DESC, "criadoEm"));

        Page<Denuncia> page = service.listar(status, tipo, estado, pageable);
        return PageResponse.de(page, DenunciaMapper::resumo);
    }

    @Operation(summary = "Abre o detalhe de uma denuncia",
               description = "CONSULTA SENSIVEL: devolve o relato do denunciante. "
                           + "Perfis sem autorizacao para ver identificacao recebem o "
                           + "endereco substituido por marcador de protecao.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Detalhe do caso"),
        @ApiResponse(responseCode = "401", description = "Token ausente ou expirado", content = @io.swagger.v3.oas.annotations.media.Content),
        @ApiResponse(responseCode = "404", description = "Denuncia inexistente", content = @io.swagger.v3.oas.annotations.media.Content)
    })
    @Auditavel(acao = AuditoriaService.CONSULTA_SENSIVEL, recurso = "Denuncia",
               detalhe = "Leitura do detalhe, que expoe o relato do denunciante")
    @GetMapping("/{id}")
    public DenunciaDetalheResponse porId(@PathVariable Long id, Authentication auth) {
        return DenunciaMapper.detalhe(service.buscarObrigatoria(id), podeVerIdentidade(auth));
    }

    @Operation(summary = "Atualiza os dados de uma denuncia",
               description = "Substitui os campos descritivos do caso. Protocolo e status "
                           + "nao sao alterados por esta rota - status tem endpoint proprio "
                           + "porque cada transicao precisa gerar historico.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Denuncia atualizada"),
        @ApiResponse(responseCode = "400", description = "Dados invalidos", content = @io.swagger.v3.oas.annotations.media.Content),
        @ApiResponse(responseCode = "404", description = "Denuncia inexistente", content = @io.swagger.v3.oas.annotations.media.Content)
    })
    @Auditavel(acao = AuditoriaService.ALTERACAO_DADOS, recurso = "Denuncia")
    @PutMapping("/{id}")
    public DenunciaDetalheResponse atualizar(@PathVariable Long id,
                                             @Valid @RequestBody DenunciaRequest req,
                                             Authentication auth) {
        return DenunciaMapper.detalhe(service.atualizar(id, req), podeVerIdentidade(auth));
    }

    @Operation(summary = "Muda o status e registra na linha do tempo",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Status alterado"),
        @ApiResponse(responseCode = "404", description = "Denuncia inexistente", content = @io.swagger.v3.oas.annotations.media.Content),
        @ApiResponse(responseCode = "422", description = "Transicao invalida", content = @io.swagger.v3.oas.annotations.media.Content)
    })
    @Auditavel(acao = AuditoriaService.ALTERACAO_STATUS, recurso = "Denuncia")
    @PatchMapping("/{id}/status")
    public DenunciaResumoResponse mudarStatus(@PathVariable Long id,
                                              @Valid @RequestBody AtualizarStatusRequest req,
                                              Authentication auth) {
        String usuario = (auth == null || auth.getName() == null) ? "anonimo" : auth.getName();
        return DenunciaMapper.resumo(service.atualizarStatus(id, req.getStatus(), usuario));
    }

    @Operation(summary = "Atribui um responsavel pelo caso",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Responsavel atribuido"),
        @ApiResponse(responseCode = "404", description = "Denuncia inexistente", content = @io.swagger.v3.oas.annotations.media.Content)
    })
    @Auditavel(acao = AuditoriaService.ATRIBUICAO, recurso = "Denuncia")
    @PatchMapping("/{id}/responsavel")
    public DenunciaResumoResponse atribuir(@PathVariable Long id,
                                           @Valid @RequestBody AtribuirResponsavelRequest req) {
        return DenunciaMapper.resumo(service.atribuirResponsavel(id, req.getResponsavelId()));
    }

    @Operation(summary = "Exclui logicamente uma denuncia",
               description = "O registro nao e apagado do banco: e marcado como excluido e o "
                           + "conteudo sensivel (relato, endereco, resumo da IA) e eliminado. "
                           + "Atende ao direito de eliminacao da LGPD sem destruir a "
                           + "rastreabilidade exigida da administracao publica. Exige motivo.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Denuncia excluida"),
        @ApiResponse(responseCode = "404", description = "Denuncia inexistente", content = @io.swagger.v3.oas.annotations.media.Content),
        @ApiResponse(responseCode = "422", description = "Motivo nao informado", content = @io.swagger.v3.oas.annotations.media.Content)
    })
    @Auditavel(acao = AuditoriaService.EXCLUSAO, recurso = "Denuncia",
               detalhe = "Exclusao logica com anonimizacao do conteudo sensivel")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(
            @PathVariable Long id,
            @Parameter(description = "Justificativa registrada na trilha de auditoria", required = true)
            @RequestParam String motivo) {
        service.excluir(id, motivo);
        return ResponseEntity.noContent().build();
    }

    // ------------------------------------------------------------------
    /**
     * Somente perfis com autorizacao para dado identificavel recebem o
     * endereco exato. O ATENDENTE trabalha o caso sem essa informacao.
     */
    private boolean podeVerIdentidade(Authentication auth) {
        if (auth == null || auth.getAuthorities() == null) return false;
        for (GrantedAuthority a : auth.getAuthorities()) {
            PerfilUsuario perfil = PerfilUsuario.de(a.getAuthority().replaceFirst("^ROLE_", ""));
            if (perfil.podeVerIdentidade()) return true;
        }
        return false;
    }
}
