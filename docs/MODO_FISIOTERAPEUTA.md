# Modo Fisioterapeuta

## Acesso facial pelo tablet

O endereço `/modo-fisio/entrar` é público. A câmera frontal do tablet captura quadros durante a validação. O servidor executa detecção, vivacidade passiva e comparação facial; as imagens não são gravadas. O usuário precisa ser ativo, ter perfil `user`, estar vinculado explicitamente a um profissional CREFITO ativo e possuir cadastro facial.

Redesenho de 11/11/2026: uma única área ampla de câmera ocupa o centro da tela, com instrução e ações em uma faixa inferior. Substitui completamente a composição anterior de texto à esquerda e câmera pequena à direita. Priorizar o TCL 8492A em paisagem pela dimensão/orientação da janela, sem depender do tipo de ponteiro. Adaptar também ao celular em retrato; controles principais com pelo menos 48 px e sem corte em janelas baixas.

O fluxo atual é **Ativar câmera → posicionar o rosto → Entrar → verificar → abrir atendimento**. A pedido do usuário em 11/11/2026, remover espera de três segundos e piscada obrigatória. Capturar seis quadros JPEG de largura 480, qualidade 0,82, separados por 120 ms (cerca de 600 ms entre primeiro/último), com novo desafio descartável por tentativa. Não capturar nem autenticar automaticamente ao abrir a câmera, nem repetir tentativas em loop. Prévia espelhada com `object-fit: contain`, sem cortar a imagem capturada; o contorno acompanha as dimensões reais do vídeo, inclusive após girar o dispositivo.

Cancelar continua disponível durante permissão, captura e requisições. Abortar requisições/temporizadores, parar todas as trilhas ao cancelar, navegar ou ocultar a página e ignorar resultados atrasados. Permissão concedida depois do cancelamento também deve liberar a câmera. Limpar quadros/canvas após a operação; não armazenar imagens no navegador. Sucesso mostra confirmação breve e abre a área existente. Falhas de permissão, câmera ausente/ocupada e reconhecimento oferecem orientação e nova tentativa explícita; erros usam notificação global, mantendo a orientação de recuperação na faixa de ações. Respeitar Retry-After no 429, com botão temporariamente indisponível.

Verificação automatizada: `frontend/scripts/verify-physio-login.cjs`, com câmera sintética e APIs interceptadas. Abrange resoluções, ausência de captura automática, sequência de quadros, cancelamento/respostas tardias, permissão negada, retentativa/429, saída da página, sucesso e descarte de mídia. Não usa webcam real nem cria sessões de produção. A calibração física da câmera/posição do tablet continua exigindo teste no dispositivo.

O frontend pode ser instalado como PWA no Android. No Chrome, abra `/modo-fisio/entrar`, use **Instalar app** quando o botão aparecer ou o menu do navegador → **Instalar app**. A tela inicial instalada abre no acesso facial. O service worker mantém somente o shell e os arquivos estáticos do app para abertura offline; nenhuma resposta de API, cadastro de paciente ou dado clínico é armazenado no cache.

O cadastro é feito em Configurações → Usuários. Primeiro associe o usuário ao profissional local; depois capture três imagens (frente, leve esquerda e leve direita). O servidor armazena somente os descritores faciais cifrados com AES-256-GCM em `physiotherapist_face_biometrics`. A chave `REALMED_BIOMETRY_KEY` deve ser uma chave Base64 de 32 bytes, armazenada como segredo de ambiente e mantida em backup seguro. Perder ou substituir a chave torna os cadastros existentes ilegíveis; será necessário recadastrar os rostos. Remover a associação ou bloquear/inativar o usuário apaga o modelo facial.

O reconhecimento usa `@vladmandic/human` 3.3.6 e `@tensorflow/tfjs-node` 4.22.0 no backend. O processamento depende dos modelos locais empacotados pela biblioteca; não baixar modelos dinamicamente no tablet. Atualizações de modelo que mudem os descritores exigem nova versão do modelo e recadastro. A câmera do tablet precisa de origem HTTPS e permissão do navegador.

O limite de emissão de desafios é independente do limite de tentativas de autenticação, pois cada leitura usa os dois endpoints. Logins bem-sucedidos e o pedido de confirmação adicional (que ainda não decide o acesso) não consomem a cota de oito falhas em 15 minutos do tablet/IP compartilhado; desafios e falhas efetivas continuam limitados.

### Reconhecimento ágil — 11/11/2026

