/**
 * Backup Manager Service - LotoSniper
 * Gerencia o backup completo e automático de 'Meus Jogos' e 'Configurações'
 * do LocalStorage com suporte a Download Forçado JSON, Snapshots de Segurança
 * e integração com Google Drive / Nuvem.
 */

import { GameTicket } from '../types/lotofacil';
import { getSavedFechamentos, SavedFechamentoPrognostico } from './savedFechamentosStorage';
import { soundService } from './soundAlert';

export interface BackupDataPayload {
  app: 'LotoSniper AI Pro';
  versao: string;
  timestamp: number;
  dataHoraFormatada: string;
  estatisticas: {
    totalTicketsAtuais: number;
    totalFechamentosSalvos: number;
    totalConfiguracoes: number;
  };
  meusJogos: {
    ticketsAtuais: GameTicket[];
    fechamentosSalvos: SavedFechamentoPrognostico[];
    activeFechamentoMeta: any;
    ticketTags: Record<string, string[]>;
  };
  configuracoes: {
    tema: string;
    pollingIntervalMs: number;
    alerta14e15Ativo: boolean;
    alertaThreshold: string;
    opportunityAlertsConfig: any;
    vaziosConfig: any;
    notificationConfig: any;
    prizeTiersConfig: any;
    scheduledAlerts: any;
    hybridRules: any;
    autoDownloadOnSaveEnabled: boolean;
  };
  checksum?: string;
}

export interface LocalSnapshotMeta {
  id: string;
  timestamp: number;
  dataHora: string;
  totalTickets: number;
  totalFechamentos: number;
  tamanhoKB: number;
  origem: 'auto' | 'manual' | 'pre_fechamento' | 'recuperacao';
}

const SNAPSHOTS_KEY = 'lotosniper_auto_backup_snapshots_v2';
const AUTO_DOWNLOAD_CONFIG_KEY = 'lotosniper_auto_download_on_save';
const LAST_BACKUP_TIME_KEY = 'lotosniper_last_backup_timestamp';

/**
 * Coleta o estado completo de 'Meus Jogos' e 'Configurações' do LocalStorage
 */
export function buildCompleteBackupPayload(): BackupDataPayload {
  let ticketsAtuais: GameTicket[] = [];
  try {
    const rawTickets = localStorage.getItem('lotosniper_saved_tickets');
    if (rawTickets) ticketsAtuais = JSON.parse(rawTickets);
  } catch {}

  const fechamentosSalvos = getSavedFechamentos();

  let activeFechamentoMeta: any = null;
  try {
    const rawMeta = localStorage.getItem('lotosniper_active_fechamento_meta');
    if (rawMeta) activeFechamentoMeta = JSON.parse(rawMeta);
  } catch {}

  let ticketTags: Record<string, string[]> = {};
  try {
    const rawTags = localStorage.getItem('lotosniper_ticket_tags');
    if (rawTags) ticketTags = JSON.parse(rawTags);
  } catch {}

  // Configurações gerais
  const tema = localStorage.getItem('lotosniper_theme') || 'gold';
  const pollingIntervalMs = Number(localStorage.getItem('lotosniper_polling_interval_ms') || 10000);
  const alerta14e15Ativo = localStorage.getItem('lotosniper_alert_14_15_enabled') !== 'false';
  const alertaThreshold = localStorage.getItem('lotosniper_alert_threshold') || '13_plus';

  const parseOrNull = (key: string) => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  };

  const autoDownloadOnSaveEnabled = localStorage.getItem(AUTO_DOWNLOAD_CONFIG_KEY) === 'true';

  const payload: BackupDataPayload = {
    app: 'LotoSniper AI Pro',
    versao: '2026.4.1',
    timestamp: Date.now(),
    dataHoraFormatada: new Date().toLocaleString('pt-BR'),
    estatisticas: {
      totalTicketsAtuais: ticketsAtuais.length,
      totalFechamentosSalvos: fechamentosSalvos.length,
      totalConfiguracoes: 10,
    },
    meusJogos: {
      ticketsAtuais,
      fechamentosSalvos,
      activeFechamentoMeta,
      ticketTags,
    },
    configuracoes: {
      tema,
      pollingIntervalMs,
      alerta14e15Ativo,
      alertaThreshold,
      opportunityAlertsConfig: parseOrNull('lotosniper_opportunity_alerts_config'),
      vaziosConfig: parseOrNull('lotosniper_vazios_config'),
      notificationConfig: parseOrNull('lotosniper_notification_config'),
      prizeTiersConfig: parseOrNull('lotosniper_prize_tiers_config'),
      scheduledAlerts: parseOrNull('lotosniper_scheduled_alerts'),
      hybridRules: parseOrNull('lotosniper_hybrid_rules'),
      autoDownloadOnSaveEnabled,
    },
  };

  return payload;
}

/**
 * Dispara o Download Forçado do arquivo JSON no navegador
 */
