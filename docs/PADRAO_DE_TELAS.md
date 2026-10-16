# Padrão de telas do Realmed

Este é o padrão obrigatório para alterações e novas telas. Foi definido em 14/10/2026 por solicitação do usuário, usando as listagens do ConectaMed como referência e preservando a identidade REALMED.

Referências analisadas: `ConectaMed/docs/listagens.md`, `TableActionToolbar.vue`, `ListTableFrame.vue`, `DataList.vue`, `TablePagination.vue` e as telas de Médicos e Encaminhamentos. Os componentes do Realmed ficam em `frontend/src/components/`; as regras visuais em `frontend/src/assets/list-workspace.css`.

## Estrutura das listagens

Os grupos Central de Guias, Estoque, Cadastros, Configurações e Integrações usam `MenuGroup`: clicar no título expande/recolhe seus subitens, com seta indicadora e `aria-expanded`/`aria-controls`. Preferências são independentes e persistidas por grupo. Ao navegar de outra seção para um grupo, ele abre para mostrar a opção ativa. Dashboard e Pacientes permanecem links diretos. Recolher um grupo é uma escolha de navegação, sem relação com permissões.

O cabeçalho compartilhado possui botão de três pontos verticais para recolher/expandir o menu. No desktop, recolher libera toda a largura para o conteúdo e a preferência é salva em `realmed_menu_collapsed`. No celular, o botão abre/fecha o menu sobreposto; ao navegar, o menu fecha. O botão permanece acessível, com título, `aria-expanded` e `aria-controls`; menu oculto não recebe foco.

1. `PageShell` apresenta título e descrição curtos, com a propriedade `list` nas listagens principais.
2. Um card superior reúne busca e filtros. Usar rótulos visíveis, limpar filtros e campos compactos. Filtros adicionais extensos podem ser expandidos; nesse estado, permitir rolagem normal para não cortar conteúdo.
3. Um card inferior reúne, nesta ordem, **barra de ações → tabela → paginação**.
4. Usar `DataList`, que compõe `ListTableFrame`, `TableActionToolbar` e `TablePagination`. Não recriar essa estrutura em cada view.

Exemplo:

```vue
<PageShell title="Produtos" subtitle="Cadastros do estoque" list>
  <DataList
    v-model:selected="selected"
    :items="filteredProducts"
    :columns="columns"
    :actions="actions"
    bounded
    selection-key="name"
  >
    <template #filters>
      <div class="list-filter-grid">
        <label class="filter-search">
          Pesquisar
          <input v-model="search" class="input" />
        </label>
      </div>
    </template>
  </DataList>
</PageShell>
```

## Seleção e ações

- Clicar na linha seleciona; clicar novamente desmarca. `Enter` e espaço também selecionam a linha focada.
- **Selecionar não abre nem edita automaticamente.** Abrir usa o ícone correspondente; editar usa o lápis.
- Ações ficam na barra superior. Não acrescentar uma coluna de botões repetidos em cada linha.
- Ações que exigem registro ficam desabilitadas sem seleção, durante carregamento ou quando o estado/permissão não permitir sua execução.
- Limpar seleção ao mudar de página, capacidade ou quando o registro deixa de existir no conjunto filtrado. Recarregar dados atualiza a referência do selecionado.
- Ícones têm área de 40 × 40 px, `title`, `aria-label` e texto acessível. Usar azul para a criação principal e vermelho para exclusão/inativação.
- Preservar regras operacionais: nota fechada e item atendido não tornam editáveis por mudança visual.
- Menus permanecem visíveis. Falta de permissão de acesso abre **Usuário sem permissão a essa função**, sem apagar a sessão.

## Tabela e paginação