- Pré-carregar/aquecer modelos com a amostra embutida da biblioteca ao iniciar a API. Desligar íris e emoções; manter malha facial, alinhamento por rotação, descritor, antifoto, vivacidade e cálculo leve de gestos a partir da malha. Inferência serializada entre logins/cadastros, fila limitada a quatro trabalhos e caches de detecção desativados para não reaproveitar resultados entre pessoas.
- Analisar primeiro início/meio/fim da captura; parar em três quadros válidos e usar no máximo seis análises. Aceitar quadros intermediários ruins, mas exigir pelo menos duas imagens distintas com qualidade, antifoto e vivacidade >= 0,6. Rejeitar múltiplos rostos na imagem analisada. Bytes idênticos não constituem duas confirmações.
- Uma sequência praticamente estática não basta, mesmo que os modelos passivos retornem scores altos. Comparar assinaturas temporárias de luminância central (16×16 blocos) pela correlação normalizada, ignorando mudança global de brilho/contraste; diferença inferior a 0,0005 pede confirmação adicional. Servidor emite outro desafio descartável de 30 segundos vinculado ao modo `blink` e retorna `FACE_MOTION_REQUIRED`. Interface mantém a câmera, explica e aguarda Confirmar com piscada; captura então 16 quadros e o servidor exige sequência olhos abertos → piscada → abertos, além de dois descritores de olhos abertos. Não repetir automaticamente e não aceitar opção do cliente para retirar a exigência. A checagem de movimento bloqueia a amostra estática testada, mas não prova profundidade ou rejeição universal de fotografias/vídeos.
- Comparar cada descritor com os cadastros existentes, mantendo similaridade mínima 0,5 e margem mínima 0,04 entre identidades. Exigir duas confirmações do mesmo usuário e rejeitar identidades conflitantes; um quadro ambíguo não vota. Descartar descritores de consulta, retornos do motor e temporários também em falhas.
- Correção limitada de sombras antes da inferência: medir luminância mediana central, aplicar curva gama entre 0,65 e 1 apenas quando moderadamente escuro (mediana 10–84), preservando altas luzes. Imagens normais e praticamente pretas não são modificadas. Essa compensação não recupera detalhes perdidos no escuro nem garante leitura com janela/sol diretamente atrás. Modelo e vetores de 1024 valores permanecem compatíveis com os cadastros cifrados existentes.
- A verificação passiva substitui o desafio ativo em toda entrada; a piscada fica como confirmação adicional para sequência estática. Mantém filtros probabilísticos contra apresentação de fotos, mas não comprova profundidade física nem oferece a segurança de sensores infravermelhos. A biblioteca descreve limitações dos modelos em [antifoto/vivacidade](https://github.com/vladmandic/human/discussions/206); [Face ID](https://support.apple.com/en-us/102381) usa hardware específico. Não afirmar equivalência nem taxa de acerto validada sem calibração representativa no tablet.

Testes de política/inferência isolada em `backend/test/physiotherapist-face.test.js` cobrem confirmações, ambiguidade, rejeições, repetição, limpeza, limites, concorrência e compensação. Testes sintéticos não medem falsos aceites/rejeições de pessoas reais.

## Identidade e Stenci compartilhado

Cada fisioterapeuta continua sendo um usuário Realmed individual para identificação, auditoria e associação à agenda. A senha e o usuário Stenci usados pelo modo ficam em secrets do servidor `STENCI_FISIO_USERNAME` e `STENCI_FISIO_PASSWORD`; não vão ao navegador, banco ou logs. Essa conta Stenci compartilhada é uma exceção autorizada para o modo de fisioterapia e não muda o login individual do restante do Realmed nem a conta isolada do coletor de faturamento.

Após o reconhecimento, o backend autentica a conta Stenci compartilhada, seleciona a branch Realmed, valida `/v1/me`, confirma o logoff e então cria o JWT Realmed do profissional reconhecido. As credenciais são copiadas para o `StenciSessionStore` criptografado em memória durante a validade do JWT, encerradas no logout/expiração/reinício e usadas em operações com login/logoff temporários.

Para desenvolver o fluxo de login e a montagem das telas antes de configurar a conta compartilhada, `STENCI_FISIO_DEV_BYPASS=true` habilita uma sessão Realmed sem Stenci. O reconhecimento facial, usuário ativo e vínculo ao profissional continuam obrigatórios. Nesse modo, `/physio/me` sinaliza a sessão de desenvolvimento e a interface mostra as abas sem chamar agenda, busca de pacientes ou produção. A variável fica desativada por padrão em `.env.example`. Em produção, a ativação requer também `STENCI_FISIO_DEV_BYPASS_IN_PRODUCTION=true`, para tornar explícita a janela de teste.

## Agenda, pacientes e produção disponíveis

- Agenda lê as agendas associadas explicitamente ao profissional em `physiotherapy_rotation_agendas` e consulta `/v1/calendar` para a data escolhida.
- Busca usa o cadastro de pacientes do Stenci. O resultado exibe todos os atendimentos daquele paciente presentes na coleta de agenda do Stenci da branch Realmed.
- Produção soma os registros já coletados em `billing_stenci_appointments` no período informado. O resumo compartilhado pelo tablet não inclui dados de pacientes.
- O acesso facial também pode ser alcançado pela área autenticada e pelo link da tela de login regular. O login Stenci regular continua disponível como alternativa.

## Operações Stenci ainda pendentes de contrato

Este modo não inventa contratos para ler/gravar evolução, finalizar atendimento ou alterar o status de agenda. Não exibir essas ações como concluídas até receber e implementar os endpoints e respectivos corpos/respostas fornecidos pelo usuário.

## Configuração de ambiente

```dotenv
STENCI_FISIO_USERNAME=
STENCI_FISIO_PASSWORD=
STENCI_FISIO_DEV_BYPASS=false
STENCI_FISIO_DEV_BYPASS_IN_PRODUCTION=false
REALMED_BIOMETRY_KEY=
```

Gere `REALMED_BIOMETRY_KEY` com 32 bytes aleatórios codificados em Base64, por exemplo `openssl rand -base64 32`. Use secrets do servidor em produção; não coloque valores reais em `.env.example`, imagens, frontend ou repositório.
