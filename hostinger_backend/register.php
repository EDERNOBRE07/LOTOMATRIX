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
                    <label for="senha" class="block text-xs font-semibold text-slate-300 mb-1">Senha de Acesso</label>
                    <input 
                        type="password" 
                        id="senha" 
                        name="senha" 
                        required 
                        placeholder="••••••••••••"
                        class="w-full bg-slate-950/70 border border-slate-800 focus:border-emerald-500 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none font-mono"
                        oninput="avaliarForcaSenhaRegistro(this.value)"
                    >
                    
                    <!-- Componente Visual PasswordStrengthMeter -->
                    <div id="meter-container" class="mt-2 space-y-1.5">
                        <div class="flex items-center justify-between text-[11px]">
                            <span class="text-slate-400 font-medium flex items-center gap-1">
                                <span>Força da Senha:</span>
                                <span id="meter-bits" class="font-mono text-slate-500 tabular-nums">(0 bits)</span>
                            </span>
                            <span id="meter-label" class="font-bold uppercase tracking-wider text-[10px] text-slate-500">
                                Digite uma senha
                            </span>
                        </div>
                        <div class="grid grid-cols-5 gap-1.5 h-1.5 w-full">
                            <div class="bar-seg h-full rounded-full bg-slate-800 transition-all duration-300"></div>
                            <div class="bar-seg h-full rounded-full bg-slate-800 transition-all duration-300"></div>
                            <div class="bar-seg h-full rounded-full bg-slate-800 transition-all duration-300"></div>
                            <div class="bar-seg h-full rounded-full bg-slate-800 transition-all duration-300"></div>
                            <div class="bar-seg h-full rounded-full bg-slate-800 transition-all duration-300"></div>
                        </div>
                        <div id="meter-time" class="text-[10px] text-slate-500 flex items-center justify-between">
                            <span>Estimativa de resistência:</span>
                            <span id="meter-estimate" class="font-medium text-slate-400">—</span>
                        </div>
                    </div>
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
                    id="btn-submit"
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

    <script>
    function avaliarForcaSenhaRegistro(pwd) {
        const bars = document.querySelectorAll('.bar-seg');
        const label = document.getElementById('meter-label');
        const bitsSpan = document.getElementById('meter-bits');
        const estimateSpan = document.getElementById('meter-estimate');

        if (!pwd || pwd.length === 0) {
            bars.forEach(b => b.className = 'bar-seg h-full rounded-full bg-slate-800 transition-all duration-300');
            label.innerText = 'Digite uma senha';
            label.className = 'font-bold uppercase tracking-wider text-[10px] text-slate-500';
            bitsSpan.innerText = '(0 bits)';
            estimateSpan.innerText = '—';
            return;
        }

        const len = pwd.length;
        const hasLower = /[a-z]/.test(pwd);
        const hasUpper = /[A-Z]/.test(pwd);
        const hasDigit = /[0-9]/.test(pwd);
        const hasSymbol = /[^A-Za-z0-9]/.test(pwd);

        let pool = 0;
        if (hasLower) pool += 26;
        if (hasUpper) pool += 26;
        if (hasDigit) pool += 10;
        if (hasSymbol) pool += 33;

        let entropy = pool > 0 ? Math.round(len * (Math.log(pool) / Math.LN2)) : 0;
        if (len >= 12) entropy += 6;
        if (len >= 16) entropy += 10;

        bitsSpan.innerText = '(' + entropy + ' bits)';

        let score = 1;
        let config = { text: 'Muito Fraca', color: 'text-rose-400', bar: 'bg-rose-500', time: '< 1 segundo' };

        if (len < 8) {
            score = 1;
            config = { text: 'Muito Fraca', color: 'text-rose-400', bar: 'bg-rose-500', time: '< 1 segundo' };
        } else if (entropy < 38 || (!hasDigit && !hasSymbol)) {
            score = 2;
            config = { text: 'Fraca', color: 'text-orange-400', bar: 'bg-orange-500', time: 'Poucos minutos' };
        } else if (entropy < 58) {
            score = 3;
            config = { text: 'Média', color: 'text-amber-400', bar: 'bg-amber-400', time: 'Vários meses' };
        } else if (entropy < 80) {
            score = 4;
            config = { text: 'Forte', color: 'text-emerald-400', bar: 'bg-emerald-500', time: 'Décadas / Séculos' };
        } else {
            score = 5;
            config = { text: 'Excelente (Blindada)', color: 'text-cyan-400', bar: 'bg-cyan-400', time: 'Milhões de anos' };
        }

        label.innerText = config.text;
        label.className = 'font-bold uppercase tracking-wider text-[10px] ' + config.color;
        estimateSpan.innerText = config.time;

        bars.forEach((b, idx) => {
            if (idx < score) {
                b.className = 'bar-seg h-full rounded-full transition-all duration-300 ' + config.bar;
            } else {
                b.className = 'bar-seg h-full rounded-full bg-slate-800 transition-all duration-300';
            }
        });
    }
    </script>
</body>
</html>
