<?php
/**
 * LotoSniper - Redefinição de Senha
 * Valida o token seguro com limite de 1 hora
 * Atualiza a senha no banco via password_hash() com custo Bcrypt 12
 * Inclui medidor de força de senha em tempo real (Password Strength Meter)
 */

require_once __DIR__ . '/conexao.php';

session_start();

$token = filter_input(INPUT_GET, 'token', FILTER_DEFAULT) ?? filter_input(INPUT_POST, 'token', FILTER_DEFAULT);
$tokenValido = false;
$usuario = null;
$mensagemErro = '';
$mensagemSucesso = '';

if (empty($token) || strlen($token) !== 64 || !ctype_xdigit($token)) {
    $mensagemErro = 'Token de recuperação inválido ou inexistente.';
} else {
    try {
        // Validar token e conferir validade de 1 hora
        $stmt = $pdo->prepare("
            SELECT id, email, status, token_expiracao 
            FROM usuarios 
            WHERE token_recuperacao = :token 
            LIMIT 1
        ");
        $stmt->execute([':token' => $token]);
        $usuario = $stmt->fetch();

        if (!$usuario) {
            $mensagemErro = 'Este link de recuperação é inválido ou já foi utilizado.';
        } elseif (strtotime($usuario['token_expiracao']) < time()) {
            $mensagemErro = 'Este link de recuperação expirou (limite de 1 hora). Solicite uma nova redefinição.';
        } elseif ($usuario['status'] === 'bloqueado') {
            $mensagemErro = 'Sua conta está bloqueada pelo administrador. Entre em contato com o suporte.';
        } else {
            $tokenValido = true;
        }
    } catch (Exception $e) {
        error_log("[LotoSniper Redefinir-Senha Erro] " . $e->getMessage());
        $mensagemErro = 'Erro no servidor ao validar solicitação.';
    }
}

// Processar formulário de nova senha
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $tokenValido) {
    $novaSenha = $_POST['nova_senha'] ?? '';
    $confirmaSenha = $_POST['confirma_senha'] ?? '';

    if (strlen($novaSenha) < 8) {
        $mensagemErro = 'A nova senha deve ter no mínimo 8 caracteres.';
    } elseif ($novaSenha !== $confirmaSenha) {
        $mensagemErro = 'As duas senhas digitadas não coincidem.';
    } else {
        try {
            // Gerar hash seguro com Bcrypt custo 12
            $hashSenha = password_hash($novaSenha, PASSWORD_BCRYPT, ['cost' => 12]);

            // Atualizar senha e invalidar token
            $stmtUpdate = $pdo->prepare("
                UPDATE usuarios 
                SET senha = :senha, token_recuperacao = NULL, token_expiracao = NULL, atualizado_em = NOW() 
                WHERE id = :id
            ");
            $stmtUpdate->execute([
                ':senha' => $hashSenha,
                ':id' => $usuario['id']
            ]);

            // Registrar log de auditoria
            $stmtLog = $pdo->prepare("
                INSERT INTO logs_auditoria (admin_email, usuario_alvo_id, usuario_alvo_email, acao, ip, user_agent)
                VALUES ('sistema', :alvo_id, :alvo_email, 'redefiniu_propria_senha', :ip, :ua)
            ");
            $stmtLog->execute([
                ':alvo_id' => $usuario['id'],
                ':alvo_email' => $usuario['email'],
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0',
                ':ua' => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255)
            ]);

            $mensagemSucesso = 'Senha redefinida com sucesso! Você já pode entrar com sua nova senha.';
            $tokenValido = false; // Bloquear novo envio
        } catch (Exception $e) {
            error_log("[LotoSniper Redefinir-Senha Update Erro] " . $e->getMessage());
            $mensagemErro = 'Falha ao atualizar senha. Tente novamente.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Criar Nova Senha - LotoSniper</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0b0f19;
      color: #f1f5f9;
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      width: 100%;
      max-width: 440px;
      padding: 36px 32px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }
    .logo-container {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo-title {
      font-size: 26px;
      font-weight: 800;
      background: linear-gradient(135deg, #10b981, #06b6d4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.5px;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 14px;
      margin-top: 6px;
    }
    .alert {
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 20px;
      line-height: 1.5;
    }
    .alert-success {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }
    .alert-error {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
    }
    .form-group {
      margin-bottom: 18px;
    }
    label {
      display: block;
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    input[type="password"] {
      width: 100%;
      padding: 12px 14px;
      background: #090d16;
      border: 1px solid #374151;
      border-radius: 8px;
      color: #f8fafc;
      font-size: 14px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    input[type="password"]:focus {
      outline: none;
      border-color: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
    }
    /* Password Strength Meter CSS */
    .strength-meter-container {
      margin-top: 8px;
      margin-bottom: 14px;
    }
    .strength-bars {
      display: flex;
      gap: 5px;
      height: 5px;
      margin-bottom: 6px;
    }
    .bar {
      flex: 1;
      height: 100%;
      background: #1f2937;
      border-radius: 3px;
      transition: background-color 0.3s;
    }
    .strength-text {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
    }
    .btn-submit {
      width: 100%;
      padding: 13px;
      background: #10b981;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 10px;
      transition: background-color 0.2s;
    }
    .btn-submit:hover {
      background: #059669;
    }
    .back-link {
      display: block;
      text-align: center;
      margin-top: 24px;
      color: #94a3b8;
      font-size: 13px;
      text-decoration: none;
    }
    .back-link:hover {
      color: #10b981;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-container">
      <div class="logo-title">LotoSniper</div>
      <p class="subtitle">Criar Nova Senha</p>
    </div>

    <?php if (!empty($mensagemSucesso)): ?>
      <div class="alert alert-success">
        <?= htmlspecialchars($mensagemSucesso) ?>
      </div>
      <a href="login.php" class="btn-submit" style="display:block; text-align:center; text-decoration:none;">Ir para o Login</a>
    <?php elseif (!empty($mensagemErro)): ?>
      <div class="alert alert-error">
        <?= htmlspecialchars($mensagemErro) ?>
      </div>
      <a href="esqueci-senha.php" class="back-link">Solicitar novo link de recuperação</a>
    <?php endif; ?>

    <?php if ($tokenValido): ?>
      <form action="redefinir-senha.php" method="POST">
        <input type="hidden" name="token" value="<?= htmlspecialchars($token) ?>">

        <div class="form-group">
          <label for="nova_senha">Nova Senha (Mínimo 8 dígitos)</label>
          <input 
            type="password" 
            id="nova_senha" 
            name="nova_senha" 
            required 
            placeholder="••••••••••••"
            autocomplete="new-password"
            oninput="avaliarForcaSenha(this.value)"
          />
          <!-- Real-Time Password Strength Meter -->
          <div class="strength-meter-container">
            <div class="strength-bars">
              <div class="bar" id="bar-1"></div>
              <div class="bar" id="bar-2"></div>
              <div class="bar" id="bar-3"></div>
              <div class="bar" id="bar-4"></div>
            </div>
            <div id="strength-label" class="strength-text">Digite a senha</div>
          </div>
        </div>

        <div class="form-group">
          <label for="confirma_senha">Confirmar Nova Senha</label>
          <input 
            type="password" 
            id="confirma_senha" 
            name="confirma_senha" 
            required 
            placeholder="••••••••••••"
            autocomplete="new-password"
          />
        </div>

        <button type="submit" class="btn-submit">Salvar Nova Senha</button>
      </form>
    <?php endif; ?>

    <a href="login.php" class="back-link">&larr; Voltar para a tela de Login</a>
  </div>

  <script>
    function avaliarForcaSenha(senha) {
      const bars = [
        document.getElementById('bar-1'),
        document.getElementById('bar-2'),
        document.getElementById('bar-3'),
        document.getElementById('bar-4')
      ];
      const label = document.getElementById('strength-label');
      
      let pontuacao = 0;
      if (!senha) {
        bars.forEach(b => b.style.backgroundColor = '#1f2937');
        label.innerText = 'Digite a senha';
        label.style.color = '#64748b';
        return;
      }

      if (senha.length >= 8) pontuacao++;
      if (senha.length >= 12) pontuacao++;
      if (/[A-Z]/.test(senha) && /[a-z]/.test(senha)) pontuacao++;
      if (/[0-9]/.test(senha)) pontuacao++;
      if (/[^A-Za-z0-9]/.test(senha)) pontuacao++;

      // Converter pontuação para escala de 1 a 4
      let nivel = 1;
      if (pontuacao >= 5) nivel = 4;
      else if (pontuacao >= 3) nivel = 3;
      else if (pontuacao >= 2) nivel = 2;

      const configs = {
        1: { texto: 'Fraca', cor: '#ef4444', bars: 1 },
        2: { texto: 'Média', cor: '#f59e0b', bars: 2 },
        3: { texto: 'Forte', cor: '#10b981', bars: 3 },
        4: { texto: 'Excelente', cor: '#06b6d4', bars: 4 },
      };

      const c = configs[nivel];
      label.innerText = 'Força: ' + c.texto;
      label.style.color = c.cor;

      bars.forEach((bar, index) => {
        bar.style.backgroundColor = (index < c.bars) ? c.cor : '#1f2937';
      });
    }
  </script>
</body>
</html>
