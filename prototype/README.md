# Seguro IN — Protótipo demonstrativo

Landing page estática para validar a experiência de captação de leads e encaminhamento para cotação ou atendimento. **Nenhum dado é enviado ou persistido** — a captação é simulada em memória.

## Execução local

```bash
cd prototype
python3 -m http.server 8080
```

Abrir [http://localhost:8080](http://localhost:8080) ou abrir `index.html` diretamente no navegador (suporte a `file://`).

## Estrutura

```
prototype/
├── index.html              # Landing page completa
├── proxima-etapa.html      # Página demonstrativa de destino
├── assets/
│   ├── css/styles.css      # Tokens, layout, componentes
│   ├── js/
│   │   ├── config.js       # Configuração e modo demonstrativo
│   │   ├── catalog.js      # 13 produtos + 8 atividades RC
│   │   ├── lead-adapter.js # Simulação de envio em memória
│   │   ├── app.js          # UI, formulário, validação
│   │   └── next-step.js    # Validação de parâmetros da próxima etapa
│   └── img/
│       ├── brand-mark.svg
│       ├── brand-mark-light.svg
│       ├── logo.svg
│       ├── favicon.svg
│       └── hero-protection.svg
├── qa/
│   └── validate-flows.js   # Testes automatizados de fluxo
└── README.md
```

## Checklist de implementação

- [x] Etapa 1 — Estrutura, config, catálogo, README
- [x] Etapa 2 — SVGs, tokens CSS, identidade visual
- [x] Etapa 3 — Landing page completa (7 blocos + FAQ)
- [x] Etapa 4 — Formulário dialog, validação, adaptador simulado
- [x] Etapa 5 — proxima-etapa.html e roteamento
- [x] Etapa 6 — Testes automatizados e revisão

## Jornadas testáveis

| Jornada | Como testar |
| --- | --- |
| Cotação pessoal | Escolher Automóvel → preencher dados fictícios → Continuar → Continuar para cotação |
| RC profissional | Aba Sua profissão → Medicina → preencher → Ver próximo passo |
| Empresarial | Aba Sua empresa → Riscos cibernéticos → Falar com corretor |
| Orientação sem produto | "Prefiro falar com um corretor" → preencher sem selecionar seguro |
| Validação | Enviar vazio, telefone inválido, e-mail inválido — erros exatos conforme spec |
| Falha simulada | Em `config.js`, definir `demoFailureOnce: true` — 1ª tentativa falha, 2ª funciona |

## Identidade visual

**Conceito:** proximidade com precisão.

| Token | Valor | Uso |
| --- | --- | --- |
| `--color-ink` | `#123847` | Títulos, fechamento |
| `--color-brand` | `#076D79` | Botões, links |
| `--color-aqua` | `#89D7DE` | Ilustração |
| `--color-sun` | `#E6AE52` | Destaque demonstrativo |
| `--color-canvas` | `#F4F8FA` | Fundos alternados |

**Tipografia:** Sora (títulos) + Source Sans 3 (corpo), via Google Fonts. Fontes WOFF2 locais pendentes para produção.

**Assinatura visual:** curva de proteção no símbolo IN e na arte `hero-protection.svg`.

## Referência frontend-design

Consultada em **6 de setembro de 2026** — [SKILL.md](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md) do repositório `anthropics/claude-code` (branch `main`).

Princípios aplicados: decisões visuais ligadas ao negócio, tipografia intencional, hierarquia funcional, conteúdo real, movimento discreto, assinatura visual única (arte + marca).

## Validações realizadas

- [x] Testes automatizados (`node qa/validate-flows.js`) — catálogo, telefone, roteamento, adaptador, falha controlada
- [x] Arquivos essenciais presentes e caminhos relativos corretos
- [x] Servidor local verificado (HTTP 200 em HTML, CSS, JS)
- [x] Configuração demonstrativa: `demoFailureOnce: false`, `debugEvents: false`
- [ ] Screenshots responsivos — executar `node qa/capture-screenshots.js` após `npm i playwright` (opcional)
- [ ] Inspeção visual manual recomendada em 1440×900, 768×1024, 390×844 e 320×740

## Distinção demonstração vs. produção

| Aspecto | Protótipo | Produção futura |
| --- | --- | --- |
| Envio de leads | Simulado em memória | API/backend controlado |
| Próxima etapa | `proxima-etapa.html` local | URL validada pelo servidor |
| Dados pessoais | Apenas na sessão da página | Armazenamento seguro |
| `prototypeMode: false` | Bloqueia envio sem adaptador real | Requer implementação completa |

## Pendências para produção

1. Backend de leads e confirmação antes do redirect
2. Integração com cotadores (Porto, Argo, Suhai) — inventário em `seguro-in-plano-prototipo.md` §12
3. Fontes WOFF2 locais com licenças
4. Política de privacidade definitiva e dados cadastrais confirmados
5. Logos de seguradoras (após autorização)
6. SEO, analytics e publicação

## Configuração de QA

Em `assets/js/config.js`:

```js
demoFailureOnce: true,  // testar falha na 1ª tentativa
debugEvents: true,      // log de eventos no console (sem dados pessoais)
```

Restaurar valores padrão após testes.
