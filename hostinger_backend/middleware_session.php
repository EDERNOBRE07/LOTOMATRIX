<?php
/**
 * ============================================================================
 * LOTOSNIPER PRO • MIDDLEWARE DE INTEGRIDADE DE SESSÃO & SEGURANÇA EM TEMPO REAL
 * Domínio: lotosniper.com.br
 * ============================================================================
 * 
 * Responsabilidades Obrigatórias de Segurança:
 * 1. Inicialização de sessão com cookies blindados (HttpOnly, SameSite=Strict, Secure).
 * 2. Validação contínua de inatividade (limite padrão: 1800 segundos / 30 minutos).
 * 3. Validação anti-hijacking: Detecção de alteração de endereço IP do cliente.
 * 4. Validação anti-hijacking: Detecção de alteração de User-Agent (navegador/dispositivo).
 * 5. Trava em Tempo Real no Banco MySQL: Consulta obrigatória do campo `status` a cada
 *    requisição. Se for 'bloqueado' ou diferente de 'ativo', encerra a sessão imediatamente,
 *    invalida os cookies e redireciona (ou retorna JSON 403 em requisições de API).
 */

require_once __DIR__ . '/conexao.php';

// Garantir que a sessão está ativa com parâmetros rigorosos
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

    // Nome único da sessão para isolamento
    session_name('LOTOSNIPER_SESSID');
    session_start();
}

/**
 * Obtém o IP real do cliente tratando proxies reversos (Cloudflare, balanceadores, etc)
 * de forma sanitizada.
 * 
 * @return string Endereço IP do cliente
 */
