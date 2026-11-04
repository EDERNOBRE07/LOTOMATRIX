<?php
/**
 * LotoSniper - Configuração do PHPMailer com SMTP Hostinger
 * Servidor SMTP: smtp.hostinger.com
 * Portas: 465 (SSL) ou 587 (TLS)
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Verificar se o Composer autoloader está disponível, caso contrário tentar carregamento manual
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
} elseif (file_exists(__DIR__ . '/phpmailer/src/PHPMailer.php')) {
    require_once __DIR__ . '/phpmailer/src/Exception.php';
    require_once __DIR__ . '/phpmailer/src/PHPMailer.php';
    require_once __DIR__ . '/phpmailer/src/SMTP.php';
}

// Configurações SMTP da Hostinger
define('SMTP_HOST', getenv('SMTP_HOST') ?: 'smtp.hostinger.com');
define('SMTP_PORT', (int)(getenv('SMTP_PORT') ?: 465));
define('SMTP_USER', getenv('SMTP_USER') ?: 'suporte@lotosniper.com.br');
define('SMTP_PASS', getenv('SMTP_PASS') ?: 'SuaSenhaEmailHostinger@2026');
define('SMTP_FROM_NAME', 'LotoSniper - Segurança');
define('SMTP_SECURE_MODE', SMTP_PORT === 465 ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS);

/**
 * Cria e configura uma instância de PHPMailer pronta para envio via Hostinger
 * @return PHPMailer|null Retorna objeto configurado ou null se biblioteca não instalada
 */
function obterMailerConfigurado() {
    if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        error_log("[LotoSniper Mail Error] PHPMailer não está instalado. Execute 'composer require phpmailer/phpmailer' na raiz do servidor.");
        return null;
    }

    $mail = new PHPMailer(true);

    try {
        // Configurações do Servidor
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->SMTPSecure = SMTP_SECURE_MODE;
        $mail->Port       = SMTP_PORT;
        $mail->CharSet    = 'UTF-8';
        $mail->Timeout    = 15; // 15 segundos timeout
        
        // Remetente padrão
        $mail->setFrom(SMTP_USER, SMTP_FROM_NAME);
        
        // Configurações extras de segurança
        $mail->SMTPOptions = [
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true,
                'allow_self_signed' => false,
            ]
        ];

        return $mail;
    } catch (Exception $e) {
        error_log("[LotoSniper Mail Config Error] " . $e->getMessage());
        return null;
    }
}

/**
 * Envia e-mail de recuperação de senha com layout profissional e token temporário
 * @param string $destinatarioEmail
 * @param string $token
 * @param string $baseUrl
 * @return bool
 */
function enviarEmailRecuperacao($destinatarioEmail, $token, $baseUrl = 'https://lotosniper.com.br') {
    $mail = obterMailerConfigurado();
    $linkRecuperacao = rtrim($baseUrl, '/') . "/redefinir-senha.php?token=" . urlencode($token);

    $assunto = "Redefinição de Senha de Acesso - LotoSniper";

    $corpoHtml = "
    <!DOCTYPE html>
    <html lang='pt-BR'>
    <head>
      <meta charset='UTF-8'>
      <style>
        body { background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #f1f5f9; }
        .container { max-width: 560px; margin: 0 auto; background: #111827; border-radius: 12px; border: 1px solid #1f2937; overflow: hidden; }
        .header { background: linear-gradient(135deg, #059669, #0d9488); padding: 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 1px; }
        .body-content { padding: 32px 28px; }
        .badge { display: inline-block; background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.25); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
        p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
        .btn { display: inline-block; background: #10b981; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px 28px; border-radius: 8px; margin: 20px 0; text-align: center; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
        .footer { background: #090d16; padding: 20px; text-align: center; border-top: 1px solid #1f2937; }
        .footer p { color: #64748b; font-size: 12px; margin: 0; }
        .code-box { background: #030712; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; color: #38bdf8; word-break: break-all; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class='container'>
        <div class='header'>
          <h1>LotoSniper</h1>
        </div>
        <div class='body-content'>
          <span class='badge'>Solicitação de Segurança</span>
          <p style='color: #ffffff; font-size: 17px; font-weight: 600;'>Olá,</p>
          <p>Recebemos uma solicitação para redefinir a senha de acesso à sua conta no LotoSniper vinculada ao e-mail: <strong style='color:#f1f5f9;'>" . htmlspecialchars($destinatarioEmail) . "</strong>.</p>
          <p>Para criar uma nova senha, clique no botão seguro abaixo. <strong>Este link é válido por apenas 1 hora:</strong></p>
          
          <div style='text-align: center;'>
            <a href='" . htmlspecialchars($linkRecuperacao) . "' class='btn'>Redefinir Minha Senha</a>
          </div>

          <p style='font-size: 13px;'>Se o botão acima não funcionar, copie e cole o link a seguir no seu navegador:</p>
          <div class='code-box'>" . htmlspecialchars($linkRecuperacao) . "</div>

          <p style='margin-top: 24px; font-size: 13px; color: #ef4444;'>Caso você não tenha solicitado esta alteração, ignore este e-mail imediatamente. Sua conta permanece segura e nenhuma ação foi realizada.</p>
        </div>
        <div class='footer'>
          <p>&copy; " . date('Y') . " LotoSniper. Todos os direitos reservados.</p>
          <p>Sistema de Inteligência e Fechamento Matemático - lotosniper.com.br</p>
        </div>
      </div>
    </body>
    </html>
    ";

    $textoPlano = "LotoSniper - Redefinição de Senha\n\n"
        . "Recebemos uma solicitação para redefinir sua senha.\n"
        . "Acesse o link a seguir (válido por 1 hora):\n"
        . $linkRecuperacao . "\n\n"
        . "Se não foi você, desconsidere este e-mail.";

    if ($mail !== null) {
        try {
            $mail->addAddress($destinatarioEmail);
            $mail->isHTML(true);
            $mail->Subject = $assunto;
            $mail->Body    = $corpoHtml;
            $mail->AltBody = $textoPlano;

            $mail->send();
            return true;
        } catch (Exception $e) {
            error_log("[LotoSniper Mail Send Error] Destinatário: {$destinatarioEmail} | Erro: " . $mail->ErrorInfo);
            return false;
        }
    } else {
        // Fallback para mail() nativo do PHP se PHPMailer não estiver no servidor
        $headers  = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: " . SMTP_FROM_NAME . " <" . SMTP_USER . ">\r\n";
        $headers .= "Reply-To: " . SMTP_USER . "\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion();

        $enviado = @mail($destinatarioEmail, $assunto, $corpoHtml, $headers);
        if (!$enviado) {
            error_log("[LotoSniper Mail Fallback Error] Falha na função nativa mail() para {$destinatarioEmail}.");
        }
        return $enviado;
    }
}
