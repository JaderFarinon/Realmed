using APIClient;
using System.Net.Http.Headers;
using Microsoft.JSInterop;
using NexusHealth_Blazor.Config;
using Microsoft.AspNetCore.Components;
using Radzen.Blazor;
using Radzen;

namespace NexusHealth_Blazor.Pages.Qualidade.GestaodeNotificacoes
{
    public partial class NovaNotificacao
    {

        //WebService
        public static ConfigWS wsConfig = new ConfigWS();
        public HttpClient httpClient = new HttpClient();

        public NotificacaoIncidente notificacao = new NotificacaoIncidente { CdIncidente = 0, CdAtendimento = 0, CdProtocolo = 0, CdMedicacao = 0, DtNotificacao = DateTime.Now };
        public List<Setor> listaSetores = new();

        public List<MedicoTasy> listaMedicos = new List<MedicoTasy>();

        public List<Atendimento> atendimentos = new List<Atendimento>();
        public List<Protocolo> protocolos = new List<Protocolo>();
        public List<MaterialMedicamento> medicamentos = new List<MaterialMedicamento>();
        public List<EscalaNews> escalas = new List<EscalaNews>();
        public List<Cateter> cateteres = new List<Cateter>();

        public List<NotificacaoIncidenteTipo> listaTipos = new();

        //Lista Busca Pacientes
        List<Paciente> pacientes = new List<Paciente>();

        private ElementReference modalMultipleSerialNumbers;

        public StatusFunc status = new StatusFunc();

        public string? DsPaciente;

        public void ShowNotification(NotificationMessage message)
        {
            NotificationService.Notify(message);
        }

        string Modal;
        string NomeModal;
        string NomeModalProc;
        string? ModalOrigem;
        string? Pct { get; set; }

        public bool ieQualidade { get; set; } = false;
        public bool iePesquisa { get; set; } = false;
        public bool ieIniciar = false;
        public bool subIncidente = true;
        public bool atendHidden = true;
        public bool protocoloHidden = true;
        public bool medicacaoHidden = true;
        public bool cateterHidden = true;
        public bool cateterAtendHidden = true;
        public bool newsHidden = true;
        public bool pacienteHidden = true;
        public bool medicoHidden = true;
        public bool ShowStepsButtons { get; set; } = true;
        public string? NextText { get; set; } = "Próximo";
        public bool Disabled { get; set; } = false;

        private void setVisibility()
        {
            if (notificacao.CdIncidente == 39 || notificacao.CdIncidente == 32 || notificacao.CdIncidente == 35) //
            {
                pacienteHidden = false;
                medicoHidden = false;
                atendHidden = false;
                protocoloHidden = false;
                medicacaoHidden = false;
                cateterHidden = true;
                cateterAtendHidden = true;
                newsHidden = true;
                subIncidente = true;
            }
            else if (notificacao.CdIncidente == 36) //Cateter
            {
                pacienteHidden = false;
                medicoHidden = false;
                atendHidden = true;
                protocoloHidden = true;
                medicacaoHidden = true;
                cateterHidden = false;
                cateterAtendHidden = false;
                newsHidden = true;
                subIncidente = true;
            }
            else if (notificacao.CdIncidente == 28) //Escala News
            {
                pacienteHidden = false;
                medicoHidden = false;
                atendHidden = true;
                protocoloHidden = true;
                medicacaoHidden = true;
                cateterHidden = true;
                cateterAtendHidden = true;
                newsHidden = false;
                subIncidente = true;
            }
            else if(notificacao.CdIncidente == 27 && iePesquisa == true && ieQualidade != true) //SubIncidente
            {
                //BuscaEstudos

                pacienteHidden = true;
                medicoHidden = true;
                atendHidden = true;
                protocoloHidden = true;
                medicacaoHidden = true;
                cateterHidden = true;
                cateterAtendHidden = true;
                newsHidden = true;
                subIncidente = false;
            }
            else if(notificacao.CdIncidente == 33) // Fornecedor Mat/Med OS 2024073296
            {
                pacienteHidden = false;
                medicoHidden = true;
                atendHidden = true;
                protocoloHidden = true;
                medicacaoHidden = true;
                cateterHidden = true;
                cateterAtendHidden = true;
                newsHidden = true;
                subIncidente = true;
            }
            else 
            {
                pacienteHidden = true;
                medicoHidden = true;
                atendHidden = true;
                protocoloHidden = true;
                medicacaoHidden = true;
                cateterHidden = true;
                cateterAtendHidden = true;
                newsHidden = true;
                subIncidente = true;
            }
        }

