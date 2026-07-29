package br.gov.protege.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Dados recebidos do formulario do cidadao ao registrar uma denuncia.
 */
public class DenunciaRequest {

    @NotBlank(message = "O tipo da denuncia e obrigatorio")
    private String tipo;

    @NotBlank(message = "A descricao e obrigatoria")
    private String descricao;

    private String estado;
    private String cidade;
    private String endereco;
    private boolean anonimo = true;

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }

    public String getEndereco() { return endereco; }
    public void setEndereco(String endereco) { this.endereco = endereco; }

    public boolean isAnonimo() { return anonimo; }
    public void setAnonimo(boolean anonimo) { this.anonimo = anonimo; }
}
