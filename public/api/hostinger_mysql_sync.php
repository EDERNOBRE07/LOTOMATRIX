<?php
/**
 * LotoSniper - Hostinger MySQL Database Bridge
 * Banco de Dados: u376010332_LotoSniper
 * Usuário: u376010332_LotoSniper
 * Site: lotosniper.com.br
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$db_host = getenv('DB_HOST') ?: 'localhost';
$db_name = getenv('DB_NAME') ?: 'u376010332_LotoSniper';
$db_user = getenv('DB_USER') ?: 'u376010332_LotoSniper';
$db_pass = getenv('DB_PASS') ?: '';

try {
    $pdo = new PDO("mysql:host={$db_host};dbname={$db_name};charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    // Criar tabela se não existir
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS lotosniper_saved_fechamentos (
            id VARCHAR(128) PRIMARY KEY,
            concurso INT NOT NULL,
            data_concurso VARCHAR(32),
            tipo_fechamento VARCHAR(255) NOT NULL,
            modalidade_matriz VARCHAR(255) NOT NULL,
            universo_dezenas TEXT NOT NULL,
            dezenas_fixas TEXT,
            dezenas_excluidas TEXT,
            faixa_soma_min INT,
            faixa_soma_max INT,
            paridade_min INT,
            paridade_max INT,
            total_jogos INT NOT NULL,
            custo_total DECIMAL(10,2) NOT NULL,
            tickets_json MEDIUMTEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';

    if ($method === 'GET') {
        if ($action === 'status') {
            $stmt = $pdo->query("SELECT COUNT(*) as total FROM lotosniper_saved_fechamentos");
            $total = (int)$stmt->fetchColumn();
            echo json_encode([
                'success' => true,
                'status' => 'connected',
                'database' => $db_name,
                'user' => $db_user,
                'site' => 'lotosniper.com.br',
                'total_saved' => $total,
            ]);
            exit();
        }

        // Listar todos os fechamentos
        $stmt = $pdo->query("SELECT * FROM lotosniper_saved_fechamentos ORDER BY created_at DESC LIMIT 50");
        $rows = $stmt->fetchAll();
        $fechamentos = array_map(function ($r) {
            return [
                'id' => $r['id'],
                'concurso' => (int)$r['concurso'],
                'dataConcurso' => $r['data_concurso'],
                'tipoFechamento' => $r['tipo_fechamento'],
                'modalidadeMatriz' => $r['modalidade_matriz'],
                'universoDezenas' => json_decode($r['universo_dezenas'], true) ?: [],
                'dezenasFixas' => json_decode($r['dezenas_fixas'], true) ?: [],
                'dezenasExcluidas' => json_decode($r['dezenas_excluidas'], true) ?: [],
                'faixaSoma' => ['min' => (int)$r['faixa_soma_min'], 'max' => (int)$r['faixa_soma_max']],
                'paridade' => ['minPares' => (int)$r['paridade_min'], 'maxPares' => (int)$r['paridade_max']],
                'totalJogos' => (int)$r['total_jogos'],
                'custoTotal' => (float)$r['custo_total'],
                'tickets' => json_decode($r['tickets_json'], true) ?: [],
                'dataCriacao' => $r['created_at'],
            ];
        }, $rows);

        echo json_encode(['success' => true, 'fechamentos' => $fechamentos]);
        exit();
    }

    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        if (!$data || empty($data['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Dados inválidos']);
            exit();
        }

        $stmt = $pdo->prepare("
            INSERT INTO lotosniper_saved_fechamentos (
                id, concurso, data_concurso, tipo_fechamento, modalidade_matriz,
                universo_dezenas, dezenas_fixas, dezenas_excluidas,
                faixa_soma_min, faixa_soma_max, paridade_min, paridade_max,
                total_jogos, custo_total, tickets_json
            ) VALUES (
                :id, :concurso, :data_concurso, :tipo_fechamento, :modalidade_matriz,
                :universo_dezenas, :dezenas_fixas, :dezenas_excluidas,
                :faixa_soma_min, :faixa_soma_max, :paridade_min, :paridade_max,
                :total_jogos, :custo_total, :tickets_json
            ) ON DUPLICATE KEY UPDATE
                concurso = VALUES(concurso),
                data_concurso = VALUES(data_concurso),
                tipo_fechamento = VALUES(tipo_fechamento),
                modalidade_matriz = VALUES(modalidade_matriz),
                universo_dezenas = VALUES(universo_dezenas),
                dezenas_fixas = VALUES(dezenas_fixas),
                dezenas_excluidas = VALUES(dezenas_excluidas),
                faixa_soma_min = VALUES(faixa_soma_min),
                faixa_soma_max = VALUES(faixa_soma_max),
                paridade_min = VALUES(paridade_min),
                paridade_max = VALUES(paridade_max),
                total_jogos = VALUES(total_jogos),
                custo_total = VALUES(custo_total),
                tickets_json = VALUES(tickets_json)
        ");

        $stmt->execute([
            ':id' => $data['id'],
            ':concurso' => (int)($data['concurso'] ?? 0),
            ':data_concurso' => $data['dataConcurso'] ?? '',
            ':tipo_fechamento' => $data['tipoFechamento'] ?? '',
            ':modalidade_matriz' => $data['modalidadeMatriz'] ?? '',
            ':universo_dezenas' => json_encode($data['universoDezenas'] ?? []),
            ':dezenas_fixas' => json_encode($data['dezenasFixas'] ?? []),
            ':dezenas_excluidas' => json_encode($data['dezenasExcluidas'] ?? []),
            ':faixa_soma_min' => (int)($data['faixaSoma']['min'] ?? 180),
            ':faixa_soma_max' => (int)($data['faixaSoma']['max'] ?? 220),
            ':paridade_min' => (int)($data['paridade']['minPares'] ?? 6),
            ':paridade_max' => (int)($data['paridade']['maxPares'] ?? 9),
            ':total_jogos' => (int)($data['totalJogos'] ?? count($data['tickets'] ?? [])),
            ':custo_total' => (float)($data['custoTotal'] ?? 0),
            ':tickets_json' => json_encode($data['tickets'] ?? []),
        ]);

        echo json_encode(['success' => true, 'id' => $data['id'], 'message' => 'Fechamento gravado no MySQL']);
        exit();
    }

    if ($method === 'DELETE') {
        $id = $_GET['id'] ?? '';
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ID não informado']);
            exit();
        }
        $stmt = $pdo->prepare("DELETE FROM lotosniper_saved_fechamentos WHERE id = :id");
        $stmt->execute([':id' => $id]);
        echo json_encode(['success' => true, 'deleted' => $id]);
        exit();
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Falha de conexão com o banco Hostinger MySQL: ' . $e->getMessage(),
        'database' => $db_name,
        'user' => $db_user,
    ]);
}
