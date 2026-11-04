<?php
/**
 * LotoSniper - Verificador e Guardião de Sessão Segura
 * Protege contra:
 * 1. Acesso direto sem login prévio (Redireciona para login.php)
 * 2. Inatividade superior a 1800 segundos (30 minutos)
 * 3. Sequestro de Sessão (Session Hijacking): checagem de IP e User-Agent
 * 4. Trava Crítica: Se o status do usuário no banco foi alterado para 'bloqueado' ou não for 'ativo',
 *    a sessão é sumariamente encerrada e o usuário é deslogado.
 */

if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_samesite', 'Strict');
    
    // Cookie seguro apenas em HTTPS
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        ini_set('session.cookie_secure', '1');
    }
    
    session_start();
}

$timeoutInatividade = 1800; // 30 minutos em segundos

// 1. Verificar se usuário está autenticado
if (empty($_SESSION['usuario_id']) || empty($_SESSION['usuario_email'])) {
    session_unset();
    session_destroy();
    header("Location: login.php?erro=" . urlencode("Sessão expirada ou não autenticada. Por favor, faça login."));
    exit;
}

// 2. Checagem de Inatividade (Session Inactivity Timeout)
if (isset($_SESSION['ultimo_acesso']) && (time() - $_SESSION['ultimo_acesso'] > $timeoutInatividade)) {
    session_unset();
    session_destroy();
    header("Location: login.php?erro=" . urlencode("Sua sessão expirou por inatividade (30 min). Faça login novamente."));
    exit;
}
$_SESSION['ultimo_acesso'] = time();

// 3. Checagem Anti-Session Hijacking (IP & User-Agent Fingerprint)
$ipAtual = $_SERVER['REMOTE_ADDR'] ?? '';
$uaAtual = $_SERVER['HTTP_USER_AGENT'] ?? '';

if (isset($_SESSION['seguranca_ip']) && $_SESSION['seguranca_ip'] !== $ipAtual) {
    // Violação de integridade de IP
    error_log("[LotoSniper Alerta Hijacking] IP alterado de {$_SESSION['seguranca_ip']} para {$ipAtual} (User: {$_SESSION['usuario_email']})");
    session_unset();
    session_destroy();
    header("Location: login.php?erro=" . urlencode("Violação de segurança detectada: IP de rede alterado durante a sessão."));
    exit;
}

if (isset($_SESSION['seguranca_ua']) && $_SESSION['seguranca_ua'] !== $uaAtual) {
    // Violação de integridade de User-Agent
    error_log("[LotoSniper Alerta Hijacking] User-Agent alterado para o usuário {$_SESSION['usuario_email']}");
    session_unset();
    session_destroy();
    header("Location: login.php?erro=" . urlencode("Violação de segurança detectada: Dispositivo alterado durante a sessão."));
    exit;
}

// 4. Trava Crítica em Tempo Real no Banco MySQL:
// Se o status foi alterado para 'bloqueado' ou diferente de 'ativo' pelo admin, forçar logout
if (isset($pdo) && !empty($_SESSION['usuario_id'])) {
    try {
        $stmtStatusCheck = $pdo->prepare("SELECT status, nivel FROM usuarios WHERE id = :id LIMIT 1");
        $stmtStatusCheck->execute([':id' => $_SESSION['usuario_id']]);
        $dadosAtuais = $stmtStatusCheck->fetch();

        if (!$dadosAtuais || $dadosAtuais['status'] !== 'ativo') {
            $motivo = ($dadosAtuais && $dadosAtuais['status'] === 'bloqueado')
                ? "Sua conta foi suspensa ou bloqueada pelo administrador."
                : "Sua conta não possui status ativo.";
            
            session_unset();
            session_destroy();
            header("Location: login.php?erro=" . urlencode($motivo));
            exit;
        }

        // Atualizar nível de permissão caso o admin tenha alterado
        $_SESSION['usuario_nivel'] = $dadosAtuais['nivel'];
    } catch (Exception $e) {
        error_log("[LotoSniper Auth Check DB Error] " . $e->getMessage());
    }
}
