using APIClient;
using Blazorise;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using NexusHealth_Blazor.Config;
using NexusHealth_Blazor.Pages.Global;
using Radzen;
using System.Net.Http.Headers;

namespace NexusHealth_Blazor.Pages.Qualidade.GestaodeNotificacoes.Parametros
{
    public partial class Parametros
    {
        //WebService
        public static ConfigWS wsConfig = new ConfigWS();
        public HttpClient httpClient = new HttpClient();

        private List<RespNotificacao> listaResponsaveis = new List<RespNotificacao>();

        private string? DsResp { get; set; }

        //StatusFunc
        public StatusFunc statusfunc = new StatusFunc();

        public void ShowNotification(NotificationMessage message)
        {
            NotificationService.Notify(message);
        }

        private async void ListarRespNotificacoes()
        {
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
            NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);

            try
            {
                listaResponsaveis = (List<RespNotificacao>)await _ws.ListarRespNotificacaoAsync();
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

        private async void GravaResponsavel()
        {
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await localStorage.GetItemAsStringAsync("token"));
            NexusWS _ws = new NexusWS(wsConfig.GetUrl(), httpClient);

            try
            {
                statusfunc = await _ws.GravaResponsavelAsync(DsResp, await localStorage.GetItemAsStringAsync("token"));

                if(statusfunc.Status == true) 
                {
                    ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Success, Summary = "Sucesso", Detail = $"Responsável adicionado com sucesso.", Duration = 4000 });
                }
            }
            catch (Exception e)
            {
                ShowNotification(new NotificationMessage { Severity = NotificationSeverity.Error, Summary = "Erro", Detail = $"Erro ao gravar<br>Status: {statusfunc.Status}. <br> QueryMessage: {statusfunc.DsReturn}. <br><br> FunctionMessage: {e.Message}", Duration = 10000 });
                throw;
            }
            finally
            {
                ListarRespNotificacoes();
            }
        }

        protected override async Task OnInitializedAsync()
        {
            try
            {
                await base.OnInitializedAsync();
                ListarRespNotificacoes();
            }
            catch (Exception)
            {
                throw;
            }

        }
    }
}