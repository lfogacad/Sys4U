/**
 * Utilitários de culturas (CCIH).
 * Ponto único de inserção de culturas coletadas, usado tanto pela
 * evolução médica (ChecklistEvoModal → generateAIEvolution) quanto
 * pelo botão rápido da MedicalDashboard.
 *
 * REGRA DE DEDUPLICAÇÃO: uma cultura é identificada por (tipo + dataColeta).
 * Se o mesmo material já foi registrado no mesmo dia, por qualquer caminho,
 * a segunda inserção é ignorada — a ordem não importa.
 */

export const TIPOS_CULTURA_PADRAO = [
  'Hemocultura',
  'Hemocultura pareada (CVC)',
  'Urocultura',
  'Secreção Traqueal',
  'Outro'
];

/** Data de hoje no fuso do Amazonas, formato AAAA-MM-DD. */
export const dataHojeAmazonas = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus' }).format(new Date());

/**
 * Normaliza o nome do material, considerando o detalhe do "Outro".
 * "Outro" + "Líquor" → "Outro (Líquor)"
 */
export const montarNomeMaterial = (tipo, detalhe) => {
  if (tipo === 'Outro' && detalhe && String(detalhe).trim()) {
    return `Outro (${String(detalhe).trim()})`;
  }
  return tipo;
};

/**
 * Verifica se já existe cultura do mesmo material na mesma data de coleta.
 */
export const culturaJaRegistrada = (lista, nomeMaterial, dataColeta) => {
  if (!Array.isArray(lista)) return false;
  return lista.some(
    c =>
      String(c?.tipo || '').trim().toLowerCase() === String(nomeMaterial || '').trim().toLowerCase() &&
      c?.dataColeta === dataColeta
  );
};

/**
 * Regra ÚNICA de inserção de culturas do dia.
 *
 * @param {object} params
 * @param {Array}  params.listaAtual  array atual de currentPatient.culturas.lista
 * @param {Array}  params.tipos       materiais selecionados (ex: ['Hemocultura', 'Urocultura'])
 * @param {string} params.outroDetalhe texto livre quando "Outro" está marcado
 * @param {string} [params.dataColeta] data da coleta (AAAA-MM-DD). Default: hoje
 * @param {string} [params.origem]    'evolucao' | 'rapida' — só para auditoria
 * @returns {{ listaFinal: Array, adicionadas: Array, ignoradas: Array }}
 */
export const inserirCulturasDoDia = ({
  listaAtual = [],
  tipos = [],
  outroDetalhe = '',
  dataColeta = dataHojeAmazonas(),
  origem = 'evolucao'
}) => {
  const listaFinal = Array.isArray(listaAtual) ? [...listaAtual] : [];
  const adicionadas = [];
  const ignoradas = [];

  (tipos || []).forEach(tipo => {
    if (!tipo) return;
    const nomeMaterial = montarNomeMaterial(tipo, outroDetalhe);

    if (culturaJaRegistrada(listaFinal, nomeMaterial, dataColeta)) {
      ignoradas.push(nomeMaterial);
      return;
    }

    const nova = {
      id: `cult_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tipo: nomeMaterial,
      dataColeta,
      status: 'Pendente',
      germe: '',
      analiseIA: '',
      dataResultado: '',
      origemRegistro: origem   // auditoria: 'evolucao' ou 'rapida'
    };

    listaFinal.push(nova);
    adicionadas.push(nova);
  });

  return { listaFinal, adicionadas, ignoradas };
};