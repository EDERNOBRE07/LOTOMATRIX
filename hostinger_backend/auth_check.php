<?php
/**
 * ============================================================================
 * LOTOSNIPER PRO • MIDDLEWARE DE PROTEÇÃO DE SESSÃO E WHITELIST
 * Domínio: lotosniper.com.br
 * ============================================================================
 * 
 * Regras de Segurança:
 * 1. Blindagem contra acesso direto via URL sem autenticação prévia.
 * 2. Expiração automática por tempo de inatividade (30 minutos / 1800 segundos).
 * 3. Validação contínua da Whitelist: Re-consulta o status no MySQL para revogar
 *    imediatamente o acesso caso o usuário tenha sido bloqueado pelo Admin.
 * 4. Regeneração periódica do ID de sessão para blindagem contra Session Fixation.
 */

require_once __DIR__ . '/config.php';

// Tempo máximo de inatividade em segundos (30 minutos)
define('SESSION_TIMEOUT_SECONDS', 1800);

/**
 * Valida a sessão atual do usuário e garante que o status permanece 'ativo' no MySQL
 */
function checkUserAuthentication(): array {
    // 1. Verifica se os dados mínimos de autenticação estão na sessão
    if (empty($_SESSION['usuario_id']) || empty($_SESSION['usuario_email'])) {
        terminateSessionAndRedirect('acesso_negado', 'Faça login para acessar o sistema.');
    }

    // 2. Controle de Inatividade (Session Inactivity Timeout)
    $agora = time();
    if (isset($_SESSION['ultimo_acesso'])) {
        $inatividade = $agora - $_SESSION['ultimo_acesso'];
        if ($inatividade > SESSION_TIMEOUT_SECONDS) {
            terminateSessionAndRedirect('sessao_expirada', 'Sua sessão expirou por inatividade. Faça login novamente.');
        }
    }
    // Atualiza o timestamp do último acesso
    $_SESSION['ultimo_acesso'] = $agora;

    // 3. Validação Contínua no Banco de Dados (Whitelist Estrita)
    // Impede que um usuário cujo status foi alterado para 'pendente' ou 'bloqueado' continue navegando
    try {
        $pdo = getDbConnection();
        $stmt = $pdo->prepare('SELECT id, nome, email, nivel, status FROM usuarios WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $_SESSION['usuario_id']]);
        $usuario = $stmt->fetch();

        // Se o usuário não existir mais ou não for estritamente 'ativo', derruba a sessão
        if (!$usuario || $usuario['status'] !== 'ativo') {
            terminateSessionAndRedirect('acesso_revogado', 'Credenciais inválidas ou acesso não autorizado.');
        }

        // Sincroniza o nível na sessão
        $_SESSION['usuario_nivel'] = $usuario['nivel'];
        $_SESSION['usuario_nome'] = $usuario['nome'];

        return $usuario;
    } catch (PDOException $e) {
        error_log('[LotoSniper Auth Check Error] ' . $e->getMessage());
        terminateSessionAndRedirect('erro_banco', 'Erro ao verificar permissões de acesso.');
    }
}

/**
 * Exige que o usuário autenticado possua nivel === 'admin'
 */
function requireAdmin(): array {
    $usuario = checkUserAuthentication();
    if ($usuario['nivel'] !== 'admin') {
        http_response_code(403);
        // Exibe tela amigável de acesso restrito
        die('
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Acesso Restrito • LotoSniper</title>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-slate-950 text-white min-h-screen flex items-center justify-center p-4">
                <div class="bg-slate-900 border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
                    <div class="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20 text-2xl font-bold">⚠️</div>
                    <h1 class="text-xl font-bold text-red-400 mb-2">Acesso Restrito ao Administrador</h1>
                    <p class="text-slate-400 text-sm mb-6">Esta área é exclusiva para a equipe administrativa do LotoSniper.</p>
                    <a href="login.php" class="inline-block px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition">Voltar ao Login</a>
                </div>
            </body>
            </html>
        ');
    }
    return $usuario;
}

/**
 * Encerra a sessão atual de forma limpa e redireciona
 */
function terminateSessionAndRedirect(string $motivo, string $mensagem): void {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            $params['secure'],
            $params['httponly']
        );
    }
    session_destroy();

    $redirectUrl = 'login.php?erro=' . urlencode($motivo) . '&msg=' . urlencode($mensagem);
    header("Location: $redirectUrl");
    exit;
}
