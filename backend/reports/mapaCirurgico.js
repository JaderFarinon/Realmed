const path = require('path');
const PdfPrinter = require('pdfmake');

const fonts = {
  Roboto: {
    normal: path.join(__dirname, '..', 'node_modules', 'pdfmake', 'build', 'fonts', 'Roboto-Regular.ttf'),
    bold: path.join(__dirname, '..', 'node_modules', 'pdfmake', 'build', 'fonts', 'Roboto-Medium.ttf'),
    italics: path.join(__dirname, '..', 'node_modules', 'pdfmake', 'build', 'fonts', 'Roboto-Italic.ttf'),
    bolditalics: path.join(__dirname, '..', 'node_modules', 'pdfmake', 'build', 'fonts', 'Roboto-MediumItalic.ttf'),
  },
};

const printer = new PdfPrinter(fonts);

function pad(value) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return '00';
  }
  return number < 10 ? `0${number}` : String(number);
}

function parseDateValue(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const dateFromNumber = new Date(value);
    return Number.isNaN(dateFromNumber.getTime()) ? null : dateFromNumber;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const isoCandidate = trimmed.replace(' ', 'T');
    const dateFromIso = new Date(isoCandidate);
    if (!Number.isNaN(dateFromIso.getTime())) {
      return dateFromIso;
    }

    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const day = Number(parts[0]);
      const month = Number(parts[1]) - 1;
      const year = Number(parts[2]);
      if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) {
        const brazilDate = new Date(year, month, day);
        if (!Number.isNaN(brazilDate.getTime())) {
          return brazilDate;
        }
      }
    }
  }

  return null;
}

