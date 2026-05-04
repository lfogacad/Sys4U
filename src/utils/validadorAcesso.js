import { collection, query, where, getDocs } from 'firebase/firestore';
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
];

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
  
  // 2º FILTRO: Busca em lote. Precisamos da escala de ONTEM (para plantões N e DN ativos) e de HOJE
  const hoje = new Date(now);
  const ontem = new Date(now);
  ontem.setDate(ontem.getDate() - 1);

  // Formato YYYY-MM-DD para o Firebase
  const formatarData = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  const dataHojeStr = formatarData(hoje);
  const dataOntemStr = formatarData(ontem);

  try {
    const escalasRef = collection(db, "escalas");
    // Consulta dupla usando a cláusula 'in'
    const q = query(escalasRef, where("data", "in", [dataOntemStr, dataHojeStr]));
    const querySnapshot = await getDocs(q);

    let plantonistaEncontradoEJanelaAtiva = false;
    let turnosAchados = [];
    const nomeBanco = userProfile.nome.toUpperCase().trim();

    querySnapshot.forEach((doc) => {
      const plantao = doc.data();
      if (!plantao.nome || !plantao.sigla) return;

      const nomeEscala = plantao.nome.toUpperCase().trim();

      // Regra da Interseção Nominal
      if (nomeBanco.includes(nomeEscala)) {
        // Valida se, além de estar na escala, ele está na janela cronológica correta
        const dentroDaJanela = verificarJanelaDeTempo(plantao.data, plantao.sigla, now);
        
        if (dentroDaJanela) {
          plantonistaEncontradoEJanelaAtiva = true;
        } else {
          // Guarda o turno bloqueado para dar feedback preciso ao usuário
          turnosAchados.push(`${plantao.sigla} (Data base: ${plantao.data})`);
        }
      }
    });

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