        private void EmptyCallback()
        {
            return;
        }

        private async void ListarSetores()
        {
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
            NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);
            try
            {

                listaSetores = (List<Setor>)await _ws.ListarSetoresAsync();
            }
            catch (Exception e)
            {
                //_spinnerService.Hide();
                throw;
            }
            finally
            {
                await InvokeAsync(() => StateHasChanged());
            }
        }

        private async void ListarTipos()
        {
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
            NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);
            try
            {

                listaTipos = (List<NotificacaoIncidenteTipo>)await _ws.ListarTiposNotAsync(ieQualidade, iePesquisa);
            }
            catch (Exception e)
            {
                //_spinnerService.Hide();
                throw;
            }
            finally
            {
                await InvokeAsync(() => StateHasChanged());
            }
        }

        private async void ListarMedicos()
        {
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
            NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);
            try
            {

                listaMedicos = (List<MedicoTasy>)await _ws.ListarMedicosTasyAsync();
            }
            catch (Exception e)
            {
                //_spinnerService.Hide();
                throw;
            }
            finally
            {
                await InvokeAsync(() => StateHasChanged());
            }
        }

        private async void BuscaAtendimento() 
        {
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
            NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);
            try
            {
                atendimentos = (List<Atendimento>)await _ws.ListarAtendimentosAsync(notificacao.CdPaciente);
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
                throw;
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

        private async void BuscaEscalas()
        {
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
            NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);
            try
            {
                escalas = (List<EscalaNews>)await _ws.ListarNewsAsync(notificacao.CdPaciente);
            }
            catch (Exception e)
            {
                NotificationService.Notify(NotificationSeverity.Error, $"Erro ao listar escalas", $"{e}");
            }
            finally
            {
                await InvokeAsync(() => StateHasChanged());
            }
        }

        private async void BuscaCateteres()
        {
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
            NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);
            try
            {
                cateteres = (List<Cateter>)await _ws.ListarCateteresAsync(notificacao.CdPaciente);
            }
            catch (Exception e)
            {
                NotificationService.Notify(NotificationSeverity.Error, $"Erro ao listar os cateteres", $"{e}");
            }
            finally
            {
                await InvokeAsync(() => StateHasChanged());
            }
        }

        private async void BuscaPct()
        {
            try
            {
                pacientes.Clear();
                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
                NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);
                pacientes = (List<Paciente>)await _ws.BuscaPctTasyAsync(Pct);
            }
            catch (Exception e)
            {
                throw;
            }
            await InvokeAsync(() => StateHasChanged());
        }

        private void ModalBuscaPct()
        {
            Modal = $"modal";
            NomeModal = $"#modal-buscapct";
        }

        private async void GravaNotificacao(StepsCanChangeEventArgs args)
        {
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
            NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);
            try
            {
                var response2 = await DialogService.Confirm(
                "Você tem certeza que deseja enviar essa notificação?",
                "Confirmação",
                new ConfirmOptions()
                    {
                        CloseDialogOnEsc = false,
                        CloseDialogOnOverlayClick = false,
                        ShowClose = false,
                        CancelButtonText = "Não",
                        OkButtonText = "Sim",
                    }
                );

                if (response2 == true)
                {
                    DialogService.Close(true);
                    Disabled = true;

                    status = await _ws.GravarNotificacaoIncidenteAsync(notificacao);
                    if (status.Status == true)
                    {
                        ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Success, Summary = "Sucesso", Detail = $"Notificação enviada com sucesso.", Duration = 4000 });
                        Thread.Sleep(5000);
                        Navigation.NavigateTo(Navigation.Uri, true);
                    }
                    else 
                    {
                        ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Error, Summary = "Erro", Detail = $"Erro ao enviar notificação<br>Status: {status.Status}. <br> QueryMessage: {status.DsReturn}. <br><br> FunctionMessage: {status.DsReturn}", Duration = 10000 });
                    }
                }
            }
            catch (Exception e)
            {
                ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Error, Summary = "Erro", Detail = $"Erro ao enviar notificação<br>Status: {status.Status}. <br> QueryMessage: {status.DsReturn}. <br><br> FunctionMessage: {e.Message}", Duration = 10000 });
            }
            finally
            {
                await InvokeAsync(() => StateHasChanged());
            }
        }

        private async Task CanChange(StepsCanChangeEventArgs args)
        {
            try 
            {
                if (args.NewIndex < args.SelectedIndex) { 
                    switch (args.NewIndex) 
                    {
                        case 0:
                        case 1:
                        case 2:
                            NextText = "Próximo";
                            ShowStepsButtons = true; 
                            return;
                        default:
                            NextText = "Finalizar";
                            return;
                            
                    }
                }
                if (args.SelectedIndex == 0) {
                    switch (notificacao.CdSetorNotificador)
                    {
                        case null:
                            break;
                        default:
                            NextText = "Próximo"; return;
                    }
                    
                }
                if (args.SelectedIndex == 1) 
                {
                    switch ((ieQualidade, iePesquisa))
                    { 
                        case (true, false):
                            var info = VerificaInfoQualidade();
                            if(info == true){ NextText = "Finalizar"; return; } else { break; }
                        case (false, true):
                            NextText = "Finalizar";
                            return;
                        default:
                            break;
                    }

                    
                }
                if (args.SelectedIndex == 2 && args.NewIndex == 3) 
                { 
                    if(notificacao.DsFato != null && notificacao.DsConsequencias != null && notificacao.DsConsequencias != "Sem Consequências" && notificacao.DsConsequenciasImediatas != null && notificacao.DsAcoesImediatas != null) 
                    {
                        GravaNotificacao(args); 
                        ShowStepsButtons = false; 
                        return;
                    }
                    else if (notificacao.DsFato != null && notificacao.DsConsequencias == "Sem Consequências" && notificacao.DsConsequenciasImediatas == null && notificacao.DsAcoesImediatas != null)
                    {
                        GravaNotificacao(args);
                        ShowStepsButtons = false;
                        return;
                    }
                    
                }

                bool VerificaInfoQualidade()
                {
                    switch (notificacao.CdIncidente)
                    {
                        case 0:
                        case null:
                            return false;
                        case 32:
                        case 35:
                        case 39:
                            if (notificacao.CdPaciente != null && notificacao.DsPaciente != null && notificacao.CdAtendimento != null && notificacao.CdProtocolo != null && notificacao.CdMedicacao != null)
                            {
                                
                                return true;
                            }
                            else
                            {
                                return false;
                            }
                        case 36:
                            if (notificacao.CdPaciente != null && notificacao.DsPaciente != null && notificacao.DsCateter != null && notificacao.DtAtendimento != null)
                            {
                                return true;
                            }
                            else
                            {
                                return false;
                            }
                        case 28:
                            if (notificacao.CdPaciente != null && notificacao.DsPaciente != null && notificacao.DsEscalaNews != null)
                            {
                                return true;
                            }
                            else 
                            {
                                return false;
                            }
                        default:
                            // Para outros CdTipos, pode adicionar as condições necessárias aqui
                            return true;
                    }
                }

                var response = await DialogService.Alert( $"Você deixou passar algum campo obrigatório nessa etapa, certifique-se que preencheu todos os campos obrigatórios!<br><br>Campos<br> {(
                args.SelectedIndex == 0 && notificacao.CdSetorNotificador == null ? "<b>Setor</b>" : 
                args.SelectedIndex == 1 && ieQualidade != true && iePesquisa != true ? "<b>Qualidade ou Pesquisa Clínica</b>" :
                args.SelectedIndex == 1 && notificacao.CdIncidente == null ? "<b>Tipo de Incidente</b>" :
                args.SelectedIndex == 1 && (notificacao.CdIncidente == 32 || notificacao.CdIncidente == 35 || notificacao.CdIncidente == 39) && notificacao.CdPaciente == null && notificacao.DsPaciente == null && notificacao.CdAtendimento == null && notificacao.CdProtocolo == null && notificacao.CdMedicacao == null ? "<b>Código e Nome do Paciente<br>Médico<br>Atendimento<br>Protocolo<br>Medicação</b>" : 
                args.SelectedIndex == 1 && notificacao.CdIncidente == 36 && notificacao.CdPaciente == null && notificacao.DsPaciente == null && notificacao.DsCateter == null && notificacao.DtAtendimento == null ? "<b>Código e Nome do Paciente<br>Médico<br>Implantes de Cateter<br>Atendimentos</b>" : 
                args.SelectedIndex == 1 && notificacao.CdIncidente == 28 && notificacao.CdPaciente == null && notificacao.DsPaciente == null && notificacao.DsEscalaNews == null ? "<b>Código e Nome do Paciente<br>Médico<br>Escala de News</b>" : 
                args.SelectedIndex == 2 && notificacao.DsFato == null ? "<b>Descreva o Fato</b>" :
                args.SelectedIndex == 2 && notificacao.DsConsequencias == null ? "<b>Consequências para</b>" :
                args.SelectedIndex == 2 && notificacao.DsConsequencias != null && notificacao.DsConsequencias != "Sem Consequências" && notificacao.DsConsequenciasImediatas == null ? "<b>Consequências Imediatas</b>" :
                args.SelectedIndex == 2 && notificacao.DsAcoesImediatas == null ? "<b>Ações Imediatas</b>" : "")}",
                "Ops...",
                new AlertOptions()
                {
                    CloseDialogOnEsc = false,
                    CloseDialogOnOverlayClick = false,
                    ShowClose = false,
                    OkButtonText = "Ok",
                });

                if (response == true)
                {
                    args.PreventDefault();
                }
            }
            catch (Exception e) 
            {
                throw e;
            }          
        }

        protected override async Task OnAfterRenderAsync(bool firstRender)
        {

            if (firstRender)
            {
                ListarSetores();
                ListarMedicos();

                /*await localStorage.SetItemAsync("nmPerfil", "Administração");
                await localStorage.SetItemAsync("nmFuncao", "Repasse Para Terceiros");*/


                try
                {
                    //Bootstrap tether Core JavaScript
                    await JS.InvokeAsync<IJSObjectReference>("import", "/dist/js/demo-theme.min.js?1668287865");
                    await JS.InvokeAsync<IJSObjectReference>("import", "/dist/libs/apexcharts/dist/apexcharts.min.js?1668287865");
                    await JS.InvokeAsync<IJSObjectReference>("import", "/dist/libs/jsvectormap/dist/js/jsvectormap.min.js?1668287865");
                    await JS.InvokeAsync<IJSObjectReference>("import", "/dist/libs/jsvectormap/dist/maps/world.js?1668287865");
                    await JS.InvokeAsync<IJSObjectReference>("import", "/dist/libs/jsvectormap/dist/maps/world-merc.js?1668287865");
                    await JS.InvokeAsync<IJSObjectReference>("import", "/dist/js/tabler.min.js?1668287865");
                    await JS.InvokeAsync<IJSObjectReference>("import", "/dist/js/demo.min.js?1668287865");

                    //Forms
                    //Libs JS
                    await JS.InvokeAsync<IJSObjectReference>("import", "/dist/libs/litepicker/dist/litepicker.js?1695847769");
                    await JS.InvokeAsync<IJSObjectReference>("import", "/dist/libs/tom-select/dist/js/tom-select.base.min.js");
                    await JS.InvokeAsync<IJSObjectReference>("import", "/dist/libs/nouislider/dist/nouislider.min.js");
                    await JS.InvokeAsync<IJSObjectReference>("import", "/dist/libs/tom-select/dist/js/tom-select.base.min.js?1695847769");

                    //Tabler Core
                    await JS.InvokeAsync<IJSObjectReference>("import", "/dist/js/tabler.min.js?1668287865");
                    await JS.InvokeAsync<IJSObjectReference>("import", "/dist/js/demo.min.js?1668287865");

                    //Smart Blazor
                    //await JS.InvokeAsync<IJSObjectReference>("import", "_content/Smart.Blazor/css/smart.default.css");
                    //await JS.InvokeAsync<IJSObjectReference>("import", "_content/Smart.Blazor/js/smart.blazor.js");
                    //await JS.InvokeAsync<IJSObjectReference>("import", "_content/Smart.Blazor/js/modules/smart.table.js");

                }
                catch (Exception)
                {
                    throw;
                }
            }
        }

        protected override async Task OnInitializedAsync()
        {
            try
            {
                await JS.InvokeVoidAsync("window.scrollTo", "0", "1");
            }
            catch (Exception e)
            {
                throw e;
            }
            finally
            {
                //
            }

        }
    }
}