using APIClient;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using NexusHealth_Blazor.Config;
using Radzen;
using System.Net.Http.Headers;

namespace NexusHealth_Blazor.Pages.Qualidade.GestaodeNotificacoes
{
    public partial class DialogPreviewPreProcessamento
    {
        //WebService
        public static ConfigWS wsConfig = new ConfigWS();
        public HttpClient httpClient = new HttpClient();

        [Parameter] public int NotificacaoID { get; set; }
        private int value { get; set; } = 1;

        private NotificacaoIncidente notificacao = new NotificacaoIncidente();
        private List<NotificacaoIncidenteTipo> listaTipos = new List<NotificacaoIncidenteTipo>();
        private List<RespNotificacao> responsaveis = new List<RespNotificacao>();
        private Usuario usuario = new Usuario();
        private MedicoTasy medico = new MedicoTasy();
        private Paciente paciente = new Paciente();
        private List<Setor> setores = new List<Setor>();
        public List<Atendimento> atendimentos = new List<Atendimento>();
        public List<Protocolo> protocolos = new List<Protocolo>();
        public List<MaterialMedicamento> medicamentos = new List<MaterialMedicamento>();
        public List<Cateter> cateteres = new List<Cateter>();
        public List<EscalaNews> escalas = new List<EscalaNews>();
        List<Paciente> pacientes = new List<Paciente>();
        public List<MedicoTasy> listaMedicos = new List<MedicoTasy>();
        public StatusFunc statusfunc = new();

        string Modal;
        string NomeModal;
        string NomeModalProc;
        string? ModalOrigem;
        string? Pct { get; set; }
        public bool atendHidden = true;
        public bool protocoloHidden = true;
        public bool medicacaoHidden = true;
        public bool cateterHidden = true;
        public bool cateterAtendHidden = true;
        public bool newsHidden = true;
        public string Disabled { get; set; } = "card-inactive";
        public bool ieQualidade { get; set; }
        public bool iePesquisa { get; set; }

        private ElementReference modalMultipleSerialNumbers;

        private void ShowNotification(NotificationMessage message)
        {
            NotificationService.Notify(message);
        }

        private void setVisibility()
        {
            if (notificacao.CdIncidente == 39 || notificacao.CdIncidente == 32 || notificacao.CdIncidente == 35)
            {
                BuscaAtendimento();
                BuscaProtocolos();
                BuscaMedicacao();
                atendHidden = false;
                protocoloHidden = false;
                medicacaoHidden = false;
                cateterHidden = true;
                cateterAtendHidden = true;
                newsHidden = true;
            }
            else if (notificacao.CdIncidente == 36)
            {
                BuscaCateteres();
                BuscaAtendimento();
                atendHidden = true;
                protocoloHidden = true;
                medicacaoHidden = true;
                cateterHidden = false;
                cateterAtendHidden = false;
                newsHidden = true;
            }
            else if (notificacao.CdIncidente == 28)
            {
                BuscaEscalas();
                atendHidden = true;
                protocoloHidden = true;
                medicacaoHidden = true;
                cateterHidden = true;
                cateterAtendHidden = true;
                newsHidden = false;
            }
            else
            {
                atendHidden = true;
                protocoloHidden = true;
                medicacaoHidden = true;
                cateterHidden = true;
                cateterAtendHidden = true;
                newsHidden = true;
            }
        }

        private void EmptyCallback()
        {
            return;
        }

        private async void ObterDadosNotificacao()
        {
            try
            {
                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
                NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);

                notificacao = await _ws.ObterDadosNotificacaoAsync(NotificacaoID);
            }
            catch (HttpRequestException e)
            {
                Console.WriteLine(e.Message);
                throw e;
            }
            finally
            {
                setVisibility();
                await InvokeAsync(() => StateHasChanged());
            }
        }

        private async void ListarTipos()
        {
            try
            {
                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
                NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);

                listaTipos = (List<NotificacaoIncidenteTipo>)await _ws.ListarTiposNotAsync(ieQualidade, iePesquisa);
            }
            catch (HttpRequestException e)
            {
                Console.WriteLine(e.Message);
                throw;
            }
            finally
            {
                await InvokeAsync(() => StateHasChanged());
            }
        }

        private async void ListarRespNotificacoes()
        {
            try
            {
                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
                NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);

                responsaveis = (List<RespNotificacao>)await _ws.ListarRespNotificacaoAsync();
            }
            catch (HttpRequestException e)
            {
                Console.WriteLine(e.Message);
                throw;
            }
            finally
            {
                await InvokeAsync(() => StateHasChanged());
            }
        }

        private async void ListarSetores() 
        {
            try
            {
                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
                NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);

                setores = (List<Setor>)await _ws.ListarSetoresAsync();
            }
            catch (HttpRequestException e)
            {
                Console.WriteLine(e.Message);
                throw;
            }
            finally
            {
                await InvokeAsync(() => StateHasChanged());
            }
        }

        private async void ObterDadosMedico()
        {
            try
            {
                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
                NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);

                medico = await _ws.ObterDadosMedicoAsync(notificacao.CdMedico);
            }
            catch (HttpRequestException e)
            {
                Console.WriteLine(e.Message);
                throw;
            }
            finally
            {
                await InvokeAsync(() => StateHasChanged());
            }
        }

        private async void ObterDadosPaciente() 
        {
            try
            {
                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
                NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);

                paciente = await _ws.ObterDadosPacienteAsync(notificacao.CdPaciente);
            }
            catch (HttpRequestException e)
            {
                Console.WriteLine(e.Message);
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
                throw e;
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
                //NotificationService.Notify(NotificationSeverity.Error, $"Erro ao listar escalas", $"{e}");
            }
            finally
            {
                await InvokeAsync(() => StateHasChanged());
            }
        }

        private void ModalBuscaPct()
        {
            Modal = $"modal";
            NomeModal = $"#modal-buscapct2";
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

        

        protected override async Task OnAfterRenderAsync(bool firstRender)
        {
            if (firstRender)
            {
                ObterDadosNotificacao();
                ListarSetores();
                ListarTipos();
                ListarMedicos();
                ListarRespNotificacoes();
                ObterDadosMedico();
                ObterDadosPaciente();

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

                }
                catch (Exception)
                {
                    throw;
                }
            }
        }

        protected override async Task OnInitializedAsync()
        {

            httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
            NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);
            usuario = await _ws.ObterDadosUsuarioAsync(await localStorage.GetItemAsStringAsync("token"));

        }
    }
}