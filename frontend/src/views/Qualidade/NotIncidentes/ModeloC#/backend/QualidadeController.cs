using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NexusHealth_WS.Classes;
using NexusHealth_WS.Model;
using Microsoft.AspNetCore.Components.Forms;
using System.IO;
using System.Net.Http;
using Newtonsoft.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using NexusHealth_WS.Util;
using System.Text;
//using System.Linq.Dynamic.Core.Tokenizer;

namespace NexusHealth_WS.Controllers
{

    [Authorize]
    [ApiController]
    [Route("[controller]/[action]")]
    public class QualidadeController : Controller
    {

        private readonly JwtAuthenticationManager jwtAuthenticationManager;
        public QualidadeController(JwtAuthenticationManager jwtAuthenticationManager)
        {
            this.jwtAuthenticationManager = jwtAuthenticationManager;
        }

        //Função Campanhas

        //Função Controle de Documentos

        //             ,        ,
        //            /(        )`
        //            \ \___   / |
        //            /- _  `-/  '
        //           (/\/ \ \   /\
        //           / /   | `    \
        //           O O   ) /    |
        //           `-^--'`<     '
        //          (_.) _  )   /
        //           `.___/`    /
        //             `-----' /
        //<----.     __ / __   \
        //<----|====O)))==) \) /====
        //<----'    `--' `.__,' \
        //             |        |
        //              \       /
        //         ______((_  / \______
        //       ,'  ,-----'   |        \
        //       `--{
        //         __________)        \/
        //********Gambiarra da braba... precisamos ver outra forma de fazer isso, feio demais!!!!********//
        [HttpGet]
        [Authorize]
        public UploadResult UploadResult()
        {
            return new UploadResult();
        }

        [HttpGet]
        [Authorize]
        public DocumentoUpload DocumentoUpload()
        {
            return new DocumentoUpload();
        }
        //********Gambiarra da braba... precisamos ver outra forma de fazer isso, feio demais!!!!********//


        [HttpGet]
        [Authorize]
        public List<Fornecedor> ListarFornecedores()
        {
            QualidadeModel model = new QualidadeModel();
            return model.ListarFornecedores();
        }

        [HttpGet]
        [Authorize]
        public List<Fornecedor> ListarFornecedor(string dsRazaoSocial, string dsNomeFantasia, string dsCnpj, string dsMunicipio, string dsEstado, string dsSetor)
        {
            QualidadeModel model = new QualidadeModel();
            return model.ListarFornecedor(dsRazaoSocial, dsNomeFantasia, dsCnpj, dsMunicipio, dsEstado, dsSetor);
        }

        [HttpGet]
        [Authorize]
        public List<Documento> ListarDocumentos(int IdFornecedor, int IdUsuario, string IdPerfil)
        {
            QualidadeModel model = new QualidadeModel();
            return model.ListarDocumentos(IdFornecedor, IdUsuario, IdPerfil);
        }

        [HttpPost]
        [Authorize]
        public bool GravaDocumento(int IdFornecedor, string TituloDocumento, int Orgao, int PrazoEmissao, int IdUsuario)
        {
            QualidadeModel model = new QualidadeModel();
            return model.GravaDocumento(IdFornecedor, TituloDocumento, Orgao, PrazoEmissao, IdUsuario);
        }


