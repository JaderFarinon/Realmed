# App do paciente — link individual

Decisão corrigida em 13/11/2026: a equipe deve abrir a mesma página que o paciente recebe por QR code, livre de login. O agendamento online é separado, em `/agendar-avaliacao`, e não terá atalho na Gestão de Tratamentos.

## Acesso e vínculo

- Na Avaliação do tratamento, o sistema prepara o QR code automaticamente quando a aba é aberta. Abrir app do paciente e Copiar link usam o endereço representado pelo QR.
- No card superior do tratamento, App do paciente abre esse mesmo endereço em outra aba. Na lista, selecionar a linha e usar o olho.
- Formato `/paciente/codigo`: código aleatório de 32 bytes, codificado em base64url (43 caracteres). Um único link por paciente local, estável nas continuações e independente da sessão do funcionário.
- Não exige conta, senha, PIN ou JWT Realmed. O próprio link individual permite consultar somente aquele paciente. A equipe precisa de `guide_processes/view` para obter/emitir o acesso pelo tratamento.
- As emissões simultâneas são serializadas sob trava do paciente, com leitura atual da linha de acesso. Reutilizar o vínculo existente; não gerar outro código a cada clique ou nova guia. Não alterar o paciente do tratamento ou sua relação com o Stenci.
- Links da antiga prévia autenticada redirecionam para o app individual após validar o acesso da equipe. A página do paciente não é uma segunda versão visual.

## Conteúdo

Interface para celular com Início, Agenda, Avaliação e Evolução. Mostra nome, convênio, fisioterapeuta e sessões registradas. Seleciona inicialmente o ciclo não excluído mais recente e permite consultar os demais ciclos do mesmo paciente. Nunca inferir alta, melhora ou conclusão clínica apenas pelas contagens.

Avaliação somente COMPLETED, vinculada ao ciclo escolhido; continuidades exibem seu snapshot inicial. Rascunhos e metadados administrativos não são enviados. Desde 19/11/2026, cada evolução confirmada como `finished` pelo fluxo do tablet aparece nesta aba com data/sessão, texto final e assinatura textual do fisioterapeuta, para consulta pelo paciente e apresentação ao seu médico. O app permite imprimir/salvar em PDF. Nunca expor rascunho, pedido incerto ou evolução de outro paciente. O conteúdo vem de snapshot cifrado gravado apenas após confirmação remota; a conta compartilhada não é usada pela rota pública e nada clínico é persistido no navegador.

Agenda: horários já coletados em `billing_stenci_appointments`, por ID externo Stenci explícito e unidade configurada. Não cruzar por nomes nem inventar associação entre agendamento e guia. Pode incluir outros tratamentos do paciente, com até 20 futuros e 20 anteriores; informar cobertura e última atualização da coleta. Ausência de registros não significa ausência de atendimentos. Sem novas consultas/gravações Stenci.

## API e armazenamento

- `POST /api/patient-portal/treatments/:id/access`: autenticação Realmed e permissão de leitura de Tratamentos. Cria/reutiliza o link; responde apenas `{path}`. Registra PATIENT_PORTAL_ACCESS_CREATED uma única vez no histórico, sem código/URL.
- `POST /api/public/patient-portal/view`: `{code, treatmentId?}` no corpo. Código válido, acesso não revogado e vínculo exato com o paciente são obrigatórios. IDs de outro paciente, códigos inválidos e tratamentos excluídos não dão acesso. Não aceita JWT administrativo como substituição do código.
- Migration `20261113000002_patient_portal`: uma linha por paciente; hash SHA-256 para consulta e envelope AES-256-GCM vinculado ao ID do paciente para recuperar o mesmo link. Chave derivada de PATIENT_PORTAL_KEY ou, se ausente, JWT_SECRET. **Preservar o valor da chave usada**; ao rotacionar JWT_SECRET com fallback, migrar os envelopes ou fixar PATIENT_PORTAL_KEY com o valor anterior antes. Não recriar acessos silenciosamente. Revogados não são reativados pela emissão.
- Respostas no-store, no-referrer e noindex; nenhum token em logs/auditoria da aplicação, nenhum dado clínico em armazenamento do navegador. A rota pública tem limite de consulta, sem polling ou tentativa automática.
- Transações de consulta mantêm o escopo do paciente e do ciclo; não alterar etapas, reservas de edição, tratamentos, prontuários ou permissões.

## Celular e instalação

Rodapé fixo e discreto de 28 px, acrescido da área segura inferior do dispositivo. O conteúdo reserva esse espaço e preenche a altura da tela quando curto; a última informação permanece acessível nas telas longas. Rodapé presente em carregamento/erro e oculto na impressão.

Salvar no celular aproveita a oferta de instalação do navegador quando disponível; caso contrário, orienta adicionar aos favoritos ou à tela inicial. O service worker gera um manifesto para o link individual, com start_url/id iguais ao acesso do paciente, sem mudar o manifesto do fisio. Navegação /paciente/ e manifesto pessoal não entram no cache. Dados clínicos e API não têm funcionamento offline; o app precisa de conexão para carregar o conteúdo. Instalação nativa depende do navegador/dispositivo.

## Validação e publicação

Testes unitários de código/envelope/manifesto; integração MySQL descartável com emissão simultânea, continuação, permissão atual, acesso anônimo, isolamento, rascunho, exclusão e revogação; interface em celular/desktop com APIs sintéticas e QR local. Build/TypeScript, suíte backend e padrão compartilhado antes da publicação. Produção validada sem criar acessos fictícios ou consultar pacientes reais.

Arquivos de testes: backend/test/patient-portal.test.js, deploy/test-patient-portal.cjs e frontend/scripts/verify-patient-portal.cjs. Os testes anteriores de patient-preview preservam a validação da consulta mínima de dados reutilizada pelo app.
