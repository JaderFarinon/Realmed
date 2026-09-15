using NexusHealth_WS.Classes;
using MySql.Data.MySqlClient;

namespace NexusHealth_WS.Model
{
    public class QualidadeModel
    {
        #region Funções Documentos -- Qualidade

        internal List<Fornecedor> ListarFornecedores()
        {
            List<Fornecedor> fornecedores = new List<Fornecedor>();

            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string sql = "select * from doc_fornecedor";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = sql;
                var dr = cmd.ExecuteReader();

                while (dr.Read())
                {
                    #pragma warning disable CS8601 // Possível atribuição de referência nula.
                    Fornecedor fornecedor = new Fornecedor();
                    fornecedor.IdFornecedor = Convert.ToInt32(dr["id"]);
                    fornecedor.RazaoSocial = dr["razao_social"].ToString();
                    fornecedor.NomeFantasia = dr["nome_fantasia"].ToString();
                    fornecedor.Cnpj = dr["cnpj"].ToString();
                    fornecedor.Municipio = Convert.ToInt32(dr["municipio"]);
                    fornecedor.Estado = dr["estado"].ToString();
                    fornecedor.Email = dr["email"].ToString();
                    fornecedor.Telefone = dr["telefone"].ToString();
                    fornecedor.Endereco = dr["endereco"].ToString();
                    fornecedor.PeriodoAvaliacao = dr["periodo_ava"].ToString();
                    fornecedores.Add(fornecedor);
                }

                conn.Close();
                return fornecedores;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        internal List<Fornecedor> ListarFornecedor(string DsRazaoSocial, string DsNomeFantasia, string DsCnpj, string DsMunicipio, string DsEstado, string DsSetor) 
        {
            List<Fornecedor> fornecedores = new List<Fornecedor>();

            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = "select distinct a.id,a.razao_social, a.nome_fantasia, a.cnpj, a.municipio, a.estado, b.nome "+
                    "from doc_fornecedor a " +
                    "inner join municipio b on b.cd_tasy = a.municipio " +
                    "left join doc_setor d on d.id_fornecedor = a.id " +
                    "where ((upper(a.razao_social) like concat('%',upper(?ds_razao_social),'%')) or (?ds_razao_social = 'X')) " +
                    "and ((upper(a.nome_fantasia) like concat('%',upper(?ds_nome_fantasia),'%')) or (?ds_nome_fantasia = 'X')) " +
                    "and ((a.cnpj like concat('%',upper(?ds_cnpj),'%')) or (?ds_cnpj = '0')) " +
                    "and (a.municipio = ?ds_municipio or ?ds_municipio = '0') " +
                    "and (upper(a.estado) = upper(?ds_estado) or ?ds_estado = 'X') " +
                    "and (d.id_setor = ?ds_setor or ?ds_setor = '0') " +
                    "order by 2";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("ds_razao_social", DsRazaoSocial));
                cmd.Parameters.Add(new MySqlParameter("ds_nome_fantasia", DsNomeFantasia));
                cmd.Parameters.Add(new MySqlParameter("ds_cnpj", DsCnpj));
                cmd.Parameters.Add(new MySqlParameter("ds_municipio", DsMunicipio));
                cmd.Parameters.Add(new MySqlParameter("ds_estado", DsEstado));
                cmd.Parameters.Add(new MySqlParameter("ds_setor", DsSetor));
                var dr = cmd.ExecuteReader();

                while (dr.Read())
                {
                    #pragma warning disable CS8601 // Possível atribuição de referência nula.
                    Fornecedor fornecedor = new Fornecedor();
                    fornecedor.IdFornecedor = Convert.ToInt32(dr["id"]);
                    fornecedor.RazaoSocial = dr["razao_social"].ToString();
                    fornecedor.NomeFantasia = dr["nome_fantasia"].ToString();
                    fornecedor.Cnpj = dr["cnpj"].ToString();
                    fornecedor.Municipio = Convert.ToInt32(dr["municipio"]);
                    fornecedor.Estado = dr["estado"].ToString();
                    fornecedor.Nome = dr["nome"].ToString();
                    fornecedores.Add(fornecedor);
                }
                conn.Close();
                return fornecedores;
            }
            catch (Exception e)
            {
                return fornecedores;
            }
        }

//        internal List<Fornecedor> ListarFornecedorAlerta(int IdUser, int PerfilUser) 
//        {
//            List<Fornecedor> fornecedores = new List<Fornecedor>();

//            try
//            {
//                DBConfig dbConfig = new DBConfig();
//                MySqlConnection conn = dbConfig.MysqlConn();

//                string query = "select qt.razao_social, " +
//                    "sum(qt.qt_vencidos) qt_vencidos, " +
//                    "sum(qt.qt_alerta) qt_alerta, " +
//                    "sum(qt.qt_urgente) qt_urgente, " +
//                    "sum(qt.qt_sem_anexo) qt_sem_anexo, " +
//                    "qt.id " +
//                    "from (select final.razao_social, " +
//                    "case " +
//                    "when final.status = 'Vencido' " +
//                    "then 1 " +
//                    "else 0 " +
//                    "end qt_vencidos, " +
//                    "case " +
//                    "when final.status = 'Alerta' " +
//                    "then 1 " +
//                    "else 0 " +
//                    "end qt_alerta, " +
//                    "case " +
//                    "when final.status = 'Urgente' " +
//                    "then 1 " +
//                    "else 0 " +
//                    "end qt_urgente, " +
//                    "case " +
//                    "when final.status = 'Sem Anexo' " +
//                    "then 1 " +
//                    "else 0 " +
//                    "end qt_sem_anexo, " +
//                    "final.id " +
//                    "from (SELECT distinct CASE " +
//                    "WHEN (select count(z.id) from doc_version as z where z.id_doc = a.id) = 0 THEN 'Sem Anexo' " +
//                    "WHEN b.doc_val is null THEN 'Normal' " +
//                    "WHEN DATEDIFF(b.doc_val,CURDATE( )) - a.doc_emission > 15 THEN 'Normal' " +
//                    "WHEN DATEDIFF(b.doc_val,CURDATE( )) - a.doc_emission <= 15 && DATEDIFF(b.doc_val,CURDATE( )) - a.doc_emission > 2 THEN 'Alerta' " +
//                    "WHEN DATEDIFF(b.doc_val,CURDATE( )) - a.doc_emission <= 2 && DATEDIFF(b.doc_val,CURDATE( )) - a.doc_emission >= (a.doc_emission*-1) THEN 'Urgente' " +
//                    "WHEN b.doc_val < CURDATE() THEN 'Vencido' " +
//                    "ELSE 'Erro' " +
//                    "END as status, " +
//                    "a.cd_cgc_pj, " +
//                    "c.razao_social, " +
//                    "a.id id_doc, " +
//                    "b.id id_version, " +
//                    "a.doc_user, " +
//                    "c.id " +
//                    "FROM doc as a " +
//                    "inner join doc_version b on (b.id_doc = a.id and b.id = (select max(y.id) from doc_version y where y.id_doc = a.id)) " +
//                    "inner join doc_fornecedor c on c.id = a.id_fornecedor) final " +
//                    "where final.status != 'Normal' " +
//                    "and ((final.doc_user = ?idUser) " +
//                    "or (final.id in (select x.id_item from usuarios_notificacao as x where x.id_usuario = ?idUser)) " +
//                    "or (?perfilUser = 1))) qt " +
//                    "group by qt.razao_social, qt.id";

//                var cmd = conn.CreateCommand();
//                conn.Open();
//                cmd.CommandText = query;
//                cmd.Parameters.Add(new MySqlParameter("ds_razao_social", DsRazaoSocial));
//                cmd.Parameters.Add(new MySqlParameter("ds_nome_fantasia", DsNomeFantasia));
//                cmd.Parameters.Add(new MySqlParameter("ds_cnpj", DsCnpj));
//                cmd.Parameters.Add(new MySqlParameter("ds_municipio", DsMunicipio));
//                cmd.Parameters.Add(new MySqlParameter("ds_estado", DsEstado));
//                cmd.Parameters.Add(new MySqlParameter("ds_setor", DsSetor));
//                var dr = cmd.ExecuteReader();

//                while (dr.Read())
//                {
//#pragma warning disable CS8601 // Possível atribuição de referência nula.
//                    Fornecedor fornecedor = new Fornecedor();
//                    fornecedor.IdFornecedor = Convert.ToInt32(dr["id"]);
//                    fornecedor.RazaoSocial = dr["razao_social"].ToString();
//                    fornecedor.NomeFantasia = dr["nome_fantasia"].ToString();
//                    fornecedor.Cnpj = dr["cnpj"].ToString();
//                    fornecedor.Municipio = Convert.ToInt32(dr["municipio"]);
//                    fornecedor.Estado = dr["estado"].ToString();
//                    fornecedor.Nome = dr["nome"].ToString();
//                    fornecedores.Add(fornecedor);
//                }
//                conn.Close();
//                return fornecedores;
//            }
//            catch (Exception e)
//            {
//                return fornecedores;
//            }
//        }

