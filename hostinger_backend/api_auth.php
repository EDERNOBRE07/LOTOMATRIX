<?php
/**
 * ============================================================================
 * LOTOSNIPER PRO • API RESTFUL DE AUTENTICAÇÃO E SESSÃO (JSON)
 * Domínio: lotosniper.com.br
 * Endpoint: /auth/api_auth.php
 * ============================================================================
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

// Permite requisições do próprio domínio
$allowedOrigin = 'https://lotosniper.com.br';
if (isset($_SERVER['HTTP_ORIGIN']) && ($_SERVER['HTTP_ORIGIN'] === $allowedOrigin || strpos($_SERVER['HTTP_ORIGIN'], 'localhost') !== false)) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$action = $_GET['action'] ?? $input['action'] ?? 'check_session';

try {
    $pdo = getDbConnection();

    switch ($action) {
        case 'check_session':
            if (empty($_SESSION['usuario_id'])) {
                echo json_encode([
                    'authenticated' => false,
                    'message' => 'Nenhuma sessão ativa.'
                ]);
                exit;
            }

            // 1. Checagem de inatividade (1800s / 30m)
            if (isset($_SESSION['ultimo_acesso']) && (time() - $_SESSION['ultimo_acesso'] > 1800)) {
                $_SESSION = [];
                session_destroy();
                echo json_encode([
                    'authenticated' => false,
                    'expired' => true,
                    'message' => 'Sessão expirada por inatividade.'
                ]);
                exit;
            }

            // 2. Checagem de alteração de IP (Anti-Hijacking)
            $ipAtual = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
            if (strpos($ipAtual, ',') !== false) {
                $ipAtual = trim(explode(',', $ipAtual)[0]);
            }
            if (!empty($_SESSION['seguranca_ip']) && $_SESSION['seguranca_ip'] !== $ipAtual) {
                error_log("[LotoSniper API Security] IP alterado de {$_SESSION['seguranca_ip']} para {$ipAtual} (User ID: {$_SESSION['usuario_id']})");
                $_SESSION = [];
                session_destroy();
                http_response_code(401);
                echo json_encode([
                    'authenticated' => false,
                    'hijacking_ip' => true,
                    'message' => 'Violação de segurança detectada: IP de rede alterado durante a sessão ativa.'
                ]);
                exit;
            }

            // 3. Checagem de alteração de User-Agent (Anti-Hijacking)
            $uaAtual = substr(trim($_SERVER['HTTP_USER_AGENT'] ?? 'Desconhecido'), 0, 300);
            if (!empty($_SESSION['seguranca_ua']) && $_SESSION['seguranca_ua'] !== $uaAtual) {
                error_log("[LotoSniper API Security] User-Agent alterado (User ID: {$_SESSION['usuario_id']})");
                $_SESSION = [];
                session_destroy();
                http_response_code(401);
                echo json_encode([
                    'authenticated' => false,
                    'hijacking_ua' => true,
                    'message' => 'Violação de segurança detectada: Dispositivo alterado durante a sessão ativa.'
                ]);
                exit;
            }

            // 4. Trava em Tempo Real no Banco MySQL (Status 'bloqueado' força logout imediato)
            $stmt = $pdo->prepare('SELECT id, nome, email, nivel, status FROM usuarios WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => $_SESSION['usuario_id']]);
            $user = $stmt->fetch();

            if (!$user || $user['status'] !== 'ativo') {
                $isBloqueado = ($user && $user['status'] === 'bloqueado');
                $_SESSION = [];
                session_destroy();
                http_response_code(403);
                echo json_encode([
                    'authenticated' => false,
                    'status_invalido' => true,
                    'bloqueado' => $isBloqueado,
                    'message' => $isBloqueado 
                        ? 'Sua conta foi BLOQUEADA pelo administrador. Acesso revogado imediatamente.' 
                        : 'Acesso pendente de aprovação ou inativo.'
                ]);
                exit;
            }

            $_SESSION['ultimo_acesso'] = time();
            $_SESSION['usuario_nivel'] = $user['nivel'];

            echo json_encode([
                'authenticated' => true,
                'user' => [
                    'id' => (int)$user['id'],
                    'nome' => $user['nome'],
                    'email' => $user['email'],
                    'nivel' => $user['nivel'],
                    'status' => $user['status']
                ]
            ]);
            break;

        case 'login':
            $email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);
            $senha = $input['senha'] ?? '';

            if (!$email || empty($senha)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'E-mail ou senha não informados.'
                ]);
                exit;
            }

            $stmt = $pdo->prepare('SELECT id, nome, email, senha, nivel, status FROM usuarios WHERE email = :email LIMIT 1');
            $stmt->execute([':email' => $email]);
            $usuario = $stmt->fetch();

            $dummyHash = '$2y$12$DUMMYHASHFORPROTECTIONAGAINSTTIMINGATTACKS2026';
            $hashToCheck = $usuario ? $usuario['senha'] : $dummyHash;
            $senhaValida = password_verify($senha, $hashToCheck);

            // Regra de Whitelist Estrita
            if ($usuario && $senhaValida && $usuario['status'] === 'ativo') {
                session_regenerate_id(true);
                $_SESSION['usuario_id'] = (int)$usuario['id'];
                $_SESSION['usuario_nome'] = $usuario['nome'];
                $_SESSION['usuario_email'] = $usuario['email'];
                $_SESSION['usuario_nivel'] = $usuario['nivel'];
                $_SESSION['ultimo_acesso'] = time();

                // Registro para middleware anti-hijacking
                $ipAtual = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
                if (strpos($ipAtual, ',') !== false) {
                    $ipAtual = trim(explode(',', $ipAtual)[0]);
                }
                $_SESSION['seguranca_ip'] = $ipAtual;
                $_SESSION['seguranca_ua'] = substr(trim($_SERVER['HTTP_USER_AGENT'] ?? 'Desconhecido'), 0, 300);

                $stmtUpdate = $pdo->prepare('UPDATE usuarios SET ultimo_login = NOW(), ultimo_ip = :ip WHERE id = :id');
                $stmtUpdate->execute([':ip' => $ipAtual, ':id' => $usuario['id']]);

                echo json_encode([
                    'success' => true,
                    'message' => 'Autenticação bem-sucedida.',
                    'user' => [
                        'id' => (int)$usuario['id'],
                        'nome' => $usuario['nome'],
                        'email' => $usuario['email'],
                        'nivel' => $usuario['nivel']
                    ]
                ]);
            } else {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'message' => 'Credenciais inválidas ou acesso não autorizado.'
                ]);
            }
            break;

        case 'logout':
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
            echo json_encode(['success' => true, 'message' => 'Logout efetuado com sucesso.']);
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ação não suportada.']);
            break;
    }
} catch (Exception $e) {
    error_log('[LotoSniper API Auth Error] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno de servidor.']);
}
