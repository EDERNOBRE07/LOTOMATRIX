<?php
/**
 * ============================================================================
 * LOTOSNIPER PRO • MIDDLEWARE DE SEGURANÇA DE SESSÃO (session_security.php)
 * Domínio: lotosniper.com.br
 * ============================================================================
 * 
 * Requisitos Implementados:
 * 1. Validação contínua da integridade da sessão a cada requisição HTTP.
 * 2. Detecção de alteração de endereço IP do usuário durante a sessão ativa (Anti-Hijacking).
 * 3. Detecção de alteração de User-Agent (navegador/dispositivo) durante a sessão ativa.
 * 4. Trava Crítica em Tempo Real no Banco MySQL: Destrói a sessão imediatamente se o
 *    campo 'status' do usuário for alterado para 'bloqueado' (ou diferente de 'ativo').
 * 5. Expiração e destruição limpa de cookies, log no error_log() e resposta adequada
 *    (redirecionamento para login.php ou resposta JSON 401/403 para chamadas de API).
 */

// Garantir que as configurações do banco estão carregadas
require_once __DIR__ . '/conexao.php';

// Inicialização segura de sessão com cookies blindados
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_samesite', 'Strict');

    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443)
        || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

    if ($isHttps) {
        ini_set('session.cookie_secure', '1');
    }

    session_name('LOTOSNIPER_SESSID');
    session_start();
}

/**
 * Obtém o IP do cliente tratando proxies reversos (Cloudflare, Nginx, load balancers)
 * @return string Endereço IP validado
 */
