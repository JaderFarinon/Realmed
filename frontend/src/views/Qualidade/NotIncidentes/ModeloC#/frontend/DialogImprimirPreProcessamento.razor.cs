using APIClient;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using NexusHealth_Blazor.Config;
using System.Net.Http.Headers;
using Blazorise;
using Microsoft.AspNetCore.Components.Web;
using Newtonsoft.Json;
using NexusHealth_Blazor.Shared;
using Radzen;
using System;
using System.Net.Http;

namespace NexusHealth_Blazor.Pages.Qualidade.GestaodeNotificacoes
{
    public partial class DialogImprimirPreProcessamento
    {
        //WebService
        public static ConfigWS wsConfig = new ConfigWS();
        public HttpClient httpClient = new HttpClient();

        [Parameter] public int NotificacaoID { get; set; }

        public string NmNotificador { get; set; }
        public string DsSetor { get; set; }
        public string NmPaciente { get; set; }
        public string DsIncidente { get; set; }
        public string DsMedico { get; set; }
        public bool ieQualidade { get; set; }
        public bool iePesquisa { get; set; }

        public NotificacaoIncidente notificacao = new NotificacaoIncidente();
        private List<RespNotificacao> responsaveis = new List<RespNotificacao>();
        public List<Medico> listaMedicos = new();
        public List<Funcionario> listaFuncionarios = new();
        public List<NotificacaoIncidenteTipo> listaTipos = new();
        public List<Setor> listaSetores = new();

        public string DsResponsavel { get; set; }

        private MedicoTasy medico = new MedicoTasy();
        private Paciente paciente = new Paciente();

        private async Task ObterDadosNotificacao()
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
                await InvokeAsync(() => StateHasChanged());
            }
        }

        private async Task ObterDadosMedico()
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

        private async Task ObterDadosPaciente()
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

        private async Task ListarRespNotificacoes()
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
                DsResponsavel = (notificacao.CdResponsavel != null ? responsaveis.First(x => x.Id == notificacao.CdResponsavel).DsResp : "Não Informado");
                await InvokeAsync(() => StateHasChanged());
            }
        }

        private async Task ListarTipos()
        {
            listaTipos.Clear();
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

        private async Task ListarSetores()
        {
            listaSetores.Clear();
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

        public async Task ListarMedicos()
        {
            listaMedicos.Clear();
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
            NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);
            try
            {

                listaMedicos = (List<Medico>)await _ws.ListarMedicosAsync();
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
                try
                {
                    //Bootstrap tether Core JavaScript
                    await JS.InvokeAsync<IJSObjectReference>("import", "/dist/js/demo-theme.min.js?1668287865");
                    await JS.InvokeAsync<IJSObjectReference>("import", "/dist/js/tabler.min.js?1668287865");
                    await JS.InvokeAsync<IJSObjectReference>("import", "/dist/js/demo.min.js?1668287865");

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
            try
            {
                await base.OnInitializedAsync();

                await ObterDadosMedico();
                await ObterDadosPaciente();
                await ListarRespNotificacoes();
                await ListarTipos();
                await ListarMedicos();
                await ListarSetores();
                await ObterDadosNotificacao();


                //await JS.InvokeVoidAsync("print");
            }
            catch (JSDisconnectedException e)
            {
                throw e;
            }
        }
    }
}