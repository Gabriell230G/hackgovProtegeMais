package br.gov.protege.controller;

import br.gov.protege.audit.Auditavel;
import br.gov.protege.model.Denuncia;
import br.gov.protege.model.PerfilUsuario;
import br.gov.protege.repository.DenunciaRepository;
import br.gov.protege.service.AuditoriaService;
import br.gov.protege.service.ExportacaoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

/**
 * Extracao de dados para analise fora do sistema.
 *
 * Esta e a operacao de maior exposicao do canal. Uma consulta sensivel expoe
 * um caso; uma exportacao entrega centenas de uma vez, num arquivo que passa
 * a circular por e-mail e pen drive, fora de qualquer controle de acesso.
 *
 * Por isso ela e a mais restrita: so GESTOR e ADMIN, sempre auditada, sem o
 * relato das denuncias, e com o mesmo mascaramento de endereco que vale nas
 * telas. Negar o endereco no detalhe e entrega-lo em lote numa planilha
 * seria uma contradicao que o atacante encontraria antes do avaliador.
 */
@Tag(name = "Exportacao", description = "Extracao de dados para analise")
@RestController
@RequestMapping("/api/exportacao")
public class ExportacaoController {

    private final DenunciaRepository repo;
    private final ExportacaoService exportacao;

    public ExportacaoController(DenunciaRepository repo, ExportacaoService exportacao) {
        this.repo = repo;
        this.exportacao = exportacao;
    }

    @Operation(summary = "Exporta as denuncias em CSV",
               description = "Restrito a GESTOR e ADMIN. Gera trilha de auditoria. "
                           + "NAO inclui o relato das denuncias - as perguntas de gestao "
                           + "(volume, tipo, prazo, situacao) nao precisam do texto, e um arquivo "
                           + "com centenas de relatos circulando seria o vazamento que o resto do "
                           + "sistema evita. Valores iniciados por =, +, - ou @ sao prefixados com "
                           + "apostrofo para que a planilha nao os interprete como formula.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Arquivo CSV"),
        @ApiResponse(responseCode = "403", description = "Perfil sem permissao")
    })
    @Auditavel(acao = AuditoriaService.EXPORTACAO, recurso = "Denuncia",
               detalhe = "Exportacao das denuncias em CSV")
    @GetMapping(value = "/denuncias", produces = "text/csv; charset=UTF-8")
    public ResponseEntity<byte[]> denunciasCsv() {
        List<Denuncia> todas = repo.findByExcluidaFalseOrderByCriadoEmDesc();
        String csv = exportacao.gerarCsv(todas, podeVerIdentidade());

        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        h.setContentDisposition(ContentDisposition.attachment()
                .filename("protege_denuncias_" + LocalDate.now() + ".csv", StandardCharsets.UTF_8)
                .build());
        h.add("X-Content-Type-Options", "nosniff");

        return ResponseEntity.ok().headers(h).body(csv.getBytes(StandardCharsets.UTF_8));
    }

    private boolean podeVerIdentidade() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null) return false;
        return auth.getAuthorities().stream()
                .map(a -> a.getAuthority().replaceFirst("^ROLE_", ""))
                .map(PerfilUsuario::de)
                .anyMatch(PerfilUsuario::podeVerIdentidade);
    }
}
