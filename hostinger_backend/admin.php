<?php
/**
 * LotoSniper - Painel do Administrador (admin.php)
 * Restrito estritamente a usuários autenticados com nivel = 'admin'
 * Funcionalidades:
 * - Listagem de todos os usuários cadastrados (E-mail, Status, Nível, Data de Criação, Último IP)
 * - Botões de ação rápida: "Aprovar Acesso" (pendente -> ativo) e "Bloquear Acesso" (-> bloqueado)
 * - Registro automático de cada ação na tabela `logs_auditoria` com IP, admin e timestamp
 * - Visualização em tempo real das trilhas de auditoria
 */

require_once __DIR__ . '/conexao.php';
require_once __DIR__ . '/auth_check.php';

// Verificação estrita de nível de privilégio
if (($_SESSION['usuario_nivel'] ?? '') !== 'admin') {
    http_response_code(403);
    die('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Acesso Negado</title><style>body{background:#0b0f19;color:#ef4444;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;}div{text-align:center;background:#111827;padding:2rem;border-radius:12px;border:1px solid #ef4444;}</style></head><body><div><h2>403 - Acesso Negado</h2><p style="color:#94a3b8;">Apenas administradores credenciados podem acessar este painel.</p><a href="painel.php" style="color:#10b981;margin-top:10px;display:inline-block;">Voltar para o Painel</a></div></body></html>');
}

$adminId = $_SESSION['usuario_id'];
$adminEmail = $_SESSION['usuario_email'];
$mensagemSucesso = '';
$mensagemErro = '';

// Processar Ações Administrativas (Aprovar / Bloquear / Tornar Admin)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['acao'], $_POST['usuario_id'])) {
    $acao = $_POST['acao'];
    $usuarioId = (int)$_POST['usuario_id'];

    if ($usuarioId <= 0) {
        $mensagemErro = 'ID de usuário inválido.';
    } elseif ($usuarioId === $adminId && in_array($acao, ['bloquear', 'despromover'])) {
        $mensagemErro = 'Por segurança, você não pode bloquear a si próprio.';
    } else {
        try {
            // Obter usuário alvo
            $stmtUser = $pdo->prepare("SELECT id, email, status, nivel FROM usuarios WHERE id = :id LIMIT 1");
            $stmtUser->execute([':id' => $usuarioId]);
            $alvo = $stmtUser->fetch();

            if (!$alvo) {
                $mensagemErro = 'Usuário não encontrado no banco de dados.';
            } else {
                $statusAntigo = $alvo['status'];
                $novoStatus = $statusAntigo;
                $nomeAcao = '';

                if ($acao === 'aprovar') {
                    $novoStatus = 'ativo';
                    $nomeAcao = 'aprovou_usuario';
                } elseif ($acao === 'bloquear') {
                    $novoStatus = 'bloqueado';
                    $nomeAcao = 'bloqueou_usuario';
                } elseif ($acao === 'pendente') {
                    $novoStatus = 'pendente';
                    $nomeAcao = 'retornou_pendente';
                }

                if ($nomeAcao !== '') {
                    // Atualizar usuário
                    $stmtUpdate = $pdo->prepare("UPDATE usuarios SET status = :status, atualizado_em = NOW() WHERE id = :id");
                    $stmtUpdate->execute([':status' => $novoStatus, ':id' => $usuarioId]);

                    // Registrar na Trilha de Auditoria
                    $stmtAudit = $pdo->prepare("
                        INSERT INTO logs_auditoria (admin_id, admin_email, usuario_alvo_id, usuario_alvo_email, acao, status_anterior, status_novo, ip, user_agent)
                        VALUES (:admin_id, :admin_email, :alvo_id, :alvo_email, :acao, :st_antigo, :st_novo, :ip, :ua)
                    ");
                    $stmtAudit->execute([
                        ':admin_id' => $adminId,
                        ':admin_email' => $adminEmail,
                        ':alvo_id' => $alvo['id'],
                        ':alvo_email' => $alvo['email'],
                        ':acao' => $nomeAcao,
                        ':st_antigo' => $statusAntigo,
                        ':st_novo' => $novoStatus,
                        ':ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0',
                        ':ua' => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255)
                    ]);

                    $mensagemSucesso = "Usuário {$alvo['email']} alterado para '{$novoStatus}' com sucesso!";
                }
            }
        } catch (Exception $e) {
            error_log("[LotoSniper Admin Action Error] " . $e->getMessage());
            $mensagemErro = 'Erro ao executar ação administrativa: ' . $e->getMessage();
        }
    }
}

