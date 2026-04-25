# Documentação Técnica - RegCheck

Documentação completa do sistema RegCheck gerada automaticamente.

**Última atualização:** 23/04/2026, 12:20:29

## Como Usar Esta Documentação

A documentação está organizada por categorias. Recomendamos a seguinte ordem de leitura:

1. **Arquitetura**: Entenda a estrutura geral do sistema
2. **Stack Tecnológica**: Conheça as tecnologias utilizadas
3. **Infraestrutura**: Configure o ambiente de desenvolvimento
4. **Modelagem de Dados**: Compreenda o modelo de dados
5. **API Reference**: Consulte os endpoints disponíveis
6. **Códigos de Erro**: Entenda os erros da API

## Arquitetura

- [Arquitetura do Sistema](01-arquitetura.md): Estrutura, camadas e componentes
- [Stack Tecnológica](02-stack-tecnologica.md): Tecnologias, bibliotecas e ferramentas

## Desenvolvimento

- [Infraestrutura](03-infraestrutura.md): Docker, serviços e configuração
- [Modelagem de Dados](04-modelagem-dados.md): Entidades, relacionamentos e ERD

## API

- [Referência da API](06-api-reference.md): Endpoints, parâmetros e exemplos
- [Códigos de Erro](07-codigos-erro.md): Referência completa de erros da API

## Regenerar Documentação

Para regenerar esta documentação:

```bash
pnpm generate:docs
```

## Referências

- Código fonte: Repositório principal
- Gerador de docs: `scripts/generate-docs.ts`
