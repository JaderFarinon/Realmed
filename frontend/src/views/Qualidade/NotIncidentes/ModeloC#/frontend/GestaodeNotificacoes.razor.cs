using APIClient;
using Blazorise;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using NexusHealth_Blazor.Config;
using Radzen;
using System.Net.Http.Headers;
using static System.Runtime.InteropServices.JavaScript.JSType;
using static NexusHealth_Blazor.Shared.MainLayout;
using static NexusHealth_Blazor.Pages.Qualidade.GestaodeNotificacoes.Processamento;
using FastReport;
using Radzen.Blazor;
using System.Numerics;
using Microsoft.EntityFrameworkCore;
using System;
using NexusHealth_Blazor.Util;

namespace NexusHealth_Blazor.Pages.Qualidade.GestaodeNotificacoes
{
    public partial class GestaodeNotificacoes
    {
        //WebService
        public static ConfigWS wsConfig = new ConfigWS();
        public HttpClient httpClient = new HttpClient();

        #region Classes Globais

        [CascadingParameter(Name = "Header")] public HeaderParameter header { get; set; }

        Processamento? child { get; set; }
        PreviewProcessamento? child2 { get; set; }

        #endregion

        #region Classes

        public NotificacaoIncidente notIncidenteFiltro = new() { DsPaciente = "", DsClass = "", CdMedico = 0, CdSetorNotificador = 0, CdIncidente = 0, IeFinalizado = 0 };
        public IList<NotificacaoIncidente> selectedNotificacao = new List<NotificacaoIncidente>();
        public List<NotificacoesIncidentePermissao> permissoes = new();
        public NotificacoesIncidentePermissao permissaoUsuario = new();

        //Processamento
        public NotificacaoIncidente notificacaoProc { get; set; }
        public string NmNotificador { get; set; }
        public string DsSetor { get; set; }
        public string NmPaciente { get; set; }
        public string DsIncidente { get; set; }
        public int? CdAtendimento { get; set; }
        public int? CdProtocolo { get; set; }
        public string DsMedico { get; set; }
        private int TabsSelectedIndex { get; set; }

        public NotificacaoIncidente filtroNotificacao = new NotificacaoIncidente();
        public List<NotificacaoIncidente> notIncidentes = new();

        public List<MedicoTasy> listaMedicos = new();
        public List<Funcionario> listaFuncionarios = new();
        public List<NotificacaoIncidenteTipo> listaTipos = new();
        public List<Setor> listaSetores = new();
        public List<NotificacaoIncidente> listaNotificacoes = new();
        public StatusFunc statusfunc = new();
        public Usuario usuariosFiltro = new() { Nm_usuario = "", Status = "", Perfil = "", Setor = 0, Cd_estabelecimento = 0 };
        public List<Usuario> usuarios = new();

        #endregion

        #region Váriaveis Locais

        public bool ieParametro { get; set; }
        public bool ieProcessamento { get; set; }
        public bool iePreviewProcessamento { get; set; }
        public bool ieBtnParametro { get; set; }
        public bool iePreProcessamento { get; set; }
        public bool ieNucleoSeguranca { get; set; }
        public bool ieAdministrativo { get; set; }
        public bool ieComissoes { get; set; }
        public bool ieQualidade { get; set; }
        public bool ieCompras { get; set; }
        public bool iePesquisa { get; set; }

        bool filtroQualidade { get; set; } = false;
        bool filtroPesquisa { get; set; } = false;

        public bool exibeNotificacao = false;
        bool isLoading = false;
        
        bool iePermissao;
        string Modal;
        string NomeModal;
        public int id;

        private string status { get; set; }
        private string nmStatus { get; set; }

        int notificacaoId { get; set; }

        //Abas
        private bool ActivePreProcessamento { get; set; } = false;
        private bool ActivePrePesquisa { get; set; } = false;
        private bool ActiveNucleoSeguranca { get; set; } = false;
        private bool ActiveAdministrativo { get; set; } = false;
        private bool ActiveComissoes { get; set; } = false;
        private bool ActiveQualidade { get; set; } = false;
        private bool ActiveCompras { get; set; } = false;
        private bool ActivePosPesquisa { get; set; } = false;

        #endregion

        async Task BusyDialog()
        {
            await DialogService.OpenAsync<LoadingDialog>("", null, new DialogOptions() { ShowTitle = false, Style = "min-height:auto;min-width:auto;width:auto", CloseDialogOnEsc = false });
        }

        #region Funções - Gestão de Incidentes

        private void ShowNotification(NotificationMessage message)
        {
            NotificationService.Notify(message);
        }

