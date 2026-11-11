const { digest } = require('../services/legacyInventoryImport')
module.exports = function fixture() {
  const data = {
    apresentacao: [
      { id_apresentacao: 1, nome_apresentacao: 'Unidade', ativo: 'S' },
    ],
    categoria: [{ id_categoria: 1, nome_categoria: 'Materiais', ativo: 'S' }],
    setor: [
      {
        id_setor: 11,
        nome_setor: 'Geral',
        descricao: 'Setor de origem',
        ativo: 'S',
      },
    ],
    fornecedor: [
      { id_fornecedor: 1, razao_social: 'Fornecedor fictício', ativo: 'S' },
    ],
    produto: [
      {
        id_produto: 1,
        codigo: '1',
        nome_produto: 'Produto fictício',
        categoria: 1,
        unidade: 1,
        qtd_minima: 1,
        foto: null,
      },
    ],
    estoque: [
      { id_estoque: 1, produto: 1, setor_id: 11, quantidade: 5 },
      { id_estoque: 2, produto: 102, setor_id: 11, quantidade: 3 },
    ],
    nota: [
      {
        cod_nota: 1,
        numero_nota: 'NF-FICTICIA',
        id_fornecedor: 27,
        data_nota: '2026-05-13',
        fechado: 1,
      },
    ],
    item: [
      {
        id_item: 1,
        cod_nota: 1,
        cod_produto: 102,
        quantidade: 3,
        valor_item: '10.00',
      },
    ],
    pedido: [
      {
        cod_pedido: 1,
        id_usuario: 29,
        data_pedido: '2026-05-13',
        flag_baixa: 'A',
        status_pedido: 'PENDENTE',
        obs: '',
      },
    ],
    item_pedido: [
      {
        id_item_pedido: 1,
        cod_pedido: 1,
        cod_produto: 102,
        quantidade: 2,
        quantidade_solicitada: 2,
        quantidade_atendida: 0,
        status_item: 'PENDENTE',
        flag_baixa: 'A',
        obs: '',
      },
      {
        id_item_pedido: 2,
        cod_pedido: 3813,
        cod_produto: 1,
        quantidade: 1,
        quantidade_solicitada: 1,
        quantidade_atendida: 0,
        status_item: 'PENDENTE',
        flag_baixa: 'A',
        obs: '',
      },
    ],
    usuario: [
      {
        id_usuario: 29,
        login: 'usuario.legado',
        setor: 11,
        setor_id: null,
        ativo: 'S',
        perfil: 1,
      },
    ],
    perfil: [{ id_perfil: 1, nome_perfil: 'admin', nivel: 5 }],
  }
  return {
    schema: 'estoque_realmed',
    capturedAt: '2026-10-19T12:00:00.000Z',
    fingerprint: digest(data),
    data,
  }
}
