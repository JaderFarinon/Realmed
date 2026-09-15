using Microsoft.AspNetCore.Components;
using APIClient;
using NexusHealth_Blazor.Config;
using Radzen;
using Radzen.Blazor;
using Microsoft.AspNetCore.Components.Web;
using System.Net.Http.Headers;
using static NexusHealth_Blazor.Pages.Qualidade.GestaodeNotificacoes.GestaodeNotificacoes;
using NexusHealth_Blazor.Pages.PesquisaClinica.Protocolos;

namespace NexusHealth_Blazor.Pages.Qualidade.GestaodeNotificacoes
{
    public partial class Processamento
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
        public List<Protocolo> protocolos = new List<Protocolo>();
        public List<MaterialMedicamento> medicamentos = new List<MaterialMedicamento>();

        string nmFuncao { get; set; }
        string modal { get; set; }

        private void ShowNotification(NotificationMessage message)
        {
            NotificationService.Notify(message);
        }

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
                                    notificacao.IeStatus = "C";
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
                                    notificacao.IeStatus = "C";
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
                                    notificacao.IeStatus = "D";
                                    IeDiagramas = false;
                                }
                                else if (notificacao.Gravidade == "Evento Adverso" && notificacao.DsGravidades != "" && notificacao.DsProtocoloSeguranca == "Cadeia Medicamentosa" && notificacao.DsEventoRelacao != "Protocolo" && notificacao.DsJustificativaRelacionada == "" && notificacao.DsProdutoRelacao != "" && notificacao.NrLote != "" && notificacao.NrRegistroAnvisa != "" && notificacao.DsFornecedor != "" && notificacao.DsRelacaoOpcional != "")
                                {
                                    DsSucessoClassProt = "btn-outline-success";
                                    notificacao.IeStatus = "D";
                                    IeDiagramas = false;
                                }
                                else if (notificacao.Gravidade == "Evento Adverso" && notificacao.DsGravidades != "" && notificacao.DsProtocoloSeguranca == "Cadeia Medicamentosa" && notificacao.DsEventoRelacao == "Protocolo" && notificacao.DsJustificativaRelacionada != "" && notificacao.DsProdutoRelacao != "" && notificacao.NrLote != "" && notificacao.NrRegistroAnvisa != "" && notificacao.DsFornecedor != "" && notificacao.DsRelacaoOpcional != "")
                                {
                                    DsSucessoClassProt = "btn-outline-success";
                                    notificacao.IeStatus = "D";
                                    IeDiagramas = false;
                                }
                                else if (notificacao.Gravidade != "Evento Adverso" && notificacao.DsProtocoloSeguranca == "Cadeia Medicamentosa" && notificacao.DsEventoRelacao != "Protocolo" && notificacao.DsJustificativaRelacionada == "" && notificacao.DsProdutoRelacao != "" && notificacao.NrLote != "" && notificacao.NrRegistroAnvisa != "" && notificacao.DsFornecedor != "" && notificacao.DsRelacaoOpcional != "") 
                                {
                                    notificacao.DsGravidades = "";
                                    DsSucessoClassProt = "btn-outline-success";
                                    notificacao.IeStatus = "D";
                                    IeDiagramas = false;
                                }
                                else if (notificacao.Gravidade != "Evento Adverso" && notificacao.DsProtocoloSeguranca == "Cadeia Medicamentosa" && notificacao.DsEventoRelacao == "Protocolo" && notificacao.DsJustificativaRelacionada != "" && notificacao.DsProdutoRelacao != "" && notificacao.NrLote != "" && notificacao.NrRegistroAnvisa != "" && notificacao.DsFornecedor != "" && notificacao.DsRelacaoOpcional != "")
                                {
                                    notificacao.DsGravidades = "";
                                    DsSucessoClassProt = "btn-outline-success";
                                    notificacao.IeStatus = "D";
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
                                    notificacao.IeStatus = "D";
                                    IeDiagramas = false;
                                }
                                else 
                                {
                                    DsSucessoClassProt = "";
                                    notificacao.IeFinalizado = 0;
                                    notificacao.IeStatus = "C";
                                    IeDiagramas = true;
                                }

                                break;
                            case "IePlanosAcao":
                                if (notificacao.DsIshikawa == "Sim" && notificacao.DsTarefa1 != "" && notificacao.DsTarefa2 != "" && notificacao.DsAmbiente1 != "" && notificacao.DsAmbiente2 != "" && notificacao.DsPaciente1 != "" && notificacao.DsPaciente2 != "" && notificacao.DsGestao1 != "" && notificacao.DsGestao2 != "" && notificacao.DsEquipe1 != "" && notificacao.DsEquipe2 != "" && notificacao.DsIndividuo1 != "" && notificacao.DsIndividuo2 != "" && notificacao.DsComunica != "")
                                {
                                    DsSucessoDiagramas = "btn-outline-success";
                                    notificacao.IeStatus = "P";
                                    IePlanosAcao = false;
                                }
                                else if(notificacao.DsBowTie == "Sim" && notificacao.Ameaca1 != "" && notificacao.Ameaca2 != "" && notificacao.Ameaca3 != "" && notificacao.Ameaca4 != "" && notificacao.Ameaca5 != "" && notificacao.Barreira1 != "" && notificacao.Barreira2 != "" && notificacao.Barreira3 != "" && notificacao.Evento != "" && notificacao.Mitigacao1 != "" && notificacao.Mitigacao2 != "" && notificacao.Mitigacao2 != "" && notificacao.Mitigacao3 != "" && notificacao.Dano1 != "" && notificacao.Dano2 != "" && notificacao.Dano3 != "" && notificacao.Dano4 != "" && notificacao.Dano5 != "") 
                                {
                                    DsSucessoDiagramas = "btn-outline-success";
                                    notificacao.IeStatus = "P";
                                    IePlanosAcao = false;
                                }
                                else if (notificacao.DsNaranjo == "Sim" && notificacao.Questao1 != null && notificacao.Questao2 != null && notificacao.Questao3 != null && notificacao.Questao4 != null && notificacao.Questao5 != null && notificacao.Questao6 != null && notificacao.Questao7 != null && notificacao.Questao8 != null && notificacao.Questao9 != null && notificacao.Questao10 != null && notificacao.SomaNaranjo != null) 
                                {
                                    DsSucessoDiagramas = "btn-outline-success";
                                    notificacao.IeStatus = "P";
                                    IePlanosAcao = false;
                                }
                                else if (notificacao.DsIshikawa == "Não" || notificacao.DsIshikawa == "" && notificacao.DsBowTie == "Não" || notificacao.DsBowTie == "" && notificacao.DsNaranjo == "Não" || notificacao.DsNaranjo == "") 
                                {
                                    DsSucessoDiagramas = "";
                                    notificacao.IeFinalizado = 0;
                                    notificacao.IeStatus = "D";
                                    IePlanosAcao = true;
                                }

                                break;
                            case "IeAvaliacao":
                                if (notificacao.DsAcao1_1 != "" && notificacao.DsAcao1_2 != "" && notificacao.DsAcao1_3 != "" && notificacao.DsAcao1_4 != "" && notificacao.DsAcao2_1 != "" && notificacao.DsAcao2_2 != "" && notificacao.DsAcao2_3 != "" && notificacao.DsAcao2_4 != "")
                                {
                                    DsSucessoPlanosAcao = "btn-outline-success";
                                    notificacao.IeStatus = "F";
                                    IeAvaliacao = false;
                                }
                                else 
                                {
                                    DsSucessoPlanosAcao = "";
                                    notificacao.IeFinalizado = 0;
                                    notificacao.IeStatus = "P";
                                    IeAvaliacao = true;
                                }

                                if (notificacao.DsAvalEficacia != "" && notificacao.DsAvalEvidencias != "")
                                {
                                    DsSucessoAvaliacao = "btn-outline-success";
                                    notificacao.IeFinalizado = 1;
                                    notificacao.IeStatus = "F";
                                }
                                else
                                {
                                    DsSucessoAvaliacao = "";
                                    notificacao.IeStatus = "F";
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

        public async void GravarPosProcessamento()
        {
            try
            {
                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
                NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);

                statusfunc = await _ws.GravarPosProcessamentoAsync(notificacao);

                if (statusfunc.Status)
                {
                    ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Success, Summary = "Success", Detail = $"{statusfunc.DsReturn}", Duration = 4000 });
                }
                else
                {
                    ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Error, Summary = "Error", Detail = $"{statusfunc.DsReturn}", Duration = 4000 });
                }

                if (statusfunc.Status == true) 
                {
                    if(notificacao.DsIshikawa == "Sim") 
                    {
                        statusfunc = await _ws.GravarDiagramaIshikawaAsync(notificacao);

                        if (statusfunc.Status)
                        {
                            ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Success, Summary = "Success", Detail = $"{statusfunc.DsReturn}", Duration = 4000 });
                        }
                        else
                        {
                            ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Error, Summary = "Error", Detail = $"{statusfunc.DsReturn}", Duration = 4000 });
                        }
                    }
                    if(notificacao.DsBowTie == "Sim") 
                    {
                        statusfunc = await _ws.GravarDiagramaBowTieAsync(notificacao);

                        if (statusfunc.Status)
                        {
                            ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Success, Summary = "Success", Detail = $"{statusfunc.DsReturn}", Duration = 4000 });
                        }
                        else
                        {
                            ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Error, Summary = "Error", Detail = $"{statusfunc.DsReturn}", Duration = 4000 });
                        }
                    }
                    if (notificacao.DsNaranjo == "Sim")
                    {
                        statusfunc = await _ws.GravarDiagramaNaranjoAsync(notificacao);

                        if (statusfunc.Status)
                        {
                            ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Success, Summary = "Success", Detail = $"{statusfunc.DsReturn}", Duration = 4000 });
                        }
                        else
                        {
                            ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Error, Summary = "Error", Detail = $"{statusfunc.DsReturn}", Duration = 4000 });
                        }
                    }
                }
            }
            catch (Exception e)
            {
                throw e;
            }
            finally
            {
                await InvokeAsync(() => StateHasChanged());
            }
        }

        void ShowContextMenuWithItems(MouseEventArgs args)
        {
            ContextMenuService.Open(args,
                new List<ContextMenuItem> {
                new ContextMenuItem(){ Text = $"Apagar", Value = 1, Icon = "delete" }
             }, OnMenuItemClick);
        }

        void OnMenuItemClick(MenuItemEventArgs args)
        {
            if (args.Value.Equals(1))
            {
                switch (nmFuncao)
                {
                    case "Tarefa1":
                        notificacao.DsTarefa1 = "";
                        break;
                    case "Tarefa2":
                        notificacao.DsTarefa2 = "";
                        break;
                    case "Ambiente1":
                        notificacao.DsAmbiente1 = "";
                        break;
                    case "Ambiente2":
                        notificacao.DsAmbiente2 = "";
                        break;
                    case "Paciente1":
                        notificacao.DsPaciente1 = "";
                        break;
                    case "Paciente2":
                        notificacao.DsPaciente2 = "";
                        break;
                    case "Gestao1":
                        notificacao.DsGestao1 = "";
                        break;
                    case "Gestao2":
                        notificacao.DsGestao2 = "";
                        break;
                    case "Equipe1":
                        notificacao.DsEquipe1 = "";
                        break;
                    case "Equipe2":
                        notificacao.DsEquipe2 = "";
                        break;
                    case "Individuo1":
                        notificacao.DsIndividuo1 = "";
                        break;
                    case "Individuo2":
                        notificacao.DsIndividuo2 = "";
                        break;
                    case "Comunica":
                        notificacao.DsComunica = "";
                        break;
                }

                ieDisponibilidade.ChecarDisponibilidade(!ieDisponibilidade.IePlanosAcao, "IePlanosAcao", null);
                StateHasChanged();
                ContextMenuService.Close();
            }
        }

        void SomaNaranjo(float valorQuestao) 
        {

            notificacao.SomaNaranjo = ((notificacao.Questao1 == 999 || notificacao.Questao1 == null ? 0 : notificacao.Questao1) + 
                                       (notificacao.Questao2 == 999 || notificacao.Questao2 == null ? 0 : notificacao.Questao2) + 
                                       (notificacao.Questao3 == 999 || notificacao.Questao3 == null ? 0 : notificacao.Questao3) +
                                       (notificacao.Questao4 == 999 || notificacao.Questao4 == null ? 0 : notificacao.Questao4) +
                                       (notificacao.Questao5 == 999 || notificacao.Questao5 == null ? 0 : notificacao.Questao5) +
                                       (notificacao.Questao6 == 999 || notificacao.Questao6 == null ? 0 : notificacao.Questao6) +
                                       (notificacao.Questao7 == 999 || notificacao.Questao7 == null ? 0 : notificacao.Questao7) +
                                       (notificacao.Questao8 == 999 || notificacao.Questao8 == null ? 0 : notificacao.Questao8) +
                                       (notificacao.Questao9 == 999 || notificacao.Questao9 == null ? 0 : notificacao.Questao9) +
                                       (notificacao.Questao10 == 999 || notificacao.Questao10 == null ? 0 : notificacao.Questao10));
            StateHasChanged();
        }

        private async void BuscaProtocolos()
        {
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
            NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);
            try
            {
                protocolos = (List<Protocolo>)await _ws.ListarProtocolosNotificacaoAsync(notificacao.CdAtendimento);
            }
            catch (Exception e)
            {
                throw e;
            }
            finally
            {
                await InvokeAsync(() => StateHasChanged());
            }
        }

        private async void BuscaMedicacao()
        {
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
            NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);
            try
            {
                medicamentos = (List<MaterialMedicamento>)await _ws.ListarMedicamentosAsync(notificacao.CdAtendimento, notificacao.CdProtocolo);
            }
            catch (Exception e)
            {
                throw;
            }
            finally
            {
                await InvokeAsync(() => StateHasChanged());
            }
        }

        protected override async Task OnInitializedAsync()
        {
            try
            {
                notificacao = notificacaoTemp;
                BuscarPosProcessamento();
                BuscaProtocolos();
                BuscaMedicacao();
            }
            catch (Exception e)
            {
                throw e;
            }
            finally
            {
                ieEtapas.IeClassProt = true;
                ieEtapas.IeDiagramas = false;
                ieEtapas.IePlanosAcao = false;
                ieEtapas.IeAvaliacao = false;

                ieEtapas.IeIshikawa = false;
                ieEtapas.IeBowTie = false;
                ieEtapas.IeNaranjo = false;
            }
        }
    }
}