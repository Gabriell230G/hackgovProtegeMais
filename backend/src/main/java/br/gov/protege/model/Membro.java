package br.gov.protege.model;

import jakarta.persistence.*;

/**
 * Membro da equipe do gestor publico (usado no Kanban e na
 * atribuicao de responsaveis pelas denuncias).
 */
@Entity
@Table(name = "membro_equipe")
public class Membro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(length = 80)
    private String cargo;

    @Column(unique = true, length = 150)
    private String email;

    public Membro() {}

    public Membro(String nome, String cargo, String email) {
        this.nome = nome;
        this.cargo = cargo;
        this.email = email;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getCargo() { return cargo; }
    public void setCargo(String cargo) { this.cargo = cargo; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}
