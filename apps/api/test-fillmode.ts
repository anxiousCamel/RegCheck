/**
 * Script de teste para verificar se fillMode está sendo salvo corretamente
 *
 * Execute com: npx tsx test-fillmode.ts
 */

import { prisma } from '@regcheck/database';

async function testFillMode() {
  console.log('🔍 Testando fillMode...\n');

  // 1. Buscar todos os templates
  const templates = await prisma.template.findMany({
    select: {
      id: true,
      name: true,
      fillMode: true,
      status: true,
    },
  });

  console.log('📋 Templates encontrados:');
  templates.forEach((t) => {
    console.log(`  - ${t.name} (${t.status}): fillMode = ${t.fillMode}`);
  });

  if (templates.length === 0) {
    console.log('  ⚠️  Nenhum template encontrado');
    return;
  }

  // 2. Testar update em um template DRAFT
  const draftTemplate = templates.find((t) => t.status === 'DRAFT');

  if (!draftTemplate) {
    console.log('\n⚠️  Nenhum template DRAFT encontrado para testar');
    return;
  }

  console.log(`\n🧪 Testando update no template: ${draftTemplate.name}`);
  console.log(`   fillMode atual: ${draftTemplate.fillMode}`);

  // Alternar entre AUTOMATICO e SELECAO_MANUAL
  const newFillMode = draftTemplate.fillMode === 'AUTOMATICO' ? 'SELECAO_MANUAL' : 'AUTOMATICO';

  console.log(`   Mudando para: ${newFillMode}...`);

  const updated = await prisma.template.update({
    where: { id: draftTemplate.id },
    data: { fillMode: newFillMode },
    select: {
      id: true,
      name: true,
      fillMode: true,
    },
  });

  console.log(`   ✅ Atualizado! fillMode agora é: ${updated.fillMode}`);

  // 3. Verificar se realmente salvou
  const verified = await prisma.template.findUnique({
    where: { id: draftTemplate.id },
    select: { fillMode: true },
  });

  if (verified?.fillMode === newFillMode) {
    console.log(`   ✅ Verificado! O banco salvou corretamente.`);
  } else {
    console.log(`   ❌ ERRO! O banco não salvou. Valor atual: ${verified?.fillMode}`);
  }

  console.log('\n✨ Teste concluído!');
}

testFillMode()
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
