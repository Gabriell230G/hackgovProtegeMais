package br.gov.protege.model;

import jakarta.persistence.*;

/**
 * Usuario do painel do gestor (Area do Servidor).
 * A senha e armazenada com hash BCrypt.
 */
@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String senhaHash;

    private String nome;
    private String role = "GESTOR";

    public Usuario() {}

    public Usuario(String email, String senhaHash, String nome, String role) {
        this.email = email;
        this.senhaHash = senhaHash;
        this.nome = nome;
        this.role = role;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getSenhaHash() { return senhaHash; }
    public void setSenhaHash(String senhaHash) { this.senhaHash = senhaHash; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
