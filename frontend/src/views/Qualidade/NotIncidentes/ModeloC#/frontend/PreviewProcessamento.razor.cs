using Microsoft.AspNetCore.Components;
using APIClient;
using NexusHealth_Blazor.Config;
using Radzen;
using Radzen.Blazor;
using Microsoft.AspNetCore.Components.Web;
using System.Net.Http.Headers;
using static NexusHealth_Blazor.Pages.Qualidade.GestaodeNotificacoes.GestaodeNotificacoes;

namespace NexusHealth_Blazor.Pages.Qualidade.GestaodeNotificacoes
{
    public partial class PreviewProcessamento
    {
        //WebService
        public static ConfigWS wsConfig = new ConfigWS();
        public HttpClient httpClient = new HttpClient();

        [Parameter] public NotificacaoIncidente notificacaoTemp { get; set; }
        [Parameter] public string NmNotificador { get; set; }
        [Parameter] public string DsSetor { get; set; }
        [Parameter] public string NmPaciente { get; set; }
        [Parameter] public string DsIncidente { get; set; }
        [Parameter] public string DsMedico { get; set; }

        public NotificacaoIncidente notificacao { get; set; }
        public List<MedicoRepasse> listaMedicos = new();
        public List<Funcionario> listaFuncionarios = new();
        public List<NotificacaoIncidenteTipo> listaTipos = new();
        public List<Setor> listaSetores = new();
        public StatusFunc statusfunc = new();

        string nmFuncao { get; set; }
        string modal { get; set; }

        public static class ieEtapas
        {
            //Etapas
            public static bool IeClassProt { get; set; } = true;
            public static bool IeDiagramas { get; set; } = false;
            public static bool IePlanosAcao { get; set; } = false;
            public static bool IeAvaliacao { get; set; } = false;

            //Diagramas
            public static bool IeIshikawa { get; set; } = false;
            public static bool IeBowTie { get; set; } = false;
            public static bool IeNaranjo { get; set; } = false;

            //Planos de Ação
            public static bool IePrimeiro { get; set; } = true;
            public static bool IeSegundo { get; set; } = false;
            public static bool IeTerceiro { get; set; } = false;

            public static NotificacaoIncidente notificacao = new();

            public static void Check(bool ie, string? nmEtapa, string? nmPlano, string? nmDiagrama)
            {
                try
                {
                    if (nmEtapa != null)
                    {
                        IeClassProt = false;
                        IeDiagramas = false;
                        IePlanosAcao = false;
                        IeAvaliacao = false;

                        // Verifica o estado atual da variável correspondente
                        switch (nmEtapa)
                        {
                            case "IeClassProt":
                                IeClassProt = (IeClassProt && ie) ? false : ie;
                                break;
                            case "IeDiagramas":
                                IeDiagramas = (IeDiagramas && ie) ? false : ie;
                                break;
                            case "IePlanosAcao":
                                IePlanosAcao = (IePlanosAcao && ie) ? false : ie;
                                break;
                            case "IeAvaliacao":
                                IeAvaliacao = (IeAvaliacao && ie) ? false : ie;
                                break;
                            default:
                                throw new ArgumentException("nmEtapa inválido");
                        }
                    }
                    else if (nmPlano != null)
                    {
                        IePrimeiro = false;
                        IeSegundo = false;
                        IeTerceiro = false;

                        switch (nmPlano)
                        {
                            case "IePrimeiro":
                                IePrimeiro = (IePrimeiro && ie) ? false : ie;
                                break;
                            case "IeSegundo":
                                IeSegundo = (IeSegundo && ie) ? false : ie;
                                break;
                            case "IeTerceiro":
                                IeTerceiro = (IeTerceiro && ie) ? false : ie;
                                break;
                            default:
                                throw new ArgumentException("nmPlano inválido");
                        }
                    }
                    else
                    {
                        IeIshikawa = false;
                        IeBowTie = false;
                        IeNaranjo = false;

                        switch (nmDiagrama)
                        {
                            case "IeIshikawa":
                                IeIshikawa = (IeIshikawa && ie) ? false : ie;
                                break;
                            case "IeBowTie":
                                IeBowTie = (IeBowTie && ie) ? false : ie;
                                break;
                            case "IeNaranjo":
                                IeNaranjo = (IeNaranjo && ie) ? false : ie;
                                break;
                            default:
                                throw new ArgumentException("nmDiagrama inválido");
                        }
                    }
                }
                catch (Exception e)
                {
                    throw e;
                }
                finally
                {

                    StateChanged?.Invoke();
                }

            }

