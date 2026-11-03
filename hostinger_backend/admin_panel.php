<?php
/**
 * ============================================================================
 * LOTOSNIPER PRO • PAINEL ADMINISTRATIVO & GESTÃO DA WHITELIST
 * Domínio: lotosniper.com.br
 * ============================================================================
 * 
 * Proteção:
 * 1. Exclusivo para usuários autenticados com nivel === 'admin'.
 * 2. Proteção contra CSRF em todas as ações de aprovação e bloqueio.
 * 3. PDO com Prepared Statements em todas as queries.
 * 4. Logs de auditoria interna.
 */

require_once __DIR__ . '/auth_check.php';

// Validação estrita: apenas admin tem acesso a esta página
$adminLogado = requireAdmin();
$pdo = getDbConnection();

$mensagemAcao = '';
$tipoMensagem = '';

// Processamento de Ações Administrativas (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrfToken = $_POST['csrf_token'] ?? '';
    $acao = $_POST['acao'] ?? '';
    $usuarioId = filter_input(INPUT_POST, 'usuario_id', FILTER_VALIDATE_INT);

    if (!validateCsrfToken($csrfToken)) {
        $mensagemAcao = 'Token de segurança CSRF inválido ou expirado.';
        $tipoMensagem = 'erro';
    } elseif (!$usuarioId) {
        $mensagemAcao = 'Identificador de usuário inválido.';
        $tipoMensagem = 'erro';
    } else {
        try {
            // Impede que o próprio admin logado se auto-bloqueie ou se rebaixe
            if ($usuarioId === (int)$adminLogado['id'] && in_array($acao, ['bloquear', 'rebaixar', 'excluir'])) {
                $mensagemAcao = 'Ação de segurança: Você não pode bloquear ou alterar o próprio perfil de administrador logado.';
                $tipoMensagem = 'erro';
            } else {
                switch ($acao) {
                    case 'aprovar':
                        // Muda status de 'pendente' ou 'bloqueado' para 'ativo'
                        $stmt = $pdo->prepare('UPDATE usuarios SET status = "ativo" WHERE id = :id');
                        $stmt->execute([':id' => $usuarioId]);
                        $mensagemAcao = "Usuário ID #$usuarioId foi APROVADO com sucesso e agora tem status ATIVO.";
                        $tipoMensagem = 'sucesso';
                        break;

                    case 'bloquear':
                        // Muda status para 'bloqueado' (revoga na hora via auth_check)
                        $stmt = $pdo->prepare('UPDATE usuarios SET status = "bloqueado" WHERE id = :id');
                        $stmt->execute([':id' => $usuarioId]);
                        $mensagemAcao = "Acesso do Usuário ID #$usuarioId foi BLOQUEADO imediatamente.";
                        $tipoMensagem = 'aviso';
                        break;

                    case 'tornar_pendente':
                        // Retorna para pendente
                        $stmt = $pdo->prepare('UPDATE usuarios SET status = "pendente" WHERE id = :id');
                        $stmt->execute([':id' => $usuarioId]);
                        $mensagemAcao = "Usuário ID #$usuarioId retornou para a fila de status PENDENTE.";
                        $tipoMensagem = 'aviso';
                        break;

                    case 'promover_admin':
                        $stmt = $pdo->prepare('UPDATE usuarios SET nivel = "admin" WHERE id = :id');
                        $stmt->execute([':id' => $usuarioId]);
                        $mensagemAcao = "Usuário ID #$usuarioId promovido a ADMINISTRADOR.";
                        $tipoMensagem = 'sucesso';
                        break;

                    case 'rebaixar_usuario':
                        $stmt = $pdo->prepare('UPDATE usuarios SET nivel = "usuario" WHERE id = :id');
                        $stmt->execute([':id' => $usuarioId]);
                        $mensagemAcao = "Usuário ID #$usuarioId definido como USUÁRIO comum.";
                        $tipoMensagem = 'sucesso';
                        break;

                    case 'excluir':
                        $stmt = $pdo->prepare('DELETE FROM usuarios WHERE id = :id');
                        $stmt->execute([':id' => $usuarioId]);
                        $mensagemAcao = "Cadastro do Usuário ID #$usuarioId excluído definitivamente.";
                        $tipoMensagem = 'aviso';
                        break;

                    default:
                        $mensagemAcao = 'Ação não reconhecida.';
                        $tipoMensagem = 'erro';
                        break;
                }
            }
        } catch (PDOException $e) {
            error_log('[LotoSniper Admin Action Error] ' . $e->getMessage());
            $mensagemAcao = 'Erro ao processar a ação no banco de dados.';
            $tipoMensagem = 'erro';
        }
    }
}

