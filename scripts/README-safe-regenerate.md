# 🔄 Safe Regenerate - Regeneração Segura do Prisma

Script automatizado que faz backup, para processos, regenera o Prisma Client e reinicia a aplicação de forma segura.

## 🚀 Como Usar

### Comando Rápido

```bash
pnpm run db:safe-regenerate
```

Ou diretamente:

**Windows (PowerShell):**

```powershell
powershell -ExecutionPolicy Bypass -File scripts/safe-regenerate.ps1
```

**Linux/Mac (Bash):**

```bash
bash scripts/safe-regenerate.sh
```

---

## 📋 O Que o Script Faz

### Passo 1: 📦 Backup do Banco de Dados

- Cria um backup automático do banco de dados
- Salva em `backups/` com timestamp
- Continua mesmo se o backup falhar (banco pode não estar rodando)

### Passo 2: 🛑 Para Processos Node.js

- Para todos os processos Node.js em execução
- Garante que nenhum arquivo está sendo usado
- Evita erros de "arquivo em uso"

### Passo 3: 🧹 Limpa Cache do Prisma

- Remove a pasta `.prisma` do cache
- Garante regeneração limpa
- Evita conflitos de versão

### Passo 4: ⚙️ Regenera Prisma Client

- Executa `pnpm run db:generate`
- Atualiza os tipos TypeScript
- Inclui novos campos do schema

### Passo 5: 🚀 Reinicia Aplicação (Opcional)

- Pergunta se você quer iniciar a aplicação
- Se sim, executa `pnpm dev`
- Se não, você pode iniciar manualmente depois

---

## 🎯 Quando Usar

Use este comando quando:

- ✅ Adicionar novos campos ao schema do Prisma
- ✅ Modificar models existentes
- ✅ Atualizar enums
- ✅ Receber erro "Unknown field" do Prisma
- ✅ Precisar regenerar o Prisma Client
- ✅ Quiser fazer tudo de forma segura com backup

---

## ⚠️ Importante

- **Backup Automático:** O script sempre tenta fazer backup antes de qualquer mudança
- **Processos Parados:** Todos os processos Node.js serão parados
- **Sem Perda de Dados:** O backup garante que você pode restaurar se algo der errado
- **Interativo:** O script pergunta se você quer reiniciar a aplicação

---

## 🔧 Troubleshooting

### Erro: "EPERM: operation not permitted"

- O script já resolve isso parando os processos automaticamente
- Se persistir, feche manualmente todos os terminais e tente novamente

### Erro: "Backup failed"

- Normal se o banco não estiver rodando
- O script continua mesmo assim
- Inicie o banco com `pnpm infra:up` se necessário

### Erro: "Prisma generate failed"

- Verifique se o schema está correto
- Verifique se o banco está acessível
- Verifique as variáveis de ambiente (.env)

---

## 📝 Exemplo de Uso

```bash
# Executar o script
pnpm run db:safe-regenerate

# Saída esperada:
🔄 RegCheck - Safe Regenerate
================================

📦 Passo 1/5: Criando backup do banco de dados...
✅ Backup criado com sucesso!

🛑 Passo 2/5: Parando processos Node.js...
✅ Processos Node.js parados!

🧹 Passo 3/5: Limpando cache do Prisma...
✅ Cache do Prisma limpo!

⚙️  Passo 4/5: Regenerando Prisma Client...
✅ Prisma Client regenerado com sucesso!

🚀 Passo 5/5: Reiniciar aplicação?
Deseja iniciar a aplicação agora? (S/n) S

🎉 Iniciando aplicação...
```

---

## 🆚 Comparação com Outros Comandos

| Comando                   | Backup | Para Processos | Limpa Cache | Regenera | Reinicia      |
| ------------------------- | ------ | -------------- | ----------- | -------- | ------------- |
| `pnpm db:generate`        | ❌     | ❌             | ❌          | ✅       | ❌            |
| `pnpm reinstall`          | ❌     | ✅             | ✅          | ✅       | ❌            |
| `pnpm db:safe-regenerate` | ✅     | ✅             | ✅          | ✅       | ✅ (opcional) |

---

## 🎉 Benefícios

1. **Segurança:** Backup automático antes de qualquer mudança
2. **Automação:** Tudo em um único comando
3. **Confiabilidade:** Para processos antes de regenerar
4. **Flexibilidade:** Escolha se quer reiniciar ou não
5. **Multiplataforma:** Funciona no Windows, Linux e Mac

---

## 📚 Comandos Relacionados

- `pnpm db:generate` - Apenas regenera o Prisma (sem backup)
- `pnpm db:export` - Apenas faz backup do banco
- `pnpm db:import` - Restaura um backup
- `pnpm reinstall` - Reinstala todas as dependências
- `pnpm dev` - Inicia a aplicação

---

## 🤝 Contribuindo

Se você encontrar problemas ou tiver sugestões de melhorias para este script, abra uma issue ou PR!
