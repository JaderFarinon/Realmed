# Armazenamento privado

Diretórios reservados a documentos e ativos gerados pela API. Este conteúdo deve permanecer fora do diretório público do frontend e nunca deve ser servido sem autenticação e autorização.

Nenhuma pasta de `storage` é publicada pelo Express. Uploads manuais permanecem em
`documents`; logos em `assets/logos`; assinaturas em `assets/signatures`; modelos
PDF em `templates/documents`; e documentos confirmados gerados recebem um UUID e
ficam em `generated`. A pré-visualização é produzida somente em memória.

Os documentos são renderizados no backend com PDFKit em um novo PDF, preservando
o arquivo de modelo original. Páginas, coordenadas, dimensões e tamanho da fonte
são lidos de `document_template_fields`; portanto, ajustes de layout não exigem
alterações em controllers. Cada regeneração cria um arquivo e registro novos, e o
registro anterior é marcado como substituído sem apagar o arquivo ou a auditoria.
