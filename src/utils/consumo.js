// ============================================================
// consumo.js — Instante real da oferta de dieta.
// Combina a DATA do registro (dataHoraRegistro) com o HORÁRIO
// informado da oferta (horario / horarioRefeicao).
//
// Regra do plantão noturno: se o horário informado é MUITO maior
// que o horário do lançamento (diferença > 6h), a oferta foi no
// dia anterior — ex.: registrado 00:40, ofertado 19:00 → recua 1 dia.
// ============================================================

export const RECUO_MAX_MS = 6 * 60 * 60 * 1000; // 6 horas

export const instanteRefeicao = (reg) => {
  const base = reg?.dataHoraRegistro ? new Date(reg.dataHoraRegistro) : null;
  if (!base || isNaN(base.getTime())) return null;

  const hhmm = String(reg.horario || reg.horarioRefeicao || '').trim();
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return base; // sem horário legível → usa o instante do registro

  const instante = new Date(base);
  instante.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);

  if (instante > base && (instante - base) > RECUO_MAX_MS) {
    instante.setDate(instante.getDate() - 1);
  }
  return instante;
};

/** Data ISO (AAAA-MM-DD) do instante da oferta. '' quando inválido. */
export const dataRefeicaoISO = (reg) => {
  const i = instanteRefeicao(reg);
  if (!i) return '';
  return `${i.getFullYear()}-${String(i.getMonth() + 1).padStart(2, '0')}-${String(i.getDate()).padStart(2, '0')}`;
};

/** Data brasileira DD-MM-AAAA do instante da oferta. 'Sem data' quando inválido. */
export const dataRefeicaoBR = (reg) => {
  const i = instanteRefeicao(reg);
  if (!i) return 'Sem data';
  return `${String(i.getDate()).padStart(2, '0')}-${String(i.getMonth() + 1).padStart(2, '0')}-${i.getFullYear()}`;
};