function formatDate(value) {
  const date = parseDateValue(value);
  if (!date) {
    return '';
  }
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function formatTime(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  if (value instanceof Date) {
    return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
  }

  if (typeof value === 'string') {
    const parsed = parseDateValue(value);
    if (parsed) {
      return formatTime(parsed);
    }
    const parts = value.split(':');
    if (parts.length >= 2) {
      return `${pad(parts[0])}:${pad(parts[1])}`;
    }
  }

  return '';
}

function formatDateTime(value) {
  const date = parseDateValue(value);
  if (!date) {
    return '';
  }
  return `${formatDate(date)} ${formatTime(date)}`.trim();
}

function combineDateAndTime(date, time) {
  if (!date) {
    return null;
  }
  const safeTime = (time && time.trim()) || '00:00';
  const extended = safeTime.length === 5 ? `${safeTime}:00` : safeTime;
  return `${date}T${extended}`;
}

function formatPeriod(filters = {}) {
  const startSource = filters?.periodo?.inicio
    ? filters.periodo.inicio
    : combineDateAndTime(filters.dataInicio, filters.horaInicio);
  const endSource = filters?.periodo?.fim
    ? filters.periodo.fim
    : combineDateAndTime(filters.dataFim, filters.horaFim);

  const formattedStart = formatDateTime(startSource);
  const formattedEnd = formatDateTime(endSource);

  if (formattedStart && formattedEnd) {
    return formattedStart === formattedEnd
      ? formattedStart
      : `${formattedStart} até ${formattedEnd}`;
  }

  return formattedStart || formattedEnd || '';
}

function formatTimeRange(start, end) {
  const startFormatted = formatTime(start);
  const endFormatted = formatTime(end);

  if (startFormatted && endFormatted) {
    return `${startFormatted} - ${endFormatted}`;
  }

  return startFormatted || endFormatted || '';
}

function defaultValue(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return value;
}

function cleanText(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return value.toString().replace(/\s+/g, ' ').trim();
}

function trim(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function toTitleCase(value) {
  if (!value) {
    return '';
  }

  const lower = value.toString().toLocaleLowerCase('pt-BR');

  return lower.replace(/(^|[\s\-/:()\[\]'])(\p{L})/gu, (match, boundary, letter) => {
    const boundaryText = boundary === undefined ? '' : boundary;
    return `${boundaryText}${letter.toLocaleUpperCase('pt-BR')}`;
  });
}

function parseList(value) {
  if (value === undefined || value === null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(item => !!item);
  }

  return value
    .toString()
    .split('.$.')
    .map(item => item.replace(/^--\s*/, '').trim())
    .filter(item => item.length > 0);
}

function createSummary(cirurgias = [], filtros = {}, resumo = {}) {
  const total = Array.isArray(cirurgias) ? cirurgias.length : 0;
  return {
    total,
    periodo: resumo.periodo || formatPeriod(filtros),
    medico: resumo.medico || defaultValue(resumo?.medicoNome || filtros?.medico?.nome, 'Todos'),
    setor: resumo.setor || defaultValue(filtros.setor, 'Centro Cirúrgico'),
    generatedAt: resumo.generatedAt ? parseDateValue(resumo.generatedAt) || new Date() : new Date(),
  };
}

function getSalaSortKey(record = {}) {
  const salaNome = cleanText(record.DescSala);
  if (salaNome) {
    return salaNome.toLowerCase();
  }

  if (record.tbSala !== undefined && record.tbSala !== null) {
    const numero = Number(record.tbSala);
    if (!Number.isNaN(numero)) {
      return numero.toString().padStart(5, '0');
    }
    return record.tbSala.toString().toLowerCase();
  }

  return 'zzzzz';
}

function getHoraSortKey(record = {}) {
  const range = formatTimeRange(record.tbHoraInicial, record.tbHoraFinal);
  if (range) {
    return range;
  }

  const horaInicial = formatTime(record.tbHoraInicial);
  if (horaInicial) {
    return horaInicial;
  }

  return '99:99';
}

function sortCirurgias(cirurgias = []) {
  return [...cirurgias].sort((a, b) => {
    const dataA = parseDateValue(a.tbGrupoData || a.tbData);
    const dataB = parseDateValue(b.tbGrupoData || b.tbData);

    const dataDiff = (dataA ? dataA.getTime() : 0) - (dataB ? dataB.getTime() : 0);
    if (dataDiff !== 0) {
      return dataDiff;
    }

    const salaDiff = getSalaSortKey(a).localeCompare(getSalaSortKey(b));
    if (salaDiff !== 0) {
      return salaDiff;
    }

    const horaDiff = getHoraSortKey(a).localeCompare(getHoraSortKey(b));
    if (horaDiff !== 0) {
      return horaDiff;
    }

    return cleanText(a.tbNome).localeCompare(cleanText(b.tbNome));
  });
}

function formatSala(record = {}) {
  const extractSalaNumber = value => {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const text = cleanText(value);
    if (!text) {
      return null;
    }

    const hasSalaWord = /sala/i.test(text);
    const digitsMatch = text.match(/\d+/);

    if (digitsMatch && (hasSalaWord || /^\d+$/.test(text))) {
      const numericValue = Number(digitsMatch[0]);
      if (!Number.isNaN(numericValue)) {
        return numericValue.toString();
      }
      return digitsMatch[0];
    }

    if (!Number.isNaN(Number(text))) {
      return Number(text).toString();
    }

    return null;
  };

  const salaFromDesc = extractSalaNumber(record.DescSala);
  if (salaFromDesc !== null) {
    return salaFromDesc;
  }

  const salaFromField = extractSalaNumber(record.tbSala);
  if (salaFromField !== null) {
    return salaFromField;
  }

  const salaNome = cleanText(record.DescSala);
  if (salaNome) {
    return salaNome;
  }

  return '-';
}

function formatHora(record = {}) {
  const horaRegistro = formatTime(record.tbData);
  if (horaRegistro) {
    return horaRegistro;
  }
  const range = formatTimeRange(record.tbHoraInicial, record.tbHoraFinal);
  if (range) {
    return range;
  }
  const horaInicial = formatTime(record.tbHoraInicial);
  if (horaInicial) {
    return horaInicial;
  }
  return '-';
}

function formatPaciente(record = {}) {
  const partes = [];
  const nome = cleanText(record.tbNome);
  if (nome) {
    const formatado = toTitleCase(nome);
    if (formatado) {
      partes.push(formatado);
    }
  }
  const nomeSocial = cleanText(record.tbNomeSocial);
  if (nomeSocial) {
    const formatadoSocial = toTitleCase(nomeSocial);
    if (formatadoSocial) {
      partes.push(formatadoSocial);
    }
  }
  return partes.length ? partes.join('\n') : '-';
}

function formatIdade(record = {}) {
  if (record.tbIdadeAnos !== undefined && record.tbIdadeAnos !== null) {
    const idadeNumerica = Number(record.tbIdadeAnos);
    if (!Number.isNaN(idadeNumerica)) {
      return idadeNumerica.toString();
    }

    const idadeTexto = cleanText(record.tbIdadeAnos);
    if (idadeTexto) {
      const match = idadeTexto.match(/\d+/);
      if (match) {
        return match[0];
      }
      return idadeTexto;
    }
  }
  const idade = cleanText(record.tbIdade);
  if (idade) {
    const match = idade.match(/\d+/);
    if (match) {
      return match[0];
    }
    return idade;
  }
  return '-';
}

function formatProcedimentos(record = {}) {
  const procedimentos = parseList(record.tbCirurgia);
  if (procedimentos.length) {
    return procedimentos.join('\n');
  }
  return '-';
}

function formatEmpresa(record = {}) {
  const empresa = cleanText(record.tbCampo1);
  if (empresa) {
    return toTitleCase(empresa);
  }
  return '-';
}

function formatCirurgiao(record = {}) {
  const nomes = [];
  const cirurgiaoComposto = cleanText(record.tbCirurgiao);
  if (cirurgiaoComposto) {
    const formatado = toTitleCase(cirurgiaoComposto);
    if (formatado) {
      nomes.push(formatado);
    }
  } else {
    const principal = cleanText(record.Cirurgiao);
    if (principal) {
      nomes.push(toTitleCase(principal));
    }
    const segundo = cleanText(record.Cirurgiao2);
    if (segundo) {
      nomes.push(`2º: ${toTitleCase(segundo)}`);
    }
    const residente = cleanText(record.Residente);
    if (residente) {
      nomes.push(`Res.: ${toTitleCase(residente)}`);
    }
  }

  return nomes.length ? nomes.join('\n') : '-';
}

function formatConvenio(record = {}) {
  const convenio = cleanText(record.Convenio);
  if (convenio) {
    return toTitleCase(convenio);
  }
  return '-';
}

function buildObservationRow(record) {
  const texto = trim(record.tbObservacao)
    ? trim(record.tbObservacao)
    : 'Sem observações registradas.';

  return [
    {
      colSpan: 14,
      text: `Observações: ${texto}`,
      style: 'observationRow',
      border: [true, false, true, true],
      borderColor: ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0'],
      fillColor: '#f8fafc',
      margin: [6, 4, 6, 4],
    },
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
  ];
}

function formatTempoCirurgico(record = {}) {
  const tempoBruto = record.tbTempoCirurgico;
  if (tempoBruto === undefined || tempoBruto === null || tempoBruto === '') {
    return '-';
  }

  if (tempoBruto instanceof Date && !Number.isNaN(tempoBruto.getTime())) {
    const horas = tempoBruto.getUTCHours();
    const minutos = tempoBruto.getUTCMinutes();
    if (!Number.isNaN(horas) && !Number.isNaN(minutos)) {
      return `${pad(horas)}:${pad(minutos)}`;
    }
  }

  const tempo = cleanText(tempoBruto);
  if (!tempo) {
    return '-';
  }

  if (/^\d{1,2}:\d{2}:\d{2}$/.test(tempo)) {
    return tempo.slice(0, 5);
  }

  const matchDateTime = tempo.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  if (matchDateTime) {
    return matchDateTime[2];
  }


  const matchGenericTime = tempo.match(/(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?/);
  if (matchGenericTime) {
    return `${pad(matchGenericTime[1])}:${pad(matchGenericTime[2])}`;
  }

  return tempo;
}

function formatFornecedor(record = {}) {
  const fornecedor = cleanText(record.tbFornecedor);
  if (fornecedor) {
    return fornecedor;
  }
  return '-';
}

function formatIntensificador(record = {}) {
  const intensificador = cleanText(record.tbIntensificador);
  if (intensificador) {
    return toTitleCase(intensificador);
  }
  return '-';
}

function formatTiposAnestesia(record = {}) {
  const tipos = parseList(record.tbAnestesia);
  if (tipos.length) {
    return tipos.join('\n');
  }
  return '-';
}

function formatTipoConta(record = {}) {
  const tipoConta = cleanText(record.tbDescTipoConta);
  if (tipoConta) {
    return tipoConta;
  }
  return '-';
}

function formatPernoite(record = {}) {
  const pernoite = cleanText(record.tbPernoite);
  if (pernoite) {
    return pernoite;
  }
  return '-';
}

function buildMainTable(cirurgias = [], summary = {}) {
  const headerRow = [
    { text: 'Sala', style: 'tableHeader', fillColor: '#1e3a8a' },
    { text: 'Hora', style: 'tableHeader', fillColor: '#1e3a8a' },
    { text: 'Paciente', style: 'tableHeader', fillColor: '#1e3a8a' },
    { text: 'Idade', style: 'tableHeader', fillColor: '#1e3a8a' },
    { text: 'Procedimento', style: 'tableHeader', fillColor: '#1e3a8a' },
    { text: 'Empresa', style: 'tableHeader', fillColor: '#1e3a8a' },
    { text: 'Cirurgião', style: 'tableHeader', fillColor: '#1e3a8a' },
    { text: 'Convênio', style: 'tableHeader', fillColor: '#1e3a8a' },
    { text: 'Duração', style: 'tableHeader', fillColor: '#1e3a8a' },
    { text: 'Fornecedor', style: 'tableHeader', fillColor: '#1e3a8a' },
    { text: 'Intensificador', style: 'tableHeader', fillColor: '#1e3a8a' },
    { text: 'Anestesia', style: 'tableHeader', fillColor: '#1e3a8a' },
    { text: 'Conta', style: 'tableHeader', fillColor: '#1e3a8a' },
    { text: 'Pernoite', style: 'tableHeader', fillColor: '#1e3a8a' },
  ];

  const body = [headerRow];

  cirurgias.forEach(record => {
    body.push([
      { text: formatSala(record), style: 'tableCell' },
      { text: formatHora(record), style: 'tableCellCentered' },
      { text: formatPaciente(record), style: 'tableCell' },
      { text: formatIdade(record), style: 'tableCellCentered' },
      { text: formatProcedimentos(record), style: 'tableCell' },
      { text: formatEmpresa(record), style: 'tableCell' },
      { text: formatCirurgiao(record), style: 'tableCell' },
      { text: formatConvenio(record), style: 'tableCell' },
      { text: formatTempoCirurgico(record), style: 'tableCellCentered' },
      { text: formatFornecedor(record), style: 'tableCell' },
      { text: formatIntensificador(record), style: 'tableCellCentered' },
      { text: formatTiposAnestesia(record), style: 'tableCell' },
      { text: formatTipoConta(record), style: 'tableCell' },
      { text: formatPernoite(record), style: 'tableCellCentered' },
    ]);

    body.push(buildObservationRow(record));
  });

  body.push([
    {
      colSpan: 14,
      text: `Total de procedimentos: ${summary.total || cirurgias.length}`,
      style: 'totalRow',
      border: [true, true, true, true],
      borderColor: ['#1e3a8a', '#1e3a8a', '#1e3a8a', '#1e3a8a'],
      fillColor: '#1e3a8a',
      color: '#f8fafc',
      alignment: 'right',
      margin: [6, 6, 6, 6],
    },
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
  ]);

  return {
    table: {
      headerRows: 1,
      widths: ['auto', 'auto', 100, 'auto', 150, 'auto', 'auto', 80, 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
      body,
    },
    layout: {
      hLineColor: () => '#e2e8f0',
      vLineColor: () => '#e2e8f0',
      paddingLeft: () => 3,
      paddingRight: () => 3,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
  };
}

function buildContent(cirurgias = [], summary = {}) {
  if (!cirurgias.length) {
    return [{ text: 'Nenhuma cirurgia encontrada para os filtros informados.', style: 'noData' }];
  }

  return [buildMainTable(cirurgias, summary)];
}

function buildHeader(summary) {
  return {
    margin: [16, 14, 16, 10],
    table: {
      widths: ['*', 'auto'],
      body: [[
        {
          stack: [
            { text: 'Centro Cirúrgico', style: 'headerLabel' },
            { text: 'Mapa Cirúrgico', style: 'headerTitle' },
          ],
          fillColor: '#1e3a8a',
          border: [false, false, false, false],
          margin: [14, 12, 14, 12],
        },
        {
          stack: [
            { text: `Período: ${defaultValue(summary.periodo, '-')}`, margin: [0, 0, 0, 4] },
            { text: `Médico: ${defaultValue(summary.medico, 'Todos')}`, margin: [0, 0, 0, 4] },
            { text: `Setor: ${defaultValue(summary.setor, 'Centro Cirúrgico')}`, margin: [0, 0, 0, 4] },
            { text: `Total de procedimentos: ${summary.total}`, margin: [0, 0, 0, 0] },
          ],
          alignment: 'right',
          fillColor: '#2563eb',
          border: [false, false, false, false],
          margin: [14, 12, 14, 12],
          color: '#f8fafc',
          style: 'headerDetails',
        },
      ]],
    },
    layout: 'noBorders',
  };
}

function buildFooter(summary) {
  return (currentPage, pageCount) => ({
    margin: [16, 8, 16, 24],
    columns: [
      { text: `Emitido em ${defaultValue(formatDateTime(summary.generatedAt), '-')}`, style: 'footerText' },
      { text: `Total de registros: ${summary.total}`, alignment: 'center', style: 'footerHighlight' },
      { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', style: 'footerText' },
    ],
  });
}

function gerarRelatorio(dados = {}) {
  const cirurgias = Array.isArray(dados.cirurgias) ? dados.cirurgias : [];
  const summary = createSummary(cirurgias, dados.filtros || {}, dados.summary || {});
  const cirurgiasOrdenadas = sortCirurgias(cirurgias);

  const docDefinition = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [16, 116, 16, 54],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 8,
      color: '#1f2937',
    },
    styles: {
      headerLabel: {
        color: '#bfdbfe',
        fontSize: 10,
        letterSpacing: 1,
        bold: true,
      },
      headerTitle: {
        color: '#f8fafc',
        fontSize: 22,
        bold: true,
        margin: [0, 6, 0, 0],
        letterSpacing: 1,
      },
      headerDetails: {
        fontSize: 10,
        color: '#f8fafc',
      },
      tableHeader: {
        fontSize: 8,
        fontSize: 8,
        bold: true,
        color: '#f8fafc',
        alignment: 'left',
        margin: [0, 3, 0, 3],
      },
      tableCell: {
        fontSize: 7,
        color: '#0f172a',
        margin: [0, 1, 0, 1],
      },
      tableCellCentered: {
        fontSize: 7,
        color: '#0f172a',
        margin: [0, 1, 0, 1],
        alignment: 'center',
      },
      observationRow: {
        fontSize: 7,
        color: '#1f2937',
      },
      totalRow: {
        fontSize: 9,
        bold: true,
      },
      noData: {
        margin: [0, 60, 0, 0],
        fontSize: 12,
        color: '#475569',
        alignment: 'center',
      },
      footerText: {
        fontSize: 8,
        color: '#64748b',
      },
      footerHighlight: {
        fontSize: 8,
        color: '#2563eb',
        bold: true,
      },
    },
    header: buildHeader(summary),
    footer: buildFooter(summary),
    content: buildContent(cirurgiasOrdenadas, summary),
  };

  return printer.createPdfKitDocument(docDefinition);
}

module.exports = { gerarRelatorio };
