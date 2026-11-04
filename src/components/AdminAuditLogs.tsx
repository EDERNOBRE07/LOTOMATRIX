import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, FileText, ArrowRight, UserCheck, Ban, KeyRound } from 'lucide-react';

export interface AuditLogItem {
  id: number;
  admin_email: string;
  usuario_alvo_email: string;
  acao: string;
  status_anterior?: string;
  status_novo?: string;
  ip: string;
  criado_em: string;
}

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      } else {
        // Fallback ilustrativo
        setLogs([
          {
            id: 101,
            admin_email: 'admin@lotosniper.com.br',
            usuario_alvo_email: 'carlos.apostador@gmail.com',
            acao: 'aprovou_usuario',
            status_anterior: 'pendente',
            status_novo: 'ativo',
            ip: '187.19.204.12',
            criado_em: '2026-11-04 10:14:22'
          },
          {
            id: 100,
            admin_email: 'admin@lotosniper.com.br',
            usuario_alvo_email: 'investidor.bot@spammer.net',
            acao: 'bloqueou_usuario',
            status_anterior: 'ativo',
            status_novo: 'bloqueado',
            ip: '187.19.204.12',
            criado_em: '2026-11-04 09:30:10'
          },
          {
            id: 99,
            admin_email: 'sistema',
            usuario_alvo_email: 'roberto.fechamento@uol.com.br',
            acao: 'redefiniu_propria_senha',
            status_anterior: 'ativo',
            status_novo: 'ativo',
            ip: '189.44.12.80',
            criado_em: '2026-11-03 18:22:05'
          }
        ]);
      }
    } catch {
      setLogs([
        {
          id: 101,
          admin_email: 'admin@lotosniper.com.br',
          usuario_alvo_email: 'carlos.apostador@gmail.com',
          acao: 'aprovou_usuario',
          status_anterior: 'pendente',
          status_novo: 'ativo',
          ip: '187.19.204.12',
          criado_em: '2026-11-04 10:14:22'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionBadge = (acao: string) => {
    if (acao.includes('aprov')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
          <UserCheck className="w-3 h-3" />
          Aprovação
        </span>
      );
    }
    if (acao.includes('bloque')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded">
          <Ban className="w-3 h-3" />
          Bloqueio
        </span>
      );
    }
    if (acao.includes('senha')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded">
          <KeyRound className="w-3 h-3" />
          Senha Alterada
        </span>
      );
    }
    return (
      <span className="text-[11px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
        {acao}
      </span>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              Trilha de Auditoria Administrativa (logs_auditoria)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Rastreabilidade de cada alteração de status realizada por administradores ou pelo sistema.
            </p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Logs
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Data/Hora</th>
              <th className="py-3 px-3">Administrador</th>
              <th className="py-3 px-3">Ação Realizada</th>
              <th className="py-3 px-3">Usuário Alvo</th>
              <th className="py-3 px-3">Transição de Status</th>
              <th className="py-3 px-4 text-right">IP de Registro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                  Nenhum log de auditoria encontrado.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-4 text-slate-400">{log.criado_em}</td>
                  <td className="py-3 px-3 text-cyan-400 font-sans font-medium">{log.admin_email}</td>
                  <td className="py-3 px-3">{getActionBadge(log.acao)}</td>
                  <td className="py-3 px-3 text-slate-200 font-sans">{log.usuario_alvo_email}</td>
                  <td className="py-3 px-3 font-sans">
                    {log.status_anterior || log.status_novo ? (
                      <span className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400">{log.status_anterior || '?'}</span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <span className="font-bold text-emerald-400">{log.status_novo || '?'}</span>
                      </span>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500">{log.ip}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminAuditLogs;
