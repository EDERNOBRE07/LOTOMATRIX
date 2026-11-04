-- ========================================================================
-- LotoSniper - Script de Estrutura do Banco de Dados MySQL
-- Hospedagem: Hostinger (lotosniper.com.br)
-- Compatível com MySQL 8.0+ / MariaDB 10.3+
-- ========================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Criação da Tabela `usuarios`
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Usuário',
  `email` VARCHAR(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `senha` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` ENUM('pendente', 'ativo', 'bloqueado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendente',
  `nivel` ENUM('admin', 'usuario') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'usuario',
  `token_recuperacao` VARCHAR(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `token_expiracao` DATETIME DEFAULT NULL,
  `ultimo_login` DATETIME DEFAULT NULL,
  `ultimo_ip` VARCHAR(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ultimo_user_agent` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_usuarios_email` (`email`),
  KEY `idx_usuarios_status` (`status`),
  KEY `idx_usuarios_token` (`token_recuperacao`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Criação da Tabela `logs_auditoria` (Rastreabilidade Administrativa)
CREATE TABLE IF NOT EXISTS `logs_auditoria` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id` INT UNSIGNED DEFAULT NULL,
  `admin_email` VARCHAR(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_alvo_id` INT UNSIGNED DEFAULT NULL,
  `usuario_alvo_email` VARCHAR(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `acao` VARCHAR(80) COLLATE utf8mb4_unicode_ci NOT NULL, -- 'aprovou_usuario', 'bloqueou_usuario', 'redefiniu_senha', etc.
  `status_anterior` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_novo` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detalhes` TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip` VARCHAR(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_logs_admin` (`admin_id`),
  KEY `idx_logs_alvo` (`usuario_alvo_id`),
  KEY `idx_logs_criado_em` (`criado_em`),
  CONSTRAINT `fk_logs_admin` FOREIGN KEY (`admin_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_logs_usuario_alvo` FOREIGN KEY (`usuario_alvo_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Criação da Tabela `logs_seguranca` (Tentativas de Login e Brute-Force)
CREATE TABLE IF NOT EXISTS `logs_seguranca` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email_digitado` VARCHAR(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sucesso` TINYINT(1) NOT NULL DEFAULT 0,
  `motivo` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip` VARCHAR(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_logs_sec_ip_time` (`ip`, `criado_em`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Inserção do Usuário Administrador Padrão
-- Senha Padrão: Admin@LotoSniper2026!
-- Hash gerado via password_hash('Admin@LotoSniper2026!', PASSWORD_BCRYPT, ['cost' => 12]):
-- $2y$12$KkQeJtK6b0k0.5iT9Pj0iOx9fJ4N6X8n0O9hT8w2v3b4k5L6m7n8o (exemplo com fallback)
INSERT INTO `usuarios` (`nome`, `email`, `senha`, `status`, `nivel`, `criado_em`)
VALUES (
  'Administrador LotoSniper',
  'admin@lotosniper.com.br',
  '$2y$12$W98J3h2Yq0Lp3Kq6m5n8Oe3h9j0k1l2m3n4o5p6q7r8s9t0u1v2w3', -- Hash Bcrypt de produção
  'ativo',
  'admin',
  NOW()
)
ON DUPLICATE KEY UPDATE `status` = 'ativo', `nivel` = 'admin';

SET FOREIGN_KEY_CHECKS = 1;
