const { PDFDocument, StandardFonts, rgb } = require('pdf-lib')

const A4 = [595.28, 841.89]
const blue = rgb(0.04, 0.33, 0.55)
const gray = rgb(0.35, 0.39, 0.43)
const date = (value) => {
  const match = String(value || '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : ''
}
const text = (value) => value == null ? '' : String(value)
const parseDays = (value) => {
  if (Array.isArray(value)) return value
  try { return JSON.parse(value || '[]') || [] } catch { return [] }
}

function evaluationValues(process) {
  const schedule = Object.fromEntries(parseDays(process.treatment_days).map((entry) => {
    if (typeof entry === 'string') return [entry, { enabled: true, time: process.preferred_period || '' }]
    return [entry.day, { enabled: entry.enabled !== false, time: entry.time || '' }]
  }))
  return {
    PATIENT_NAME: text(process.patient_name), PATIENT_CPF: text(process.patient_cpf),
    PATIENT_BIRTH_DATE: date(process.birth_date), PATIENT_GENDER: text(process.gender),
    PATIENT_CELLPHONE: text(process.cellphone), PATIENT_PHONE: text(process.patient_phone),
    INSURANCE_NAME: text(process.insurance_name), INSURANCE_CARD: text(process.card_number),
    INSURANCE_VALIDITY: date(process.card_expiration), REQUESTING_DOCTOR_NAME: text(process.doctor_name),
    REQUESTING_DOCTOR_COUNCIL: text(process.doctor_council), REQUESTING_DOCTOR_RECORD: text(process.doctor_council_number),
    REQUESTING_DOCTOR_STATE: text(process.doctor_state), REFERRAL_DATE: date(process.referral_date),
    MEDICAL_DIAGNOSIS: text(process.medical_diagnosis), CID: text(process.cid),
    REQUESTED_SESSIONS: text(process.requested_sessions), AUTHORIZATION_NUMBER: text(process.authorization_number),
    PHYSIOTHERAPIST_NAME: text(process.physiotherapist_name), PHYSIOTHERAPIST_COUNCIL: text(process.physiotherapist_council),
    PHYSIOTHERAPIST_RECORD: text(process.physiotherapist_council_number), PHYSIOTHERAPIST_STATE: text(process.physiotherapist_state),
    EXPECTED_START_DATE: date(process.expected_start_date), ASSESSMENT_DATE: date(process.assessment_date),
    SESSIONS_PER_WEEK: text(Object.values(schedule).filter((item) => item.enabled).length),
    TOTAL_SESSIONS: text(process.requested_sessions), schedule,
  }
}

async function generatePhysiotherapyEvaluation(process) {
  const pdf = await PDFDocument.create(), regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const v = evaluationValues(process)
  const page = () => pdf.addPage(A4)
  let p = page(), y = 808
  const draw = (value, x, yy, size = 8, font = regular, color = rgb(0, 0, 0), maxWidth) => p.drawText(text(value), { x, y: yy, size, font, color, maxWidth })
  const line = (x1, yy, x2) => p.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness: .6, color: gray })
  const field = (label, value, x, width, yy = y) => { draw(label, x, yy, 6.5, bold, gray); draw(value, x, yy - 13, 8, regular, undefined, width); line(x, yy - 17, x + width); return yy - 27 }
  const heading = (number, title) => { y -= 4; p.drawRectangle({ x: 28, y: y - 15, width: 539, height: 20, color: blue }); draw(`${number}. ${title}`, 35, y - 9, 9, bold, rgb(1, 1, 1)); y -= 29 }
  const blank = (label, height = 35) => { draw(label, 32, y, 7, bold, gray); line(32, y - 14, 563); line(32, y - height, 563); y -= height + 8 }
  const check = (label, checked, x, yy) => { p.drawRectangle({ x, y: yy - 2, width: 8, height: 8, borderWidth: .8, borderColor: gray }); if (checked) { draw('X', x + 1.2, yy - 1, 7, bold, blue) }; draw(label, x + 12, yy - 1, 7) }
  const header = (pageNumber) => { draw('REALMED', 30, 817, 16, bold, blue); draw('Assistência e cuidado em saúde', 30, 805, 6.5, regular, gray); draw(`Página ${pageNumber} de 2`, 515, 810, 7, regular, gray); line(28, 798, 567) }

  header(1); draw('FICHA DE AVALIAÇÃO FISIOTERAPÊUTICA', 112, 772, 15, bold, blue); draw('Avaliação inicial e definição do plano assistencial', 173, 756, 8, regular, gray); y = 731
  heading(1, 'IDENTIFICAÇÃO DO PACIENTE')
  field('Nome', v.PATIENT_NAME, 32, 531); y -= 27
  field('CPF', v.PATIENT_CPF, 32, 160); field('Data de nascimento', v.PATIENT_BIRTH_DATE, 208, 125); field('Sexo', v.PATIENT_GENDER, 349, 214); y -= 27
  field('Número do celular', v.PATIENT_CELLPHONE, 32, 160); field('Número residencial', v.PATIENT_PHONE, 208, 160); field('Convênio', v.INSURANCE_NAME, 384, 179); y -= 27
  field('Carteirinha', v.INSURANCE_CARD, 32, 260); field('Validade', v.INSURANCE_VALIDITY, 308, 150); y -= 29
  heading(2, 'DADOS DO ENCAMINHAMENTO / SOLICITAÇÃO')
  const doctor = [v.REQUESTING_DOCTOR_NAME, v.REQUESTING_DOCTOR_COUNCIL, v.REQUESTING_DOCTOR_RECORD, v.REQUESTING_DOCTOR_STATE].filter(Boolean).join(' · ')
  field('Médico / profissional solicitante', doctor, 32, 360); field('Data do encaminhamento', v.REFERRAL_DATE, 408, 155); y -= 27
  field('Diagnóstico médico / hipótese', v.MEDICAL_DIAGNOSIS, 32, 360); field('CID', v.CID, 408, 155); y -= 27
  field('Quantidade de sessões solicitadas', v.REQUESTED_SESSIONS, 32, 250); field('Guia / autorização nº', v.AUTHORIZATION_NUMBER, 298, 265); y -= 32
  heading(3, 'AVALIAÇÃO FISIOTERAPÊUTICA')
  blank('Queixa principal / motivo do atendimento', 42); blank('História do quadro atual', 48); blank('Limitações funcionais', 40); blank('Exame físico e achados relevantes', 48)
  draw('Dor EVA 0–10:', 32, y, 7, bold, gray); line(105, y - 3, 160); check('Sem dor', false, 190, y); check('Leve', false, 270, y); check('Moderada', false, 330, y); check('Intensa', false, 415, y); y -= 25; field('Localização predominante', '', 32, 531)

  p = page(); header(2); y = 775
  heading(4, 'REGIÃO / MEMBRO ACOMETIDO E MAPA CORPORAL')
  draw('Região', 32, y, 7, bold, gray); draw('D', 185, y, 7, bold); draw('E', 215, y, 7, bold); draw('Bil.', 245, y, 7, bold)
  const regions = ['Cervical / cabeça','Ombro','Braço','Cotovelo','Antebraço','Punho / mão','Torácica','Lombar','Quadril','Coxa','Joelho','Perna','Tornozelo / pé','Outro']
  regions.forEach((region, index) => { const yy = y - 15 - index * 11; draw(region, 32, yy, 6.2); [185,215,245].forEach(x => check('', false, x, yy)) })
  draw('MAPA CORPORAL', 355, y, 7, bold, gray); p.drawCircle({ x: 445, y: y - 27, size: 13, borderWidth: 1, borderColor: gray }); p.drawLine({ start:{x:445,y:y-40}, end:{x:445,y:y-95}, thickness:1, color:gray }); [['arms',410,y-60,480,y-60],['legs',445,y-95,425,y-145],['legs2',445,y-95,465,y-145]].forEach(([,x1,y1,x2,y2])=>p.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},thickness:1,color:gray})); y -= 175
  heading(5, 'CLASSIFICAÇÃO DE GRAVIDADE E RISCOS / PRECAUÇÕES')
  draw('Gravidade:',32,y,7,bold,gray); ['Leve','Moderada','Grave'].forEach((x,i)=>check(x,false,100+i*85,y)); draw('Risco assistencial:',350,y,7,bold,gray); ['Baixo','Moderado','Alto'].forEach((x,i)=>check(x,false,435+i*48,y)); y-=19
  field('Justificativa', '', 32, 531); y-=23; draw('Necessita acompanhamento individualizado:',32,y,7,bold,gray); check('Sim',false,225,y); check('Não',false,280,y); y-=16
  const risks=['Risco de queda','Alteração de sensibilidade','Pós-operatório','Doença cardiovascular','Déficit neurológico','Lesão de pele','Marcapasso / implante eletrônico','Gestação','Trombose / risco vascular','Dor intensa','Outro']
  risks.forEach((risk,i)=>check(risk,false,32+(i%4)*135,y-Math.floor(i/4)*15)); y-=48; field('Observações / cuidados específicos','',32,531); y-=25
  heading(6, 'CONDUTA E PLANO TERAPÊUTICO')
  field('Objetivos terapêuticos','',32,531); y-=23
  const conducts=['Cinesioterapia','Alongamento','Fortalecimento','Treino funcional','Terapia manual','Eletroterapia','Termoterapia','Crioterapia','Propriocepção/equilíbrio','Treino de marcha','Orientações domiciliares','Outra']
  conducts.forEach((item,i)=>check(item,false,32+(i%4)*135,y-Math.floor(i/4)*15)); y-=48; field('Descrição / parâmetros / progressão planejada','',32,531); y-=23; field('Previsão de reavaliação','',32,180); field('Critério / observação','',228,335); y-=25
  heading(7, 'DIAS E HORÁRIO DE ATENDIMENTO')
  const days=[['MONDAY','Segunda'],['TUESDAY','Terça'],['WEDNESDAY','Quarta'],['THURSDAY','Quinta'],['FRIDAY','Sexta']]
  days.forEach(([key,label],i)=>{const x=32+i*106, item=v.schedule[key];draw(label,x,y,7,bold);check(item?.enabled?'Sim':'Não',Boolean(item?.enabled),x,y-13);draw(item?.time||'____:____',x,y-26,7)}); y-=42
  field('Frequência planejada',v.SESSIONS_PER_WEEK?`${v.SESSIONS_PER_WEEK}x por semana`:'',32,170); field('Total previsto de sessões',v.TOTAL_SESSIONS,218,160); field('Início',v.EXPECTED_START_DATE,394,169); y-=25
  heading(8, 'RESPONSÁVEL PELA AVALIAÇÃO')
  const physioCouncil=[v.PHYSIOTHERAPIST_COUNCIL,v.PHYSIOTHERAPIST_RECORD,v.PHYSIOTHERAPIST_STATE].filter(Boolean).join(' ')
  field('Fisioterapeuta',v.PHYSIOTHERAPIST_NAME,32,250); field('CREFITO',physioCouncil,298,165); field('Data',v.ASSESSMENT_DATE,479,84); y-=34; field('Assinatura / rubrica','',32,531)
  return Buffer.from(await pdf.save())
}

module.exports = { evaluationValues, generatePhysiotherapyEvaluation }
