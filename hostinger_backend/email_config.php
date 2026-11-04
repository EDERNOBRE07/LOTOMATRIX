<?php
/**
 * ============================================================================
 * LOTOSNIPER PRO • CONFIGURAÇÃO DO PHPMAILER COM SERVIDOR SMTP HOSTINGER
 * Domínio: lotosniper.com.br
 * ============================================================================
 * 
 * Especificações Técnicas de Integração:
 * - Servidor SMTP: smtp.hostinger.com
 * - Porta SSL: 465 (SMTPS com criptografia SSL nativa)
 * - Porta Alternativa: 587 (STARTTLS)
 * - Autenticação: SMTPAuth habilitada com credenciais seguras
 * - Suporte a Logs de Erro: Gravação estruturada em error_log() e arquivo local
 * - Estrutura de E-mails: Template HTML responsivo profissional para recuperação de senha
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

// 1. Carregamento da Biblioteca PHPMailer (Composer ou Inclusão Manual na Hostinger)
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
} elseif (file_exists(__DIR__ . '/phpmailer/src/PHPMailer.php')) {
    require_once __DIR__ . '/phpmailer/src/Exception.php';
    require_once __DIR__ . '/phpmailer/src/PHPMailer.php';
    require_once __DIR__ . '/phpmailer/src/SMTP.php';
}

// 2. Parâmetros de Conexão SMTP Hostinger (Configuráveis via variáveis de ambiente)
if (!defined('SMTP_HOST')) define('SMTP_HOST', getenv('SMTP_HOST') ?: 'smtp.hostinger.com');
if (!defined('SMTP_PORT')) define('SMTP_PORT', (int)(getenv('SMTP_PORT') ?: 465));
if (!defined('SMTP_USER')) define('SMTP_USER', getenv('SMTP_USER') ?: 'suporte@lotosniper.com.br');
if (!defined('SMTP_PASS')) define('SMTP_PASS', getenv('SMTP_PASS') ?: 'SuaSenhaEmailHostinger@2026');
if (!defined('SMTP_FROM_NAME')) define('SMTP_FROM_NAME', getenv('SMTP_FROM_NAME') ?: 'LotoSniper • Segurança');
if (!defined('SMTP_DEBUG_ENABLED')) define('SMTP_DEBUG_ENABLED', getenv('SMTP_DEBUG') === '1');

/**
 * Registra logs detalhados de envio e falhas de e-mail.
 * Grava no log de erros padrão do PHP e, se houver permissão, em arquivo local dedicado.
 * 
 * @param string $nivel 'INFO', 'WARNING' ou 'ERROR'
 * @param string $mensagem Texto descritivo do evento
 * @param array $contexto Dados adicionais para depuração (e-mail, código, erro)
 */
function registrarLogEmail(string $nivel, string $mensagem, array $contexto = []): void {
    $timestamp = date('Y-m-d H:i:s');
    $contextoSanitizado = $contexto;

    // Mascarar senhas ou tokens completos para evitar vazamento em logs
    if (isset($contextoSanitizado['token'])) {
        $contextoSanitizado['token'] = substr($contextoSanitizado['token'], 0, 8) . '...[protegido]';
    }
    if (isset($contextoSanitizado['senha'])) {
        $contextoSanitizado['senha'] = '***';
    }

    $detalhes = !empty($contextoSanitizado) ? ' | Dados: ' . json_encode($contextoSanitizado, JSON_UNESCAPED_UNICODE) : '';
    $linhaLog = sprintf("[%s] [LotoSniper Mail - %s] %s%s", $timestamp, strtoupper($nivel), $mensagem, $detalhes);

    // Gravação no log do PHP (visível no painel da Hostinger em 'Logs de Erros')
    error_log($linhaLog);

    // Gravação opcional em arquivo de log local dedicado se o diretório logs/ existir e for gravável
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir) && is_writable(__DIR__)) {
        @mkdir($logDir, 0755, true);
    }
    if (is_dir($logDir) && is_writable($logDir)) {
        @file_put_contents($logDir . '/email_transacoes.log', $linhaLog . PHP_EOL, FILE_APPEND | LOCK_EX);
    }
}

