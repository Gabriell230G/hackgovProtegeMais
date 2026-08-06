package br.gov.protege.mapper;

import br.gov.protege.dto.DenunciaDetalheResponse;
import br.gov.protege.dto.DenunciaPublicaResponse;
import br.gov.protege.dto.DenunciaResumoResponse;
import br.gov.protege.model.Denuncia;
import br.gov.protege.util.MascaraUtil;

/**
 * Converte a entidade Denuncia nas respostas da API.
 *
 * Existe por uma razao de seguranca, nao de estilo: enquanto os
 * controllers devolviam a entidade diretamente, toda listagem trafegava
 * o relato completo e o endereco de dezenas de vitimas. Aqui cada
 * resposta carrega apenas os campos que aquele consumidor precisa.
 */
public final class DenunciaMapper {

    private DenunciaMapper() { }

    /** Canal publico: o cidadao acompanha o proprio protocolo. */
    public static DenunciaPublicaResponse publica(Denuncia d) {
        return new DenunciaPublicaResponse(
                d.getProtocolo(),
                d.getTipo(),
                d.getLocal(),
                d.getStatus(),
                d.getScore(),
                d.getScoreTxt(),
                d.getCriadoEm(),
                d.getHistorico());
    }

    /** Listagem do painel: sem relato e sem endereco. */
    public static DenunciaResumoResponse resumo(Denuncia d) {
        return new DenunciaResumoResponse(
                d.getId(),
                d.getProtocolo(),
                d.getTipo(),
                d.getLocal(),
                d.getStatus(),
                d.isAnonimo(),
                d.getScore(),
                d.getScoreTxt(),
                d.getUrgenciaIa(),
                d.getResponsavelId(),
                d.getCriadoEm());
    }

    /**
     * Detalhe do caso.
     *
     * @param podeVerIdentidade quando falso (perfil operacional), o endereco
     *                          exato e substituido por um marcador de protecao.
     */
    public static DenunciaDetalheResponse detalhe(Denuncia d, boolean podeVerIdentidade) {
        return new DenunciaDetalheResponse(
                d.getId(),
                d.getProtocolo(),
                d.getTipo(),
                d.getLocal(),
                d.getEstado(),
                d.getCidade(),
                podeVerIdentidade ? d.getEndereco() : MascaraUtil.endereco(d.getEndereco()),
                d.getDescricao(),
                d.getStatus(),
                d.isAnonimo(),
                d.getScore(),
                d.getScoreLabel(),
                d.getScoreTxt(),
                d.getUrgenciaIa(),
                d.getResumoIa(),
                d.getOrigemAnalise(),
                d.getResponsavelId(),
                d.getCriadoEm(),
                d.getConcluidaEm(),
                d.getHistorico());
    }
}
