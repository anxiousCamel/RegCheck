#!/usr/bin/env node
/**
 * Seed de balanças e equipamentos no banco de dados.
 * Uso: node scripts/seed-balanças.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapeamento de loja slug -> nome no banco
const LOJA_NAMES = {
  maria_antonia: 'Maria Antônia',
  mogi_guacu: 'Mogi Guaçu',
  rebouças: 'Rebouças',
};

// Mapeamento de tipo slug -> nome no banco
const TIPO_NAMES = {
  balanca_setor: 'Balança setor',
  impressora: 'Impressora',
};

const data = {"lojas":{"maria_antonia":{"Rotisseria":[{"id":1745663596363,"setor":"Rotisseria","tipo":"balanca_setor","numero":"60","serie":"10653254","patrimonio":"4882"},{"id":1754067933717,"setor":"Rotisseria","tipo":"balanca_setor","numero":"01","serie":"--","patrimonio":"--"}],"Frios":[{"id":1745663637324,"setor":"Frios","tipo":"balanca_setor","numero":"61","serie":"1065325257","patrimonio":"5103"},{"id":1745663656366,"setor":"Frios","tipo":"balanca_setor","numero":"41","serie":"10653254","patrimonio":"4878"},{"id":1745663684950,"setor":"Frios","tipo":"balanca_setor","numero":"15","serie":"10744737","patrimonio":"6884"},{"id":1745663698773,"setor":"Frios","tipo":"balanca_setor","numero":"23","serie":"10653250","patrimonio":"5052"},{"id":1746707320984,"setor":"Frios","tipo":"balanca_setor","numero":"63","serie":"10744750","patrimonio":"------","loja":"maria_antonia"}],"Hortifruti":[{"id":1745663786822,"setor":"Hortifruti","tipo":"balanca_setor","numero":"31","serie":"10653259","patrimonio":"---"},{"id":1745663808776,"setor":"Hortifruti","tipo":"balanca_setor","numero":"51","serie":"10653248","patrimonio":"4794"},{"id":1745663840118,"setor":"Hortifruti","tipo":"balanca_setor","numero":"16","serie":"10740032","patrimonio":"6883"},{"id":1745663615812,"setor":"Hortifruti","tipo":"balanca_setor","numero":"65","serie":"002050","patrimonio":"21631","loja":"maria_antonia"}],"Padaria":[{"id":1745663744582,"setor":"Padaria","tipo":"balanca_setor","numero":"45","serie":"10653244","patrimonio":"4875"},{"id":1745663765909,"setor":"Padaria","tipo":"balanca_setor","numero":"22","serie":"10653253","patrimonio":"9279"},{"id":1745663730198,"setor":"Padaria","tipo":"balanca_setor","numero":"34","serie":"10744755","patrimonio":"1161","loja":"maria_antonia"}],"Açougue":[{"id":1745663857681,"setor":"Açougue","tipo":"balanca_setor","numero":"64","serie":"10653260","patrimonio":"----"},{"id":1745663868453,"setor":"Açougue","tipo":"balanca_setor","numero":"52","serie":"10653252","patrimonio":"4795"},{"id":1745663880261,"setor":"Açougue","tipo":"balanca_setor","numero":"42","serie":"10653256","patrimonio":"4880"},{"id":1745663898675,"setor":"Açougue","tipo":"balanca_setor","numero":"44","serie":"10653246","patrimonio":"5107"},{"id":1745663910233,"setor":"Açougue","tipo":"balanca_setor","numero":"21","serie":"10653253","patrimonio":"----","loja":"maria_antonia"},{"id":1745663826670,"setor":"Açougue","tipo":"balanca_setor","numero":"43","serie":"10653251","patrimonio":"4881","loja":"maria_antonia"}],"Peixaria":[],"Checkout":[{"id":1747508511237,"setor":"Checkout","tipo":"impressora","numero":"201","serie":"---","patrimonio":"---"}]},"mogi_guacu":{"Padaria":[]},"rebouças":{"Açougue":[]}}};

// Normaliza valores placeholder para null
function normalize(val) {
  if (!val || /^[-]+$/.test(val.trim())) return null;
  return val.trim();
}

async function main() {
  let created = 0;
  let skipped = 0;

  for (const [lojaSlug, setores] of Object.entries(data.lojas)) {
    const lojaNome = LOJA_NAMES[lojaSlug];
    if (!lojaNome) {
      console.warn(`Loja desconhecida: ${lojaSlug}, pulando...`);
      continue;
    }

    const loja = await prisma.loja.upsert({
      where: { nome: lojaNome },
      update: {},
      create: { nome: lojaNome },
    });

    for (const [setorNome, equipamentos] of Object.entries(setores)) {
      if (!equipamentos.length) continue;

      const setor = await prisma.setor.upsert({
        where: { nome: setorNome },
        update: {},
        create: { nome: setorNome },
      });

      for (const eq of equipamentos) {
        const tipoNome = TIPO_NAMES[eq.tipo] ?? eq.tipo;

        const tipo = await prisma.tipoEquipamento.upsert({
          where: { nome: tipoNome },
          update: {},
          create: { nome: tipoNome },
        });

        // Usa numero+serie como chave de idempotência
        const existing = await prisma.equipamento.findFirst({
          where: {
            lojaId: loja.id,
            setorId: setor.id,
            tipoId: tipo.id,
            numeroEquipamento: eq.numero,
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.equipamento.create({
          data: {
            lojaId: loja.id,
            setorId: setor.id,
            tipoId: tipo.id,
            numeroEquipamento: eq.numero,
            serie: normalize(eq.serie),
            patrimonio: normalize(eq.patrimonio),
          },
        });
        created++;
        console.log(`  ✓ ${lojaNome} / ${setorNome} / ${tipoNome} #${eq.numero}`);
      }
    }
  }

  console.log(`\nConcluído: ${created} criados, ${skipped} já existiam.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