function obterIpClienteMiddleware(): string {
    $candidatos = [
        $_SERVER['HTTP_CF_CONNECTING_IP'] ?? null, // Cloudflare
        $_SERVER['HTTP_X_REAL_IP'] ?? null,        // Nginx proxy
        $_SERVER['HTTP_X_FORWARDED_FOR'] ?? null,   // Proxy padrão (primeiro IP)
        $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'
    ];

    foreach ($candidatos as $ipRaw) {
        if (!empty($ipRaw)) {
            // Em caso de múltiplos IPs separados por vírgula em X-Forwarded-For
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
 * Obtém o User-Agent atual do cliente de forma sanitizada.
 * 
 * @return string User-Agent ou 'Desconhecido'
 */
function obterUserAgentMiddleware(): string {
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'Desconhecido';
    return substr(trim($ua), 0, 300);
}

/**
 * Destrói completamente a sessão do usuário, expira os cookies no navegador
 * e interrompe a requisição com redirect ou JSON conforme o tipo de cliente.
 * 
 * @param string $motivo Mensagem descritiva do motivo do encerramento
 * @param string $codigoErro Código de identificação do erro (ex: 'bloqueado', 'hijacking_ip', 'expirada')
 * @param bool $isApi Se a resposta deve ser estritamente em JSON
 */
function forcarLogoutImediato(string $motivo, string $codigoErro = 'sessao_invalida', bool $isApi = false): void {
    $usuarioId = $_SESSION['usuario_id'] ?? 'Anônimo';
    $usuarioEmail = $_SESSION['usuario_email'] ?? 'desconhecido';
    $ip = obterIpClienteMiddleware();

    // Log detalhado de segurança no servidor Hostinger
    error_log(sprintf(
        "[LotoSniper Security Middleware] LOGOUT FORÇADO [%s] | Usuário ID: %s (%s) | IP: %s | Motivo: %s",
        strtoupper($codigoErro),
        $usuarioId,
        $usuarioEmail,
        $ip,
        $motivo
    ));

    // Limpar variáveis de sessão
    $_SESSION = [];

    // Invalidar o cookie de sessão do navegador com data retroativa
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

    // Detectar se é requisição de API ou AJAX
    $isJsonExpected = $isApi 
        || (!empty($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)
        || (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest')
        || (isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false);

    if ($isJsonExpected) {
        http_response_code($codigoErro === 'bloqueado' ? 403 : 401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'sucesso' => false,
            'autenticado' => false,
            'erro' => $motivo,
            'codigo' => $codigoErro,
            'timestamp' => time()
        ]);
        exit;
    }

    // Redirecionamento amigável para a página de login
    $urlDestino = 'login.php?erro=' . urlencode($motivo) . '&codigo=' . urlencode($codigoErro);
    header("Location: {$urlDestino}");
    exit;
}

/**
 * Função Principal do Middleware: Valida a integridade da sessão na requisição atual.
 * 
 * Regras Validadas:
 * 1. Existência da sessão ativa.
 * 2. Timeout de inatividade (1800 segundos / 30 minutos).
 * 3. Integridade do IP: se o IP mudou em relação ao login, encerra a sessão.
 * 4. Integridade do User-Agent: se o navegador/dispositivo mudou, encerra a sessão.
 * 5. Trava em Tempo Real no MySQL: consulta o banco e bloqueia imediatamente se status !== 'ativo'.
 * 
 * @param PDO|null $pdo Instância PDO (se nulo, usa a global ou conecta)
 * @param bool $exigirAdmin Se verdadeiro, restringe a requisição para administradores
 * @return array Dados atualizados do usuário autenticado
 */
function validarIntegridadeSessao(?PDO $pdo = null, bool $exigirAdmin = false): array {
    global $pdo;

    // Se ainda não houver conexão, conectar
    if (!$pdo) {
        try {
            require_once __DIR__ . '/conexao.php';
        } catch (Exception $e) {
            error_log("[LotoSniper Middleware DB Error] " . $e->getMessage());
            forcarLogoutImediato("Erro ao validar sessão com o servidor de dados.", "db_indisponivel");
        }
    }

    // 1. Checar se há usuário autenticado na sessão
    if (empty($_SESSION['usuario_id']) || empty($_SESSION['usuario_email'])) {
        forcarLogoutImediato("Você precisa estar autenticado para acessar este recurso.", "nao_autenticado");
    }

    // 2. Validação de Inatividade (30 minutos = 1800s)
    $limiteInatividade = 1800;
    if (isset($_SESSION['ultimo_acesso']) && (time() - $_SESSION['ultimo_acesso'] > $limiteInatividade)) {
        forcarLogoutImediato("Sua sessão expirou por inatividade (30 minutos). Por favor, realize o login novamente.", "inatividade");
    }

    $ipAtual = obterIpClienteMiddleware();
    $uaAtual = obterUserAgentMiddleware();

    // 3. Validação de Integridade do IP (Anti-Session Hijacking)
    if (!isset($_SESSION['seguranca_ip'])) {
        // Inicializa caso não tenha sido preenchido no login
        $_SESSION['seguranca_ip'] = $ipAtual;
    } elseif ($_SESSION['seguranca_ip'] !== $ipAtual) {
        forcarLogoutImediato(
            "Violação de segurança detectada: alteração de endereço IP de rede durante a sessão ativa.",
            "hijacking_ip"
        );
    }

    // 4. Validação de Integridade do User-Agent (Anti-Session Hijacking)
    if (!isset($_SESSION['seguranca_ua'])) {
        // Inicializa caso não tenha sido preenchido no login
        $_SESSION['seguranca_ua'] = $uaAtual;
    } elseif ($_SESSION['seguranca_ua'] !== $uaAtual) {
        forcarLogoutImediato(
            "Violação de segurança detectada: alteração de navegador ou dispositivo durante a sessão ativa.",
            "hijacking_ua"
        );
    }

    // 5. TRAVA CRÍTICA EM TEMPO REAL NO BANCO DE DADOS MYSQL
    // Consulta direta ao banco de dados para checar o status e permissões atuais
    try {
        $stmt = $pdo->prepare("SELECT id, nome, email, nivel, status FROM usuarios WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => (int)$_SESSION['usuario_id']]);
        $usuarioBanco = $stmt->fetch();

        // 5.1 Se o usuário foi removido do banco
        if (!$usuarioBanco) {
            forcarLogoutImediato("Conta de usuário não localizada no sistema.", "usuario_inexistente");
        }

        // 5.2 Se o status no banco for exatamente 'bloqueado'
        if ($usuarioBanco['status'] === 'bloqueado') {
            forcarLogoutImediato(
                "Sua conta foi BLOQUEADA pelo administrador. O acesso a este sistema foi revogado imediatamente.",
                "bloqueado"
            );
        }

        // 5.3 Se o status for diferente de 'ativo' (ex: 'pendente' aguardando aprovação)
        if ($usuarioBanco['status'] !== 'ativo') {
            forcarLogoutImediato(
                "Sua conta está com status '{$usuarioBanco['status']}' e requer aprovação ativa do administrador.",
                "status_inativo"
            );
        }

        // 5.4 Sincronizar dados em caso de atualização recente de cargo pelo admin
        $_SESSION['usuario_nivel'] = $usuarioBanco['nivel'];
        if (!empty($usuarioBanco['nome'])) {
            $_SESSION['usuario_nome'] = $usuarioBanco['nome'];
        }

        // 5.5 Validação de privilégio de administrador, se exigido
        if ($exigirAdmin && $usuarioBanco['nivel'] !== 'admin') {
            http_response_code(403);
            die('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Acesso Restrito</title><style>body{background:#0b0f19;color:#ef4444;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}div{text-align:center;background:#111827;padding:2.5rem;border-radius:12px;border:1px solid #ef4444;max-width:440px;box-shadow:0 10px 25px rgba(0,0,0,0.5);}a{color:#10b981;margin-top:16px;display:inline-block;text-decoration:none;font-weight:600;}</style></head><body><div><h2>403 - Acesso Não Autorizado</h2><p style="color:#94a3b8;font-size:14px;">Este recurso é restrito exclusivamente a administradores credenciados do LotoSniper.</p><a href="painel.php">&larr; Voltar para a Área Restrita</a></div></body></html>');
        }

    } catch (PDOException $e) {
        error_log("[LotoSniper Middleware Query Error] " . $e->getMessage());
        forcarLogoutImediato("Falha temporária ao auditar status de segurança da conta.", "erro_banco");
    }

    // 6. Atualizar timestamp de atividade
    $_SESSION['ultimo_acesso'] = time();

    return $usuarioBanco;
}
