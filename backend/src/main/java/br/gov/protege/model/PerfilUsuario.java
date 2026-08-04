package br.gov.protege.model;

/**
 * Perfis de acesso do Protege+.
 *
 * A separacao nao e burocratica: o principio e o da minimizacao (LGPD,
 * art. 6, III). Quem trabalha o caso no dia a dia nao precisa da identidade
 * de quem denunciou; quem audita o sistema nao precisa ler o relato.
 */
public enum PerfilUsuario {

    /** Cidadao. Registra e consulta o proprio protocolo. Nao autentica. */
    CIDADAO(false, false),

    /** Trata os casos no Kanban. NAO ve identificacao do denunciante. */
    ATENDENTE(false, false),

    /** Coordena o atendimento. Ve identificacao quando o caso nao e anonimo. */
    GESTOR(true, false),

    /** Fiscaliza o uso do sistema. Ve a trilha, NAO ve o relato das denuncias. */
    AUDITOR(false, true),

    /** Administra usuarios e perfis. Acesso pleno, integralmente auditado. */
    ADMIN(true, true);

    private final boolean veIdentidade;
    private final boolean veAuditoria;

    PerfilUsuario(boolean veIdentidade, boolean veAuditoria) {
        this.veIdentidade = veIdentidade;
        this.veAuditoria = veAuditoria;
    }

    public boolean podeVerIdentidade() { return veIdentidade; }
    public boolean podeVerAuditoria()  { return veAuditoria; }

    /** Converte com seguranca, caindo no perfil de menor privilegio. */
    public static PerfilUsuario de(String valor) {
        if (valor == null) return ATENDENTE;
        try {
            return valueOf(valor.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ATENDENTE;
        }
    }
}
