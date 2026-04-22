# Documentação do RegCheck

## Índice de Documentos

### 📘 Documentação Principal

- **[Documentação Técnica Completa](./regcheck-technical-doc.md)** - Documento técnico completo seguindo template estruturado com:
  - Objetivo e referências
  - Glossário técnico
  - Público-alvo e confidencialidade
  - MVP (v1.0) e expectativas futuras
  - Especificação técnica e arquitetura
  - Documentação da API REST
  - Guia de configuração do ambiente
  - Padrões de código e versionamento
  - Documentação de testes e deploy
  - Fluxos do processo (diagramas Mermaid)
  - Documentos de referência
  - Apêndices: pontos críticos, riscos, melhorias sugeridas

### 📊 Documentação Complementar

- **[Fluxos Principais](./flows.md)** - Diagramas de sequência e fluxo dos processos principais:
  - Ciclo de vida do Template
  - Ciclo de vida do Document
  - Criação de Template
  - Geração de PDF
  - Editor Visual
  - RepetitionEngine

- **[README Principal](../README.md)** - Guia de setup rápido e comandos essenciais

## Estrutura da Documentação

```
docs/
├── README-DOCS.md                    # Este arquivo (índice)
├── regcheck-technical-doc.md         # Documentação técnica completa
├── flows.md                          # Fluxos e diagramas
└── [outros documentos futuros]
```

## Como Usar Esta Documentação

### Para Desenvolvedores Novos no Projeto

1. Leia o [README Principal](../README.md) para setup inicial
2. Consulte a [Documentação Técnica Completa](./regcheck-technical-doc.md) seções 1-6 para entender o sistema
3. Estude os [Fluxos Principais](./flows.md) para entender os processos
4. Consulte a seção 6.4 (Documentação da API) para integração

### Para Arquitetos e Tech Leads

1. Leia a seção 6.3 (Especificação Técnica e Arquitetura)
2. Consulte o Apêndice A (Pontos Críticos e Riscos)
3. Revise o Apêndice B (Melhorias Sugeridas)
4. Analise os diagramas de arquitetura e ER

### Para DevOps e SRE

1. Leia a seção 6.5 (Guia de Configuração do Ambiente)
2. Consulte a seção 6.8 (Documentação de Testes e Deploy)
3. Revise as variáveis de ambiente e Docker Compose
4. Consulte o Apêndice A.2 (Riscos de Segurança)

### Para Product Owners e Stakeholders

1. Leia as seções 1 (Objetivo) e 6.1 (MVP)
2. Consulte a seção 6.2 (Expectativas Futuras)
3. Revise o Apêndice B (Melhorias Sugeridas)

## Convenções de Documentação

### Símbolos Usados

- ✅ Funcionalidade implementada
- ⚠️ Limitação conhecida
- 🔮 Funcionalidade futura (não implementada)
- 📘 Documentação
- 📊 Diagrama
- 🔧 Configuração
- 🚀 Deploy

### Diagramas Mermaid

Todos os diagramas são renderizáveis em:
- GitHub/GitLab (nativo)
- VS Code (extensão Markdown Preview Mermaid Support)
- Editores online: https://mermaid.live/

### Atualização da Documentação

- **Frequência:** A cada release ou mudança significativa
- **Responsável:** Tech Lead ou desenvolvedor que implementou a mudança
- **Processo:** Pull Request com label `documentation`

## Links Rápidos

### Ambientes

- **Frontend Local:** http://localhost:3000
- **API Local:** http://localhost:4000
- **MinIO Console:** http://localhost:9001
- **Prisma Studio:** http://localhost:5555

### Repositórios e Ferramentas

- **Repositório:** [URL do Git]
- **CI/CD:** [URL do pipeline]
- **Monitoramento:** [URL do Grafana/CloudWatch]
- **Issue Tracker:** [URL do Jira/GitHub Issues]

## Contribuindo para a Documentação

Para melhorar esta documentação:

1. Identifique gaps ou informações desatualizadas
2. Crie uma branch: `docs/improve-<topic>`
3. Faça as alterações necessárias
4. Abra um Pull Request com:
   - Título descritivo
   - Descrição do que foi alterado e por quê
   - Label `documentation`
5. Solicite revisão do Tech Lead

## Contato

Para dúvidas sobre a documentação:
- **Tech Lead:** [Nome/Email]
- **Canal Slack:** #regcheck-dev
- **Email:** dev@regcheck.com

---

**Última atualização:** Janeiro 2025  
**Versão da documentação:** 1.0