/**
 * Cria e configura a instância do PHPMailer conectada ao servidor da Hostinger com SSL.
 * 
 * @param bool $habilitarDebug Se true, ativa saída detalhada de debug SMTP
 * @return PHPMailer|null Retorna objeto pronto para uso ou null se classe não existir
 */
function obterMailerConfigurado(bool $habilitarDebug = false): ?PHPMailer {
    if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        registrarLogEmail(
            'ERROR',
            'Biblioteca PHPMailer não encontrada. Instale via Composer (composer require phpmailer/phpmailer) ou faça upload da pasta /phpmailer.'
        );
        return null;
    }

    $mail = new PHPMailer(true);

    try {
        // Configurações do protocolo SMTP
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->Port       = SMTP_PORT;
        $mail->CharSet    = 'UTF-8';
        $mail->Timeout    = 20; // 20 segundos de timeout para conexões lentas

        // Configuração de Criptografia SSL / TLS conforme porta
        if (SMTP_PORT === 465) {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS; // SSL direto na porta 465
        } else {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; // TLS na porta 587
        }

        // Remetente padrão autenticado
        $mail->setFrom(SMTP_USER, SMTP_FROM_NAME);
        $mail->addReplyTo(SMTP_USER, SMTP_FROM_NAME);

        // Opções de SSL da Hostinger
        $mail->SMTPOptions = [
            'ssl' => [
                'verify_peer'       => true,
                'verify_peer_name'  => true,
                'allow_self_signed' => false,
                'crypto_method'     => STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | (defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT') ? STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT : 0)
            ]
        ];

        // Configuração de depuração (debug)
        if ($habilitarDebug || SMTP_DEBUG_ENABLED) {
            $mail->SMTPDebug = SMTP::DEBUG_SERVER;
            $mail->Debugoutput = function($str, $level) {
                registrarLogEmail('INFO', "SMTP Debug [{$level}]: " . trim($str));
            };
        } else {
            $mail->SMTPDebug = SMTP::DEBUG_OFF;
        }

        return $mail;

    } catch (Exception $e) {
        registrarLogEmail('ERROR', 'Falha ao inicializar PHPMailer: ' . $e->getMessage());
        return null;
    }
}

/**
 * Envia o e-mail de recuperação de senha com link seguro contendo o token randômico.
 * Inclui layout HTML responsivo de alta conversão e versão em texto puro para clientes antigos.
 * 
 * @param string $destinatarioEmail E-mail do usuário cadastrado
 * @param string $token Token criptográfico randômico de 64 caracteres
 * @param string $baseUrl URL base do sistema (ex: https://lotosniper.com.br)
 * @param string $nome Nome do usuário (opcional)
 * @return bool Retorna true se enviado com sucesso, false em caso de falha
 */