function obterIpClienteSeguro(): string {
    $candidatos = [
        $_SERVER['HTTP_CF_CONNECTING_IP'] ?? null,
        $_SERVER['HTTP_X_REAL_IP'] ?? null,
        $_SERVER['HTTP_X_FORWARDED_FOR'] ?? null,
        $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'
    ];

    foreach ($candidatos as $ipRaw) {
        if (!empty($ipRaw)) {
            $partes = explode(',', $ipRaw);
            $ip = trim($partes[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }

    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

/**
 * Obtém a assinatura de User-Agent sanitizada
 * @return string
 */
function obterUserAgentSeguro(): string {
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'Desconhecido';
    return substr(trim($ua), 0, 300);
}

/**
 * Destrói sumariamente a sessão do usuário, expira cookies e bloqueia a requisição
 * 
 * @param string $motivo Mensagem explicativa
 * @param string $codigo Código de segurança (ex: 'bloqueado', 'ip_alterado', 'ua_alterado', 'expirado')
 * @param bool $isApi Se deve responder com JSON
 */
function destruirSessaoImediata(string $motivo, string $codigo = 'sessao_invalida', bool $isApi = false): void {
    $userId = $_SESSION['usuario_id'] ?? 'Anonimo';
    $userEmail = $_SESSION['usuario_email'] ?? 'desconhecido';
    $ip = obterIpClienteSeguro();

    // Log detalhado de auditoria de segurança no servidor Hostinger
    error_log(sprintf(
        "[LotoSniper session_security] SESSÃO DESTRUÍDA IMEDIATAMENTE [%s] | Usuário ID: %s (%s) | IP: %s | Motivo: %s",
        strtoupper($codigo),
        $userId,
        $userEmail,
        $ip,
        $motivo
    ));

    // Limpar o array de variáveis de sessão
    $_SESSION = [];

    // Invalidar o cookie de sessão do navegador com tempo expirado
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'] ?? '/',
            $params['domain'] ?? '',
            $params['secure'] ?? false,
            $params['httponly'] ?? true
        );
    }

    // Destruir a sessão no disco/servidor
    session_destroy();

    // Detectar requisição JSON / API / AJAX
    $isJsonExpected = $isApi
        || (!empty($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)
        || (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest')
        || (isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false);

    if ($isJsonExpected) {
        $statusCode = ($codigo === 'bloqueado') ? 403 : 401;
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'sucesso' => false,
            'autenticado' => false,
            'bloqueado' => ($codigo === 'bloqueado'),
            'codigo' => $codigo,
            'erro' => $motivo,
            'timestamp' => time()
        ]);
        exit;
    }

    // Redirecionamento seguro para a página de login
    $url = 'login.php?erro=' . urlencode($motivo) . '&codigo=' . urlencode($codigo);
    header("Location: {$url}");
    exit;
}

/**
 * Validador de Integridade de Sessão:
 * Executado a cada requisição HTTP para blindar o LotoSniper.
 * 
 * @param PDO|null $pdo Conexão PDO
 * @param bool $exigirAdmin Se a página exige privilégio de administrador
 * @return array Dados atualizados do usuário autenticado no MySQL
 */
function validarSegurancaSessao(?PDO $pdo = null, bool $exigirAdmin = false): array {
    global $pdo;

    if (!$pdo) {
        try {
            require_once __DIR__ . '/conexao.php';
        } catch (Exception $e) {
            destruirSessaoImediata("Serviço de validação de dados indisponível.", "falha_conexao");
        }
    }

    // 1. Verificar se usuário possui credenciais ativas na sessão
    if (empty($_SESSION['usuario_id']) || empty($_SESSION['usuario_email'])) {
        destruirSessaoImediata("Autenticação obrigatória para acessar esta área.", "nao_autenticado");
    }

    // 2. Timeout de Inatividade (1800 segundos / 30 minutos)
    $limiteInatividade = 1800;
    if (isset($_SESSION['ultimo_acesso']) && (time() - $_SESSION['ultimo_acesso'] > $limiteInatividade)) {
        destruirSessaoImediata("Sua sessão expirou por inatividade (30 minutos). Faça login novamente.", "inatividade");
    }

    $ipAtual = obterIpClienteSeguro();
    $uaAtual = obterUserAgentSeguro();

    // 3. Validação de Alteração de IP durante a sessão (Anti-Hijacking)
    if (!isset($_SESSION['seguranca_ip'])) {
        $_SESSION['seguranca_ip'] = $ipAtual;
    } elseif ($_SESSION['seguranca_ip'] !== $ipAtual) {
        destruirSessaoImediata(
            "Alerta de segurança: O endereço IP de rede foi alterado durante a sessão ({$_SESSION['seguranca_ip']} -> {$ipAtual}). Sessão destruída por precaução anti-sequestro.",
            "ip_alterado"
        );
    }

    // 4. Validação de Alteração de User-Agent durante a sessão (Anti-Hijacking)
    if (!isset($_SESSION['seguranca_ua'])) {
        $_SESSION['seguranca_ua'] = $uaAtual;
    } elseif ($_SESSION['seguranca_ua'] !== $uaAtual) {
        destruirSessaoImediata(
            "Alerta de segurança: O navegador ou dispositivo foi alterado durante a sessão ativa. Sessão destruída por precaução anti-sequestro.",
            "ua_alterado"
        );
    }

    // 5. CHECAGEM OBRIGATÓRIA NO BANCO DE DADOS MYSQL:
    // Destrói a sessão imediatamente se o 'status' for 'bloqueado'
    try {
        $stmt = $pdo->prepare("SELECT id, nome, email, nivel, status FROM usuarios WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => (int)$_SESSION['usuario_id']]);
        $usuarioBanco = $stmt->fetch();

        // Usuário removido
        if (!$usuarioBanco) {
            destruirSessaoImediata("Conta de usuário inexistente ou excluída.", "usuario_inexistente");
        }

        // TRAVA CRÍTICA: STATUS 'BLOQUEADO' FORÇA DESTRUIÇÃO IMEDIATA DA SESSÃO
        if ($usuarioBanco['status'] === 'bloqueado') {
            destruirSessaoImediata(
                "Sua conta foi BLOQUEADA pelo administrador. A sessão foi destruída e o acesso revogado sumariamente.",
                "bloqueado"
            );
        }

        // Outros status não ativos (ex: 'pendente')
        if ($usuarioBanco['status'] !== 'ativo') {
            destruirSessaoImediata(
                "Sua conta está com status '{$usuarioBanco['status']}' e aguarda aprovação manual do administrador.",
                "status_pendente"
            );
        }

        // Atualizar permissões e nome
        $_SESSION['usuario_nivel'] = $usuarioBanco['nivel'];
        if (!empty($usuarioBanco['nome'])) {
            $_SESSION['usuario_nome'] = $usuarioBanco['nome'];
        }

        // Restrição para páginas de administrador
        if ($exigirAdmin && $usuarioBanco['nivel'] !== 'admin') {
            http_response_code(403);
            die('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Acesso Negado</title><style>body{background:#0b0f19;color:#ef4444;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;}div{text-align:center;background:#111827;padding:2rem;border-radius:12px;border:1px solid #ef4444;}</style></head><body><div><h2>403 - Acesso Negado</h2><p style="color:#94a3b8;">Área restrita exclusivamente a administradores.</p><a href="painel.php" style="color:#10b981;margin-top:10px;display:inline-block;">Voltar para o Painel</a></div></body></html>');
        }

    } catch (PDOException $e) {
        error_log("[LotoSniper session_security DB Error] " . $e->getMessage());
        destruirSessaoImediata("Erro interno ao validar integridade da conta no banco de dados.", "db_error");
    }

    // 6. Atualizar timestamp de atividade da sessão
    $_SESSION['ultimo_acesso'] = time();

    return $usuarioBanco;
}

// Execução automática do middleware ao ser incluído diretamente
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    // Se o arquivo for chamado diretamente por URL, rejeita com 403
    http_response_code(403);
    die("Acesso direto a middleware não permitido.");
}
