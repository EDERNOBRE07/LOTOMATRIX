<?php
/**
 * ============================================================================
 * LOTOSNIPER PRO • GUARDIÃO DE AUTENTICAÇÃO E SESSÃO (auth_check.php)
 * Domínio: lotosniper.com.br
 * ============================================================================
 * 
 * Atua como barreira de segurança em páginas restritas (ex: painel.php, admin.php).
 * Executa o middleware de integridade de sessão session_security.php:
 * 1. Inicializa cookies com atributos seguros (HttpOnly, SameSite, Secure).
 * 2. Valida inatividade (expiração automática após 30 minutos).
 * 3. Valida integridade do IP (anti-session hijacking).
 * 4. Valida integridade do User-Agent (anti-session hijacking).
 * 5. Trava Crítica em Tempo Real: Destrói a sessão imediatamente se o status for 'bloqueado'.
 */

require_once __DIR__ . '/conexao.php';
require_once __DIR__ . '/session_security.php';

// Executar validação completa de segurança e integridade de sessão
$dadosUsuarioLogado = validarSegurancaSessao($pdo);