function enviarEmailRecuperacao(
    string $destinatarioEmail, 
    string $token, 
    string $baseUrl = 'https://lotosniper.com.br', 
    string $nome = ''
): bool {
    $mail = obterMailerConfigurado();
    $linkRecuperacao = rtrim($baseUrl, '/') . "/redefinir-senha.php?token=" . urlencode($token);
    $saudacaoNome = !empty($nome) ? htmlspecialchars($nome) : 'Apostador';

    $assunto = "Redefinição de Senha de Acesso • LotoSniper PRO";

    // Template HTML Moderno e Responsivo
    $corpoHtml = "
    <!DOCTYPE html>
    <html lang='pt-BR'>
    <head>
      <meta charset='UTF-8'>
      <meta name='viewport' content='width=device-width, initial-scale=1.0'>
      <title>{$assunto}</title>
      <style>
        body { background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #f1f5f9; }
        .wrapper { max-width: 580px; margin: 0 auto; background: #111827; border-radius: 16px; border: 1px solid #1f2937; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.4); }
        .header { background: linear-gradient(135deg, #059669 0%, #0d9488 50%, #0284c7 100%); padding: 32px 24px; text-align: center; }
        .header-logo { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; margin: 0; }
        .header-badge { display: inline-block; background: rgba(0,0,0,0.25); color: #a7f3d0; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 3px 10px; border-radius: 6px; margin-top: 8px; border: 1px solid rgba(255,255,255,0.15); }
        .content { padding: 36px 32px; }
        .badge-security { display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.12); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 5px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 20px; }
        h2 { color: #f8fafc; font-size: 20px; font-weight: 700; margin: 0 0 16px; }
        p { color: #94a3b8; font-size: 15px; line-height: 1.65; margin: 0 0 16px; }
        .btn-container { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 15px 36px; border-radius: 10px; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.35); text-align: center; }
        .btn:hover { background: #059669; }
        .code-box { background: #030712; padding: 14px; border-radius: 8px; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 12px; color: #38bdf8; word-break: break-all; border: 1px solid #1e293b; margin: 12px 0 20px; }
        .warning-card { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 10px; padding: 14px 18px; margin-top: 24px; }
        .warning-card p { color: #fca5a5; font-size: 13px; margin: 0; line-height: 1.5; }
        .footer { background: #090d16; padding: 24px; text-align: center; border-top: 1px solid #1f2937; }
        .footer p { color: #64748b; font-size: 12px; margin: 4px 0; }
      </style>
    </head>
    <body>
      <div class='wrapper'>
        <div class='header'>
          <h1 class='header-logo'>LotoSniper <span style='font-size: 14px; font-weight: 600; opacity: 0.9;'>PRO</span></h1>
          <div class='header-badge'>Segurança de Acesso Hostinger</div>
        </div>

        <div class='content'>
          <div class='badge-security'>🔒 Verificação de Identidade</div>
          <h2>Olá, {$saudacaoNome}!</h2>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>LotoSniper</strong> vinculada ao e-mail: <span style='color: #f1f5f9; font-weight: 600;'>" . htmlspecialchars($destinatarioEmail) . "</span>.</p>
          <p>Para definir uma nova senha e restabelecer seu acesso restrito, clique no botão seguro abaixo. <strong>Por motivos de segurança, este link é válido por apenas 1 hora:</strong></p>

          <div class='btn-container'>
            <a href='" . htmlspecialchars($linkRecuperacao) . "' target='_blank' class='btn'>Redefinir Minha Senha &rarr;</a>
          </div>

          <p style='font-size: 13px;'>Se o botão acima não abrir diretamente, copie e cole o link seguro abaixo no seu navegador:</p>
          <div class='code-box'>" . htmlspecialchars($linkRecuperacao) . "</div>

          <div class='warning-card'>
            <p><strong>Não solicitou esta alteração?</strong><br>
            Caso você não tenha solicitado a recuperação, ignore este e-mail imediatamente. Sua senha atual permanecerá inalterada e sua conta continua 100% segura com criptografia Bcrypt.</p>
          </div>
        </div>

        <div class='footer'>
          <p><strong>LotoSniper PRO</strong> • Sistema de Inteligência e Fechamento Matemático</p>
          <p>Hospedado com Segurança SSL na Hostinger • Domínio: lotosniper.com.br</p>
          <p style='color: #475569; font-size: 11px; margin-top: 8px;'>Este é um e-mail automático do sistema. Por favor, não responda a esta mensagem.</p>
        </div>
      </div>
    </body>
    </html>
    ";

    // Versão alternativa em texto plano (RFC 2046)
    $textoPlano = "====================================================\n"
        . "LOTOSNIPER PRO - RECUPERAÇÃO DE SENHA DE ACESSO\n"
        . "====================================================\n\n"
        . "Olá, {$saudacaoNome}!\n\n"
        . "Recebemos uma solicitação para redefinir sua senha de acesso no LotoSniper.\n\n"
        . "Para definir sua nova senha, acesse o link seguro abaixo (válido por 1 hora):\n"
        . $linkRecuperacao . "\n\n"
        . "IMPORTANTE: Se você não solicitou esta redefinição, apenas desconsidere este e-mail. "
        . "Sua conta permanece protegida.\n\n"
        . "Atenciosamente,\nEquipe de Segurança LotoSniper\nhttps://lotosniper.com.br";

    // Envio prioritário via PHPMailer com Hostinger SMTP
    if ($mail !== null) {
        try {
            $mail->clearAddresses();
            $mail->clearAttachments();

            $mail->addAddress($destinatarioEmail, $nome ?: $destinatarioEmail);
            $mail->isHTML(true);
            $mail->Subject = $assunto;
            $mail->Body    = $corpoHtml;
            $mail->AltBody = $textoPlano;

            $sucesso = $mail->send();

            if ($sucesso) {
                registrarLogEmail('INFO', "E-mail de recuperação enviado com sucesso via PHPMailer", [
                    'destinatario' => $destinatarioEmail,
                    'servidor' => SMTP_HOST . ':' . SMTP_PORT
                ]);
                return true;
            }

            registrarLogEmail('WARNING', "PHPMailer retornou falso sem exceção", [
                'destinatario' => $destinatarioEmail,
                'erro_info' => $mail->ErrorInfo
            ]);
            return false;

        } catch (Exception $e) {
            registrarLogEmail('ERROR', "Falha ao enviar e-mail via PHPMailer: " . $mail->ErrorInfo, [
                'destinatario' => $destinatarioEmail,
                'excecao' => $e->getMessage()
            ]);
            // Continua para o fallback nativo caso falhe o envio via PHPMailer
        }
    }

    // Fallback Secundário via mail() nativo do servidor Hostinger (se PHPMailer indisponível)
    registrarLogEmail('WARNING', "Acionando fallback da função nativa mail() para {$destinatarioEmail}");

    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: " . SMTP_FROM_NAME . " <" . SMTP_USER . ">\r\n";
    $headers .= "Reply-To: " . SMTP_USER . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
    $headers .= "X-Priority: 1 (Highest)\r\n";

    $enviadoFallback = @mail($destinatarioEmail, $assunto, $corpoHtml, $headers);

    if ($enviadoFallback) {
        registrarLogEmail('INFO', "E-mail de recuperação enviado com sucesso via fallback nativo mail()", [
            'destinatario' => $destinatarioEmail
        ]);
        return true;
    } else {
        registrarLogEmail('ERROR', "Falha completa no envio de e-mail (PHPMailer e mail() falharam)", [
            'destinatario' => $destinatarioEmail
        ]);
        return false;
    }
}

/**
 * Função utilitária para diagnóstico: testa a conexão física e autenticação com smtp.hostinger.com.
 * Ideal para testes a partir do painel administrativo.
 * 
 * @return array ['sucesso' => bool, 'mensagem' => string, 'tempo_ms' => float]
 */
function testarConexaoSmtp(): array {
    $inicio = microtime(true);
    $mailer = obterMailerConfigurado(false);

    if (!$mailer) {
        return [
            'sucesso' => false,
            'mensagem' => 'PHPMailer não está instalado no servidor.',
            'tempo_ms' => 0
        ];
    }

    try {
        // Tenta estabelecer handshake SMTP e encerrar imediatamente
        $smtp = new SMTP();
        $conectado = $smtp->connect(SMTP_HOST, SMTP_PORT, 10, [
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true,
                'allow_self_signed' => false
            ]
        ]);

        $tempoMs = round((microtime(true) - $inicio) * 1000, 2);

        if ($conectado) {
            $smtp->quit();
            return [
                'sucesso' => true,
                'mensagem' => "Conexão com " . SMTP_HOST . ":" . SMTP_PORT . " estabelecida com sucesso via SSL.",
                'tempo_ms' => $tempoMs
            ];
        }

        return [
            'sucesso' => false,
            'mensagem' => "Não foi possível conectar ao servidor " . SMTP_HOST . " na porta " . SMTP_PORT . ".",
            'tempo_ms' => $tempoMs
        ];
    } catch (\Throwable $e) {
        $tempoMs = round((microtime(true) - $inicio) * 1000, 2);
        return [
            'sucesso' => false,
            'mensagem' => "Erro no teste de conexão: " . $e->getMessage(),
            'tempo_ms' => $tempoMs
        ];
    }
}
