package br.gov.protege.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Dados de entrada para cadastro e edicao de um membro da equipe.
 */
@Schema(description = "Dados de um membro da equipe do orgao")
public class MembroRequest {

    @NotBlank(message = "O nome e obrigatorio")
    @Size(max = 100, message = "O nome deve ter no maximo 100 caracteres")
    @Schema(example = "Ana Souza")
    private String nome;

    @Size(max = 80, message = "O cargo deve ter no maximo 80 caracteres")
    @Schema(example = "Analista de Denuncias")
    private String cargo;

    @Email(message = "E-mail invalido")
    @Size(max = 150, message = "O e-mail deve ter no maximo 150 caracteres")
    @Schema(example = "ana.souza@protege.gov.br")
    private String email;

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getCargo() { return cargo; }
    public void setCargo(String cargo) { this.cargo = cargo; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}
