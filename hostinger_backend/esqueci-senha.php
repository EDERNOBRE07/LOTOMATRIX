<?php
/**
 * LotoSniper - Solicitação de Recuperação de Senha
 * Gera token seguro randômico (bin2hex(random_bytes(32))) com validade de 1 hora
 * Envia link via PHPMailer / Hostinger SMTP
 */

require_once __DIR__ . '/conexao.php';
require_once __DIR__ . '/email_config.php';

session_start();

$mensagemSucesso = '';
$mensagemErro = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);

    if (!$email) {
        $mensagemErro = 'Por favor, informe um endereço de e-mail válido.';
    } else {
        try {
            // Buscar usuário
            $stmt = $pdo->prepare("SELECT id, email, status FROM usuarios WHERE email = :email LIMIT 1");
            $stmt->execute([':email' => $email]);
            $usuario = $stmt->fetch();

            if ($usuario) {
                // Se a conta estiver bloqueada, não permitir recuperação
                if ($usuario['status'] === 'bloqueado') {
                    // Mensagem neutra para evitar enumeração de contas
                    $mensagemSucesso = 'Se o e-mail informado estiver cadastrado e apto, você receberá um link de recuperação em alguns instantes.';
                } else {
                    // Gerar token seguro de 64 caracteres hexadecimais (32 bytes)
                    $token = bin2hex(random_bytes(32));
                    // 1 hora a partir de agora
                    $expiracao = date('Y-m-d H:i:s', strtotime('+1 hour'));

                    // Gravar token no banco
                    $stmtUpdate = $pdo->prepare("
                        UPDATE usuarios 
                        SET token_recuperacao = :token, token_expiracao = :expiracao 
                        WHERE id = :id
                    ");
                    $stmtUpdate->execute([
                        ':token' => $token,
                        ':expiracao' => $expiracao,
                        ':id' => $usuario['id']
                    ]);

                    // Determinar a URL base do site
                    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
                    $host = $_SERVER['HTTP_HOST'] ?? 'lotosniper.com.br';
                    $baseUrl = $protocol . $host;

                    // Enviar e-mail seguro
                    $enviado = enviarEmailRecuperacao($email, $token, $baseUrl);
                    
                    if ($enviado) {
                        $mensagemSucesso = 'Enviamos as instruções e o link seguro para redefinição da sua senha. Verifique sua caixa de entrada e spam.';
                    } else {
                        $mensagemErro = 'Não foi possível enviar o e-mail no momento. Tente novamente em alguns minutos.';
                    }
                }
            } else {
                // Timing attack protection + Prevenção contra enumeração de contas
                usleep(random_int(100000, 300000));
                $mensagemSucesso = 'Se o e-mail informado estiver cadastrado e apto, você receberá um link de recuperação em alguns instantes.';
            }
        } catch (Exception $e) {
            error_log("[LotoSniper Esqueci-Senha Erro] " . $e->getMessage());
            $mensagemErro = 'Ocorreu um erro interno ao processar sua solicitação. Tente novamente mais tarde.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha - LotoSniper</title>
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
      margin-bottom: 28px;
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
      margin-bottom: 20px;
    }
    label {
      display: block;
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    input[type="email"] {
      width: 100%;
      padding: 12px 14px;
      background: #090d16;
      border: 1px solid #374151;
      border-radius: 8px;
      color: #f8fafc;
      font-size: 14px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    input[type="email"]:focus {
      outline: none;
      border-color: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
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
      transition: background-color 0.2s, transform 0.1s;
    }
    .btn-submit:hover {
      background: #059669;
    }
    .btn-submit:active {
      transform: scale(0.99);
    }
    .back-link {
      display: block;
      text-align: center;
      margin-top: 24px;
      color: #94a3b8;
      font-size: 13px;
      text-decoration: none;
      transition: color 0.2s;
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
      <p class="subtitle">Recuperação Segura de Senha</p>
    </div>

    <?php if (!empty($mensagemSucesso)): ?>
      <div class="alert alert-success">
        <?= htmlspecialchars($mensagemSucesso) ?>
      </div>
    <?php endif; ?>

    <?php if (!empty($mensagemErro)): ?>
      <div class="alert alert-error">
        <?= htmlspecialchars($mensagemErro) ?>
      </div>
    <?php endif; ?>

    <form action="esqueci-senha.php" method="POST">
      <div class="form-group">
        <label for="email">E-mail Cadastrado</label>
        <input 
          type="email" 
          id="email" 
          name="email" 
          placeholder="seu@email.com" 
          required 
          autocomplete="email"
          autofocus
        />
      </div>

      <button type="submit" class="btn-submit">Enviar Link de Recuperação</button>
    </form>

    <a href="login.php" class="back-link">&larr; Voltar para a tela de Login</a>
  </div>
</body>
</html>