        internal List<Documento> ListarDocumentos(int IdFornecedor, int IdUsuario, string IdPerfil)
        {
            List<Documento> documentos = new List<Documento>();

            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = "SELECT      b.name_type, " +
                                    "a.id id, " +
                                    "a.doc_name, " +
                                    "a.doc_emission, " +
                                    "date_format(a.doc_dtAdd, '%d/%m/%Y') as doc_dtAdd, " +
                                    "a.doc_user, " +
                                    "date_format(a.doc_val, '%d/%m/%Y') as doc_val, " +
                                    "a.id_version, " +
                                    "a.status, " +
                                    "x.usu_nome, " +
                                    "d.ds_orgao, " +
                                    "a.cd_cgc_pj, " +
                                    "a.id_fornecedor, " +
                                    "max(a.id_version), " +
                                    "z.cnpj " +
                                "FROM(SELECT    a.id, " +
                                                "a.id_type, " +
                                                "a.doc_name, " +
                                                "a.doc_emission, " +
                                                "a.doc_dtAdd, " +
                                                "a.doc_user, " +
                                                "a.id_orgao, " +
                                                "c.doc_val, " +
                                                "c.id as id_version, " +
                                                "CASE " +
                                                    "WHEN(select count(z.id) from doc_version as z where z.id_doc = a.id) = 0 THEN 'Sem Anexos' " +
                                                    "WHEN DATEDIFF(c.doc_val, CURDATE()) - a.doc_emission > 15 THEN 'Normal' " +
                                                    "WHEN DATEDIFF(c.doc_val, CURDATE()) - a.doc_emission <= 15 && DATEDIFF(c.doc_val, CURDATE()) - a.doc_emission > 2 THEN 'Alerta' " +
                                                    "WHEN DATEDIFF(c.doc_val, CURDATE()) - a.doc_emission <= 2 && DATEDIFF(c.doc_val, CURDATE()) - a.doc_emission >= (a.doc_emission * -1) THEN 'Urgente' " +
                                                    "WHEN c.doc_val < CURDATE() THEN 'Vencido' " +
                                                    "WHEN c.doc_val is null THEN 'Sem Validade' " +
                                                    "ELSE 'Sem Anexo' " +
                                                "END as status, " +
                                                "a.cd_cgc_pj, " +
                                                "a.id_fornecedor " +
                                        "FROM doc a " +
                                        "LEFT JOIN doc_version c on(c.id_doc = a.id and c.id = (select max(y.id) " +
                                                                                                "from doc_version as y " +
                                                                                                "where y.id_doc = a.id)) " +
                                        "ORDER BY 3, 6) as a " +
                                "INNER JOIN doc_type b on b.id = a.id_type " +
                                "INNER JOIN usuarios x on x.id = a.doc_user " +
                                "LEFT JOIN doc_orgao d on d.id = b.orgao_type " +
                                "INNER JOIN doc_fornecedor z on z.id = a.id_fornecedor " +
                                "WHERE 1 = 1 " +
                                "and a.id_fornecedor = ?id_fornecedor " +
                                " and ((a.doc_user = ?id_usuario) or (a.id in (select x.id_item from usuarios_notificacao as x where x.id_usuario = ?id_usuario)) or (?id_perfil = '1')) " +
                                "group by a.id, a.doc_val, a.id_version";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("id_fornecedor", IdFornecedor));
                cmd.Parameters.Add(new MySqlParameter("id_usuario", IdUsuario));
                cmd.Parameters.Add(new MySqlParameter("id_perfil", IdPerfil));
                var dr = cmd.ExecuteReader();

