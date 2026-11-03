<?php
/**
 * ============================================================================
 * LOTOSNIPER PRO • CADASTRO DE USUÁRIO (CRIAÇÃO COM STATUS 'PENDENTE')
 * Domínio: lotosniper.com.br
 * ============================================================================
 */

require_once __DIR__ . '/config.php';

$erro = '';
$sucesso = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nome = trim($_POST['nome'] ?? '');
    $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
    $senha = $_POST['senha'] ?? '';
    $senhaConfirma = $_POST['senha_confirma'] ?? '';
    $csrfToken = $_POST['csrf_token'] ?? '';

    if (!validateCsrfToken($csrfToken)) {
        $erro = 'Sessão expirada. Atualize a página e tente novamente.';
    } elseif (empty($nome) || mb_strlen($nome) < 3) {
        $erro = 'Informe seu nome completo (mínimo de 3 caracteres).';
    } elseif (!$email) {
        $erro = 'Informe um endereço de e-mail válido.';
    } elseif (strlen($senha) < 8) {
        $erro = 'A senha de acesso deve ter pelo menos 8 caracteres.';
    } elseif ($senha !== $senhaConfirma) {
        $erro = 'A confirmação de senha não confere.';
    } else {
        try {
            $pdo = getDbConnection();

            // Verifica se o e-mail já existe
            $checkStmt = $pdo->prepare('SELECT id FROM usuarios WHERE email = :email LIMIT 1');
            $checkStmt->execute([':email' => $email]);
            if ($checkStmt->fetch()) {
                $erro = 'Este e-mail já possui cadastro no LotoSniper. Faça login ou contate o suporte.';
            } else {
                // 1. Criptografia da Senha com password_hash() BCRYPT de alta segurança
                $senhaHash = password_hash($senha, PASSWORD_BCRYPT, ['cost' => 12]);
                $ipCadastro = $_SERVER['REMOTE_ADDR'] ?? null;

                // 2. Inserção com STATUS 'pendente' (Regra da Whitelist)
                $insertStmt = $pdo->prepare('
                    INSERT INTO usuarios (nome, email, senha, nivel, status, ip_cadastro)
                    VALUES (:nome, :email, :senha, "usuario", "pendente", :ip)
                ');
                $insertStmt->execute([
                    ':nome' => $nome,
                    ':email' => $email,
                    ':senha' => $senhaHash,
                    ':ip' => $ipCadastro
                ]);

                $sucesso = 'Cadastro realizado com sucesso! Sua conta está com status PENDENTE e será avaliada pelo administrador antes da liberação.';
            }
        } catch (PDOException $e) {
            error_log('[LotoSniper Register Error] ' . $e->getMessage());
            $erro = 'Erro ao processar o cadastro no banco de dados. Tente novamente.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Solicitar Acesso • LotoSniper PRO</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
    </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-center items-center p-4">

    <div class="w-full max-w-md">

        <!-- Logo -->
        <div class="text-center mb-6">
            <h1 class="text-xl font-black text-white flex items-center justify-center gap-2">
                LotoSniper <span class="text-xs font-mono font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md">WHITELIST</span>
            </h1>
            <p class="text-xs text-slate-400 mt-1">Solicitação de Acesso com Aprovação Manual</p>
        </div>

        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl relative overflow-hidden">
            <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-emerald-500 to-teal-400"></div>

            <div class="mb-5">
                <h2 class="text-base font-bold text-white">Criar Nova Conta</h2>
                <p class="text-xs text-slate-400 mt-0.5">Após o envio, um administrador revisará seu acesso</p>
            </div>

            <?php if (!empty($erro)): ?>
                <div class="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs">
                    ⚠️ <?= sanitizeOutput($erro) ?>
                </div>
            <?php endif; ?>

            <?php if (!empty($sucesso)): ?>
                <div class="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs space-y-2">
                    <p class="font-bold text-emerald-400">✓ <?= sanitizeOutput($sucesso) ?></p>
                    <a href="login.php" class="inline-block mt-2 text-xs font-bold text-slate-950 bg-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-300 transition">
                        Ir para a tela de Login
                    </a>
                </div>
            <?php else: ?>

            <form method="POST" action="register.php" class="space-y-3.5">
                <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">

                <div>
                    <label for="nome" class="block text-xs font-semibold text-slate-300 mb-1">Nome Completo</label>
                    <input 
                        type="text" 
                        id="nome" 
                        name="nome" 
                        required 
                        placeholder="Ex: Carlos Eduardo Silva"
                        class="w-full bg-slate-950/70 border border-slate-800 focus:border-emerald-500 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none"
                    >
                </div>

                <div>
                    <label for="email" class="block text-xs font-semibold text-slate-300 mb-1">E-mail Profissional</label>
                    <input 
                        type="email" 
                        id="email" 
                        name="email" 
                        required 
                        placeholder="carlos@exemplo.com"
                        class="w-full bg-slate-950/70 border border-slate-800 focus:border-emerald-500 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none font-medium"
                    >
                </div>

                <div>
                    <label for="senha" class="block text-xs font-semibold text-slate-300 mb-1">Senha (Mínimo 8 caracteres)</label>
                    <input 
                        type="password" 
                        id="senha" 
                        name="senha" 
                        required 
                        placeholder="••••••••••••"
                        class="w-full bg-slate-950/70 border border-slate-800 focus:border-emerald-500 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none font-mono"
                    >
                </div>

                <div>
                    <label for="senha_confirma" class="block text-xs font-semibold text-slate-300 mb-1">Confirmar Senha</label>
                    <input 
                        type="password" 
                        id="senha_confirma" 
                        name="senha_confirma" 
                        required 
                        placeholder="••••••••••••"
                        class="w-full bg-slate-950/70 border border-slate-800 focus:border-emerald-500 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none font-mono"
                    >
                </div>

                <button 
                    type="submit" 
                    class="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                >
                    Enviar Solicitação de Cadastro
                </button>
            </form>
            <?php endif; ?>

            <div class="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <span class="text-slate-500">Já tem cadastro?</span>
                <a href="login.php" class="text-emerald-400 hover:text-emerald-300 font-semibold transition">
                    Fazer Login
                </a>
            </div>
        </div>
    </div>

</body>
</html>