export function triggerForcedJSONDownload(customFilename?: string): { success: boolean; filename: string; sizeKB: number } {
  try {
    const payload = buildCompleteBackupPayload();
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const sizeKB = Math.round(blob.size / 1024);

    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10);
    const timeStamp = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = customFilename || `lotosniper_backup_completo_${dateStamp}_${timeStamp}.json`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Registra carimbo do último backup
    localStorage.setItem(LAST_BACKUP_TIME_KEY, String(Date.now()));
    soundService.playSuccess();

    // Salva snapshot local
    saveLocalSnapshot('manual');

    // Emite evento para que componentes na UI atualizem
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lotosniper-backup-created', { detail: { filename, sizeKB, timestamp: Date.now() } }));
    }

    return { success: true, filename, sizeKB };
  } catch (err) {
    console.error('[BackupManager] Erro ao executar download forçado de JSON:', err);
    return { success: false, filename: '', sizeKB: 0 };
  }
}

/**
 * Salva um snapshot local de emergência no LocalStorage (Ring buffer dos últimos 10 snapshots)
 */
export function saveLocalSnapshot(origem: 'auto' | 'manual' | 'pre_fechamento' | 'recuperacao' = 'auto'): LocalSnapshotMeta | null {
  try {
    const payload = buildCompleteBackupPayload();
    const jsonString = JSON.stringify(payload);
    const sizeKB = Math.round(new Blob([jsonString]).size / 1024);

    const meta: LocalSnapshotMeta = {
      id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      dataHora: new Date().toLocaleString('pt-BR'),
      totalTickets: payload.meusJogos.ticketsAtuais.length,
      totalFechamentos: payload.meusJogos.fechamentosSalvos.length,
      tamanhoKB: sizeKB,
      origem,
    };

    const snapshotsRaw = localStorage.getItem(SNAPSHOTS_KEY);
    let list: { meta: LocalSnapshotMeta; payload: BackupDataPayload }[] = snapshotsRaw ? JSON.parse(snapshotsRaw) : [];

    // Mantém os 8 mais recentes
    list = [{ meta, payload }, ...list.slice(0, 7)];
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(list));

    return meta;
  } catch (err) {
    console.warn('[BackupManager] Falha ao gravar snapshot local:', err);
    return null;
  }
}

/**
 * Retorna todos os snapshots locais disponíveis
 */