                while (dr.Read())
                {
                    #pragma warning disable CS8601 // Possível atribuição de referência nula.
                    Documento documento = new Documento();
                    documento.IdDocumento = Convert.ToInt32(dr["id"]);
                    documento.DsTipo = dr["name_type"].ToString();
                    documento.DsDocumento = dr["doc_name"].ToString();
                    documento.DocumentoEmissao = Convert.ToInt32(dr["doc_emission"]);
                    documento.DtAdicionado = Convert.ToDateTime(dr["doc_dtAdd"]);
                    documento.UsuarioDocumento = Convert.ToInt32(dr["doc_user"]);
                    documento.DsUsuarioDocumento = dr["usu_nome"].ToString();
                    documento.StatusDocumento = dr["status"].ToString();
                    documento.DsOrgao = dr["ds_orgao"].ToString();
                    documento.CdCgcPj = dr["cd_cgc_pj"].ToString();
                    documento.Cnpj = dr["cnpj"].ToString();
                    documentos.Add(documento);
                }
                conn.Close();
                return documentos;
            }
            catch (Exception e)
            {
                return documentos;
            }
        }

        internal bool GravaDocumento(int IdFornecedor, string TituloDocumento, int Orgao, int PrazoEmissao, int IdUsuario) 
        {
            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();
                string? cnpj = "";

                string query = "select cnpj from doc_fornecedor where id = ?id_fornecedor";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("id_fornecedor", IdFornecedor));
                var dr = cmd.ExecuteReader();

                while (dr.Read())
                {
                    cnpj = dr["cnpj"].ToString();
                }

                conn.Close();

                string query2 = "INSERT INTO doc (doc_name, id_type, doc_emission, doc_dtAdd, doc_user, cd_cgc_pj,id_fornecedor) " +
                                "VALUES (?titulo_documento,?orgao,?prazo_emissao, NOW(),?id_usuario, ?cnpj, ?id_fornecedor) ";

                var cmd2 = conn.CreateCommand();
                conn.Open();
                cmd2.CommandText = query2;
                cmd2.Parameters.Add(new MySqlParameter("id_fornecedor", IdFornecedor));
                cmd2.Parameters.Add(new MySqlParameter("titulo_documento", TituloDocumento));
                cmd2.Parameters.Add(new MySqlParameter("orgao", Orgao));
                cmd2.Parameters.Add(new MySqlParameter("prazo_emissao", PrazoEmissao));
                cmd2.Parameters.Add(new MySqlParameter("cnpj", cnpj));
                cmd2.Parameters.Add(new MySqlParameter("id_usuario", IdUsuario));
                cmd2.ExecuteReader();
                
                conn.Close();
                return true;
            }
            catch (Exception e)
            {
                return false;
            }
        }

        internal List<VersaoDoc> ListarVersoes(int IdDocumento)
        {
            List<VersaoDoc> versoes = new List<VersaoDoc>();

            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = "SELECT a.id, " +
                    "a.id_doc, " +
                    "case when a.doc_titulo is null then '' else a.doc_titulo end doc_titulo, " +
                    "case when a.doc_val is null then '' else date_format(a.doc_val, '%d/%m/%Y') end doc_val, " +
                    "date_format(a.dt_upload, '%d/%m/%Y %H:%i:%s') as dt_upload, " +
                    "a.dt_upload as dt_upload_n_format, " +
                    "date_format(a.dt_emission, '%d/%m/%Y') as dt_emission, " +
                    "a.url_doc, " +
                    "a.user, " +
                    "coalesce(b.usu_nome, 'ND') usu_nome, " +
                    "CASE " +
                        "WHEN a.doc_val > CURDATE( ) THEN 'Valido' " +
                        "WHEN a.doc_val <= CURDATE( ) THEN 'Vencido' " +
                        "WHEN a.doc_val is null THEN 'Sem Validade' " +
                        "ELSE 'Erro' " +
                    "END as status " +
                    "FROM doc_version as a " +
                    "LEFT JOIN usuarios as b on b.id = a.user " +
                    "WHERE a.id_doc = ?id_documento";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("id_documento", IdDocumento));
                var dr = cmd.ExecuteReader();

                while (dr.Read())
                {
                    #pragma warning disable CS8601 // Possível atribuição de referência nula.
                    VersaoDoc versao = new VersaoDoc();
                    versao.Id = Convert.ToInt32(dr["id"]);
                    versao.IdDoc = Convert.ToInt32(dr["id_doc"]);
                    versao.DsTitulo = dr["doc_titulo"].ToString();
                    versao.DtValidade = dr["doc_val"].ToString();
                    versao.DtUpload = Convert.ToDateTime(dr["dt_upload"]);
                    versao.DtUploadNFormat = Convert.ToDateTime(dr["dt_upload_n_format"]);
                    versao.DtEmissao = Convert.ToDateTime(dr["dt_emission"]);
                    versao.UrlDoc = dr["url_doc"].ToString();
                    versao.IdUsuario = Convert.ToInt32(dr["user"]);
                    versao.UsuNome = dr["usu_nome"].ToString();
                    versao.Status = dr["status"].ToString();
                    versoes.Add(versao);
                }
                conn.Close();
                return versoes;
            }
            catch (Exception e)
            {
                return versoes;
            }
        }

        internal bool GravaVersao(int IdDocumento, DateTime DtEmissao, DateTime DtValidade, string Arquivo, string Usuario)
        {
            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = @"INSERT INTO doc_version (id_doc, doc_val, dt_upload, dt_emission, url_doc, user) VALUES (?id_documento,?dt_validade, NOW(),?dt_emissao, concat('./Assets/uploads/docs/controle/',?ds_caminho), ?id_usuario) ";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("id_documento", IdDocumento));
                cmd.Parameters.Add(new MySqlParameter("dt_validade", DtValidade));
                cmd.Parameters.Add(new MySqlParameter("dt_emissao", DtEmissao));
                cmd.Parameters.Add(new MySqlParameter("ds_caminho", Arquivo));
                cmd.Parameters.Add(new MySqlParameter("id_usuario", Usuario));
                cmd.ExecuteReader();

                conn.Close();
                return true;
            }
            catch (Exception e)
            {
                return false;
            }
        }

        internal int BuscarStatusDoc(string Status, int IdFornecedor, int IdUsuario, string IdPerfil)
        {
            int qtDoc = 0;
            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = "select count(final.id) total " +
                               "from (SELECT      b.name_type, " +
                                                  "a.id id, " +
                                                  "a.doc_name, " +
                                                  "a.doc_emission, " +
                                                  "date_format(a.doc_dtAdd, '%d/%m/%Y') as doc_dtAdd, " +
                                                  "a.doc_user, " +
                                                  "date_format(a.doc_val, '%d/%m/%Y') as doc_val, " +
                                                  "a.id_version, " +
                                                  "a.status, " +
                                                  "x.usu_nome, " +
                                                  "d.ds_orgao, " +
                                                  "a.cd_cgc_pj, " +
                                                  "a.id_fornecedor, " +
                                                  "max(a.id_version) " +
                                      "FROM (SELECT a.id, " +
                                                    "a.id_type, " +
                                                    "a.doc_name, " +
                                                    "a.doc_emission, " +
                                                    "a.doc_dtAdd, " +
                                                    "a.doc_user, " +
                                                    "a.id_orgao, " +
                                                    "c.doc_val, " +
                                                    "c.id as id_version, " +
                                                    "CASE " +
                                                    "WHEN (select count(z.id) from doc_version as z where z.id_doc = a.id) = 0 THEN 'Sem Anexos' " +
                                                    "WHEN DATEDIFF(c.doc_val,CURDATE( )) - a.doc_emission > 15 THEN 'Normal' " +
                                                    "WHEN DATEDIFF(c.doc_val,CURDATE( )) - a.doc_emission <= 15 && DATEDIFF(c.doc_val,CURDATE( )) - a.doc_emission > 2 THEN 'Alerta' " +
                                                    "WHEN DATEDIFF(c.doc_val,CURDATE( )) - a.doc_emission <= 2 && DATEDIFF(c.doc_val,CURDATE( )) - a.doc_emission >= (a.doc_emission*-1) THEN 'Urgente' " +
                                                    "WHEN c.doc_val < CURDATE() THEN 'Vencido' " +
                                                    "WHEN c.doc_val is null THEN 'Sem Validade' " +
                                                    "ELSE 'Sem Anexo' " +
                                                    "END as status, " +
                                                    "a.cd_cgc_pj, " +
                                                    "a.id_fornecedor " +
                                                    "FROM doc a " +
                                                    "LEFT JOIN doc_version c on c.id_doc = a.id " +
                                                    "ORDER BY 3,6) as a " +
                                      "INNER JOIN doc_type b on b.id = a.id_type " +
                                      "INNER JOIN usuarios x on x.id = a.doc_user " +
                                      "LEFT JOIN doc_orgao d on d.id = b.orgao_type " +
                                      "WHERE (a.status = ?status) " +
                                      "and (a.id_fornecedor = ?id_fornecedor) " +
                                      "and (a.id_version = (select max(y.id) " +
                                                            "from doc_version as y " +
                                                            "where y.id_doc = a.id) OR (a.id_version is null)) " +
                                      "and ( (a.doc_user = ?id_usuario) or (a.id in (select x.id_item from usuarios_notificacao as x where x.id_usuario = ?id_usuario)) or (?id_perfil = '1') ) " +
                                      "group by a.id, a.doc_val, a.id_version) final";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("status", Status));
                cmd.Parameters.Add(new MySqlParameter("id_fornecedor", IdFornecedor));
                cmd.Parameters.Add(new MySqlParameter("id_usuario", IdUsuario));
                cmd.Parameters.Add(new MySqlParameter("id_perfil", IdPerfil));
                var dr = cmd.ExecuteReader();

                while (dr.Read())
                {
                    qtDoc = Convert.ToInt32(dr["total"]);
                }
                conn.Close();
                return qtDoc;
            }
            catch (Exception e)
            {
                return qtDoc;
            }
        }

        internal Fornecedor BuscarDadosFornecedor(int IdFornecedor) 
        {
            Fornecedor fornecedor = new Fornecedor();
            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = "select a.id, a.razao_social, a.nome_fantasia, a.cnpj, a.municipio, a.estado, case when a.email is null then 'Sem E-mail' else a.email end as email, case when a.telefone is null then 'Sem Telefone' else a.telefone end as telefone, a.endereco, a.periodo_ava, b.nome, c.unidade_federativa from doc_fornecedor a left join municipio b on b.cd_tasy = a.municipio left join uf as c on c.sigla_uf = a.estado where a.id = ?id_fornecedor";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("id_fornecedor", IdFornecedor));
                var dr = cmd.ExecuteReader();

                while (dr.Read()) 
                {
                    #pragma warning disable CS8601 // Possível atribuição de referência nula.
                    fornecedor.IdFornecedor = Convert.ToInt32(dr["id"]);
                    fornecedor.RazaoSocial = dr["razao_social"].ToString();
                    fornecedor.NomeFantasia = dr["nome_fantasia"].ToString();
                    fornecedor.Cnpj = dr["cnpj"].ToString();
                    fornecedor.Municipio = Convert.ToInt32(dr["municipio"]);
                    fornecedor.Estado = dr["estado"].ToString();
                    fornecedor.Nome = dr["nome"].ToString();
                    fornecedor.Email = dr["email"].ToString();
                    fornecedor.Telefone = dr["telefone"].ToString();
                    fornecedor.Endereco = dr["endereco"].ToString();
                    fornecedor.PeriodoAvaliacao = dr["periodo_ava"].ToString();
                    fornecedor.UnidadeFederativa = dr["unidade_federativa"].ToString();
                }
                conn.Close();
                return fornecedor;
            }
            catch (Exception e)
            {
                return fornecedor;
            }
        }

        internal List<Orgao> BuscarOrgaos()
        {
            List<Orgao> orgaos = new List<Orgao>();
            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = "SELECT * FROM doc_orgao WHERE dt_exclusao is null ORDER BY 2";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                var dr = cmd.ExecuteReader();

                while (dr.Read())
                {
                    Orgao orgao = new Orgao();
                    #pragma warning disable CS8601 // Possível atribuição de referência nula.
                    orgao.Id = Convert.ToInt32(dr["id"]);
                    orgao.DsOrgao = dr["ds_orgao"].ToString();
                    orgaos.Add(orgao);
                }
                conn.Close();
                return orgaos;
            }
            catch (Exception e)
            {
                return orgaos;
            }
        }

        internal bool GravaOrgao(string NmOrgao)
        {
            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = "INSERT INTO doc_orgao (ds_orgao) VALUES ('" + NmOrgao + "')";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("ds_orgao", NmOrgao));
                var dr = cmd.ExecuteReader();


                conn.Close();
                return true;
            }
            catch (Exception e)
            {
                return false;
            }
        }

        internal bool EditaOrgao(int IdOrgao, string NmOrgao)
        {
            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = "UPDATE doc_orgao SET ds_orgao = ?nm_orgao WHERE id = ?id_orgao";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("nm_orgao", NmOrgao));
                cmd.Parameters.Add(new MySqlParameter("id_orgao", IdOrgao));
                var dr = cmd.ExecuteReader();

                conn.Close();
                return true;
            }
            catch (Exception e)
            {
                return false;
            }
        }

        internal bool ExcluirOrgao(int IdOrgao, int IdUsuario)
        {
            try
            {
                DBConfig dBConfig = new DBConfig();
                MySqlConnection conn = dBConfig.MysqlConn();

                string query = "UPDATE doc_orgao SET user_exclusao = ?id_usuario, dt_exclusao = NOW() WHERE id = ?id_orgao";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("id_usuario", IdUsuario));
                cmd.Parameters.Add(new MySqlParameter("id_orgao", IdOrgao));
                var dr = cmd.ExecuteReader();

                conn.Close();
                return true;
            }
            catch (Exception e)
            {
                return false;
            }
        }

        internal List<Escopo> BuscarEscopos()
        {
            List<Escopo> escopos = new List<Escopo>();
            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = "SELECT a.*,b.usuario FROM criterios_escopos a INNER JOIN usuarios b on b.id = a.user_inclusao WHERE a.dt_exclusao is null";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                var dr = cmd.ExecuteReader();

                while (dr.Read())
                {
                    Escopo escopo = new Escopo();
                    #pragma warning disable CS8601 // Possível atribuição de referência nula.
                    escopo.Id = Convert.ToInt32(dr["id"]);
                    escopo.GrupoEscopo = dr["grupos_criterios"].ToString();
                    escopo.UsuarioCadastro = Convert.ToInt32(dr["user_inclusao"]);
                    escopo.DtCadastro = Convert.ToDateTime(dr["dt_inclusao"]);
                    escopo.UsuarioExclusao = DBNull.Value.Equals(dr["user_exclusao"]) ? 0 : Convert.ToInt32(dr["user_exclusao"]);
                    escopo.DtExclusao = dr["dt_exclusao"].ToString();
                    escopo.NmUsuario = dr["usuario"].ToString();
                    escopos.Add(escopo);
                }
                conn.Close();
                return escopos;
            }
            catch (Exception e)
            {
                return escopos;
            }
        }

        internal bool GravaEscopo(string NmEscopo, int IdUsuario)
        {
            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = "INSERT INTO criterios_escopos (grupos_criterios, user_inclusao, dt_inclusao) VALUES (?nm_escopo,?id_usuario, NOW())";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("nm_escopo", NmEscopo));
                cmd.Parameters.Add(new MySqlParameter("id_usuario", IdUsuario));
                var dr = cmd.ExecuteReader();


                conn.Close();
                return true;
            }
            catch (Exception e)
            {
                return false;
            }
        }

        internal bool EditaEscopo(int IdEscopo, string NmEscopo) 
        {
            try 
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = "UPDATE criterios_escopos SET grupos_criterios = ?nm_escopo WHERE id = ?id_escopo";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("nm_escopo", NmEscopo));
                cmd.Parameters.Add(new MySqlParameter("id_escopo", IdEscopo));
                var dr = cmd.ExecuteReader();

                conn.Close();
                return true;
            }
            catch(Exception e)
            {
                return false;
            }
        }

        internal bool ExcluirEscopo(int IdEscopo, int IdUsuario) 
        {
            try 
            {
                DBConfig dBConfig = new DBConfig();
                MySqlConnection conn = dBConfig.MysqlConn();

                string query = "UPDATE criterios_escopos SET user_exclusao = ?id_usuario, dt_exclusao = NOW() WHERE id = ?id_escopo";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("id_usuario", IdUsuario));
                cmd.Parameters.Add(new MySqlParameter("id_escopo", IdEscopo));
                var dr = cmd.ExecuteReader();

                conn.Close();
                return true;
            }
            catch (Exception e)
            {
                return false;
            }
        }

        internal List<Requisito> BuscarRequisitos() 
        {
            List<Requisito> requisitos = new List<Requisito>();
            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = "SELECT a.*, " +
                    "b.ds_orgao, " +
                    "c.id id_req, " +
                    "c.requisitos, " +
                    "CASE " +
                    "WHEN (SELECT count(y.id_type) FROM criterios_requisitos y WHERE y.id_type = a.id) > 0 " +
                    "THEN 'Requisito' " +
                    "ELSE 'Não Requisito' " +
                    "END status_req " +
                    "FROM doc_type a " +
                    "LEFT JOIN doc_orgao b on b.id = a.orgao_type " +
                    "LEFT JOIN criterios_requisitos c on c.id_type = a.id " +
                    "ORDER BY 5 desc, 2";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                var dr = cmd.ExecuteReader();

                while (dr.Read())
                {
                    Requisito requisito = new Requisito();
                    #pragma warning disable CS8601 // Possível atribuição de referência nula.
                    requisito.Id = Convert.ToInt32(dr["id"]);
                    requisito.DsTipo = dr["name_type"].ToString();
                    requisito.IdOrgao = DBNull.Value.Equals(dr["orgao_type"]) ? 0 : Convert.ToInt32(dr["orgao_type"]);
                    requisito.DsReferente = dr["ref_type"].ToString();
                    requisito.IeRequisito = DBNull.Value.Equals(dr["req_type"]) ? 0 : Convert.ToInt32(dr["req_type"]);
                    requisito.DsOrgao = dr["ds_orgao"].ToString();
                    requisito.IdRequisito = DBNull.Value.Equals(dr["id_req"]) ? 0 : Convert.ToInt32(dr["id_req"]);
                    requisito.DsRequisito = dr["requisitos"].ToString();
                    requisito.StRequisito = dr["status_req"].ToString();
                    requisitos.Add(requisito);
                }
                conn.Close();
                return requisitos;
            }
            catch (Exception e)
            {
                return requisitos;
            }
        }

        internal bool GravaRequisito(string DsTipo, string DsOrgao, string DsReferente, int IeRequisito, int IdUsuario)
        {
            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = "INSERT INTO doc_type (name_type, orgao_type, ref_type, req_type) VALUES (?ds_tipo, ?ds_orgao, ?ds_referente, ?ie_requisito)";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("ds_tipo", DsTipo));
                cmd.Parameters.Add(new MySqlParameter("ds_orgao", DsOrgao));
                cmd.Parameters.Add(new MySqlParameter("ds_referente", DsReferente));
                cmd.Parameters.Add(new MySqlParameter("ie_requisito", IeRequisito));
                var dr = cmd.ExecuteReader();

                string query2 = "INSERT INTO criterios_requisitos (id_type, requisitos, user_inclusao, dt_inclusao) VALUES (" + cmd.LastInsertedId + ", ?ds_tipo, ?id_usuario, NOW())";

                var cmd2 = conn.CreateCommand();
                conn.Open();
                cmd2.CommandText = query2;
                cmd2.Parameters.Add(new MySqlParameter("ds_tipo", DsTipo));
                cmd2.Parameters.Add(new MySqlParameter("id_usuario", IdUsuario));
                var dr2 = cmd2.ExecuteReader();

                conn.Close();
                return true;
            }
            catch (Exception e)
            {
                return false;
            }
        }

        internal bool EditaRequisito(int IdRequisito, string DsTipo, string DsOrgao, string DsReferente, int IeRequisito)
        {
            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = "UPDATE doc_type SET name_type = ?ds_tipo, orgao_type = ?ds_orgao, ref_type = ?ds_referente, req_type = ?ie_requisito WHERE id = ?id_requisito";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("ds_tipo", DsTipo));
                cmd.Parameters.Add(new MySqlParameter("ds_orgao", DsOrgao));
                cmd.Parameters.Add(new MySqlParameter("ds_referente", DsReferente));
                cmd.Parameters.Add(new MySqlParameter("ie_requisito", IeRequisito));
                cmd.Parameters.Add(new MySqlParameter("id_requisito", IdRequisito));
                var dr = cmd.ExecuteReader();

                string query2 = "UPDATE criterios_requisitos SET requisitos = ?ds_tipo WHERE id_type = ?id_requisito";

                var cmd2 = conn.CreateCommand();
                conn.Open();
                cmd2.CommandText = query2;
                cmd2.Parameters.Add(new MySqlParameter("ds_tipo", DsTipo));
                cmd2.Parameters.Add(new MySqlParameter("id_requisito", IdRequisito));
                var dr2 = cmd2.ExecuteReader();

                conn.Close();
                return true;
            }
            catch (Exception e)
            {
                return false;
            }
        }

        internal bool ExcluirRequisito(int IdRequisito, int IdUsuario)
        {
            try
            {
                DBConfig dBConfig = new DBConfig();
                MySqlConnection conn = dBConfig.MysqlConn();

                string query = "UPDATE doc_type SET user_exclusao = ?id_usuario, dt_exclusao = NOW() WHERE id = ?id_requisito";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("id_usuario", IdUsuario));
                cmd.Parameters.Add(new MySqlParameter("id_requisito", IdRequisito));
                var dr = cmd.ExecuteReader();

                string query2 = "UPDATE criterios_requisitos SET user_exclusao = ?id_usuario, dt_exclusao = NOW() WHERE id_type = ?id_requisito";

                var cmd2 = conn.CreateCommand();
                conn.Open();
                cmd2.CommandText = query2;
                cmd2.Parameters.Add(new MySqlParameter("id_usuario", IdUsuario));
                cmd2.Parameters.Add(new MySqlParameter("id_requisito", IdRequisito));
                var dr2 = cmd2.ExecuteReader();

                conn.Close();
                return true;
            }
            catch (Exception e)
            {
                return false;
            }
        }

        internal List<Escopo> BuscaEscopoFornecedor(int IdFornecedor)
        {
            List<Escopo> escopos = new List<Escopo>();
            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = "SELECT  a.id, a.id_escopo, a.id_fornecedor, a.user_inclusao, a.dt_inclusao, a.user_exclusao, a.dt_exclusao, b.grupos_criterios, c.nome_fantasia, GROUP_CONCAT(e.requisitos) requisitos, f.usuario FROM criterios_fornecedor a INNER JOIN criterios_escopos b on b.id = a.id_escopo INNER JOIN doc_fornecedor c on c.id = a.id_fornecedor INNER JOIN criterios_docs d on d.id_escopos = a.id_escopo INNER JOIN criterios_requisitos e on e.id = d.id_requisitos INNER JOIN usuarios f on f.id = a.user_inclusao WHERE a.id_fornecedor = ?id_fornecedor AND a.user_exclusao is null AND a.dt_exclusao is null GROUP BY a.id";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("id_fornecedor", IdFornecedor));
                var dr = cmd.ExecuteReader();

                while (dr.Read())
                {
                    Escopo escopo = new Escopo();
                    #pragma warning disable CS8601 // Possível atribuição de referência nula.
                    escopo.Id = Convert.ToInt32(dr["id"]);
                    escopo.IdFornecedor = Convert.ToInt32(dr["id_fornecedor"]);
                    escopo.IdEscopo = Convert.ToInt32(dr["id_escopo"]);
                    escopo.UsuarioCadastro = Convert.ToInt32(dr["user_inclusao"]);
                    escopo.DtCadastro = Convert.ToDateTime(dr["dt_inclusao"]);
                    escopo.UsuarioExclusao = Convert.ToInt32(dr["user_exclusao"]);
                    escopo.DtExclusao = dr["dt_exclusao"].ToString();
                    escopo.GrupoEscopo = dr["grupos_criterios"].ToString();
                    escopo.NmFantasia = dr["nome_fantasia"].ToString();
                    escopo.Requisitos = dr["requisitos"].ToString();
                    escopo.NmUsuario = dr["usuario"].ToString();
                    escopos.Add(escopo);
                }
                conn.Close();
                return escopos;
            }
            catch (Exception e)
            {
                return escopos;
            }
        }

        internal List<Setor> BuscaSetorFornecedor(int IdFornecedor)
        {
            List<Setor> setores = new List<Setor>();
            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = "SELECT  a.id, a.id_escopo, a.id_fornecedor, a.user_inclusao, a.dt_inclusao, a.user_exclusao, a.dt_exclusao, b.grupos_criterios, c.nome_fantasia, GROUP_CONCAT(e.requisitos) requisitos, f.usuario FROM criterios_fornecedor a INNER JOIN criterios_escopos b on b.id = a.id_escopo INNER JOIN doc_fornecedor c on c.id = a.id_fornecedor INNER JOIN criterios_docs d on d.id_escopos = a.id_escopo INNER JOIN criterios_requisitos e on e.id = d.id_requisitos INNER JOIN usuarios f on f.id = a.user_inclusao WHERE a.id_fornecedor = ?id_fornecedor AND a.user_exclusao is null AND a.dt_exclusao is null GROUP BY a.id";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("id_fornecedor", IdFornecedor));
                var dr = cmd.ExecuteReader();

                while (dr.Read())
                {
                    Setor setor = new Setor();
                    #pragma warning disable CS8601 // Possível atribuição de referência nula.
                    setor.Id = Convert.ToInt32(dr["id"]);
                    setor.IdFornecedor = Convert.ToInt32(dr["id_fornecedor"]);
                    setor.IdSetor = Convert.ToInt32(dr["id_setor"]);
                    setor.NmSetor = dr["nm_setor"].ToString();
                    setor.UsuarioCadastro = Convert.ToInt32(dr["user_register"]);
                    setor.NmUsuario = dr["user_exclusao"].ToString();
                    setor.DtCadastro = Convert.ToDateTime(dr["dt_register"]);
                    setores.Add(setor);
                }
                conn.Close();
                return setores;
            }
            catch (Exception e)
            {
                return setores;
            }
        }

        internal List<AvaliacaoFornecedor> ListarAvaliacoes(int IdFornecedor)
        {
            List<AvaliacaoFornecedor> avaliacoes = new List<AvaliacaoFornecedor>();
            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = "select a.id,a.id_fornecedor,a.id_esc,b.grupos_criterios,a.aprov_fornecedor,a.reprov_fornecedor,a.geral,a.user_register,c.usu_nome,a.dt_register,d.periodo_ava FROM doc_ava a inner join criterios_escopos b on b.id = a.id_esc inner join usuarios c on c.id = a.user_register inner join doc_fornecedor d on d.id = a.id_fornecedor where id_fornecedor = ?id_fornecedor";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("id_fornecedor", IdFornecedor));
                var dr = cmd.ExecuteReader();

                while (dr.Read())
                {
                    AvaliacaoFornecedor avaliacao = new AvaliacaoFornecedor();
                    #pragma warning disable CS8601 // Possível atribuição de referência nula.
                    avaliacao.Id = Convert.ToInt32(dr["id"]);
                    avaliacao.IdFornecedor = Convert.ToInt32(dr["id_fornecedor"]);
                    avaliacao.IdEsc = Convert.ToInt32(dr["id_esc"]);
                    avaliacao.GrupoEscopo = dr["grupos_criterios"].ToString();
                    avaliacao.AprovadoFornecedor = Convert.ToInt32(dr["aprov_fornecedor"]);
                    avaliacao.ReprovadoFornecedor = Convert.ToInt32(dr["reprov_fornecedor"]);
                    avaliacao.Geral = DBNull.Value.Equals(dr["geral"]) ? 0 : float.Parse(dr["geral"].ToString());
                    avaliacao.UsuarioCadastro = Convert.ToInt32(dr["user_register"]);
                    avaliacao.NmUsuario = dr["usu_nome"].ToString();
                    avaliacao.DtCadastro = Convert.ToDateTime(dr["dt_register"]);
                    avaliacao.PeriodoAva = dr["periodo_ava"].ToString();
                    avaliacoes.Add(avaliacao);
                }
                conn.Close();
                return avaliacoes;
            }
            catch (Exception e)
            {
                return avaliacoes;
            }
        }

        internal List<Rnc> ListarRnc(int IdFornecedor)
        {
            List<Rnc> Rncs = new List<Rnc>();
            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = "select a.id,a.id_fornecedor,a.data_rnc,a.nm_emitente,a.setor_emitente FROM doc_rnc a where a.id_fornecedor = ?id_fornecedor";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("id_fornecedor", IdFornecedor));
                var dr = cmd.ExecuteReader();

                while (dr.Read())
                {
                    Rnc Rnc = new Rnc();
                    #pragma warning disable CS8601 // Possível atribuição de referência nula.
                    Rnc.Id = Convert.ToInt32(dr["id"]);
                    Rnc.IdFornecedor = Convert.ToInt32(dr["id_fornecedor"]);
                    Rnc.DtCadastro = Convert.ToDateTime(dr["data_rnc"]);
                    Rnc.NmEmitente = dr["nm_emitente"].ToString();
                    Rnc.SetorEmitente = dr["setor_emitente"].ToString();
                    Rncs.Add(Rnc);
                }
                conn.Close();
                return Rncs;
            }
            catch (Exception e)
            {
                return Rncs;
            }
        }

        #endregion

        #region Funções Geral Indicadores -- Qualidade

        internal List<Indicadores> ListaIndicadores()
        {
            DBConfig dbConfig = new DBConfig();
            MySqlConnection conn = dbConfig.MysqlConn();

            List<Indicadores> indicadores = new List<Indicadores>();
            try
            {

                string query = "select * from indicadores a where user_deleta is null and dt_deleta = '0001-01-01 00:00:00' order by 1 desc";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                var dr = cmd.ExecuteReader();

                while (dr.Read())
                {
                    Indicadores indicador = new Indicadores();
                    #pragma warning disable CS8601 // Possível atribuição de referência nula.
                    indicador.Id = Convert.ToInt32(dr["id"]);
                    indicador.NomeIndicador = Convert.ToInt32(dr["nome_indicador"]);
                    indicador.SetorIndicador = Convert.ToInt32(dr["setor_indicador"]);
                    indicador.UserCadastro = dr["user_cadastro"].ToString();
                    indicador.DtCadastro = Convert.ToDateTime(dr["dt_cadastro"]);
                    indicador.UserEdita = dr["user_edita"].ToString();
                    indicador.DtEdita = Convert.ToDateTime(dr["dt_edita"]);
                    indicador.UserDeleta = dr["user_deleta"].ToString();
                    indicador.DtDeleta = Convert.ToDateTime(dr["dt_deleta"]);
                    indicadores.Add(indicador);
                }
                dr.Close();
                return indicadores;
            }
            catch (Exception e)
            {
                throw;
            }
            finally 
            {
                conn.Close();
            }
        }

        #endregion

        #region Funções Indicador 5'S -- Qualidade

        internal List<Indicador> ListaIndicador()
        {
            DBConfig dbConfig = new DBConfig();
            MySqlConnection conn = dbConfig.MysqlConn();

            List<Indicador> indicadores = new List<Indicador>();
            try
            {

                string query = "select * from indicador5s a where user_deleta is null and dt_deleta = '0001-01-01 00:00:00' order by 1 desc";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                var dr = cmd.ExecuteReader();

                while (dr.Read())
                {
                    Indicador indicador = new Indicador();
                    #pragma warning disable CS8601 // Possível atribuição de referência nula.
                    indicador.Id = Convert.ToInt32(dr["id"]);
                    indicador.GestaoResiduos = Convert.ToInt32(dr["gestao_residuos"]);
                    indicador.ConsumoRecursosNaturais = Convert.ToInt32(dr["cons_rec_naturais"]);
                    indicador.SegurancaTrabalho = Convert.ToInt32(dr["seg_trabalho"]);
                    indicador.ResultadoGeral = Convert.ToInt32(dr["res_geral"]);
                    indicador.DtAuditoria = Convert.ToDateTime(dr["dt_auditoria"]);
                    indicador.UserCadastro = dr["user_cadastro"].ToString();
                    indicador.DtCadastro = Convert.ToDateTime(dr["dt_cadastro"]);
                    indicador.UserEdita = dr["user_edita"].ToString();
                    indicador.DtEdita = Convert.ToDateTime(dr["dt_edita"]);
                    indicador.UserDeleta = dr["user_deleta"].ToString();
                    indicador.DtDeleta = Convert.ToDateTime(dr["dt_deleta"]);
                    indicadores.Add(indicador);
                }
                dr.Close();
                return indicadores;
            }
            catch (Exception e)
            {
                throw;
            }
            finally 
            {
                conn.Close();
            }
        }

        internal StatusFunc GravaIndicador(Indicador indicador, string usuario)
        {
            DBConfig dbConfig = new DBConfig();
            MySqlConnection conn = dbConfig.MysqlConn();

            StatusFunc status = new StatusFunc();
            try
            {

                string query = "insert into indicador5s (gestao_residuos, cons_rec_naturais, seg_trabalho, res_geral, dt_auditoria, user_cadastro, dt_cadastro) VALUES (?gestao_residuos,?consumo_naturais,?seguranca_trabalho,?resultado_geral,?dt_auditoria,?user_cadastro,NOW())";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("gestao_residuos", indicador.GestaoResiduos));
                cmd.Parameters.Add(new MySqlParameter("consumo_naturais", indicador.ConsumoRecursosNaturais));
                cmd.Parameters.Add(new MySqlParameter("seguranca_trabalho", indicador.SegurancaTrabalho));
                cmd.Parameters.Add(new MySqlParameter("resultado_geral", indicador.ResultadoGeral));
                cmd.Parameters.Add(new MySqlParameter("dt_auditoria", indicador.DtAuditoria));
                cmd.Parameters.Add(new MySqlParameter("user_cadastro", usuario));
                cmd.ExecuteNonQuery();

                status.DsReturn = "Valores inseridos com sucesso!";
                status.Status = true;
                return status;
            }
            catch (Exception e)
            {
                status.DsReturn = "Não foi possível executar a função: " + e.ToString();
                status.Status = false;
                return status;
            }
            finally 
            {
                conn.Close();
            }
        }

        internal StatusFunc EditaIndicador(Indicador indicador, string usuario)
        {
            StatusFunc status = new StatusFunc();
            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = "update indicador5s set gestao_residuos = ?gestao_residuos, cons_rec_naturais = ?consumo_naturais, seg_trabalho = ?seguranca_trabalho, res_geral = ?resultado_geral, dt_auditoria = ?dt_auditoria, user_edita = ?user_edita, dt_edita = NOW() where id = ?id";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("id", indicador.Id));
                cmd.Parameters.Add(new MySqlParameter("gestao_residuos", indicador.GestaoResiduos));
                cmd.Parameters.Add(new MySqlParameter("consumo_naturais", indicador.ConsumoRecursosNaturais));
                cmd.Parameters.Add(new MySqlParameter("seguranca_trabalho", indicador.SegurancaTrabalho));
                cmd.Parameters.Add(new MySqlParameter("resultado_geral", indicador.ResultadoGeral));
                cmd.Parameters.Add(new MySqlParameter("dt_auditoria", indicador.DtAuditoria));
                cmd.Parameters.Add(new MySqlParameter("user_edita", usuario));
                cmd.ExecuteReader();

                conn.Close();
                status.DsReturn = "Valores alterados com sucesso!";
                status.Status = true;
                return status;
            }
            catch (Exception e)
            {
                status.DsReturn = "Não foi possível executar a função: " + e.ToString();
                status.Status = false;
                return status;
            }
        }

        internal StatusFunc ExcluirIndicador(int IdIndicador, string usuario)
        {
            StatusFunc status = new StatusFunc();
            try
            {
                DBConfig dbConfig = new DBConfig();
                MySqlConnection conn = dbConfig.MysqlConn();

                string query = "update indicador5s set user_deleta = ?user_deleta, dt_deleta = now() where id = ?id";

                var cmd = conn.CreateCommand();
                conn.Open();
                cmd.CommandText = query;
                cmd.Parameters.Add(new MySqlParameter("user_deleta", usuario));
                cmd.Parameters.Add(new MySqlParameter("id", IdIndicador));
                cmd.ExecuteReader();

                conn.Close();
                status.DsReturn = "Indicador excluído!";
                status.Status = true;
                return status;
            }
            catch (Exception e)
            {
                status.DsReturn = "Não foi possível executar a função: " + e.ToString();
                status.Status = false;
                return status;
            }
        }

        #endregion
    }
}
