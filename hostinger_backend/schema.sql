-- ============================================================================
-- LOTOSNIPER PRO • BANCO DE DADOS MYSQL PARA HOSTINGER (lotosniper.com.br)
-- Sistema de Autenticação Segura, Whitelist Estrita e Painel Administrativo
-- ============================================================================

CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `senha` VARCHAR(255) NOT NULL,
  `nivel` ENUM('usuario', 'admin') NOT NULL DEFAULT 'usuario',
  `status` ENUM('pendente', 'ativo', 'bloqueado') NOT NULL DEFAULT 'pendente',
  `ip_cadastro` VARCHAR(45) NULL,
  `ultimo_login` DATETIME NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_email_status` (`email`, `status`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criação do Administrador Padrão Inicial
-- Senha inicial: LotoSniper@Admin2026! (gerada com password_hash BCRYPT)
-- IMPORTANTE: Altere a senha no primeiro login administrativo.
INSERT INTO `usuarios` (`nome`, `email`, `senha`, `nivel`, `status`)
VALUES (
  'Administrador LotoSniper',
  'admin@lotosniper.com.br',
  '$2y$12$Yk9c81pYVnQy38kR0aUuMejW6z9lG7dF2uS8nB3xK1mP5vT4qE7iO',
  'admin',
  'ativo'
) ON DUPLICATE KEY UPDATE `status` = 'ativo';
