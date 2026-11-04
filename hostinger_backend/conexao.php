<?php
/**
 * LotoSniper - Conexão Segura com Banco de Dados MySQL via PDO
 * Servidor de Hospedagem: Hostinger
 * Domínio: lotosniper.com.br
 */

// Evitar exibição direta de erros de PHP para clientes finais em produção
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// Configurações do Banco de Dados Hostinger
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'u376010332_LotoSniper');
define('DB_USER', getenv('DB_USER') ?: 'u376010332_LotoSniper');
define('DB_PASS', getenv('DB_PASS') ?: 'SuaSenhaSegura@2026#Loto');

// Opções de segurança máxima do PDO
$pdoOptions = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false, // Previne SQL Injection no parser nativo do MySQL
    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
    PDO::ATTR_PERSISTENT         => false,
];

try {
    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $pdoOptions);
} catch (PDOException $e) {
    // Log seguro sem expor credenciais ao usuário
    error_log("[LotoSniper DB Error] " . date('Y-m-d H:i:s') . ": " . $e->getMessage());
    
    // Se for requisição JSON/API
    if (!empty($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['sucesso' => false, 'erro' => 'Falha crítica na conexão segura com o banco de dados.']);
        exit;
    }
    
    // Mensagem amigável genérica para página HTML
    http_response_code(500);
    die('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Erro de Conexão - LotoSniper</title><style>body{background:#090d16;color:#e2e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}.card{background:#111827;border:1px solid #dc2626;padding:2rem;border-radius:1rem;max-width:460px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.5);}</style></head><body><div class="card"><h2 style="color:#ef4444;margin-top:0;">Falha no Sistema</h2><p>Não foi possível estabelecer contato com os servidores de dados seguros do LotoSniper.</p><p style="color:#94a3b8;font-size:0.875rem;">Nossos engenheiros já foram notificados. Tente novamente em instantes.</p></div></body></html>');
}
