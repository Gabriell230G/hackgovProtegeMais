package br.gov.protege.util;

/**
 * Mascaramento de dados pessoais.
 *
 * Aplicado nas respostas da API conforme o perfil que consulta, para que
 * um perfil operacional trabalhe o caso sem receber dado de identificacao
 * que sua funcao nao exige (minimizacao - LGPD, art. 6, III).
 */
public final class MascaraUtil {

    private MascaraUtil() { }

    /** joao.silva@email.com -> j***a@email.com */
    public static String email(String valor) {
        if (vazio(valor) || !valor.contains("@")) return null;
        String[] partes = valor.split("@", 2);
        String nome = partes[0];
        if (nome.length() <= 2) return "***@" + partes[1];
        return nome.charAt(0) + "***" + nome.charAt(nome.length() - 1) + "@" + partes[1];
    }

    /** (11) 98765-4321 -> (11) *****-4321 */
    public static String telefone(String valor) {
        if (vazio(valor)) return null;
        String digitos = valor.replaceAll("\\D", "");
        if (digitos.length() < 4) return "****";
        String fim = digitos.substring(digitos.length() - 4);
        return "*".repeat(Math.max(0, digitos.length() - 4)) + fim;
    }

    /**
     * Reduz o endereco a nada. Endereco exato so e exibido no detalhe
     * do caso, para perfis autorizados, e a leitura e auditada.
     */
    public static String endereco(String valor) {
        return vazio(valor) ? null : "[endereco protegido]";
    }

    private static boolean vazio(String s) {
        return s == null || s.isBlank();
    }
}