        [HttpGet]
        [Authorize]
        public List<VersaoDoc> ListarVersoes(int IdDocumento)
        {
            QualidadeModel model = new QualidadeModel();
            return model.ListarVersoes(IdDocumento);
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> GravaVersao([FromBody] MultipartFormDataContent formData)
        {
            try
            {
                // Obter os dados do formulário
                var jsonDocData = formData.FirstOrDefault(x => x.Headers.ContentDisposition.Name.Trim('\"') == "jsonDocData")?.ReadAsStringAsync().Result;
                var tokenUsuario = formData.FirstOrDefault(x => x.Headers.ContentDisposition.Name.Trim('\"') == "token")?.ReadAsStringAsync().Result;
                var inputFile = await formData.ReadAsStringAsync();

                if (inputFile == null)
                {
                    return BadRequest("Nenhum arquivo enviado.");
                }

                // Obter Nome Usuário
                var decToken = jwtAuthenticationManager.ValidateToken(tokenUsuario);

                // Desserializar documento
                var documento = JsonConvert.DeserializeObject<DocumentoUpload>(jsonDocData);

                // Converter a string do arquivo em bytes
                var inputFileBytes = Encoding.UTF8.GetBytes(inputFile);

                // URL do servidor de armazenamento
                string resourcePath = @"\\192.168.1.217\eCionc-Nginx\Assets\uploads\docs\controle\";
                // Nome do arquivo
                var fileName = "docteste_" + documento.IdDocumento + "_" + DateTime.Now.ToString("dd-MM-yy_H-m") + ".pdf";

                var path = Path.Combine(resourcePath, fileName);
                await System.IO.File.WriteAllBytesAsync(path, inputFileBytes);

                // Resto do código para processar os dados e salvar no banco de dados

                QualidadeModel model = new QualidadeModel();
                //model.GravaVersao(documentoUpload.IdDocumento, documentoUpload.DtEmissao, documentoUpload.DtValidade, documentoUpload.ArquivoDs, decToken.Claims.First(claim => claim.Type == "unique_name").Value.ToString());


                return Ok("Arquivo enviado e processado com sucesso.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Erro ao processar o arquivo: {ex.Message}");
            }
        }

        [HttpGet]
        [Authorize]
        public int BuscarStatusDoc(string Status,int IdFornecedor, int IdUsuario, string IdPerfil)
        {
            QualidadeModel model = new QualidadeModel();
            return model.BuscarStatusDoc(Status, IdFornecedor, IdUsuario, IdPerfil);
        }

        [HttpGet]
        [Authorize]
        public Fornecedor BuscaDadosFornecedor(int IdFornecedor) 
        {
            QualidadeModel model = new QualidadeModel();
            return model.BuscarDadosFornecedor(IdFornecedor);
        }

        [HttpGet]
        [Authorize]
        public List<Orgao> BuscarOrgaos()
        {
            QualidadeModel model = new QualidadeModel();
            return model.BuscarOrgaos();
        }

        [HttpPost]
        [Authorize]
        public bool GravaOrgao(string NmOrgao)
        {
            QualidadeModel model = new QualidadeModel();
            return model.GravaOrgao(NmOrgao);
        }

        [HttpPost]
        [Authorize]
        public bool EditaOrgao(int IdOrgao, string NmOrgao)
        {
            QualidadeModel model = new QualidadeModel();
            return model.EditaOrgao(IdOrgao, NmOrgao);
        }

        [HttpPost]
        [Authorize]
        public bool ExcluirOrgao(int IdOrgao, int IdUsuario)
        {
            QualidadeModel model = new QualidadeModel();
            return model.ExcluirOrgao(IdOrgao, IdUsuario);
        }

        [HttpGet]
        [Authorize]
        public List<Escopo> BuscarEscopos()
        {
            QualidadeModel model = new QualidadeModel();
            return model.BuscarEscopos();
        }

        [HttpPost]
        [Authorize]
        public bool GravaEscopo(string NmEscopo, int IdUsuario) 
        {
            QualidadeModel model = new QualidadeModel();
            return model.GravaEscopo(NmEscopo, IdUsuario);
        }

        [HttpPost]
        [Authorize]
        public bool EditaEscopo(int IdEscopo, string NmEscopo) 
        {
            QualidadeModel model = new QualidadeModel();
            return model.EditaEscopo(IdEscopo, NmEscopo);
        }

        [HttpPost]
        [Authorize]
        public bool ExcluirEscopo(int IdEscopo, int IdUsuario)
        {
            QualidadeModel model = new QualidadeModel();
            return model.ExcluirEscopo(IdEscopo, IdUsuario);
        }

        [HttpGet]
        [Authorize]
        public List<Requisito> BuscarRequisitos()
        {
            QualidadeModel model = new QualidadeModel();
            return model.BuscarRequisitos();
        }

        [HttpPost]
        [Authorize]
        public bool GravaRequisito(string DsTipo, string DsOrgao, string DsReferente, int IeRequisito, int IdUsuario)
        {
            QualidadeModel model = new QualidadeModel();
            return model.GravaRequisito(DsTipo, DsOrgao, DsReferente, IeRequisito, IdUsuario);
        }

        [HttpPost]
        [Authorize]
        public bool EditaRequisito(int IdRequisito, string DsTipo, string DsOrgao, string DsReferente, int IeRequisito)
        {
            QualidadeModel model = new QualidadeModel();
            return model.EditaRequisito(IdRequisito, DsTipo, DsOrgao, DsReferente, IeRequisito);
        }

        [HttpPost]
        [Authorize]
        public bool ExcluirRequisito(int IdRequisito, int IdUsuario)
        {
            QualidadeModel model = new QualidadeModel();
            return model.ExcluirRequisito(IdRequisito, IdUsuario);
        }

        [HttpGet]
        [Authorize]
        public List<Escopo> BuscaEscopoFornecedor(int IdFornecedor) 
        {
            QualidadeModel model = new QualidadeModel();
            return model.BuscaEscopoFornecedor(IdFornecedor);
        }

        [HttpGet]
        [Authorize]
        public List<Setor> BuscaSetorFornecedor(int IdFornecedor) 
        {
            QualidadeModel model= new QualidadeModel();
            return model.BuscaSetorFornecedor(IdFornecedor);
        }

        [HttpGet]
        [Authorize]
        public List<AvaliacaoFornecedor> ListarAvaliacoes(int IdFornecedor)
        {
            QualidadeModel model = new QualidadeModel();
            return model.ListarAvaliacoes(IdFornecedor);
        }

        [HttpGet]
        [Authorize]
        public List<Rnc> ListarRnc(int IdFornecedor)
        {
            QualidadeModel model = new QualidadeModel();
            return model.ListarRnc(IdFornecedor);
        }
        //Função Análise Crítica


        //Função Termos --> LGPD

        //Função Geral Indicadores -- Qualidade

        [HttpGet]
        [Authorize]
        public List<Indicadores> ListaIndicadores()
        {
            QualidadeModel model = new QualidadeModel();
            return model.ListaIndicadores();
        }

        //Função Indicador 5'S -- Qualidade
        [HttpGet]
        [Authorize]
        public List<Indicador> ListaIndicador()
        {
            QualidadeModel model = new QualidadeModel();
            return model.ListaIndicador();
        }

        [HttpPost]
        [Authorize]
        public StatusFunc GravaIndicador([FromBody] string parametro, string token)
        {
            QualidadeModel model = new QualidadeModel();
            var decToken = jwtAuthenticationManager.ValidateToken(token);
            string NmUsuario = decToken.Claims.First(claim => claim.Type == "unique_name").Value.ToString();
            return model.GravaIndicador(JsonConvert.DeserializeObject<Indicador>(parametro), NmUsuario);
        }

        [HttpPost]
        [Authorize]
        public StatusFunc EditaIndicador([FromBody] string parametro, string token)
        {
            QualidadeModel model = new QualidadeModel();
            var decToken = jwtAuthenticationManager.ValidateToken(token);
            string NmUsuario = decToken.Claims.First(claim => claim.Type == "unique_name").Value.ToString();
            return model.EditaIndicador(JsonConvert.DeserializeObject<Indicador>(parametro), NmUsuario);
        }

        [HttpPost]
        [Authorize]
        public StatusFunc ExcluirIndicador(int IdIndicador, string token)
        {
            QualidadeModel model = new QualidadeModel();
            var decToken = jwtAuthenticationManager.ValidateToken(token);
            string NmUsuario = decToken.Claims.First(claim => claim.Type == "unique_name").Value.ToString();
            return model.ExcluirIndicador(IdIndicador, NmUsuario);
        }
    }
}
