<?php
/**
 * ============================================================================
 * LOTOSNIPER PRO • ENCERRAMENTO SEGURO DE SESSÃO (LOGOUT)
 * Domínio: lotosniper.com.br
 * ============================================================================
 */

require_once __DIR__ . '/config.php';

// Limpa array de sessão
$_SESSION = [];

// Invalida o cookie de sessão no navegador
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

// Destrói a sessão no servidor
session_destroy();

// Redireciona para o login com mensagem informativa
header('Location: login.php?msg=' . urlencode('Você encerrou sua sessão com segurança.'));
exit;
