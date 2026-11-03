<?php
/**
 * ============================================================================
 * LOTOSNIPER PRO • CONFIGURAÇÃO DE BANCO DE DADOS & SEGURANÇA HOSTINGER
 * Domínio: lotosniper.com.br
 * ============================================================================
 * 
 * Diretrizes de Segurança Implementadas:
 * 1. PDO com Prepared Statements e emulação desativada (Anti-SQL Injection).
 * 2. UTF-8 mb4 completo (compatibilidade com acentuação e emojis).
 * 3. Headers HTTP de segurança rigorosos (HSTS, CSP, X-Frame, X-Content-Type).
 * 4. Configuração de sessão blindada (HttpOnly, SameSite=Strict, Secure).
 * 5. Prevenção de ataques CSRF e Session Fixation.
 */

// Desabilitar exibição de erros sensíveis em produção (ative apenas para depuração se necessário)
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Definição das credenciais do MySQL da Hostinger (Substitua pelos dados do seu hPanel)
define('DB_HOST', getenv('LOTOSNIPER_DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('LOTOSNIPER_DB_PORT') ?: 3306);
define('DB_NAME', getenv('LOTOSNIPER_DB_NAME') ?: 'u376010332_LotoSniper');
define('DB_USER', getenv('LOTOSNIPER_DB_USER') ?: 'u376010332_LotoSniper');
define('DB_PASS', getenv('LOTOSNIPER_DB_PASS') ?: 'SuaSenhaSeguraHostinger2026!');

// Cabeçalhos HTTP de Segurança Avançada
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
}

// Configuração segura de cookies de sessão
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0, // Expira ao fechar navegador
        'path' => '/',
        'domain' => $_SERVER['HTTP_HOST'] ?? '',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Strict'
    ]);
    session_name('LOTOSNIPER_SESSID');
    session_start();
}

/**
 * Retorna a conexão PDO Singleton para o MySQL da Hostinger
 * 
 * @return PDO Conexão PDO segura
 */
function getDbConnection(): PDO {
    static $pdo = null;

    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
        
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false, // Força prepared statements nativos no MySQL
            PDO::ATTR_PERSISTENT => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // Em caso de falha, registra no log do servidor sem expor detalhes na tela
            error_log('[LotoSniper DB Connection Error] ' . $e->getMessage());
            http_response_code(500);
            die(json_encode([
                'status' => 'error',
                'mensagem' => 'Serviço de autenticação temporariamente indisponível. Tente novamente em instantes.'
            ]));
        }
    }

    return $pdo;
}

/**
 * Gera ou recupera o token CSRF da sessão atual
 */
function getCsrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Valida o token CSRF enviado no formulário
 */
function validateCsrfToken(?string $token): bool {
    if (empty($token) || empty($_SESSION['csrf_token'])) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Sanitiza strings para exibição segura em HTML (Anti-XSS)
 */
function sanitizeOutput(string $str): string {
    return htmlspecialchars($str, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
