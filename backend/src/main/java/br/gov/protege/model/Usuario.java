package br.gov.protege.model;

import jakarta.persistence.*;

/**
 * Usuario do painel do gestor (Area do Servidor).
 * A senha e armazenada com hash BCrypt.
 */
@Entity
@Table(name = "servidor_publico")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 150)
    private String email;

    @Column(name = "senha_hash", nullable = false, length = 120)
    private String senhaHash;

    @Column(length = 100)
    private String nome;

    /** Chave estrangeira natural para a tabela PERFIL. */
    @Column(name = "perfil", nullable = false, length = 20)
    private String role = "ATENDENTE";

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
