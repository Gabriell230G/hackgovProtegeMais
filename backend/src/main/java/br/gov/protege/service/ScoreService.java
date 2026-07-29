package br.gov.protege.service;

import br.gov.protege.dto.DenunciaRequest;
import org.springframework.stereotype.Service;

/**
 * Calcula o score de confiabilidade da denuncia com base no
 * preenchimento dos campos. Mesma logica do score.js do frontend,
 * agora garantida no servidor (fonte da verdade).
 */
@Service
public class ScoreService {

    public record Resultado(int score, String label, String txt) {}

    public Resultado calcular(DenunciaRequest d) {
        int score = 0;

        if (notBlank(d.getTipo()) && notBlank(d.getDescricao())) score += 20;
        if (notBlank(d.getEstado()))  score += 5;
        if (notBlank(d.getCidade()))  score += 5;
        if (notBlank(d.getEndereco())) score += 10;

        // Descricao detalhada agrega confiabilidade
        int tam = d.getDescricao() == null ? 0 : d.getDescricao().trim().length();
        if (tam >= 50)  score += 20;
        if (tam >= 150) score += 20;

        // Denuncia identificada tende a ser mais verificavel
        if (!d.isAnonimo()) score += 20;

        if (score > 100) score = 100;

        String label, txt;
        if (score >= 70)      { label = "high";   txt = "Alta"; }
        else if (score >= 40) { label = "medium"; txt = "Media"; }
        else                  { label = "low";    txt = "Baixa"; }

        return new Resultado(score, label, txt);
    }

    private boolean notBlank(String s) {
        return s != null && !s.trim().isEmpty();
    }
}
