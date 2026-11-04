<?php
/**
 * ============================================================================
 * LOTOSNIPER PRO • GUARDIÃO DE AUTENTICAÇÃO E SESSÃO (auth_check.php)
 * Domínio: lotosniper.com.br
 * ============================================================================
 * 
 * Este arquivo atua como barreira de segurança em páginas restritas (ex: painel.php, admin.php).
 * Ele inclui e executa a camada de middleware de integridade de sessão:
 * 1. Inicializa cookies de sessão com atributos seguros (HttpOnly, SameSite, Secure).
 * 2. Valida inatividade (expiração automática após 30 minutos).
 * 3. Valida integridade do IP (anti-session hijacking).
 * 4. Valida integridade do User-Agent (anti-session hijacking).
 * 5. Trava Crítica em Tempo Real: Checa no MySQL se o status do usuário continua 'ativo'.
 *    Se o usuário for alterado para 'bloqueado' no banco, encerra a sessão imediatamente.
 */

require_once __DIR__ . '/conexao.php';
require_once __DIR__ . '/middleware_session.php';

// Executar validação completa de integridade de sessão
$dadosUsuarioLogado = validarIntegridadeSessao($pdo);
