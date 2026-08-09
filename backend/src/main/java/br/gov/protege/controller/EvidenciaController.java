package br.gov.protege.controller;

import br.gov.protege.audit.Auditavel;
import br.gov.protege.dto.EvidenciaResponse;
import br.gov.protege.exception.RegraDeNegocioException;
import br.gov.protege.model.Denuncia;
import br.gov.protege.model.Evidencia;
import br.gov.protege.service.AuditoriaService;
import br.gov.protege.service.DenunciaService;
import br.gov.protege.service.EvidenciaService;
import br.gov.protege.util.AssinaturaArquivo;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Anexos de uma denuncia: envio pelo cidadao, leitura pelo orgao.
 *
 * O envio e PUBLICO, pelo protocolo. Nao ha como ser diferente: o canal
 * aceita denuncia anonima, e quem denuncia anonimamente nao tem conta para
 * autenticar. O protocolo e a credencial - quem o possui, registrou o caso.
 *
 * O que substitui a autenticacao, aqui, sao limites: 10 arquivos por
 * denuncia, 5 MB cada, formatos verificados pela assinatura do arquivo,
 * limite de requisicoes por origem e bloqueio depois que o caso e concluido.
 *
 * A LEITURA e o oposto: exige autenticacao e gera trilha de auditoria. Uma
 * foto anexada a uma denuncia de violencia e o dado mais sensivel que este
 * sistema guarda, e cada acesso a ela precisa ter dono e hora.
 */
@Tag(name = "Evidencias", description = "Arquivos anexados as denuncias")
@RestController
public class EvidenciaController {

    private final EvidenciaService service;
    private final DenunciaService denuncias;

    public EvidenciaController(EvidenciaService service, DenunciaService denuncias) {
        this.service = service;
        this.denuncias = denuncias;
    }

    // ── ENVIO — canal do cidadao ─────────────────────────────────────

    @Operation(summary = "Anexa um arquivo a denuncia",
               description = "Canal publico, identificado pelo protocolo. O tipo do arquivo e "
                           + "determinado pela assinatura do conteudo, nao pela extensao nem pelo "
                           + "cabecalho Content-Type - ambos sao escolhidos por quem envia. "
                           + "Aceita: " + "imagem JPEG, PNG e WebP, PDF, audio MP3, OGG e WebM, video MP4. "
                           + "Limite de 5 MB e de 10 arquivos por denuncia.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Arquivo anexado"),
        @ApiResponse(responseCode = "404", description = "Protocolo inexistente"),
        @ApiResponse(responseCode = "413", description = "Arquivo acima de 5 MB"),
        @ApiResponse(responseCode = "415", description = "Formato recusado pela assinatura do conteudo"),
        @ApiResponse(responseCode = "422", description = "Arquivo vazio, limite de 10 anexos atingido ou caso ja concluido"),
        @ApiResponse(responseCode = "429", description = "Limite de envios por origem excedido")
    })
    @PostMapping(value = "/api/denuncias/protocolo/{protocolo}/evidencias",
                 consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<EvidenciaResponse> anexar(@PathVariable String protocolo,
                                                    @RequestParam("arquivo") MultipartFile arquivo) {
        Denuncia d = denuncias.buscarPorProtocolo(protocolo);

        // Depois de encerrado, o caso nao recebe mais anexo pelo canal aberto.
        // Anexar a um caso concluido serviria menos para complementar a denuncia
        // do que para poluir um registro que ja foi analisado.
        if ("concluida".equalsIgnoreCase(String.valueOf(d.getStatus()))) {
            throw new RegraDeNegocioException(
                    "Este caso ja foi concluido e nao aceita novos anexos");
        }

        byte[] conteudo;
        try {
            conteudo = arquivo.getBytes();
        } catch (IOException e) {
            throw new RegraDeNegocioException("Nao foi possivel ler o arquivo enviado");
        }

        Evidencia ev = service.guardar(d.getId(), conteudo, arquivo.getOriginalFilename());
        return ResponseEntity
                .created(URI.create("/api/evidencias/" + ev.getId()))
                .body(paraResposta(ev));
    }

    // ── LEITURA — painel do orgao ────────────────────────────────────

    @Operation(summary = "Lista os anexos de uma denuncia",
               description = "Devolve apenas metadado. O conteudo sai pelo endpoint de download, "
                           + "um arquivo por vez, e cada leitura gera registro de auditoria.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(responseCode = "200", description = "Metadados dos anexos")
    @GetMapping("/api/denuncias/{id}/evidencias")
    public List<EvidenciaResponse> listar(@PathVariable Long id) {
        return service.listar(id).stream().map(EvidenciaController::paraResposta).toList();
    }

    @Operation(summary = "Baixa o arquivo de uma evidencia",
               description = "Consulta sensivel: gera trilha de auditoria. O conteudo devolvido e "
                           + "conferido contra o hash gravado no recebimento - se o arquivo tiver "
                           + "sido trocado no disco, a leitura e recusada em vez de entregar algo "
                           + "que nao e mais a evidencia original.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Conteudo do arquivo"),
        @ApiResponse(responseCode = "404", description = "Evidencia inexistente ou removida"),
        @ApiResponse(responseCode = "422", description = "Arquivo no disco nao corresponde ao recebido")
    })
    @Auditavel(acao = AuditoriaService.CONSULTA_SENSIVEL, recurso = "Evidencia",
               detalhe = "Download de arquivo anexado")
    @GetMapping("/api/evidencias/{id}/arquivo")
    public ResponseEntity<byte[]> baixar(@PathVariable Long id) {
        Evidencia ev = service.buscar(id);
        byte[] dados = service.conteudo(ev);

        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.parseMediaType(ev.getTipoConteudo()));

        // attachment, e nao inline: um PDF ou SVG aberto dentro do dominio do
        // painel poderia executar script no contexto da sessao de quem abriu.
        h.setContentDisposition(ContentDisposition.attachment()
                .filename(ev.getNomeOriginal(), StandardCharsets.UTF_8).build());

        // Impede o navegador de "adivinhar" um tipo diferente do declarado.
        h.add("X-Content-Type-Options", "nosniff");

        return ResponseEntity.ok().headers(h).body(dados);
    }

    @Operation(summary = "Remove um anexo",
               description = "Remocao logica com destruicao do binario. O registro permanece com "
                           + "motivo e data: nao ha como anonimizar uma foto, mas ha como manter "
                           + "o rastro de que ela existiu e de quem a removeu.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Anexo removido"),
        @ApiResponse(responseCode = "403", description = "Perfil sem permissao"),
        @ApiResponse(responseCode = "422", description = "Motivo nao informado")
    })
    @Auditavel(acao = AuditoriaService.EXCLUSAO, recurso = "Evidencia",
               detalhe = "Remocao de arquivo anexado")
    @DeleteMapping("/api/evidencias/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id,
                                        @RequestParam(required = false) String motivo) {
        service.remover(id, motivo);
        return ResponseEntity.noContent().build();
    }

    private static EvidenciaResponse paraResposta(Evidencia e) {
        return new EvidenciaResponse(e.getId(), e.getNomeOriginal(),
                AssinaturaArquivo.rotulo(e.getTipoConteudo()),
                e.getTamanhoBytes(), e.getHashSha256(), e.getEnviadoEm());
    }
}
