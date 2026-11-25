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

// =========================================================================
// PERFIL → LISTA DE ESCALAS QUE ESSE PERFIL PODE OCUPAR
// Um perfil pode estar escalado em mais de uma profissão: o mesmo técnico de
// enfermagem cobre plantão regular (tec-enfermagem) e hemodiálise
// (tec-hemodialise). A catraca precisa consultar TODAS as escalas do perfil,
// senão o plantão de HD fica invisível para quem tem perfil de enfermagem.
// Os slugs batem com o CATEGORIA_SLUGS do ImportadorEscala.
// =========================================================================
const PERFIL_SLUGS = {
  'Médico': ['medico'],
  'Médico Plantonista': ['medico'],
  'Enfermeiro': ['enfermeiro'],
  'Téc. em Enf.': ['tec-enfermagem', 'tec-hemodialise'],
  'Téc. Enfermagem': ['tec-enfermagem', 'tec-hemodialise'],
  'Téc. Hemodiálise': ['tec-hemodialise', 'tec-enfermagem'],
  'Fisioterapeuta': ['fisioterapeuta'],
  'Fonoaudiólogo': ['fonoaudiologo'],
  'Nutricionista': ['nutricionista'],
  'Psicólogo': ['psicologo'],
  'Motorista': ['motorista'],
  'Recepção': ['recepcao'],
  'Central de Nutrição': ['central-nutricao'],
  'Administrativo': ['administrativo'],
  'Farmácia': ['farmacia'],
};

// Chave tolerante: acha o perfil mesmo com acento, ponto ou caixa diferente,
// para não depender de o texto em `usuarios.perfil` ser idêntico ao daqui.
const chavePerfil = (v) => String(v ?? '')
  .toUpperCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Z0-9 ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const PERFIL_INDEX = Object.fromEntries(
  Object.entries(PERFIL_SLUGS).map(([perfil, slugs]) => [chavePerfil(perfil), slugs])
);

const resolverSlugsDoPerfil = (perfil) =>
  PERFIL_SLUGS[perfil] || PERFIL_INDEX[chavePerfil(perfil)] || null;

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

// =========================================================================
// NORMALIZAÇÃO E MATCH DE IDENTIDADE — SOMENTE UID E NOME
// =========================================================================
const normalizarNome = (v) => String(v ?? '')
  .toUpperCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')            // remove acentos
  .replace(/\[(EXTRA|FALTOU|ATESTADO|FERIAS|FÉRIAS|LICENCA|LICENÇA|SUBSTITUTO)\]/gi, ' ')
  .replace(/\b(DR|DRA|ENF|ENFA|TEC|TECN|FT|FISIO|PROF|SR|SRA)\.?\b/g, ' ')
  // ⚠️ O importador COLA a matrícula no nome ("LUCIANO FOGAÇA DIAS 108278").
  // Esta linha é o que faz o nome casar: remove dígitos e pontuação.
  .replace(/[^A-Z ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Match de nome SEGURO: exige igualdade ou o nome menor inteiro como bloco de
// palavras (mín. 2 tokens). Sem o includes() bidirecional antigo, que deixava
// "SILVA" casar com "JOAO DA SILVA".
const nomesCorrespondem = (a, b) => {
  if (!a || !b) return false;
  if (a === b) return true;
  const menor = a.length <= b.length ? a : b;
  const maior = a.length <= b.length ? b : a;
  if (menor.split(' ').filter(Boolean).length < 2) return false;
  const escapado = menor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escapado}\\b`).test(maior);
};

// Data ISO (AAAA-MM-DD) → DD/MM/AAAA
const dataParaExibicao = (iso) => {
  const s = String(iso ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split('-').reverse().join('/') : s;
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
  const slugsUsuario = resolverSlugsDoPerfil(userProfile.perfil);
  if (!slugsUsuario || slugsUsuario.length === 0) {
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

  const uidUsuario = userProfile.uid || null;
  const nomeBanco  = normalizarNome(userProfile.nome);

  // Monta todas as combinações escala × mês. Ex.: técnico de enfermagem em
  // novembro → tec-enfermagem/2026-11, tec-enfermagem/2026-10,
  // tec-hemodialise/2026-11, tec-hemodialise/2026-10. Basta UM turno válido
  // em qualquer par para liberar a entrada.
  const alvos = [];
  slugsUsuario.forEach((slug) => {
    mesRefs.forEach((anoMes) => alvos.push({ slug, anoMes }));
  });

  try {
    for (const { slug, anoMes } of alvos) {
      const mesRef = doc(db, "escalas", slug, "meses", anoMes);
      const snap = await getDoc(mesRef);
      if (!snap.exists()) continue; // profissão/mês ainda não importado

      const dias = snap.data().dias || {};

      // Percorre todos os dias do mês
      Object.entries(dias).forEach(([dia, turnosDoDia]) => {
        Object.values(turnosDoDia || {}).forEach((turno) => {
          if (!turno || !turno.sigla) return;
          // padStart evita "2026-11-1" (não casa com "2026-11-01")
          const dataTurno = turno.data || `${anoMes}-${String(dia).padStart(2, '0')}`;

          // Considera apenas ONTEM e HOJE (mesmo critério da versão antiga)
          if (dataTurno !== dataHojeStr && dataTurno !== dataOntemStr) return;

          // Prioridade de match: UID (chave forte) → NOME normalizado
          let corresponde = false;

          // 1) UID — quando o campo estiver preenchido no turno
          if (uidUsuario && turno.uid && String(turno.uid) === String(uidUsuario)) {
            corresponde = true;
          }

          // 2) NOME normalizado — normalizarNome já remove a matrícula
          //    que o importador cola no final do nome.
          if (!corresponde && turno.nome) {
            corresponde = nomesCorrespondem(nomeBanco, normalizarNome(turno.nome));
          }

          if (!corresponde) return;

          if (verificarJanelaDeTempo(dataTurno, turno.sigla, now)) {
            plantonistaEncontradoEJanelaAtiva = true;
          } else {
            turnosAchados.push(`${turno.sigla} (Data base: ${dataParaExibicao(dataTurno)})`);
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