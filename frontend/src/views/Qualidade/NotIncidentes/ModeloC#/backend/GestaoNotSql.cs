namespace NexusHealth_WS.SQL
{
    public class GestaoNotSql
    {
        public string ListarAtendimentos = "SELECT A.NR_ATENDIMENTO, " +
                                                   "B.NM_PESSOA_FISICA, " +
                                                   "A.DT_ENTRADA, " +
                                                   "TRUNC(C.DT_ACOMODACAO_PACIENTE) DT_ACOMODACAO_PACIENTE " +
                                           "FROM ATENDIMENTO_PACIENTE A " +
                                           "INNER JOIN PESSOA_FISICA B ON B.CD_PESSOA_FISICA = A.CD_PESSOA_FISICA " +
                                           "INNER JOIN PACIENTE_ATENDIMENTO C ON C.NR_ATENDIMENTO = A.NR_ATENDIMENTO " +
                                           "WHERE B.CD_PESSOA_FISICA = :CdPessoaFisica " +
                                           "AND A.NR_SEQ_CLASSIFICACAO IN (3,6) " +
                                           "ORDER BY 1 DESC";

        public string ListarProtocolos = "SELECT DISTINCT SUBSTR(OBTER_DESC_PROTOCOLO_ONCO(NR_SEQ_PACIENTE),1,255) DS_PROTOCOLO, " +
                                                "NR_SEQ_ATENDIMENTO " +
                                         "FROM PACIENTE_ATENDIMENTO " +
                                         "WHERE NR_ATENDIMENTO = :NrAtendimento";

        public string ListarMedicamentos = "SELECT  DISTINCT A.CD_MATERIAL, " +
                                                   "C.DS_MATERIAL, " +
                                                   "A.QT_DOSE, " +
                                                   "A.CD_UNID_MED_DOSE " +
                                           "FROM PACIENTE_ATEND_MEDIC A " +
                                           "INNER JOIN PACIENTE_ATENDIMENTO B ON B.NR_SEQ_ATENDIMENTO = A.NR_SEQ_ATENDIMENTO " +
                                           "INNER JOIN MATERIAL C ON C.CD_MATERIAL = A.CD_MATERIAL " +
                                           "WHERE B.NR_ATENDIMENTO = :NrAtendimento " +
                                           "AND B.NR_SEQ_ATENDIMENTO = :NrProtocolo";

        public string ListarEscalaNews = "SELECT TO_CHAR(A.DT_AVALIACAO, 'DD/MM/YYYY HH:MM') DT_ESCALA, " +
                                                "A.QT_PONTUACAO, " +
                                                "A.NR_ATENDIMENTO, " +
                                                "SUBSTR(OBTER_NIVEL_CLINICO_NEWS(A.QT_PONTUACAO,A.NR_SEQUENCIA),1,255) DS_RISCO, " +
                                                "A.NR_SEQUENCIA " +
                                         "FROM ESCALA_NEWS A " +
                                         "INNER JOIN ATENDIMENTO_PACIENTE B ON B.NR_ATENDIMENTO = A.NR_ATENDIMENTO " +
                                         "WHERE B.CD_PESSOA_FISICA = :CdPessoaFisica " +
                                         "ORDER BY 5 DESC";

        public string ListarCateteres = "SELECT  SUBSTR(B.DS_PROCEDIMENTO, 1, 45) DS_PROCEDIMENTO, " +
                                                "A.DS_LOCAL, " +
                                                "A.DT_LIBERACAO " +
                                        "FROM HISTORICO_SAUDE_CIRURGIA A " +
                                        "INNER JOIN PROCEDIMENTO B ON B.CD_PROCEDIMENTO = A.CD_PROCEDIMENTO " +
                                        "INNER JOIN PESSOA_FISICA C ON C.CD_PESSOA_FISICA = A.CD_PESSOA_FISICA " +
                                        "WHERE C.CD_PESSOA_FISICA = :CdPessoaFisica " +
                                        "AND A.CD_PROCEDIMENTO IN (30913101, 30913012)";

    }
}
