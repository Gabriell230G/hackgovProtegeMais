# Protege+ — Canal Nacional de Denúncias

Plataforma para registro e gestão de denúncias de violência, abuso e violação de direitos, com **canal anônimo para o cidadão** e um **painel inteligente para o gestor público** (Kanban, equipe, mapa e o copiloto de IA **VigIA**).

Projeto desenvolvido para o **HackGov / Challenge FIAP** em parceria com a EGESP.

---

## Arquitetura

| Camada | Tecnologia | Por quê |
|---|---|---|
| **Frontend** | HTML + CSS + JavaScript (vanilla) | Leve, sem build, roda em qualquer navegador. Integra APIs públicas (IBGE para estados/cidades, OpenStreetMap para geolocalização). |
| **Backend** | **Java 17 + Spring Boot 3** (REST) | Padrão de mercado para APIs corporativas/governamentais: robusto, seguro e amplamente adotado no setor público. |
| **Banco de dados** | **PostgreSQL na nuvem (Supabase)** / H2 (modo offline) | Postgres gerenciado com painel web — dá para ver as tabelas e os dados em tempo real no navegador. H2 é o plano B para rodar sem internet. |
| **Segurança** | **Spring Security + JWT** + BCrypt | Login real do gestor com token; endpoints do painel protegidos. Campos sensíveis criptografados no frontend (LGPD). |
| **IA** | **Google Gemini** (via API) com _fallback_ por regras | Classifica urgência, resume relatos e responde o gestor. Sem chave, o VigIA opera por regras explicáveis. |
| **Docs** | **Swagger / OpenAPI** | Documentação interativa da API em `/swagger-ui.html`. |

---

## Como executar

### 1. Banco de dados na nuvem (Supabase)

1. Crie uma conta gratuita em <https://supabase.com> e um novo projeto.
2. Em **Project Settings → Database → Connection info**, copie host, database, usuário e senha.
3. Defina as variáveis de ambiente antes de subir o backend (a URL usa o formato JDBC):

```bash
# Linux / Mac
export DB_URL="jdbc:postgresql://<HOST>:5432/postgres"
export DB_USER="postgres"
export DB_PASSWORD="<SUA_SENHA>"

# Windows (PowerShell)
$env:DB_URL="jdbc:postgresql://<HOST>:5432/postgres"
$env:DB_USER="postgres"
$env:DB_PASSWORD="<SUA_SENHA>"
```

As tabelas são criadas automaticamente na primeira execução, com dados de exemplo. Você pode visualizá-las no **Table Editor** do Supabase, direto no navegador.

> **Modo offline (plano B):** para rodar sem internet, use o banco H2 embutido:
> `mvn spring-boot:run -Dspring-boot.run.profiles=h2` (console em `/h2-console`).

### 2. Backend (API Java)

Pré-requisitos: **JDK 17+** e **Maven**.

```bash
cd backend
mvn spring-boot:run
```

A API sobe em `http://localhost:8080`.

- **Swagger (documentação):** <http://localhost:8080/swagger-ui.html>
- **Gestor padrão** (criado automaticamente): `admin@protege.gov.br` / senha `admin123`
  *(troque em produção pelas variáveis `ADMIN_EMAIL` e `ADMIN_SENHA`).*

### 3. Frontend (portal + painel)

Sirva por HTTP (evita bloqueios de CORS/geolocalização):

```bash
# Live Server (VS Code) ou:
python -m http.server 5500   # acesse http://localhost:5500
```

O frontend detecta o backend sozinho: se a API estiver no ar, usa o banco; senão, cai para o `localStorage` (plano B automático).

### 4. IA (VigIA com Gemini) — opcional

Gere uma chave gratuita em <https://aistudio.google.com/apikey> e exporte antes de subir o backend:

```bash
export GEMINI_API_KEY="sua_chave_aqui"   # ($env:GEMINI_API_KEY no Windows)
```

Sem a chave, o VigIA continua funcionando em modo regras.

---

## Principais endpoints

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| `POST` | `/api/auth/login` | público | Login do gestor → retorna token JWT |
| `POST` | `/api/denuncias` | público | Cidadão registra denúncia (gera protocolo, score e análise de IA) |
| `GET` | `/api/denuncias/protocolo/{protocolo}` | público | Consulta de status por protocolo |
| `GET` | `/api/denuncias?status=&tipo=` | 🔒 gestor | Lista/filtra denúncias (Kanban) |
| `PATCH` | `/api/denuncias/{id}/status` | 🔒 gestor | Muda status e registra no histórico |
| `PATCH` | `/api/denuncias/{id}/responsavel` | 🔒 gestor | Atribui responsável |
| `GET` | `/api/stats` | 🔒 gestor | Dashboard: totais por status, tipo, urgência e score médio |
| `GET/POST/DELETE` | `/api/equipe` | 🔒 gestor | Gestão da equipe |
| `GET` | `/api/vigia/status` | público | Diz se a IA está em modo Gemini ou Regras |
| `POST` | `/api/vigia/analisar/{id}` | 🔒 gestor | (Re)analisa uma denúncia com IA |
| `POST` | `/api/vigia/perguntar` | 🔒 gestor | Chat do gestor com o VigIA |

🔒 = requer cabeçalho `Authorization: Bearer <token>`.

---

## Funcionalidades

**Cidadão:** denúncia anônima ou identificada, consulta de status por protocolo, botão de emergência com geolocalização, **Modo Seguro** (disfarça a tela para proteger a vítima), múltiplos idiomas e chatbot de atendimento.

**Gestor público:** login seguro, Kanban das denúncias, gestão de equipe, mapa de ocorrências, **score de confiabilidade**, dashboard de estatísticas e o **VigIA** — copiloto de IA que classifica urgência, resume relatos e prioriza o atendimento.

**Segurança e privacidade (LGPD):** autenticação JWT, criptografia de campos sensíveis e sigilo do denunciante.

---

## Testes

```bash
cd backend
mvn test
```

Cobrem as regras de score (`ScoreServiceTest`) e a classificação de urgência do VigIA (`VigiaServiceTest`).

---

## Estrutura do projeto

```
.
├── index.html
├── css/
├── js/
│   ├── backend.js        # Ponte com a API (login JWT + fallback localStorage)
│   ├── vigia.js
│   └── ...
└── backend/
    ├── pom.xml
    └── src/
        ├── main/java/br/gov/protege/
        │   ├── config/       # OpenAPI/Swagger
        │   ├── security/     # JWT, filtro e SecurityConfig
        │   ├── model/        # Denuncia, HistoricoItem, Membro, Usuario
        │   ├── repository/   # Spring Data JPA
        │   ├── service/      # Score e IA (VigIA/Gemini)
        │   └── controller/   # Endpoints REST + tratamento de erros
        └── test/java/...     # Testes JUnit
```

---

## Equipe

<!-- Preencha com os dados do grupo -->
| Nome | RM | Cidade |
|---|---|---|
| … | … | … |

---

## Links

- 🎥 **Vídeo pitch:** _(inserir link do YouTube)_
- 💻 **Repositório:** _(inserir link do GitHub)_
