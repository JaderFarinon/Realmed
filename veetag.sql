-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 15/12/2025 às 19:51
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `veetag`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `avaliacoes`
--

CREATE TABLE `avaliacoes` (
  `id` int(10) UNSIGNED NOT NULL,
  `oficina_id` int(10) UNSIGNED NOT NULL,
  `usuario_id` int(10) UNSIGNED NOT NULL,
  `nota` int(11) NOT NULL,
  `comentario` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `avaliacoes`
--

INSERT INTO `avaliacoes` (`id`, `oficina_id`, `usuario_id`, `nota`, `comentario`, `created_at`) VALUES
(1, 1, 2, 5, 'Atendimento excelente, serviço rápido e cuidadoso.', '2025-10-31 00:56:00');

-- --------------------------------------------------------

--
-- Estrutura para tabela `consumos`
--

CREATE TABLE `consumos` (
  `id` int(10) UNSIGNED NOT NULL,
  `veiculo_id` int(10) UNSIGNED NOT NULL,
  `data` date NOT NULL,
  `litros` decimal(10,2) NOT NULL,
  `km` int(11) NOT NULL,
  `preco_litro` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `consumos`
--

INSERT INTO `consumos` (`id`, `veiculo_id`, `data`, `litros`, `km`, `preco_litro`, `created_at`, `updated_at`) VALUES
(1, 1, '2024-02-10', 45.50, 360, 5.79, '2025-10-31 00:56:00', '2025-10-31 00:56:00');

-- --------------------------------------------------------

--
-- Estrutura para tabela `internal_chat_messages`
--

CREATE TABLE `internal_chat_messages` (
  `id` int(10) UNSIGNED NOT NULL,
  `sender_id` int(10) UNSIGNED NOT NULL,
  `recipient_id` int(10) UNSIGNED NOT NULL,
  `content` text DEFAULT NULL,
  `attachment_original_name` varchar(255) DEFAULT NULL,
  `attachment_stored_name` varchar(255) DEFAULT NULL,
  `attachment_mime_type` varchar(255) DEFAULT NULL,
  `attachment_size` bigint(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `knex_migrations`
--

CREATE TABLE `knex_migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `batch` int(11) DEFAULT NULL,
  `migration_time` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `knex_migrations`
--

INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES
(1, '20240101000001_create_usuarios.js', 1, '2025-10-31 00:53:13'),
(2, '20240101000002_create_oficinas.js', 1, '2025-10-31 00:53:14'),
(3, '20240101000003_create_veiculos.js', 1, '2025-10-31 00:53:14'),
(4, '20240101000004_create_veiculo_fotos.js', 1, '2025-10-31 00:53:14'),
(5, '20240101000005_create_manutencoes.js', 1, '2025-10-31 00:53:15'),
(6, '20240101000006_create_consumos.js', 1, '2025-10-31 00:53:15'),
(7, '20240101000007_create_avaliacoes.js', 1, '2025-10-31 00:53:15'),
(8, '20240215000000_add_public_token_to_veiculos.js', 2, '2025-10-31 01:14:12'),
(9, '20240607000008_update_usuario_email_unique.js', 3, '2025-10-31 01:22:14'),
(10, '001_create_people.js', 4, '2025-12-14 00:35:43'),
(11, '002_create_users.js', 4, '2025-12-14 00:35:43'),
(12, '20240601000014_create_internal_chat_messages.js', 4, '2025-12-14 00:35:43'),
(13, '20250520000031_create_user_permissions.js', 4, '2025-12-14 00:35:44'),
(14, '20251215000043_create_support_tables.js', 4, '2025-12-14 00:35:47');

-- --------------------------------------------------------

--
-- Estrutura para tabela `knex_migrations_lock`
--

CREATE TABLE `knex_migrations_lock` (
  `index` int(10) UNSIGNED NOT NULL,
  `is_locked` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `knex_migrations_lock`
--

INSERT INTO `knex_migrations_lock` (`index`, `is_locked`) VALUES
(1, 0);

-- --------------------------------------------------------

--
-- Estrutura para tabela `manutencoes`
--

CREATE TABLE `manutencoes` (
  `id` int(10) UNSIGNED NOT NULL,
  `veiculo_id` int(10) UNSIGNED NOT NULL,
  `descricao` varchar(255) NOT NULL,
  `data` date NOT NULL,
  `custo` decimal(10,2) DEFAULT 0.00,
  `fotos` text DEFAULT NULL,
  `notas_fiscais` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `manutencoes`
--

INSERT INTO `manutencoes` (`id`, `veiculo_id`, `descricao`, `data`, `custo`, `fotos`, `notas_fiscais`, `created_at`, `updated_at`) VALUES
(1, 1, 'Troca de óleo e filtro', '2024-01-15', 180.50, '[\"https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80\"]', 'NF-12345', '2025-10-31 00:56:00', '2025-10-31 00:56:00');

-- --------------------------------------------------------

--
-- Estrutura para tabela `oficinas`
--

CREATE TABLE `oficinas` (
  `id` int(10) UNSIGNED NOT NULL,
  `nome` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `senha_hash` varchar(255) NOT NULL,
  `descricao` text DEFAULT NULL,
  `localizacao` varchar(255) DEFAULT NULL,
  `plano` enum('basic','premium','enterprise') DEFAULT 'basic',
  `contatos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`contatos`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `oficinas`
--

INSERT INTO `oficinas` (`id`, `nome`, `email`, `senha_hash`, `descricao`, `localizacao`, `plano`, `contatos`, `created_at`, `updated_at`) VALUES
(1, 'Oficina Turbo Veículos', 'contato@turboveiculos.com', '$2a$10$1i7CPnIPUXqlzLCf4uAbu.ZFCz0kkb25mrHGwv61y/ucYuCBDyNsm', 'Especializada em preparação de carros esportivos e manutenção premium.', 'São Paulo - SP', 'premium', '{\"telefone\":\"(11) 99999-9999\",\"instagram\":\"@turboveiculos\",\"whatsapp\":\"https://wa.me/5511999999999\"}', '2025-10-31 00:56:00', '2025-10-31 00:56:00');

-- --------------------------------------------------------

--
-- Estrutura para tabela `people`
--

CREATE TABLE `people` (
  `id` int(10) UNSIGNED NOT NULL,
  `cpf` varchar(14) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `birth_date` date DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `blood_type` varchar(5) DEFAULT NULL,
  `zip_code` varchar(10) DEFAULT NULL,
  `street` varchar(100) DEFAULT NULL,
  `number` varchar(10) DEFAULT NULL,
  `neighborhood` varchar(60) DEFAULT NULL,
  `city` varchar(60) DEFAULT NULL,
  `state` varchar(2) DEFAULT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `marital_status` varchar(30) DEFAULT NULL,
  `nationality` varchar(60) DEFAULT NULL,
  `birthplace` varchar(60) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `support_requests`
--

CREATE TABLE `support_requests` (
  `id` int(10) UNSIGNED NOT NULL,
  `motivo` varchar(50) NOT NULL,
  `titulo` varchar(180) NOT NULL,
  `descricao` text NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'aguardando_suporte',
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `updated_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `closed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `support_request_attachments`
--

CREATE TABLE `support_request_attachments` (
  `id` int(10) UNSIGNED NOT NULL,
  `mensagem_id` int(10) UNSIGNED NOT NULL,
  `nome_original` varchar(255) NOT NULL,
  `arquivo_armazenado` varchar(255) NOT NULL,
  `mime_type` varchar(150) DEFAULT NULL,
  `tamanho_bytes` bigint(20) DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `support_request_messages`
--

CREATE TABLE `support_request_messages` (
  `id` int(10) UNSIGNED NOT NULL,
  `solicitacao_id` int(10) UNSIGNED NOT NULL,
  `conteudo` text DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `person_id` int(10) UNSIGNED DEFAULT NULL,
  `status` enum('active','inactive','blocked') DEFAULT 'active',
  `role` enum('masteradmin','admin','user') DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_login` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `user_permissions`
--

CREATE TABLE `user_permissions` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `module_key` varchar(100) NOT NULL,
  `can_view` tinyint(1) NOT NULL DEFAULT 0,
  `can_create` tinyint(1) NOT NULL DEFAULT 0,
  `can_edit` tinyint(1) NOT NULL DEFAULT 0,
  `can_delete` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(10) UNSIGNED NOT NULL,
  `nome` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `senha_hash` varchar(255) NOT NULL,
  `role` enum('admin','cliente','oficina') DEFAULT 'cliente',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `usuarios`
--

INSERT INTO `usuarios` (`id`, `nome`, `email`, `senha_hash`, `role`, `created_at`, `updated_at`) VALUES
(1, 'Administrador VeeTag', 'admin@veetag.com', '$2a$10$1i7CPnIPUXqlzLCf4uAbu.ZFCz0kkb25mrHGwv61y/ucYuCBDyNsm', 'admin', '2025-10-31 00:55:59', '2025-10-31 00:55:59'),
(2, 'Cliente VeeTag', 'cliente@veetag.com', '$2a$10$1i7CPnIPUXqlzLCf4uAbu.ZFCz0kkb25mrHGwv61y/ucYuCBDyNsm', 'cliente', '2025-10-31 00:56:00', '2025-10-31 00:56:00');

-- --------------------------------------------------------

--
-- Estrutura para tabela `veiculos`
--

CREATE TABLE `veiculos` (
  `id` int(10) UNSIGNED NOT NULL,
  `usuario_id` int(10) UNSIGNED NOT NULL,
  `marca` varchar(255) NOT NULL,
  `modelo` varchar(255) NOT NULL,
  `ano` int(11) NOT NULL,
  `motor` varchar(255) DEFAULT NULL,
  `modificacoes` text DEFAULT NULL,
  `acessorios` text DEFAULT NULL,
  `ficha_tecnica` text DEFAULT NULL,
  `publico` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `public_token` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `veiculos`
--

INSERT INTO `veiculos` (`id`, `usuario_id`, `marca`, `modelo`, `ano`, `motor`, `modificacoes`, `acessorios`, `ficha_tecnica`, `publico`, `created_at`, `updated_at`, `public_token`) VALUES
(1, 2, 'Volkswagen', 'Gol GTS', 1994, '2.0 AP injetado', 'Suspensão esportiva, rodas BBS 16\", escapamento dimensionado', 'Ar-condicionado, direção hidráulica, bancos Recaro originais', 'Motor 2.0 AP injetado, 120 cv, câmbio manual de 5 marchas, peso de 990 kg. 0-100 km/h em 9,8s.', 1, '2025-10-31 00:56:00', '2025-10-31 01:23:43', NULL);

-- --------------------------------------------------------

--
-- Estrutura para tabela `veiculo_fotos`
--

CREATE TABLE `veiculo_fotos` (
  `id` int(10) UNSIGNED NOT NULL,
  `veiculo_id` int(10) UNSIGNED NOT NULL,
  `url` varchar(255) NOT NULL,
  `legenda` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `veiculo_fotos`
--

INSERT INTO `veiculo_fotos` (`id`, `veiculo_id`, `url`, `legenda`, `created_at`) VALUES
(1, 1, 'https://images.unsplash.com/photo-1523986371872-9d3ba2e2f642?auto=format&fit=crop&w=1200&q=80', 'Volkswagen Gol GTS 1994', '2025-10-31 00:56:00');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `avaliacoes`
--
ALTER TABLE `avaliacoes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `avaliacoes_oficina_id_foreign` (`oficina_id`),
  ADD KEY `avaliacoes_usuario_id_foreign` (`usuario_id`);

--
-- Índices de tabela `consumos`
--
ALTER TABLE `consumos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `consumos_veiculo_id_foreign` (`veiculo_id`);

--
-- Índices de tabela `internal_chat_messages`
--
ALTER TABLE `internal_chat_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `internal_chat_messages_recipient_id_foreign` (`recipient_id`),
  ADD KEY `idx_internal_chat_participants` (`sender_id`,`recipient_id`),
  ADD KEY `idx_internal_chat_created_at` (`created_at`);

--
-- Índices de tabela `knex_migrations`
--
ALTER TABLE `knex_migrations`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `knex_migrations_lock`
--
ALTER TABLE `knex_migrations_lock`
  ADD PRIMARY KEY (`index`);

--
-- Índices de tabela `manutencoes`
--
ALTER TABLE `manutencoes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `manutencoes_veiculo_id_foreign` (`veiculo_id`);

--
-- Índices de tabela `oficinas`
--
ALTER TABLE `oficinas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `oficinas_email_unique` (`email`);

--
-- Índices de tabela `people`
--
ALTER TABLE `people`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_people_cpf` (`cpf`),
  ADD UNIQUE KEY `uk_people_email` (`email`);

--
-- Índices de tabela `support_requests`
--
ALTER TABLE `support_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `support_requests_updated_by_foreign` (`updated_by`),
  ADD KEY `idx_support_requests_status` (`status`),
  ADD KEY `idx_support_requests_created_by` (`created_by`),
  ADD KEY `idx_support_requests_updated_at` (`updated_at`);

--
-- Índices de tabela `support_request_attachments`
--
ALTER TABLE `support_request_attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `support_request_attachments_created_by_foreign` (`created_by`),
  ADD KEY `idx_support_attachments_message` (`mensagem_id`),
  ADD KEY `idx_support_attachments_created_at` (`created_at`);

--
-- Índices de tabela `support_request_messages`
--
ALTER TABLE `support_request_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `support_request_messages_created_by_foreign` (`created_by`),
  ADD KEY `idx_support_messages_request` (`solicitacao_id`),
  ADD KEY `idx_support_messages_created_at` (`created_at`);

--
-- Índices de tabela `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_username_unique` (`username`),
  ADD KEY `idx_users_person` (`person_id`);

--
-- Índices de tabela `user_permissions`
--
ALTER TABLE `user_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_user_permissions_user_module` (`user_id`,`module_key`),
  ADD KEY `idx_user_permissions_module` (`module_key`);

--
-- Índices de tabela `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `usuarios_email_role_unique` (`email`,`role`);

--
-- Índices de tabela `veiculos`
--
ALTER TABLE `veiculos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `veiculos_public_token_unique` (`public_token`),
  ADD KEY `veiculos_usuario_id_foreign` (`usuario_id`);

--
-- Índices de tabela `veiculo_fotos`
--
ALTER TABLE `veiculo_fotos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `veiculo_fotos_veiculo_id_foreign` (`veiculo_id`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `avaliacoes`
--
ALTER TABLE `avaliacoes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `consumos`
--
ALTER TABLE `consumos`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `internal_chat_messages`
--
ALTER TABLE `internal_chat_messages`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `knex_migrations`
--
ALTER TABLE `knex_migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de tabela `knex_migrations_lock`
--
ALTER TABLE `knex_migrations_lock`
  MODIFY `index` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `manutencoes`
--
ALTER TABLE `manutencoes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `oficinas`
--
ALTER TABLE `oficinas`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `people`
--
ALTER TABLE `people`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `support_requests`
--
ALTER TABLE `support_requests`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `support_request_attachments`
--
ALTER TABLE `support_request_attachments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `support_request_messages`
--
ALTER TABLE `support_request_messages`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `user_permissions`
--
ALTER TABLE `user_permissions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `veiculos`
--
ALTER TABLE `veiculos`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `veiculo_fotos`
--
ALTER TABLE `veiculo_fotos`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `avaliacoes`
--
ALTER TABLE `avaliacoes`
  ADD CONSTRAINT `avaliacoes_oficina_id_foreign` FOREIGN KEY (`oficina_id`) REFERENCES `oficinas` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `avaliacoes_usuario_id_foreign` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `consumos`
--
ALTER TABLE `consumos`
  ADD CONSTRAINT `consumos_veiculo_id_foreign` FOREIGN KEY (`veiculo_id`) REFERENCES `veiculos` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `internal_chat_messages`
--
ALTER TABLE `internal_chat_messages`
  ADD CONSTRAINT `internal_chat_messages_recipient_id_foreign` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `internal_chat_messages_sender_id_foreign` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `manutencoes`
--
ALTER TABLE `manutencoes`
  ADD CONSTRAINT `manutencoes_veiculo_id_foreign` FOREIGN KEY (`veiculo_id`) REFERENCES `veiculos` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `support_requests`
--
ALTER TABLE `support_requests`
  ADD CONSTRAINT `support_requests_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `support_requests_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Restrições para tabelas `support_request_attachments`
--
ALTER TABLE `support_request_attachments`
  ADD CONSTRAINT `fk_support_attachments_message` FOREIGN KEY (`mensagem_id`) REFERENCES `support_request_messages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `support_request_attachments_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Restrições para tabelas `support_request_messages`
--
ALTER TABLE `support_request_messages`
  ADD CONSTRAINT `fk_support_messages_request` FOREIGN KEY (`solicitacao_id`) REFERENCES `support_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `support_request_messages_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Restrições para tabelas `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_person_id_foreign` FOREIGN KEY (`person_id`) REFERENCES `people` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Restrições para tabelas `user_permissions`
--
ALTER TABLE `user_permissions`
  ADD CONSTRAINT `user_permissions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `veiculos`
--
ALTER TABLE `veiculos`
  ADD CONSTRAINT `veiculos_usuario_id_foreign` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `veiculo_fotos`
--
ALTER TABLE `veiculo_fotos`
  ADD CONSTRAINT `veiculo_fotos_veiculo_id_foreign` FOREIGN KEY (`veiculo_id`) REFERENCES `veiculos` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
