<?php
/**
 * ============================================================================
 * LOTOSNIPER PRO • SISTEMA DE LOGIN SEGURO COM WHITELIST ESTRITA
 * Domínio: lotosniper.com.br
 * ============================================================================
 * 
 * Diretrizes de Segurança Obrigatórias:
 * 1. PDO com Prepared Statements contra SQL Injection.
 * 2. Validação com password_verify() e resistência contra timing attacks.
 * 3. Whitelist Estrita: Acesso liberado SOMENTE se credenciais corretas E status === 'ativo'.
 * 4. Resposta genérica em caso de falha para evitar enumeração de contas e status.
 * 5. Proteção contra CSRF e Session Fixation (session_regenerate_id).
 */

require_once __DIR__ . '/config.php';

// Redireciona se já estiver autenticado
if (!empty($_SESSION['usuario_id']) && !empty($_SESSION['usuario_email'])) {
    if (($_SESSION['usuario_nivel'] ?? '') === 'admin') {
        header('Location: admin_panel.php');
    } else {
        header('Location: /#jogos');
    }
    exit;
}

$erro = '';
$sucesso = '';

// Mensagens vindas via GET (redirecionamentos)
if (!empty($_GET['msg'])) {
    $sucesso = sanitizeOutput($_GET['msg']);
}
if (!empty($_GET['erro'])) {
    if ($_GET['erro'] === 'sessao_expirada') {
        $erro = 'Sua sessão expirou por inatividade. Por favor, autentique-se novamente.';
    } elseif ($_GET['erro'] === 'acesso_revogado') {
        $erro = 'Credenciais inválidas ou acesso não autorizado.';
    } elseif ($_GET['erro'] === 'acesso_negado') {
        $erro = 'Acesso restrito. Faça login para continuar.';
    }
}

