package br.gov.protege.service;

import br.gov.protege.model.Denuncia;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * VigIA - copiloto de IA do gestor.
 *
 * Se houver uma GEMINI_API_KEY configurada, usa o modelo Gemini do Google
 * para classificar a urgencia da denuncia, gerar um resumo objetivo e
 * responder perguntas do gestor. Sem a chave, cai para uma analise por
 * regras (explicavel) - garantindo que a demo funcione sempre (plano B).
 */
@Service
public class VigiaService {

    private final String apiKey;
    private final String model;
    private final String baseUrl;
    private final RestClient http = RestClient.create();
    private final ObjectMapper mapper = new ObjectMapper();

    public VigiaService(
            @Value("${gemini.api.key:}") String apiKey,
            @Value("${gemini.api.model:gemini-1.5-flash}") String model,
            @Value("${gemini.api.url}") String baseUrl) {
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = baseUrl;
    }

    public boolean iaAtiva() {
        return apiKey != null && !apiKey.isBlank();
    }

    public record Analise(String urgencia, String resumo, String origem) {}

    /** Classifica urgencia e resume uma denuncia. */
    public Analise analisar(Denuncia d) {
        if (iaAtiva()) {
            try {
                String prompt = """
                    Voce e um analista de um canal publico de denuncias.
                    Classifique a URGENCIA desta denuncia em uma unica palavra
                    (CRITICA, ALTA, MEDIA ou BAIXA) e escreva um RESUMO objetivo
                    de no maximo 2 frases para o gestor. Responda em JSON puro,
                    sem markdown, no formato:
                    {"urgencia":"...","resumo":"..."}

                    Tipo: %s
                    Local: %s
                    Relato: %s
                    """.formatted(nz(d.getTipo()), nz(d.getLocal()), nz(d.getDescricao()));

                String texto = chamarGemini(prompt);
                String limpo = texto.replaceAll("(?s)```json|```", "").trim();
                JsonNode json = mapper.readTree(limpo);
                return new Analise(
                        json.path("urgencia").asText("MEDIA").toUpperCase(),
                        json.path("resumo").asText(""),
                        "gemini");
            } catch (Exception e) {
                // cai para as regras
            }
        }
        return analisePorRegras(d);
    }

    /** Responde uma pergunta livre do gestor sobre o panorama das denuncias. */
    public String perguntar(String pergunta, String contexto) {
        if (iaAtiva()) {
            try {
                String prompt = """
                    Voce e o VigIA, assistente do gestor publico no sistema Protege+.
                    Seja direto, pratico e cite numeros quando houver.
                    Contexto (denuncias atuais):
                    %s

                    Pergunta do gestor: %s
                    """.formatted(nz(contexto), nz(pergunta));
                return chamarGemini(prompt).trim();
            } catch (Exception e) {
                return "Nao consegui consultar a IA agora. " + resumoRegras(contexto);
            }
        }
        return resumoRegras(contexto);
    }

    // ---------------------------------------------------------------
    //  Chamada HTTP ao Gemini
    // ---------------------------------------------------------------
    private String chamarGemini(String prompt) {
        String url = baseUrl + "/" + model + ":generateContent?key=" + apiKey;

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", prompt)))));

        JsonNode resp = http.post()
                .uri(url)
                .header("Content-Type", "application/json")
                .body(body)
                .retrieve()
                .body(JsonNode.class);

        return resp.path("candidates").path(0)
                .path("content").path("parts").path(0)
                .path("text").asText("");
    }

    // ---------------------------------------------------------------
    //  Fallback por regras (explicavel, sempre funciona)
    // ---------------------------------------------------------------
    private static final Map<String, Integer> GRAVIDADE = Map.of(
            "violencia", 5, "abuso", 5, "assedio", 3, "discriminacao", 3, "outros", 2);

    private Analise analisePorRegras(Denuncia d) {
        int g = GRAVIDADE.getOrDefault(nz(d.getTipo()).toLowerCase(), 2);
        String desc = nz(d.getDescricao()).toLowerCase();
        boolean palavrasCriticas = desc.matches(".*(arma|faca|agora|socorro|ameaca|ameaç|sangue|espancad|refem|refém).*");

        String urgencia;
        if (g >= 5 && palavrasCriticas)      urgencia = "CRITICA";
        else if (g >= 5)                      urgencia = "ALTA";
        else if (g >= 3 || palavrasCriticas)  urgencia = "MEDIA";
        else                                  urgencia = "BAIXA";

        String resumo = "Denuncia de " + nz(d.getTipo()) + " em " + nz(d.getLocal())
                + ". Classificada como " + urgencia + " pela analise de regras do VigIA"
                + (palavrasCriticas ? " (termos de risco identificados no relato)." : ".");

        return new Analise(urgencia, resumo, "regras");
    }

    private String resumoRegras(String contexto) {
        return "Com base nos dados atuais, priorize denuncias de violencia e abuso, "
             + "e as que estao paradas ha mais tempo. Detalhe: " + nz(contexto);
    }

    private String nz(String s) { return s == null ? "" : s; }
}
