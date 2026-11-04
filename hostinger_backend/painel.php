<?php
/**
 * LotoSniper - Painel de Controle do Usuário Autenticado
 * Área restrita que exige sessão ativa, verificação de integridade e status 'ativo'
 */

require_once __DIR__ . '/conexao.php';
require_once __DIR__ . '/auth_check.php';

// auth_check.php já valida se está logado e se o status é 'ativo'
$emailLogado = $_SESSION['usuario_email'] ?? 'Apostador';
$nivelUsuario = $_SESSION['usuario_nivel'] ?? 'usuario';
$ultimoAcesso = date('d/m/Y H:i:s', $_SESSION['ultimo_acesso'] ?? time());
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Área Restrita - LotoSniper</title>
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
      font-size: 22px;
      font-weight: 800;
      background: linear-gradient(135deg, #10b981, #06b6d4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .user-nav {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .user-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #1e293b;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      border: 1px solid #334155;
    }
    .role-badge {
      background: #10b981;
      color: #022c22;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .btn-logout {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.2s, color 0.2s;
    }
    .btn-logout:hover {
      background: #ef4444;
      color: #ffffff;
    }
    .btn-admin {
      background: rgba(14, 165, 233, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(14, 165, 233, 0.3);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-admin:hover {
      background: #0ea5e9;
      color: #ffffff;
    }
    .container {
      max-width: 1000px;
      margin: 40px auto;
      padding: 0 20px;
      flex: 1;
      width: 100%;
    }
    .welcome-card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 28px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    }
    .welcome-card h1 {
      font-size: 24px;
      color: #f8fafc;
      margin-bottom: 8px;
    }
    .welcome-card p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.6;
    }
    .grid-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      padding: 24px;
      transition: border-color 0.2s, transform 0.2s;
    }
    .card:hover {
      border-color: #10b981;
      transform: translateY(-2px);
    }
    .card h3 {
      font-size: 16px;
      color: #f1f5f9;
      margin-bottom: 8px;
    }
    .card p {
      color: #94a3b8;
      font-size: 13px;
      margin-bottom: 16px;
      line-height: 1.5;
    }
    .card a {
      display: inline-block;
      color: #10b981;
      font-weight: 600;
      font-size: 13px;
      text-decoration: none;
    }
    .card a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="logo-title">LotoSniper</div>
    <div class="user-nav">
      <div class="user-badge">
        <span><?= htmlspecialchars($emailLogado) ?></span>
        <span class="role-badge"><?= htmlspecialchars($nivelUsuario) ?></span>
      </div>
      <?php if ($nivelUsuario === 'admin'): ?>
        <a href="admin.php" class="btn-admin">Painel Administrativo</a>
      <?php endif; ?>
      <a href="logout.php" class="btn-logout">Sair</a>
    </div>
  </header>

  <main class="container">
    <div class="welcome-card">
      <h1>Olá, <?= htmlspecialchars($emailLogado) ?>!</h1>
      <p>Bem-vindo à sua área restrita no LotoSniper. Sua sessão segura está ativa e protegida contra sequestro de sessão e inatividade.</p>
      <p style="margin-top: 8px; font-size: 12px; color: #64748b;">
        Última atividade registrada: <strong><?= $ultimoAcesso ?></strong> | IP: <strong><?= htmlspecialchars($_SERVER['REMOTE_ADDR'] ?? 'Desconhecido') ?></strong>
      </p>
    </div>

    <div class="grid-cards">
      <div class="card">
        <h3>🎯 Fechamentos Matemáticos</h3>
        <p>Gere e gerencie suas combinações com garantia de 11 a 15 pontos na Lotofácil com conferência instantânea.</p>
        <a href="/" target="_blank">Acessar Sistema LotoSniper &rarr;</a>
      </div>
      <div class="card">
        <h3>📊 Análise de ROI & Estatísticas</h3>
        <p>Monitore o retorno dos seus jogos, custos por bilhete e tendências de atrasos dos últimos 100 sorteios.</p>
        <a href="/" target="_blank">Ver Estatísticas &rarr;</a>
      </div>
      <div class="card">
        <h3>🔒 Segurança da Conta</h3>
        <p>Sua senha é protegida por hash Bcrypt unidirecional e verificada em cada requisição pelo Hostinger Guard.</p>
        <a href="esqueci-senha.php">Redefinir Senha &rarr;</a>
      </div>
    </div>
  </main>
</body>
</html>
