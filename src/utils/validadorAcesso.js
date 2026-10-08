import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase'; 

// A "Lista VIP" da UTI
const PERFIS_EXCECAO = [
  "RT Médico",
  "Nefrologista",
  "Gerente de Enfermagem",
  "RT da Fisioterapia",
  "CCIH UTI",
  "CCIH Geral",
  "Diretor Administrativo",
  "Desenvolvedor",
  "Nutricionista",
];

// Mapa perfil do usuário → slug da profissão (MESMO do importador/leitor)
const PERFIL_SLUGS = {
  'Médico': 'medico',
  'Médico Plantonista': 'medico',
  'Enfermeiro': 'enfermeiro',
  'Téc. em Enf.': 'tec-enfermagem',
  'Téc. Hemodiálise': 'tec-hemodialise',
  'Fisioterapeuta': 'fisioterapeuta',
  'Fonoaudiólogo': 'fonoaudiologo',
  'Nutricionista': 'nutricionista',
  'Psicólogo': 'psicologo',
  'Motorista': 'motorista',
  'Recepção': 'recepcao',
};

// Helper: Calcula a janela de acesso (-1h antes, +1h depois) com base na sigla
const verificarJanelaDeTempo = (dataPlantao, sigla, dataHoraAtual) => {
  // Tabela Cronológica Oficial da UTI
  const regras = {
    'D':  { startH: 6,  endH: 20, daysAdd: 0 }, // Plantão Dia (07h-19h): Acesso 06h às 20h
    'N':  { startH: 18, endH: 8,  daysAdd: 1 }, // Plantão Noite (19h-07h): Acesso 18h às 08h do dia seguinte
    'DN': { startH: 6,  endH: 8,  daysAdd: 1 }, // Plantão 24h (07h-07h): Acesso 06h às 08h do dia seguinte
    'M':  { startH: 6,  endH: 14, daysAdd: 0 }, // Manhã (07h-13h): Acesso 06h às 14h
    'T':  { startH: 12, endH: 20, daysAdd: 0 }, // Tarde (13h-19h): Acesso 12h às 20h
    'V':  { startH: 6,  endH: 14, daysAdd: 0 }  // Visita (07h-13h): Acesso 06h às 14h
  };

  const regra = regras[sigla];
  if (!regra) return true; // Failsafe para caso a coordenação crie uma sigla nova não mapeada

  const [ano, mes, dia] = dataPlantao.split('-').map(Number);
  
  // O JavaScript gerencia automaticamente viradas de mês/ano ao somar dias
  const inicioAcesso = new Date(ano, mes - 1, dia, regra.startH, 0, 0);
  const fimAcesso = new Date(ano, mes - 1, dia + regra.daysAdd, regra.endH, 0, 0);

  return dataHoraAtual >= inicioAcesso && dataHoraAtual <= fimAcesso;
};

export const verificarCatraca = async (userProfile) => {
  if (!userProfile || !userProfile.nome) {
    return { liberado: false, motivo: "Perfil incompleto. Entre em contato com a administração." };
  }

  // 1º FILTRO: Exceções da Gestão / Consultores
  if (PERFIS_EXCECAO.includes(userProfile.perfil)) {
    return { liberado: true, motivo: `Acesso liberado (Exceção: ${userProfile.perfil})` };
  }

  const now = new Date();

  // Determina a profissão (slug) do usuário a partir do perfil
  const slugUsuario = PERFIL_SLUGS[userProfile.perfil];
  if (!slugUsuario) {
    return { liberado: false, motivo: "Profissão não reconhecida no cadastro. Entre em contato com a administração." };
  }

  // Meses a consultar: mês atual + mês anterior (plantões N/DN cruzam meia-noite)
  const hoje = new Date(now);
  const ontem = new Date(now);
  ontem.setDate(ontem.getDate() - 1);

  const formatarData = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const formatarAnoMes = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  const dataHojeStr = formatarData(hoje);
  const dataOntemStr = formatarData(ontem);
  const anoMesHoje = formatarAnoMes(hoje);
  const anoMesOntem = formatarAnoMes(ontem);
  const mesRefs = [...new Set([anoMesHoje, anoMesOntem])]; // dedupe se for o mesmo mês

  let plantonistaEncontradoEJanelaAtiva = false;
  let turnosAchados = [];
  const uidUsuario = userProfile.uid;
  const nomeBanco = userProfile.nome.toUpperCase().trim();

  try {
    for (const anoMes of mesRefs) {
      const mesRef = doc(db, "escalas", slugUsuario, "meses", anoMes);
      const snap = await getDoc(mesRef);
      if (!snap.exists()) continue; // profissão/mês ainda não importado

      const dias = snap.data().dias || {};

      // Percorre todos os dias do mês
      Object.entries(dias).forEach(([dia, turnosDoDia]) => {
        Object.values(turnosDoDia || {}).forEach((turno) => {
          if (!turno || !turno.sigla) return;
          const dataTurno = turno.data || `${anoMes}-${dia}`;

          // Considera apenas ONTEM e HOJE (mesmo critério da versão antiga)
          if (dataTurno !== dataHojeStr && dataTurno !== dataOntemStr) return;

          // Match por UID (chave primária) — fallback por nome
          let corresponde = false;
          if (uidUsuario && turno.uid && turno.uid === uidUsuario) {
            corresponde = true;
          } else if (turno.nome) {
            const nomeEscala = turno.nome.toUpperCase()
              .replace('[EXTRA]', '').replace('[FALTOU]', '').replace('[ATESTADO]', '').trim();
            corresponde = nomeBanco.includes(nomeEscala) || nomeEscala.includes(nomeBanco);
          }
          if (!corresponde) return;

          if (verificarJanelaDeTempo(dataTurno, turno.sigla, now)) {
            plantonistaEncontradoEJanelaAtiva = true;
          } else {
            turnosAchados.push(`${turno.sigla} (Data base: ${dataTurno})`);
          }
        });
      });
    }

    if (plantonistaEncontradoEJanelaAtiva) {
      return { liberado: true, motivo: "Acesso liberado: Profissional validado no horário de plantão." };
    } else if (turnosAchados.length > 0) {
      return { liberado: false, motivo: `Acesso Negado: Plantão detectado, porém fora da janela de tolerância (-1h a +1h). Turnos: ${turnosAchados.join(', ')}` };
    } else {
      return { liberado: false, motivo: "Acesso Negado: Você não possui plantão escalado ou ativo no momento." };
    }
  } catch (error) {
    console.error("Erro na catraca de acesso cronológica:", error);
    return { liberado: false, motivo: "Erro ao consultar a validação cronológica. Comunique a coordenação." };
  }
};