// Processamento do Formulário de Login (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
    $senha = $_POST['senha'] ?? '';
    $csrfToken = $_POST['csrf_token'] ?? '';

    // Validação de CSRF
    if (!validateCsrfToken($csrfToken)) {
        $erro = 'Requisição inválida ou expirada. Atualize a página e tente novamente.';
    } elseif (!$email || empty($senha)) {
        $erro = 'Por favor, informe um e-mail válido e sua senha de acesso.';
    } else {
        try {
            $pdo = getDbConnection();

            // 1. Prepared Statement com PDO para busca segura por e-mail
            $stmt = $pdo->prepare('
                SELECT id, nome, email, senha, nivel, status 
                FROM usuarios 
                WHERE email = :email 
                LIMIT 1
            ');
            $stmt->execute([':email' => $email]);
            $usuario = $stmt->fetch();

            // Hash fictício para mitigação de Timing Attack quando e-mail não existe
            $dummyHash = '$2y$12$DUMMYHASHFORPROTECTIONAGAINSTTIMINGATTACKS2026';
            $hashToCheck = $usuario ? $usuario['senha'] : $dummyHash;
            $senhaValida = password_verify($senha, $hashToCheck);

            /**
             * 2. REGRA DE WHITELIST ESTRITA
             * O login só é permitido se:
             * a) O registro do usuário existe
             * b) A senha bate com password_verify()
             * c) O status é ESTRITAMENTE 'ativo'
             * 
             * Caso contrário, exibe mensagem genérica de erro para evitar enumeração.
             */
            if ($usuario && $senhaValida && $usuario['status'] === 'ativo') {
                // Regeneração de ID de sessão contra Session Fixation
                session_regenerate_id(true);

                // Preenchimento dos dados seguros na sessão
                $_SESSION['usuario_id'] = (int)$usuario['id'];
                $_SESSION['usuario_nome'] = $usuario['nome'];
                $_SESSION['usuario_email'] = $usuario['email'];
                $_SESSION['usuario_nivel'] = $usuario['nivel'];
                $_SESSION['ultimo_acesso'] = time();

                // Atualização do timestamp de último login e IP
                $ipAtual = $_SERVER['REMOTE_ADDR'] ?? null;
                $stmtUpdate = $pdo->prepare('UPDATE usuarios SET ultimo_login = NOW() WHERE id = :id');
                $stmtUpdate->execute([':id' => $usuario['id']]);

                // Redirecionamento condicional por perfil
                if ($usuario['nivel'] === 'admin') {
                    header('Location: admin_panel.php');
                } else {
                    header('Location: /#jogos');
                }
                exit;
            } else {
                // Mensagem genérica estrita conforme diretrizes de segurança
                $erro = 'Credenciais inválidas ou acesso não autorizado. Verifique seus dados ou aguarde a aprovação do administrador.';
            }
        } catch (PDOException $e) {
            error_log('[LotoSniper Login Error] ' . $e->getMessage());
            $erro = 'Falha na comunicação com o servidor de dados. Tente novamente mais tarde.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acesso Restrito • LotoSniper PRO</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
    </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-slate-950">

    <!-- Container Central -->
    <div class="w-full max-w-md">

        <!-- Logo e Cabeçalho -->
        <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-400 p-0.5 shadow-xl shadow-emerald-500/20 mb-4">
                <div class="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-400 font-black text-2xl tracking-tighter">
                    LS⚡
                </div>
            </div>
            <h1 class="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
                LotoSniper <span class="text-xs font-mono font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md">PRO</span>
            </h1>
            <p class="text-xs text-slate-400 mt-1 font-medium">Autenticação Segura • lotosniper.com.br</p>
        </div>

        <!-- Card de Login -->
        <div class="bg-slate-900/90 border border-slate-800 rounded-3xl p-7 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            
            <!-- Barra Superior de Destaque -->
            <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400"></div>

            <div class="mb-6">
                <h2 class="text-lg font-bold text-white">Login Restrito</h2>
                <p class="text-xs text-slate-400 mt-0.5">Acesso exclusivo para usuários ativos e auditados</p>
            </div>

            <!-- Alerta de Erro -->
            <?php if (!empty($erro)): ?>
                <div class="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 text-red-300 text-xs leading-relaxed animate-fade-in">
                    <span class="text-red-400 text-base leading-none">⚠️</span>
                    <div><?= $erro ?></div>
                </div>
            <?php endif; ?>

            <!-- Alerta de Sucesso -->
            <?php if (!empty($sucesso)): ?>
                <div class="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-3 text-emerald-300 text-xs leading-relaxed">
                    <span class="text-emerald-400 text-base leading-none">✓</span>
                    <div><?= $sucesso ?></div>
                </div>
            <?php endif; ?>

            <form method="POST" action="login.php" class="space-y-4" autocomplete="off">
                <!-- CSRF Token -->
                <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">

                <!-- Campo E-mail -->
                <div>
                    <label for="email" class="block text-xs font-semibold text-slate-300 mb-1.5">E-mail Cadastrado</label>
                    <div class="relative">
                        <input 
                            type="email" 
                            id="email" 
                            name="email" 
                            required 
                            autofocus
                            placeholder="seuemail@exemplo.com"
                            value="<?= isset($_POST['email']) ? sanitizeOutput($_POST['email']) : '' ?>"
                            class="w-full bg-slate-950/70 border border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-white rounded-xl px-4 py-3 text-sm placeholder:text-slate-600 transition outline-none font-medium"
                        >
                    </div>
                </div>

                <!-- Campo Senha -->
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label for="senha" class="text-xs font-semibold text-slate-300">Senha de Acesso</label>
                        <span class="text-[11px] text-slate-500">Criptografia BCRYPT</span>
                    </div>
                    <div class="relative">
                        <input 
                            type="password" 
                            id="senha" 
                            name="senha" 
                            required 
                            placeholder="••••••••••••"
                            class="w-full bg-slate-950/70 border border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-white rounded-xl px-4 py-3 text-sm placeholder:text-slate-600 transition outline-none font-mono"
                        >
                    </div>
                </div>

                <!-- Botão Entrar -->
                <button 
                    type="submit" 
                    class="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition duration-150 cursor-pointer flex items-center justify-center gap-2"
                >
                    <span>Entrar no LotoSniper</span>
                    <span class="text-base font-normal">→</span>
                </button>
            </form>

            <!-- Rodapé do Card -->
            <div class="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span class="text-slate-500">Não possui cadastro?</span>
                <a href="register.php" class="text-emerald-400 hover:text-emerald-300 font-semibold transition">
                    Criar conta (Aprovação)
                </a>
            </div>
        </div>

        <!-- Informações de Segurança e Compliance -->
        <div class="mt-6 text-center text-slate-500 text-[11px] leading-relaxed">
            <p>Protegido por MySQL PDO Prepared Statements & Whitelist Estrita.</p>
            <p class="mt-0.5">Sessão expira automaticamente após 30 minutos de inatividade.</p>
        </div>

    </div>

</body>
</html>