            public static event Action StateChanged;
        }

        public static class ieDisponibilidade 
        {
            //Etapas
            public static bool IeDiagramas { get; set; } = true;
            public static bool IePlanosAcao { get; set; } = true;
            public static bool IeAvaliacao { get; set; } = true;

            //Diagramas
            public static bool IeIshikawa { get; set; } = true;
            public static bool IeBowTie { get; set; } = true;
            public static bool IeNaranjo { get; set; } = true;

            //Class
            public static string? DsSucessoClassProt { get; set; }
            public static string? DsSucessoDiagramas { get; set; }
            public static string? DsSucessoPlanosAcao { get; set; }
            public static string? DsSucessoAvaliacao { get; set; }

            public static NotificacaoIncidente notificacao = new();

            public async static Task ChecarDisponibilidade(bool ie, string? nmEtapa, string? nmDiagrama)
            {
                try
                {
                    if (nmEtapa != null)
                    {
                        // Verifica o estado atual da variável correspondente
                        switch (nmEtapa)
                        {
                            case "IeDiagramas":
                                if (notificacao.Gravidade == "" || notificacao.Gravidade == null)
                                {
                                    notificacao.DsGravidades = "";
                                    DsSucessoClassProt = "";
                                    IeDiagramas = true;
                                    notificacao.IeFinalizado = 0;
                                }
                                else if (notificacao.DsProtocoloSeguranca == "" || notificacao.DsProtocoloSeguranca == null)
                                {
                                    notificacao.DsEventoRelacao = "";
                                    notificacao.DsJustificativaRelacionada = "";
                                    notificacao.DsProdutoRelacao = "";
                                    notificacao.NrLote = "";
                                    notificacao.NrRegistroAnvisa = "";
                                    notificacao.DsFornecedor = "";
                                    notificacao.DsRelacaoOpcional = "";
                                    DsSucessoClassProt = "";
                                    notificacao.IeFinalizado = 0;
                                    IeDiagramas = true;
                                }
                                else if (notificacao.Gravidade == "Evento Adverso" && notificacao.DsGravidades != "" && notificacao.DsProtocoloSeguranca != "Cadeia Medicamentosa")
                                {
                                    notificacao.DsEventoRelacao = "";
                                    notificacao.DsJustificativaRelacionada = "";
                                    notificacao.DsProdutoRelacao = "";
                                    notificacao.NrLote = "";
                                    notificacao.NrRegistroAnvisa = "";
                                    notificacao.DsFornecedor = "";
                                    notificacao.DsRelacaoOpcional = "";
                                    DsSucessoClassProt = "btn-outline-success";
                                    IeDiagramas = false;
                                }
                                else if (notificacao.Gravidade == "Evento Adverso" && notificacao.DsGravidades != "" && notificacao.DsProtocoloSeguranca == "Cadeia Medicamentosa" && notificacao.DsEventoRelacao != "Protocolo" && notificacao.DsJustificativaRelacionada == "" && notificacao.DsProdutoRelacao != "" && notificacao.NrLote != "" && notificacao.NrRegistroAnvisa != "" && notificacao.DsFornecedor != "" && notificacao.DsRelacaoOpcional != "")
                                {
                                    DsSucessoClassProt = "btn-outline-success";
                                    IeDiagramas = false;
                                }
                                else if (notificacao.Gravidade == "Evento Adverso" && notificacao.DsGravidades != "" && notificacao.DsProtocoloSeguranca == "Cadeia Medicamentosa" && notificacao.DsEventoRelacao == "Protocolo" && notificacao.DsJustificativaRelacionada != "" && notificacao.DsProdutoRelacao != "" && notificacao.NrLote != "" && notificacao.NrRegistroAnvisa != "" && notificacao.DsFornecedor != "" && notificacao.DsRelacaoOpcional != "")
                                {
                                    DsSucessoClassProt = "btn-outline-success";
                                    IeDiagramas = false;
                                }
                                else if (notificacao.Gravidade != "Evento Adverso" && notificacao.DsProtocoloSeguranca == "Cadeia Medicamentosa" && notificacao.DsEventoRelacao != "Protocolo" && notificacao.DsJustificativaRelacionada == "" && notificacao.DsProdutoRelacao != "" && notificacao.NrLote != "" && notificacao.NrRegistroAnvisa != "" && notificacao.DsFornecedor != "" && notificacao.DsRelacaoOpcional != "") 
                                {
                                    notificacao.DsGravidades = "";
                                    DsSucessoClassProt = "btn-outline-success";
                                    IeDiagramas = false;
                                }
                                else if (notificacao.Gravidade != "Evento Adverso" && notificacao.DsProtocoloSeguranca == "Cadeia Medicamentosa" && notificacao.DsEventoRelacao == "Protocolo" && notificacao.DsJustificativaRelacionada != "" && notificacao.DsProdutoRelacao != "" && notificacao.NrLote != "" && notificacao.NrRegistroAnvisa != "" && notificacao.DsFornecedor != "" && notificacao.DsRelacaoOpcional != "")
                                {
                                    notificacao.DsGravidades = "";
                                    DsSucessoClassProt = "btn-outline-success";
                                    IeDiagramas = false;
                                }
                                else if (notificacao.Gravidade != "Evento Adverso" && notificacao.DsProtocoloSeguranca != "Cadeia Medicamentosa")
                                {
                                    notificacao.DsGravidades = "";
                                    notificacao.DsEventoRelacao = "";
                                    notificacao.DsJustificativaRelacionada = "";
                                    notificacao.DsProdutoRelacao = "";
                                    notificacao.NrLote = "";
                                    notificacao.NrRegistroAnvisa = "";
                                    notificacao.DsFornecedor = "";
                                    notificacao.DsRelacaoOpcional = "";
                                    DsSucessoClassProt = "btn-outline-success";
                                    IeDiagramas = false;
                                }
                                else 
                                {
                                    DsSucessoClassProt = "";
                                    notificacao.IeFinalizado = 0;
                                    IeDiagramas = true;
                                }

                                break;
                            case "IePlanosAcao":
                                if (notificacao.DsIshikawa == "Sim" && notificacao.DsTarefa1 != "" && notificacao.DsTarefa2 != "" && notificacao.DsAmbiente1 != "" && notificacao.DsAmbiente2 != "" && notificacao.DsPaciente1 != "" && notificacao.DsPaciente2 != "" && notificacao.DsGestao1 != "" && notificacao.DsGestao2 != "" && notificacao.DsEquipe1 != "" && notificacao.DsEquipe2 != "" && notificacao.DsIndividuo1 != "" && notificacao.DsIndividuo2 != "" && notificacao.DsComunica != "")
                                {
                                    DsSucessoDiagramas = "btn-outline-success";
                                    IePlanosAcao = false;
                                }
                                else if(notificacao.DsBowTie == "Sim" && notificacao.Ameaca1 != "" && notificacao.Ameaca2 != "" && notificacao.Ameaca3 != "" && notificacao.Ameaca4 != "" && notificacao.Ameaca5 != "" && notificacao.Barreira1 != "" && notificacao.Barreira2 != "" && notificacao.Barreira3 != "" && notificacao.Evento != "" && notificacao.Mitigacao1 != "" && notificacao.Mitigacao2 != "" && notificacao.Mitigacao2 != "" && notificacao.Mitigacao3 != "" && notificacao.Dano1 != "" && notificacao.Dano2 != "" && notificacao.Dano3 != "" && notificacao.Dano4 != "" && notificacao.Dano5 != "") 
                                {
                                    DsSucessoDiagramas = "btn-outline-success";
                                    IePlanosAcao = false;
                                }
                                else if (notificacao.DsNaranjo == "Sim" && notificacao.Questao1 != null && notificacao.Questao2 != null && notificacao.Questao3 != null && notificacao.Questao4 != null && notificacao.Questao5 != null && notificacao.Questao6 != null && notificacao.Questao7 != null && notificacao.Questao8 != null && notificacao.Questao9 != null && notificacao.Questao10 != null && notificacao.SomaNaranjo != null) 
                                {
                                    DsSucessoDiagramas = "btn-outline-success";
                                    IePlanosAcao = false;
                                }
                                else if (notificacao.DsIshikawa == "Não" || notificacao.DsIshikawa == "" && notificacao.DsBowTie == "Não" || notificacao.DsBowTie == "" && notificacao.DsNaranjo == "Não" || notificacao.DsNaranjo == "") 
                                {
                                    DsSucessoDiagramas = "";
                                    notificacao.IeFinalizado = 0;
                                    IePlanosAcao = true;
                                }

                                break;
                            case "IeAvaliacao":
                                if (notificacao.DsAcao1_1 != "" && notificacao.DsAcao1_2 != "" && notificacao.DsAcao1_3 != "" && notificacao.DsAcao1_4 != "" && notificacao.DsAcao2_1 != "" && notificacao.DsAcao2_2 != "" && notificacao.DsAcao2_3 != "" && notificacao.DsAcao2_4 != "")
                                {
                                    DsSucessoPlanosAcao = "btn-outline-success";
                                    IeAvaliacao = false;
                                }
                                else 
                                {
                                    DsSucessoPlanosAcao = "";
                                    notificacao.IeFinalizado = 0;
                                    IeAvaliacao = true;
                                }

                                if (notificacao.DsAvalEficacia != "" && notificacao.DsAvalEvidencias != "")
                                {
                                    DsSucessoAvaliacao = "btn-outline-success";
                                    notificacao.IeFinalizado = 1;
                                }
                                else
                                {
                                    DsSucessoAvaliacao = "";
                                    notificacao.IeFinalizado = 0;
                                }
                                break;
                            default:
                                throw new ArgumentException("nmEtapa inválido");
                        }
                    }
                }
                catch (Exception e)
                {
                    throw e;
                }
                finally
                {

                    StateChanged?.Invoke();
                }

            }

            public static event Action StateChanged;
        }

        public async void BuscarPosProcessamento()
        {
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
            NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);
            try
            {
                notificacao = await _ws.ListarDadosPosProcessamentoAsync(notificacao);
            }
            catch (Exception e)
            {
                throw e;
            }
            finally
            {
                ieDisponibilidade.notificacao = notificacao;
                ieDisponibilidade.ChecarDisponibilidade(!ieDisponibilidade.IeDiagramas, "IeDiagramas", null);
                ieDisponibilidade.ChecarDisponibilidade(!ieDisponibilidade.IePlanosAcao, "IePlanosAcao", null);
                ieDisponibilidade.ChecarDisponibilidade(!ieDisponibilidade.IeAvaliacao, "IeAvaliacao", null);
                await InvokeAsync(() => StateHasChanged());
            }
        }

        protected override async Task OnInitializedAsync()
        {
            try
            {
                notificacao = notificacaoTemp;
                BuscarPosProcessamento();
            }
            catch (Exception)
            {
                throw;
            }
            finally
            {
                ieEtapas.IeIshikawa = false;
                ieEtapas.IeBowTie = false;
                ieEtapas.IeNaranjo = false;
            }
        }
    }
}