        public async Task ListarNotificacoes()
        {
            InvokeAsync(async () =>
            {
                try
                {
                    listaNotificacoes.Clear();

                    httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
                    NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);

                    listaNotificacoes = (List<NotificacaoIncidente>)await _ws.ListarNotificacoesFiltroAsync(filtroQualidade, filtroPesquisa, notIncidenteFiltro);
                }
                catch (Exception e)
                {
                    ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Error, Summary = "Error", Detail = $"{e.Message}", Duration = 4000 });
                }
                finally
                {
                    await InvokeAsync(() => StateHasChanged());
                }

                // Close the dialog
                DialogService.Close();
            });

            await BusyDialog();
        }

        public async Task ListarNotificacoesEtapas()
        {
            InvokeAsync(async () =>
            {
                try
                {
                    listaNotificacoes.Clear();

                    httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
                    NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);

                    listaNotificacoes = (List<NotificacaoIncidente>)await _ws.ListarNotificacoesEtapasFiltroAsync(notIncidenteFiltro.CdResponsavel, notIncidenteFiltro);
                }
                catch (Exception e)
                {
                    ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Error, Summary = "Error", Detail = $"{e.Message}", Duration = 4000 });
                }
                finally
                {
                    await InvokeAsync(() => StateHasChanged());
                }

                // Close the dialog
                DialogService.Close();
            });

            await BusyDialog();
        }

        public async Task ListarFuncionarios() 
        {
            try
            {
                listaFuncionarios.Clear();

                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
                NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);

                listaFuncionarios = (List<Funcionario>)await _ws.ListarFuncionariosFiltroAsync(new FiltroFuncionario());
            }
            catch (Exception e)
            {
                ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Error, Summary = "Error", Detail = $"{e.Message}", Duration = 4000 });
            }
            finally
            {
                await InvokeAsync(() => StateHasChanged());
            }
        }

        public async Task ListarMedicos()
        {
            try
            {
                listaMedicos.Clear();

                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
                NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);

                listaMedicos = (List<MedicoTasy>)await _ws.ListarMedicosTasyAsync();
            }
            catch (Exception e)
            {
                ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Error, Summary = "Error", Detail = $"{e.Message}", Duration = 4000 });
            }
            finally
            {
                await InvokeAsync(() => StateHasChanged());
            }
        }

        private async Task ListarTipos()
        {
            try
            {
                listaTipos.Clear();

                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
                NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);

                listaTipos = (List<NotificacaoIncidenteTipo>)await _ws.ListarTiposNotAsync(filtroQualidade, filtroPesquisa);
            }
            catch (Exception e)
            {
                ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Error, Summary = "Error", Detail = $"{e.Message}", Duration = 4000 }); ;
            }
            finally
            {
                await InvokeAsync(() => StateHasChanged());
            }
        }

        private async Task ListarSetores()
        {
            try
            {
                listaSetores.Clear();

                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
                NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);

                listaSetores = (List<Setor>)await _ws.ListarSetoresAsync();
            }
            catch (Exception e)
            {
                ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Error, Summary = "Error", Detail = $"{e.Message}", Duration = 4000 });
            }
            finally
            {
                await InvokeAsync(() => StateHasChanged());
            }
        }

        public void Cancelar() 
        { 
        
        }

        public void ConfirmarLista()
        {

        }

        public void Filtrar()
        {

        }

        public void ModalBuscaPct()
        {
            Modal = $"modal";
            NomeModal = $"#modal-buscapct";
        }

        async Task ShowLoading()
        {
            isLoading = true;

            await Task.Yield();

            isLoading = false;
        }

        void ShowTooltip(ElementReference elementReference, string name, TooltipOptions options = null) => TooltipService.Open(elementReference, $"{name}", options);

        public async Task OpenNotificacao()
        {
            await DialogService.OpenAsync<DialogPreProcessamento>($"Notificação {notificacaoId}",
                new Dictionary<string, object>() { { "NotificacaoID", notificacaoId } },
                new DialogOptions() { Width = "70%", Height = "auto", Resizable = false, Draggable = false });

            ListarNotificacoes();
        }

        public async Task OpenPreviewNotificacao()
        {
            await DialogService.OpenAsync<DialogPreviewPreProcessamento>("",
                new Dictionary<string, object>() { { "NotificacaoID", notificacaoId } },
                new DialogOptions() { Width = "70%", Height = "auto",  Resizable = false, Draggable = false, ShowClose = false, CloseDialogOnOverlayClick = true });

            ListarNotificacoes();
        }

        private async Task ImprimirPreProcessamento() 
        {
            /*Navigation.NavigateTo($"/DialogImprimirPreProcessamento/{notificacaoId}");*/

            await JS.InvokeAsync<object>("open", new object[] { $"/DialogImprimirPreProcessamento/{notificacaoId}", "_blank" });/* USAR ESSE*/

            /*await DialogService.OpenAsync<DialogImprimirPreProcessamento>($"Notificação {notificacaoId}",
               new Dictionary<string, object>() { { "NotificacaoID", notificacaoId } },
               new DialogOptions() { Width = "70%", Height = "auto", Resizable = false, Draggable = false });*/

        }

        public async Task OpenCancelarPreProcessamento(int ieFinalizado)
        {
            if(ieFinalizado == 1) 
            {
                var confirm = await DialogService.Confirm("Você tem certeza que deseja cancelar?", $"Cancelar Pré Processamento", new ConfirmOptions() { OkButtonText = "Sim", CancelButtonText = "Não", Width = "auto", Height = "auto" });
            }
            else 
            {
                var confirm = await DialogService.Confirm("Você tem certeza que deseja cancelar?", $"Cancelar Pré Processamento", new ConfirmOptions() { OkButtonText = "Sim", CancelButtonText = "Não", Width = "auto", Height = "auto" });
                if (confirm != true)
                {
                    return;
                }
            }
            

            DialogService.Close(true);
        }

        async void Close(dynamic result)
        {
            try
            {
                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
                NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);

                if (result == true)
                {
                    statusfunc = await _ws.CancelarPreProcessamentoAsync(notificacaoId);

                    if (statusfunc.Status)
                    {
                        ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Success, Summary = "Sucesso", Detail = $"{statusfunc.DsReturn}", Duration = 4000 });
                        ListarNotificacoes();
                    }
                    else
                    {
                        ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Error, Summary = "Error", Detail = $"{statusfunc.DsReturn}", Duration = 4000 });
                    }
                }
            }
            catch (HttpRequestException e)
            {
                throw e;
            }
        }

        private async Task CheckPermissao()
        {
            permissoes.Clear();

            await ListarPermissoes();

            try
            {
                //Checa se o usuário tem permissão para acessar os parâmetros do Gestão de Incidentes.
                if (header.perfil == 1 || permissoes.First(x => x.IdUsuario == header.IdUsuario).PreProc == true && header.perfil == 2)
                {
                    ieBtnParametro = true;
                }
                else
                {
                    ieBtnParametro = false;
                }

                if (permissoes.First(x => x.IdUsuario == header.IdUsuario).PreProc == true)
                {
                    iePreProcessamento = true;
                }
                else 
                {
                    iePreProcessamento = false;
                }

                if (permissoes.First(x => x.IdUsuario == header.IdUsuario).NucSeg == true) 
                {

                    ieNucleoSeguranca = true;
                }
                else 
                {
                    ieNucleoSeguranca = false;
                }

                if (permissoes.First(x => x.IdUsuario == header.IdUsuario).Adm == true)
                {
                    ieAdministrativo = true;
                }
                else
                {
                    ieAdministrativo = false;
                }

                if (permissoes.First(x => x.IdUsuario == header.IdUsuario).Comissoes == true)
                {
                    ieComissoes = true;
                }
                else
                {
                    ieComissoes = false;
                }

                if (permissoes.First(x => x.IdUsuario == header.IdUsuario).Qualidade == true)
                {
                    ieQualidade = true;
                }
                else
                {
                    ieQualidade = false;
                }

                if (permissoes.First(x => x.IdUsuario == header.IdUsuario).Compras == true)
                {
                    ieCompras = true;
                }
                else
                {
                    ieCompras = false;
                }

                if (permissoes.First(x => x.IdUsuario == header.IdUsuario).Pesquisa == true)
                {
                    iePesquisa = true;
                }
                else
                {
                    iePesquisa = false;
                }

                switch((iePreProcessamento, ieNucleoSeguranca, ieAdministrativo, ieComissoes, ieQualidade, ieCompras, iePesquisa))
                {
                    case (true, true, true, true, true, true, false):
                        notIncidenteFiltro.CdResponsavel = 0;
                        ActivePreProcessamento = true;
                        listaNotificacoes.Clear();
                        listaTipos.Clear();
                        filtroQualidade = true;
                        filtroPesquisa = false;
                        ListarTipos();
                        ListarNotificacoes();

                        TabsSelectedIndex = 0;
                        return;
                    case (true, true, true, true, true, true, true):
                        notIncidenteFiltro.CdResponsavel = 0;
                        ActivePreProcessamento = true;
                        listaNotificacoes.Clear();
                        listaTipos.Clear();
                        filtroQualidade = true;
                        filtroPesquisa = false;
                        ListarTipos();
                        ListarNotificacoes();

                        TabsSelectedIndex = 0;
                        return;
                    case (false, true, true, true, true, true, true):
                        notIncidenteFiltro.CdResponsavel = 6;
                        ActivePrePesquisa = true;
                        listaNotificacoes.Clear();
                        listaTipos.Clear();
                        filtroQualidade = false;
                        filtroPesquisa = true;
                        ListarTipos();
                        ListarNotificacoes();

                        TabsSelectedIndex = 1;
                        return;
                    case (false, false, false, false, false, false, true):
                        notIncidenteFiltro.CdResponsavel = 0;
                        ActivePrePesquisa = true;
                        listaNotificacoes.Clear();
                        listaTipos.Clear();
                        filtroQualidade = false;
                        filtroPesquisa = true;
                        ListarTipos();
                        ListarNotificacoes();

                        TabsSelectedIndex = 1;
                        return;
                    case (false, true, true, true, true, true, false):
                        notIncidenteFiltro.CdResponsavel = 1;
                        ActivePreProcessamento = false;
                        ActivePrePesquisa = false;
                        listaNotificacoes.Clear();
                        listaTipos.Clear();
                        filtroQualidade = true;
                        filtroPesquisa = false;
                        ListarTipos();
                        ListarNotificacoesEtapas();

                        TabsSelectedIndex = 2;
                        return;
                    case (false, true, false, true, false, false, false):
                        notIncidenteFiltro.CdResponsavel = 1;
                        ActivePreProcessamento = false;
                        ActivePrePesquisa = false;
                        listaNotificacoes.Clear();
                        listaTipos.Clear();
                        filtroQualidade = true;
                        filtroPesquisa = false;
                        ListarTipos();
                        ListarNotificacoesEtapas();

                        TabsSelectedIndex = 2;
                        return;
                    case (false, false, true, true, true, true, false):
                        notIncidenteFiltro.CdResponsavel = 2;
                        ActivePreProcessamento = false;
                        ActivePrePesquisa = false;
                        listaNotificacoes.Clear();
                        listaTipos.Clear();
                        filtroQualidade = true;
                        filtroPesquisa = false;
                        ListarTipos();
                        ListarNotificacoesEtapas();

                        TabsSelectedIndex = 3;
                        return;
                    case (false, false, false, true, true, true, false):
                        notIncidenteFiltro.CdResponsavel = 3;
                        ActivePreProcessamento = false;
                        ActivePrePesquisa = false;
                        listaNotificacoes.Clear();
                        listaTipos.Clear();
                        filtroQualidade = true;
                        filtroPesquisa = false;
                        ListarTipos();
                        ListarNotificacoesEtapas();

                        TabsSelectedIndex = 4;
                        return;
                    case (false, false, false, false, true, true, false):
                        notIncidenteFiltro.CdResponsavel = 4;
                        ActivePreProcessamento = false;
                        ActivePrePesquisa = false;
                        listaNotificacoes.Clear();
                        listaTipos.Clear();
                        filtroQualidade = true;
                        filtroPesquisa = false;
                        ListarTipos();
                        ListarNotificacoesEtapas();

                        TabsSelectedIndex = 5;
                        return;
                    case (false, false, false, false, false, true, false):
                        notIncidenteFiltro.CdResponsavel = 5;
                        ActivePreProcessamento = false;
                        ActivePrePesquisa = false;
                        listaNotificacoes.Clear();
                        listaTipos.Clear();
                        filtroQualidade = true;
                        filtroPesquisa = false;
                        ListarTipos();
                        ListarNotificacoesEtapas();

                        TabsSelectedIndex = 6;
                        return;
                    default:
                        break;
                }
            }
            finally
            {
                Console.WriteLine($"Tab with index {TabsSelectedIndex} was selected.");
                await InvokeAsync(() => StateHasChanged());
            }
        }

        private void OnTabChange(int index)
        {
            TabsSelectedIndex = index;

            Console.WriteLine($"Tab with index {index} was selected.");
        }

        #endregion

        #region Funções - Parâmetros/Permissões

        private async Task ListarPermissoes() 
        {
            try
            {
                permissoes.Clear();

                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
                NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);

                permissoes = (List<NotificacoesIncidentePermissao>)await _ws.ListarPermissaoNotificacaoAsync();
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

        private async void ObterPermissaoNotificacao(int idUsuario, string aba, bool permissao) 
        {
            try
            {
                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
                NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);

                permissaoUsuario = await _ws.ObterPermissaoNotificacaoAsync(idUsuario);

                if(aba == "PreProc") 
                {
                    permissaoUsuario.PreProc = permissao;
                }
                else if(aba == "NucSeg") 
                {
                    permissaoUsuario.NucSeg = permissao;
                }
                else if(aba == "Adm") 
                {
                    permissaoUsuario.Adm = permissao;
                }
                else if(aba == "Comissões") 
                {
                    permissaoUsuario.Comissoes = permissao;
                }
                else if (aba == "Qualidade")
                {
                    permissaoUsuario.Qualidade = permissao;
                }
                else if (aba == "Compras")
                {
                    permissaoUsuario.Compras = permissao;
                }
                else if (aba == "Pesquisa")
                {
                    permissaoUsuario.Pesquisa = permissao;
                }
            }
            catch (Exception e)
            {
                throw e;
            }
            finally
            {
                GravaPermissao(idUsuario);
                await InvokeAsync(() => StateHasChanged());
            }
        }

        private async void GravaPermissao(int idUsuario)
        {
            try
            {
                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
                NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);

                statusfunc = await _ws.GravarPermissaoNotificacaoAsync(permissaoUsuario);

                if (statusfunc.Status)
                {
                    ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Success, Summary = "Sucesso", Detail = $"{statusfunc.DsReturn}", Duration = 4000 });
                }
                else
                {
                    ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Error, Summary = "Error", Detail = $"{statusfunc.DsReturn}", Duration = 4000 });
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

        #endregion

        async void OpenProcessamento(NotificacaoIncidente data) 
        {
            try
            {
                ieProcessamento = !ieProcessamento;
                notificacaoProc = data;
                NmNotificador = (data.NmNotificador != "" ? data.NmNotificador : "Não Informado"); 
                DsSetor = (data.CdSetorNotificador != 0 ? listaSetores.First(x => x.Id == data.CdSetorNotificador).NmSetor : "Não Informado"); 
                NmPaciente = (data.DsPaciente != null ? data.DsPaciente : "Não Informado"); 
                DsIncidente = (data.CdIncidente != 0 ? listaTipos.First(x => x.Id == data.CdIncidente).DsTipo : "Não Informado");
                DsMedico = (data.CdMedico != null ? listaMedicos.First(x => x.Id_profissional == data.CdMedico).Nm_profissional : "Não Informado");
            }
            catch(Exception e) 
            {
                throw e;
            }
            finally
            {
                await InvokeAsync(() => StateHasChanged());
            }
        }

        async void OpenPreviewProcessamento(NotificacaoIncidente data)
        {
            try
            {
                iePreviewProcessamento = !iePreviewProcessamento;
                notificacaoProc = data;
                NmNotificador = (data.NmNotificador != "" ? data.NmNotificador : "Não Informado");
                DsSetor = (data.CdSetorNotificador != 0 ? listaSetores.First(x => x.Id == data.CdSetorNotificador).NmSetor : "Não Informado");
                NmPaciente = (data.DsPaciente != null ? data.DsPaciente : "Não Informado");
                DsIncidente = (data.CdIncidente != 0 ? listaTipos.First(x => x.Id == data.CdIncidente).DsTipo : "Não Informado");
                DsMedico = (data.CdMedico != null ? listaMedicos.First(x => x.Id_profissional == data.CdMedico).Nm_profissional : "Não Informado");
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

        async void SalvaProcessamento(NotificacaoIncidente data)
        {
            try
            {
                ieProcessamento = !ieProcessamento;
                notificacaoProc = data;
                NmNotificador = (data.NmNotificador != "" ? data.NmNotificador : "Não Informado");
                DsSetor = (data.CdSetorNotificador != 0 ? listaSetores.First(x => x.Id == data.CdSetorNotificador).NmSetor : "Não Informado");
                NmPaciente = (data.DsPaciente != null ? data.DsPaciente : "Não Informado");
                DsIncidente = (data.CdIncidente != 0 ? listaTipos.First(x => x.Id == data.CdIncidente).DsTipo : "Não Informado");
                DsMedico = (data.CdMedico != null ? listaMedicos.First(x => x.Id_profissional == data.CdMedico).Nm_profissional : "Não Informado");
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

        protected override async Task OnAfterRenderAsync(bool firstRender)
        {

            if (firstRender)
            {

                await ListarMedicos();
                await ListarFuncionarios();
                await ListarSetores();
                await CheckPermissao();
            }
        }

        /*protected override async Task OnInitializedAsync()
        {
            await base.OnInitializedAsync();

            await ShowLoading();

            DialogService.OnClose += Close;
        }*/
    }
}