import fs from 'fs';
import path from 'path';
import { sanitizarFechamentosSalvos } from '../src/services/savedFechamentosStorage';

/**
 * Script Executável: Sanitização e Auditoria Forense de Fechamentos Salvos
 * Uso: npx tsx scripts/sanitizarFechamentosSalvos.ts [caminho_do_arquivo.json]
 */
function main() {
  const defaultPath = './public/assets/aistudio/lotosniper_backup_jogos_salvos_2026-11-09__1__081de04d.json';
  const filePath = process.argv[2] || defaultPath;

  console.log('='.repeat(70));
  console.log(' LOTOSNIPER AI PRO • SCRIPT UTILITÁRIO DE SANITIZAÇÃO FORENSE');
  console.log('='.repeat(70));
  console.log(`Lendo arquivo: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error(`Erro: Arquivo "${filePath}" não encontrado.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const result = sanitizarFechamentosSalvos(raw);

  console.log('\n--- RESULTADOS DA SANITIZAÇÃO ---');
  console.log(`• Total de Fechamentos Avaliados: ${result.totalFechamentos}`);
  console.log(`• Fechamentos Corrompidos Sanitizados: ${result.sanitizedCount}`);
  console.log(`• Bilhetes com Dezenas Repadronizadas: ${result.ticketsCorrigidosCount}`);

  // Verifica asserções estritas
  let totalViolacoes = 0;
  result.fechamentos.forEach((f, idx) => {
    const universe = f.universoDezenas;
    const universeSet = new Set(universe);

    // Valida fixas
    const fixasInvalidas = f.dezenasFixas.filter((d) => !universeSet.has(d));
    if (fixasInvalidas.length > 0 || f.dezenasFixas.length > 12) {
      console.error(`[ERRO] Fechamento #${idx + 1} (${f.id}): fixas inválidas:`, fixasInvalidas);
      totalViolacoes++;
    }

    // Valida tickets
    (f.tickets || []).forEach((t, tIdx) => {
      const dezenas = t.dezenas || (t as any).numbers || [];
      const dezenasFora = dezenas.filter((d: number) => !universeSet.has(d));
      if (dezenasFora.length > 0) {
        console.error(`[ERRO] Fechamento #${idx + 1}, Ticket #${tIdx + 1}: dezenas fora do universo:`, dezenasFora);
        totalViolacoes++;
      }
    });
  });

  if (totalViolacoes === 0) {
    console.log('\n✓ SUCESSO: 100% dos fechamentos, dezenasFixas e tickets estão em total conformidade!');
  } else {
    console.error(`\n❌ Atenção: ${totalViolacoes} violações detectadas.`);
    process.exit(1);
  }

  // Se foi fornecido um arquivo de saída como 3º argumento, salva o resultado sanitizado
  const outputPath = process.argv[3];
  if (outputPath) {
    const outputData = {
      app: 'LotoSniper AI Pro',
      versao: '2026.4',
      dataExportacao: new Date().toISOString(),
      totalFechamentos: result.totalFechamentos,
      fechamentos: result.fechamentos,
    };
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
    console.log(`\nArquivo sanitizado exportado com sucesso para: ${outputPath}`);
  }
}

main();