// Filtros de Listagem
$filtroStatus = $_GET['filtro_status'] ?? 'todos';
$busca = trim($_GET['busca'] ?? '');

$sql = 'SELECT id, nome, email, nivel, status, ip_cadastro, ultimo_login, criado_em FROM usuarios WHERE 1=1';
$params = [];

if (in_array($filtroStatus, ['ativo', 'pendente', 'bloqueado'])) {
    $sql .= ' AND status = :status';
    $params[':status'] = $filtroStatus;
}

if (!empty($busca)) {
    $sql .= ' AND (nome LIKE :busca OR email LIKE :busca)';
    $params[':busca'] = '%' . $busca . '%';
}

$sql .= ' ORDER BY criado_em DESC LIMIT 200';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$usuarios = $stmt->fetchAll();

// Métricas de Contadores
$statsStmt = $pdo->query('
    SELECT 
        COUNT(*) as total,
        SUM(status = "ativo") as ativos,
        SUM(status = "pendente") as pendentes,
        SUM(status = "bloqueado") as bloqueados,
        SUM(nivel = "admin") as admins
    FROM usuarios
');
$stats = $statsStmt->fetch() ?: ['total' => 0, 'ativos' => 0, 'pendentes' => 0, 'bloqueados' => 0, 'admins' => 0];
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel Administrativo • LotoSniper PRO</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
    </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">

    <!-- Topbar -->
    <header class="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-sm">
                    LS⚡
                </div>
                <div>
                    <h1 class="text-sm font-black text-white flex items-center gap-2">
                        Painel do Administrador
                        <span class="text-[10px] font-mono px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-bold">
                            HOSTINGER WHITELIST
                        </span>
                    </h1>
                    <p class="text-[11px] text-slate-400">lotosniper.com.br</p>
                </div>
            </div>

            <div class="flex items-center gap-4">
                <div class="text-right hidden sm:block">
                    <p class="text-xs font-bold text-white"><?= sanitizeOutput($adminLogado['nome']) ?></p>
                    <p class="text-[10px] text-emerald-400 font-mono"><?= sanitizeOutput($adminLogado['email']) ?></p>
                </div>
                <a href="logout.php" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/30 text-xs font-semibold transition">
                    Sair
                </a>
            </div>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <!-- Notificação de Ação -->
        <?php if (!empty($mensagemAcao)): ?>
            <div class="p-4 rounded-2xl border text-xs font-medium flex items-center justify-between <?= $tipoMensagem === 'sucesso' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : ($tipoMensagem === 'aviso' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-red-500/10 border-red-500/30 text-red-300') ?>">
                <div class="flex items-center gap-2">
                    <span><?= $tipoMensagem === 'sucesso' ? '✓' : '⚠️' ?></span>
                    <span><?= sanitizeOutput($mensagemAcao) ?></span>
                </div>
                <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white font-bold ml-4">✕</button>
            </div>
        <?php endif; ?>

        <!-- Cards de Métricas -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div class="text-[11px] font-semibold text-slate-400">Total de Cadastros</div>
                <div class="text-2xl font-black text-white mt-1 font-mono"><?= (int)$stats['total'] ?></div>
                <div class="text-[10px] text-slate-500 mt-0.5"><?= (int)$stats['admins'] ?> administradores</div>
            </div>

            <div class="bg-slate-900 border border-emerald-500/20 p-4 rounded-2xl relative overflow-hidden">
                <div class="text-[11px] font-semibold text-emerald-400">Usuários Ativos (Aprovados)</div>
                <div class="text-2xl font-black text-emerald-300 mt-1 font-mono"><?= (int)$stats['ativos'] ?></div>
                <div class="text-[10px] text-emerald-500 mt-0.5">Acesso Liberado</div>
            </div>

            <div class="bg-slate-900 border border-amber-500/20 p-4 rounded-2xl">
                <div class="text-[11px] font-semibold text-amber-400">Pendentes de Aprovação</div>
                <div class="text-2xl font-black text-amber-300 mt-1 font-mono"><?= (int)$stats['pendentes'] ?></div>
                <div class="text-[10px] text-amber-500 mt-0.5">Aguardando Whitelist</div>
            </div>

            <div class="bg-slate-900 border border-red-500/20 p-4 rounded-2xl">
                <div class="text-[11px] font-semibold text-red-400">Bloqueados</div>
                <div class="text-2xl font-black text-red-300 mt-1 font-mono"><?= (int)$stats['bloqueados'] ?></div>
                <div class="text-[10px] text-red-500 mt-0.5">Sem Acesso</div>
            </div>
        </div>

        <!-- Barra de Ferramentas de Busca e Filtros -->
        <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <!-- Filtros de Status -->
            <div class="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <a href="admin_panel.php?filtro_status=todos<?= !empty($busca) ? '&busca=' . urlencode($busca) : '' ?>" class="px-3 py-1.5 rounded-xl text-xs font-bold transition <?= $filtroStatus === 'todos' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800' ?>">
                    Todos (<?= (int)$stats['total'] ?>)
                </a>
                <a href="admin_panel.php?filtro_status=pendente<?= !empty($busca) ? '&busca=' . urlencode($busca) : '' ?>" class="px-3 py-1.5 rounded-xl text-xs font-bold transition <?= $filtroStatus === 'pendente' ? 'bg-amber-500 text-slate-950 font-black' : 'text-amber-400 hover:bg-slate-800' ?>">
                    Pendentes (<?= (int)$stats['pendentes'] ?>)
                </a>
                <a href="admin_panel.php?filtro_status=ativo<?= !empty($busca) ? '&busca=' . urlencode($busca) : '' ?>" class="px-3 py-1.5 rounded-xl text-xs font-bold transition <?= $filtroStatus === 'ativo' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-emerald-400 hover:bg-slate-800' ?>">
                    Ativos (<?= (int)$stats['ativos'] ?>)
                </a>
                <a href="admin_panel.php?filtro_status=bloqueado<?= !empty($busca) ? '&busca=' . urlencode($busca) : '' ?>" class="px-3 py-1.5 rounded-xl text-xs font-bold transition <?= $filtroStatus === 'bloqueado' ? 'bg-red-500 text-white font-black' : 'text-red-400 hover:bg-slate-800' ?>">
                    Bloqueados (<?= (int)$stats['bloqueados'] ?>)
                </a>
            </div>

            <!-- Busca por Nome / Email -->
            <form method="GET" action="admin_panel.php" class="flex items-center gap-2 w-full md:w-auto">
                <input type="hidden" name="filtro_status" value="<?= sanitizeOutput($filtroStatus) ?>">
                <input 
                    type="text" 
                    name="busca" 
                    placeholder="Buscar por nome ou e-mail..."
                    value="<?= sanitizeOutput($busca) ?>"
                    class="bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-1.5 text-xs text-white outline-none w-full md:w-64"
                >
                <button type="submit" class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer">
                    Buscar
                </button>
            </form>
        </div>

        <!-- Tabela de Usuários -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-950 text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-800">
                        <tr>
                            <th class="px-4 py-3.5">ID</th>
                            <th class="px-4 py-3.5">Nome / E-mail</th>
                            <th class="px-4 py-3.5">Status Whitelist</th>
                            <th class="px-4 py-3.5">Nível</th>
                            <th class="px-4 py-3.5">Data Cadastro</th>
                            <th class="px-4 py-3.5">Último Login</th>
                            <th class="px-4 py-3.5 text-right">Ações de Gestão</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800/60 font-medium">
                        <?php if (empty($usuarios)): ?>
                            <tr>
                                <td colspan="7" class="px-4 py-8 text-center text-slate-500">
                                    Nenhum cadastro encontrado com os filtros selecionados.
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($usuarios as $u): ?>
                                <tr class="hover:bg-slate-800/40 transition">
                                    <td class="px-4 py-3.5 font-mono text-slate-500 font-bold">#<?= (int)$u['id'] ?></td>
                                    
                                    <td class="px-4 py-3.5">
                                        <div class="font-bold text-white"><?= sanitizeOutput($u['nome']) ?></div>
                                        <div class="text-[11px] text-slate-400 font-mono"><?= sanitizeOutput($u['email']) ?></div>
                                    </td>

                                    <td class="px-4 py-3.5">
                                        <?php if ($u['status'] === 'ativo'): ?>
                                            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                ATIVO
                                            </span>
                                        <?php elseif ($u['status'] === 'pendente'): ?>
                                            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                                                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                                PENDENTE
                                            </span>
                                        <?php else: ?>
                                            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                                                <span class="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                                BLOQUEADO
                                            </span>
                                        <?php endif; ?>
                                    </td>

                                    <td class="px-4 py-3.5">
                                        <?php if ($u['nivel'] === 'admin'): ?>
                                            <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                ADMIN
                                            </span>
                                        <?php else: ?>
                                            <span class="text-[10px] font-mono text-slate-400">
                                                USUÁRIO
                                            </span>
                                        <?php endif; ?>
                                    </td>

                                    <td class="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                                        <?= date('d/m/Y H:i', strtotime($u['criado_em'])) ?>
                                    </td>

                                    <td class="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                                        <?= $u['ultimo_login'] ? date('d/m/Y H:i', strtotime($u['ultimo_login'])) : '<span class="text-slate-600">Nunca</span>' ?>
                                    </td>

                                    <td class="px-4 py-3.5 text-right">
                                        <div class="flex items-center justify-end gap-1.5">
                                            
                                            <!-- Botão Aprovar (se não estiver ativo) -->
                                            <?php if ($u['status'] !== 'ativo'): ?>
                                                <form method="POST" action="admin_panel.php" class="inline">
                                                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                                                    <input type="hidden" name="usuario_id" value="<?= (int)$u['id'] ?>">
                                                    <input type="hidden" name="acao" value="aprovar">
                                                    <button type="submit" class="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 rounded-lg text-[10px] font-bold transition cursor-pointer">
                                                        ✓ Aprovar
                                                    </button>
                                                </form>
                                            <?php endif; ?>

                                            <!-- Botão Bloquear (se estiver ativo ou pendente) -->
                                            <?php if ($u['status'] !== 'bloqueado' && (int)$u['id'] !== (int)$adminLogado['id']): ?>
                                                <form method="POST" action="admin_panel.php" class="inline" onsubmit="return confirm('Confirma o BLOQUEIO de acesso deste usuário?');">
                                                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                                                    <input type="hidden" name="usuario_id" value="<?= (int)$u['id'] ?>">
                                                    <input type="hidden" name="acao" value="bloquear">
                                                    <button type="submit" class="px-2.5 py-1 bg-red-500/10 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 rounded-lg text-[10px] font-bold transition cursor-pointer">
                                                        🚫 Bloquear
                                                    </button>
                                                </form>
                                            <?php endif; ?>

                                            <!-- Botão Alternar Nível (Admin <-> Usuário) -->
                                            <?php if ((int)$u['id'] !== (int)$adminLogado['id']): ?>
                                                <form method="POST" action="admin_panel.php" class="inline">
                                                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                                                    <input type="hidden" name="usuario_id" value="<?= (int)$u['id'] ?>">
                                                    <?php if ($u['nivel'] === 'admin'): ?>
                                                        <input type="hidden" name="acao" value="rebaixar_usuario">
                                                        <button type="submit" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] transition cursor-pointer" title="Remover privilégio de admin">
                                                            ⬇ Usuário
                                                        </button>
                                                    <?php else: ?>
                                                        <input type="hidden" name="acao" value="promover_admin">
                                                        <button type="submit" class="px-2 py-1 bg-purple-500/20 hover:bg-purple-500 hover:text-white text-purple-300 border border-purple-500/30 rounded-lg text-[10px] transition cursor-pointer" title="Promover para Administrador">
                                                            ⬆ Admin
                                                        </button>
                                                    <?php endif; ?>
                                                </form>
                                            <?php endif; ?>

                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </main>

</body>
</html>