- Cabeçalho cinza claro, bordas discretas, células compactas e linha selecionada azul clara.
- Valores cortados com reticências continuam disponíveis no atributo `title` e no detalhe.
- Linhas simples: 48 px. Duas informações sobrepostas: `row-height="64"`.
- Desktop com largura ≥ 1024 px e altura ≥ 650 px: medir a altura disponível com `ResizeObserver` e paginar pela capacidade real. Não fixar 25 linhas nem esconder linhas sem paginação.
- Celular e janelas menores: dez registros por página, rolagem vertical normal e rolagem horizontal somente dentro da tabela.
- Coleções locais: `DataList` pagina `items` internamente.
- APIs paginadas: fornecer `server-total` e `page`, tratar `update:page` e `update:pageSize` e enviar a capacidade ao backend. Não paginar outra vez o lote recebido como se fosse a coleção inteira.
- Exportações utilizam o conjunto autorizado completo dos filtros, independente da página. `all-rows` permite impressão de coleções locais e matrizes de edição sem paginação; não usar para escapar da paginação em listagens comuns.

## Formulários, detalhes e exceções

- Formulários e detalhes de listagens abrem em `ListDetailDialog`. A janela tem título, fechar, rolagem do conteúdo, foco acessível, Escape e restauração de foco.
- Formulários extensos, Novo Tratamento, detalhes clínicos e dashboards usam `PageShell` sem altura fixa. A página pode rolar; nunca esconder campos para caber na tela.
- Formular com rótulos visíveis e ações claras de salvar/cancelar. Novo Tratamento oferece salvar no cabeçalho e no final para facilitar o uso do formulário longo.
- Listagens secundárias em detalhes/dashboards reutilizam `DataList` com `embedded`, sem altura fixa.
- Coordenadas de template e matriz de permissões são **grades de edição**, não ações por registro: inputs/checkboxes permanecem nas células. Adicionar, remover campo selecionado e salvar ficam acima. A matriz de permissões pode mostrar todas as funções na janela rolável.
- Indicadores, mapas, checklist documental e login mantêm seus formatos próprios; aplicar a identidade, cabeçalho e controles consistentes, sem inventar seleção em conteúdos que não são registros tabulares.

## Cobertura atual

A solicitação temporária de credenciais Stenci usa `StenciRefreshDialog` com `ListDetailDialog`, rótulos visíveis, campo de senha, mensagem de erro e ações Consultar/Cancelar. Não navegar para o login Realmed por falta de cache ou erro de credenciais externas. Ver [STENCI_SESSOES_TEMPORARIAS.md](STENCI_SESSOES_TEMPORARIAS.md).

Aplicado a Pacientes, Gestão de Tratamentos, Convênios, Profissionais, Procedimentos, Modelos de Documentos, Usuários, Permissões e todas as nove listagens de Estoque. Detalhes do paciente, versões da ficha de avaliação, campos de template, itens de pedidos/notas e tabelas do resumo de estoque também reutilizam o padrão. Dashboard, integração Stenci e Novo Tratamento usam o cabeçalho compartilhado e ações superiores adequadas à tela.

## Verificação obrigatória

Executar:

```powershell
npm run build --prefix frontend
# Servidor local exclusivo para verificação visual:
npm run dev --prefix frontend -- --host 127.0.0.1 --port 5186 --strictPort
node frontend/scripts/verify-screen-pattern.cjs
```

O teste visual usa Playwright do runtime local, dados fictícios e bloqueia todas as escritas na API. É possível configurar `REALMED_PLAYWRIGHT_ROOT` e `REALMED_UI_TEST_URL`. Verifica 1366×768, 1920×1080, 1024×650 e 390×844, seleção, ações, paginação local/servidor, modais, campos preservados e negação de acesso. Imagens de QA ficam em `.deployment/screen-pattern-qa`, sem dados reais.

Antes de concluir: conferir ausência de rolagem desnecessária no desktop, última linha e rodapé totalmente visíveis, teclado, janela pequena, celular, expansão dos filtros, cancelamento e permissões. Não concluir apenas porque a aplicação compila.
