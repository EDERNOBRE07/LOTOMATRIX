# 🛡️ Guia de Instalação e Deploy • LotoSniper no Hostinger (lotosniper.com.br)

Sistema profissional de autenticação restrita, controle de sessão seguro e Painel Administrativo com **Whitelist Estrita** desenvolvido especificamente para servidores **Hostinger (hPanel / Cloud / VPS)**.

---

## 📋 Arquitetura e Diretrizes de Segurança Implementadas

1. **MySQL PDO com Prepared Statements Nativos**:
   - `PDO::ATTR_EMULATE_PREPARES => false`: Desativa a emulação em PHP e força o MySQL a compilar a consulta de forma isolada, mitigando 100% de ataques de SQL Injection.
   - Charset `utf8mb4` com colação `utf8mb4_unicode_ci`.

2. **Criptografia de Senhas com BCRYPT**:
   - Criptografia gerada via `password_hash($senha, PASSWORD_BCRYPT, ['cost' => 12])`.
   - Verificação com `password_verify($senha, $hash)`.
   - Proteção contra **Timing Attacks**: Mesmo se o e-mail não existir, uma checagem fictícia de hash é processada para manter o tempo de resposta invariável.

3. **Whitelist Estrita**:
   - O login **só é validado** se a senha estiver correta **E** a coluna `status` no MySQL for exatamente `'ativo'`.
   - Cadastros novos são inseridos como `'pendente'`. Usuários suspensos são marcados como `'bloqueado'`.
   - Mensagem genérica para falhas: `"Credenciais inválidas ou acesso não autorizado"`, evitando ataques de enumeração de contas.

4. **Controle de Sessão e Timeout por Inatividade**:
   - Cookies configurados com `HttpOnly`, `SameSite=Strict` e `Secure` (HTTPS).
   - Invalidação automática após **30 minutos de inatividade** (1800 segundos).
   - `auth_check.php` verifica o status do usuário no banco em cada requisição. Se o administrador bloquear o usuário no painel, ele é desconectado no próximo clique.

5. **Painel do Administrador (`admin_panel.php`)**:
   - Restrito a usuários com `nivel = 'admin'`.
   - Gestão da Whitelist: Aprovar cadastros ('pendente' ➔ 'ativo'), Bloquear acessos instantaneamente e gerenciar níveis de permissão.
   - Formulários protegidos com tokens anti-CSRF (`hash_equals`).

---

## 🚀 Passo a Passo de Deploy no Hostinger (hPanel)

### Passo 1: Criar o Banco de Dados MySQL no hPanel
1. Acesse o **hPanel da Hostinger** (`hpanel.hostinger.com`).
2. Vá em **Bancos de Dados ➔ Bancos de Dados MySQL**.
3. Crie um novo banco (Ex: `u376010332_LotoSniper`), com usuário e uma senha forte.
4. Anote o Nome do Banco, Usuário e Senha.

### Passo 2: Importar o Arquivo `schema.sql` no phpMyAdmin
1. No hPanel, clique no botão **Entrar no phpMyAdmin** ao lado do banco criado.
2. Na aba superior, selecione **Importar**.
3. Selecione o arquivo `schema.sql` localizado nesta pasta e clique em **Executar**.
4. A tabela `usuarios` será criada com os índices apropriados e um usuário administrador padrão:
   - **E-mail do Administrador:** `admin@lotosniper.com.br`
   - **Senha Inicial:** `LotoSniper@Admin2026!`
   *(Recomenda-se alterar a senha após o primeiro acesso no painel).*

### Passo 3: Configurar as Credenciais no `config.php`
Abra o arquivo `config.php` e preencha as constantes com os dados da Hostinger:
```php
define('DB_HOST', 'localhost'); // Na Hostinger geralmente é 'localhost'
define('DB_NAME', 'u376010332_LotoSniper');
define('DB_USER', 'u376010332_LotoSniper');
define('DB_PASS', 'SuaSenhaHostingerAqui');
```

### Passo 4: Envio dos Arquivos para o Servidor
1. No hPanel, abra o **Gerenciador de Arquivos** (ou conecte via SFTP / FileZilla).
2. Navegue até a pasta pública de `lotosniper.com.br` (geralmente `public_html/auth` ou diretamente na raiz `public_html/`).
3. Faça o upload dos arquivos:
   - `config.php`
   - `auth_check.php`
   - `login.php`
   - `register.php`
   - `admin_panel.php`
   - `logout.php`
   - `api_auth.php`
   - `.htaccess`

### Passo 5: Teste e Validação
1. Acesse `https://lotosniper.com.br/login.php` (ou `/auth/login.php`).
2. Faça login com o administrador padrão.
3. Você será redirecionado para `admin_panel.php`.
4. Crie um usuário de teste em `register.php` e veja-o aparecer na aba **Pendentes** no Painel do Administrador.
5. Aprove o usuário de teste e faça login com ele para verificar a liberação instantânea.