export function getLocalSnapshots(): { meta: LocalSnapshotMeta; payload: BackupDataPayload }[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Restaura o sistema a partir de um snapshot local
 */
export function restoreLocalSnapshot(snapshotId: string): boolean {
  try {
    const snapshots = getLocalSnapshots();
    const found = snapshots.find((s) => s.meta.id === snapshotId);
    if (!found) return false;

    applyBackupPayload(found.payload, 'replace');
    return true;
  } catch (err) {
    console.error('[BackupManager] Erro ao restaurar snapshot:', err);
    return false;
  }
}

/**
 * Restaura o sistema a partir de uma string JSON enviada pelo usuário
 */
export function restoreBackupFromJSON(
  jsonString: string,
  mode: 'replace' | 'merge' = 'replace'
): { success: boolean; message: string; ticketsRestored: number; fechamentosRestored: number } {
  try {
    const parsed = JSON.parse(jsonString);

    // Suporte tanto para o formato completo (v2) quanto para arquivos legados
    let payload: BackupDataPayload;

    if (parsed.app === 'LotoSniper AI Pro' && parsed.meusJogos) {
      payload = parsed as BackupDataPayload;
    } else if (Array.isArray(parsed) || Array.isArray(parsed.fechamentos)) {
      // Legado de fechamentos
      const fechamentos = Array.isArray(parsed) ? parsed : parsed.fechamentos;
      payload = buildCompleteBackupPayload();
      payload.meusJogos.fechamentosSalvos = fechamentos;
    } else {
      return {
        success: false,
        message: 'Estrutura do arquivo JSON inválida. O arquivo não foi gerado pelo LotoSniper.',
        ticketsRestored: 0,
        fechamentosRestored: 0,
      };
    }

    applyBackupPayload(payload, mode);

    return {
      success: true,
      message: `Restauração concluída com sucesso! ${payload.meusJogos.ticketsAtuais.length} bilhetes e ${payload.meusJogos.fechamentosSalvos.length} fechamentos restaurados.`,
      ticketsRestored: payload.meusJogos.ticketsAtuais.length,
      fechamentosRestored: payload.meusJogos.fechamentosSalvos.length,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao decodificar arquivo JSON: ${err.message || 'Arquivo corrompido.'}`,
      ticketsRestored: 0,
      fechamentosRestored: 0,
    };
  }
}

/**
 * Aplica os dados do payload de backup no LocalStorage e dispara eventos de sincronização
 */
function applyBackupPayload(payload: BackupDataPayload, mode: 'replace' | 'merge') {
  const { meusJogos, configuracoes } = payload;

  // 1. Jogos atuais
  if (meusJogos.ticketsAtuais) {
    if (mode === 'merge') {
      try {
        const rawExisting = localStorage.getItem('lotosniper_saved_tickets');
        const existing: GameTicket[] = rawExisting ? JSON.parse(rawExisting) : [];
        const existingIds = new Set(existing.map((t) => t.id || `ticket-${t.index}`));
        const merged = [...existing, ...meusJogos.ticketsAtuais.filter((t) => !existingIds.has(t.id || `ticket-${t.index}`))];
        localStorage.setItem('lotosniper_saved_tickets', JSON.stringify(merged));
      } catch {
        localStorage.setItem('lotosniper_saved_tickets', JSON.stringify(meusJogos.ticketsAtuais));
      }
    } else {
      localStorage.setItem('lotosniper_saved_tickets', JSON.stringify(meusJogos.ticketsAtuais));
    }
  }

  // 2. Fechamentos salvos
  if (meusJogos.fechamentosSalvos && Array.isArray(meusJogos.fechamentosSalvos)) {
    if (mode === 'merge') {
      const existing = getSavedFechamentos();
      const existingIds = new Set(existing.map((f) => f.id));
      const merged = [...existing, ...meusJogos.fechamentosSalvos.filter((f) => !existingIds.has(f.id))];
      localStorage.setItem('lotosniper_saved_fechamentos', JSON.stringify(merged.slice(0, 50)));
    } else {
      localStorage.setItem('lotosniper_saved_fechamentos', JSON.stringify(meusJogos.fechamentosSalvos.slice(0, 50)));
    }
  }

  // 3. Metadados do fechamento ativo
  if (meusJogos.activeFechamentoMeta) {
    localStorage.setItem('lotosniper_active_fechamento_meta', JSON.stringify(meusJogos.activeFechamentoMeta));
  }

  // 4. Tags de jogos
  if (meusJogos.ticketTags) {
    localStorage.setItem('lotosniper_ticket_tags', JSON.stringify(meusJogos.ticketTags));
  }

  // 5. Configurações
  if (configuracoes) {
    if (configuracoes.tema) localStorage.setItem('lotosniper_theme', configuracoes.tema);
    if (configuracoes.pollingIntervalMs) localStorage.setItem('lotosniper_polling_interval_ms', String(configuracoes.pollingIntervalMs));
    if (configuracoes.alerta14e15Ativo !== undefined) localStorage.setItem('lotosniper_alert_14_15_enabled', String(configuracoes.alerta14e15Ativo));
    if (configuracoes.alertaThreshold) localStorage.setItem('lotosniper_alert_threshold', configuracoes.alertaThreshold);

    if (configuracoes.opportunityAlertsConfig) localStorage.setItem('lotosniper_opportunity_alerts_config', JSON.stringify(configuracoes.opportunityAlertsConfig));
    if (configuracoes.vaziosConfig) localStorage.setItem('lotosniper_vazios_config', JSON.stringify(configuracoes.vaziosConfig));
    if (configuracoes.notificationConfig) localStorage.setItem('lotosniper_notification_config', JSON.stringify(configuracoes.notificationConfig));
    if (configuracoes.prizeTiersConfig) localStorage.setItem('lotosniper_prize_tiers_config', JSON.stringify(configuracoes.prizeTiersConfig));
    if (configuracoes.scheduledAlerts) localStorage.setItem('lotosniper_scheduled_alerts', JSON.stringify(configuracoes.scheduledAlerts));
    if (configuracoes.hybridRules) localStorage.setItem('lotosniper_hybrid_rules', JSON.stringify(configuracoes.hybridRules));
  }

  soundService.playSuccess();

  // Emite evento global para que todas as abas recarreguem seu estado instantaneamente
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lotosniper-backup-restored', { detail: payload }));
    window.dispatchEvent(new CustomEvent('lotosniper-saved-fechamentos-updated', { detail: meusJogos.fechamentosSalvos }));
  }
}

/**
 * Verifica se o download automático está ativo
 */
export function isAutoDownloadOnSaveEnabled(): boolean {
  try {
    return localStorage.getItem(AUTO_DOWNLOAD_CONFIG_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Ativa ou desativa o download automático no LocalStorage
 */
export function setAutoDownloadOnSave(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_DOWNLOAD_CONFIG_KEY, enabled ? 'true' : 'false');
  } catch {}
}

/**
 * Obtém o carimbo do último backup realizado
 */
export function getLastBackupTimestamp(): number | null {
  try {
    const raw = localStorage.getItem(LAST_BACKUP_TIME_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Abre o Google Drive na web para que o usuário possa armazenar o arquivo JSON
 */
export function openGoogleDriveForUpload(): void {
  // Gera o download do JSON primeiro
  triggerForcedJSONDownload();
  // Abre o Google Drive para que o usuário solte o arquivo baixado
  window.open('https://drive.google.com/drive/u/0/my-drive', '_blank');
}