// Carregar estatísticas e usuários
$usuarios = [];
$totalUsuarios = 0;
$totalAtivos = 0;
$totalPendentes = 0;
$totalBloqueados = 0;
$logsAuditoria = [];

try {
    $stmtAll = $pdo->query("SELECT id, email, status, nivel, criado_em, ultimo_login, ultimo_ip FROM usuarios ORDER BY id DESC");
    $usuarios = $stmtAll->fetchAll();

    foreach ($usuarios as $u) {
        $totalUsuarios++;
        if ($u['status'] === 'ativo') $totalAtivos++;
        if ($u['status'] === 'pendente') $totalPendentes++;
        if ($u['status'] === 'bloqueado') $totalBloqueados++;
    }

    // Carregar últimos 15 logs de auditoria
    $stmtLogs = $pdo->query("SELECT * FROM logs_auditoria ORDER BY id DESC LIMIT 15");
    $logsAuditoria = $stmtLogs->fetchAll();
} catch (Exception $e) {
    error_log("[LotoSniper Admin Fetch Error] " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Painel do Administrador - LotoSniper</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0b0f19;
      color: #f1f5f9;
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      background: #111827;
      border-bottom: 1px solid #1f2937;
      padding: 16px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .logo-title {
      font-size: 20px;
      font-weight: 800;
      background: linear-gradient(135deg, #10b981, #06b6d4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .admin-badge {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .btn-nav {
      color: #94a3b8;
      font-size: 13px;
      text-decoration: none;
      margin-left: 16px;
    }
    .btn-nav:hover { color: #f1f5f9; }
    .container {
      max-width: 1200px;
      margin: 30px auto;
      padding: 0 20px;
      width: 100%;
      flex: 1;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .stat-card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      padding: 20px;
    }
    .stat-card h4 {
      font-size: 12px;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .stat-card .value {
      font-size: 28px;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
    }
    .val-total { color: #f8fafc; }
    .val-ativo { color: #34d399; }
    .val-pendente { color: #fbbf24; }
    .val-bloqueado { color: #f87171; }
    .alert {
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .alert-success { background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; }
    .alert-error { background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 28px;
      overflow-x: auto;
    }
    .card h2 {
      font-size: 18px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }
    th {
      background: #0d131f;
      padding: 12px 14px;
      color: #94a3b8;
      font-weight: 600;
      border-bottom: 1px solid #1f2937;
    }
    td {
      padding: 14px;
      border-bottom: 1px solid #1f2937;
      color: #cbd5e1;
    }
    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }
    .badge-status {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .status-ativo { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .status-pendente { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .status-bloqueado { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .action-group {
      display: flex;
      gap: 6px;
    }
    .btn-action {
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-approve {
      background: #10b981;
      color: #ffffff;
    }
    .btn-approve:hover { background: #059669; }
    .btn-block {
      background: #ef4444;
      color: #ffffff;
    }
    .btn-block:hover { background: #dc2626; }
    .btn-pend {
      background: #374151;
      color: #e5e7eb;
    }
    .btn-pend:hover { background: #4b5563; }
    .audit-table td {
      font-size: 12px;
    }
  </style>
</head>
<body>
  <header class="header">
    <div style="display: flex; align-items: center; gap: 12px;">
      <div class="logo-title">LotoSniper</div>
      <span class="admin-badge">Admin Shield</span>
    </div>
    <div>
      <span style="font-size: 13px; color: #94a3b8;"><?= htmlspecialchars($adminEmail) ?></span>
      <a href="painel.php" class="btn-nav">Área Restrita</a>
      <a href="logout.php" class="btn-nav" style="color: #ef4444;">Sair</a>
    </div>
  </header>

  <main class="container">
    <?php if (!empty($mensagemSucesso)): ?>
      <div class="alert alert-success"><?= htmlspecialchars($mensagemSucesso) ?></div>
    <?php endif; ?>

    <?php if (!empty($mensagemErro)): ?>
      <div class="alert alert-error"><?= htmlspecialchars($mensagemErro) ?></div>
    <?php endif; ?>

    <!-- Métricas do Sistema -->
    <div class="stats-grid">
      <div class="stat-card">
        <h4>Total Cadastrados</h4>
        <div class="value val-total"><?= $totalUsuarios ?></div>
      </div>
      <div class="stat-card">
        <h4>Aprovados (Ativos)</h4>
        <div class="value val-ativo"><?= $totalAtivos ?></div>
      </div>
      <div class="stat-card">
        <h4>Aguardando Aprovação</h4>
        <div class="value val-pendente"><?= $totalPendentes ?></div>
      </div>
      <div class="stat-card">
        <h4>Bloqueados</h4>
        <div class="value val-bloqueado"><?= $totalBloqueados ?></div>
      </div>
    </div>

    <!-- Tabela de Gestão de Usuários -->
    <div class="card">
      <h2>👥 Gerenciamento de Usuários e Acessos</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>E-mail</th>
            <th>Nível</th>
            <th>Status Atual</th>
            <th>Data de Cadastro</th>
            <th>Último IP</th>
            <th style="text-align: right;">Ações do Administrador</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($usuarios as $u): ?>
            <tr>
              <td style="font-family: monospace;"><?= $u['id'] ?></td>
              <td><strong><?= htmlspecialchars($u['email']) ?></strong></td>
              <td>
                <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: <?= $u['nivel'] === 'admin' ? '#3b82f6' : '#1f2937' ?>; color: #fff;">
                  <?= strtoupper($u['nivel']) ?>
                </span>
              </td>
              <td>
                <span class="badge-status status-<?= $u['status'] ?>">
                  <?= $u['status'] ?>
                </span>
              </td>
              <td><?= date('d/m/Y H:i', strtotime($u['criado_em'])) ?></td>
              <td style="font-family: monospace; font-size: 11px; color: #94a3b8;">
                <?= htmlspecialchars($u['ultimo_ip'] ?? '-') ?>
              </td>
              <td style="text-align: right;">
                <form action="admin.php" method="POST" class="action-group" style="justify-content: flex-end;">
                  <input type="hidden" name="usuario_id" value="<?= $u['id'] ?>">

                  <?php if ($u['status'] !== 'ativo'): ?>
                    <button type="submit" name="acao" value="aprovar" class="btn-action btn-approve" title="Aprovar Acesso">
                      Aprovar Acesso
                    </button>
                  <?php endif; ?>

                  <?php if ($u['status'] !== 'bloqueado' && $u['id'] != $adminId): ?>
                    <button type="submit" name="acao" value="bloquear" class="btn-action btn-block" title="Bloquear Acesso" onclick="return confirm('Deseja realmente bloquear este usuário? Ele perderá o acesso imediato.')">
                      Bloquear Acesso
                    </button>
                  <?php endif; ?>

                  <?php if ($u['status'] === 'bloqueado'): ?>
                    <button type="submit" name="acao" value="pendente" class="btn-action btn-pend" title="Mover para Pendente">
                      Pendente
                    </button>
                  <?php endif; ?>
                </form>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>

    <!-- Tabela de Auditoria (Admin Audit Trail) -->
    <div class="card">
      <h2>🛡️ Trilha de Auditoria Administrativa (logs_auditoria)</h2>
      <table class="audit-table">
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Admin</th>
            <th>Ação</th>
            <th>Usuário Alvo</th>
            <th>Transição</th>
            <th>IP de Origem</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($logsAuditoria)): ?>
            <tr>
              <td colspan="6" style="text-align: center; color: #64748b; padding: 20px;">Nenhuma ação administrativa registrada ainda.</td>
            </tr>
          <?php else: ?>
            <?php foreach ($logsAuditoria as $log): ?>
              <tr>
                <td><?= date('d/m/Y H:i:s', strtotime($log['criado_em'])) ?></td>
                <td><strong style="color: #38bdf8;"><?= htmlspecialchars($log['admin_email']) ?></strong></td>
                <td><span style="font-family: monospace; color: #fbbf24;"><?= htmlspecialchars($log['acao']) ?></span></td>
                <td><?= htmlspecialchars($log['usuario_alvo_email']) ?></td>
                <td>
                  <?php if (!empty($log['status_anterior']) || !empty($log['status_novo'])): ?>
                    <span style="color: #94a3b8;"><?= htmlspecialchars($log['status_anterior'] ?? '?') ?></span> &rarr; 
                    <strong style="color: #34d399;"><?= htmlspecialchars($log['status_novo'] ?? '?') ?></strong>
                  <?php else: ?>
                    -
                  <?php endif; ?>
                </td>
                <td style="font-family: monospace; color: #94a3b8;"><?= htmlspecialchars($log['ip']) ?></td>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
  </main>
</body>
</html>
