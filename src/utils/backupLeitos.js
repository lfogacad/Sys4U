// =====================================================
// BACKUP DE LEITOS — snapshots por horário
// =====================================================
import { collection, doc, getDocs, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// 1) GERAR SNAPSHOT: lê todos os leitos e salva em backup_leitos/{timestamp}
export const gerarSnapshotLeitos = async (rotulo = 'manual') => {
  const ts = new Date();
  const snapshotId = ts.toISOString(); // ex.: "2026-10-08T19:00:00.000Z"
  const snap = await getDocs(collection(db, 'leitos_uti'));
  const leitos = {};
  snap.forEach(d => { leitos[d.id] = d.data(); });
  await setDoc(doc(db, 'backup_leitos', snapshotId), {
    criadoEm: ts,
    rotulo,
    leitos
  });
  console.log(`[BACKUP] Snapshot ${snapshotId} salvo com ${snap.size} leitos`);
  return snapshotId;
};

// 2) LISTAR SNAPSHOTS (mais recente primeiro) — alimenta o seletor de horário
export const listarSnapshots = async () => {
  const snap = await getDocs(collection(db, 'backup_leitos'));
  return snap.docs
    .map(d => ({
      id: d.id,
      rotulo: d.data().rotulo,
      criadoEm: d.data().criadoEm
    }))
    .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
};

// 3) RESTAURAR: sobrescreve OU só preenche campos que estão vazios/faltando
export const restaurarSnapshot = async (snapshotId, { apenasCamposVazios = true } = {}) => {
  const snap = await getDoc(doc(db, 'backup_leitos', snapshotId));
  if (!snap.exists()) throw new Error('Snapshot não encontrado');
  const leitos = snap.data().leitos || {};
  const restaurados = [];
  for (const [leitoId, dadosBackup] of Object.entries(leitos)) {
    const atualRef = doc(db, 'leitos_uti', leitoId);
    const atual = (await getDoc(atualRef)).data() || {};
    const payload = apenasCamposVazios
      ? mesclarPreenchendoVazios(atual, dadosBackup)
      : dadosBackup;
    await setDoc(atualRef, payload, { merge: true });
    restaurados.push(leitoId);
  }
  return restaurados;
};

// Mescla recursiva: preenche SÓ o que está undefined/nulo/vazio agora.
// Assim, dados bons registrados DEPOIS do apagamento não são sobrescritos.
const estaVazio = (v) =>
  v === undefined || v === null || v === '' ||
  (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);

const mesclarPreenchendoVazios = (atual, backup) => {
  const saida = { ...atual };
  for (const [chave, vBackup] of Object.entries(backup || {})) {
    if (saida[chave] === undefined) {
      saida[chave] = vBackup;
    } else if (
      vBackup && typeof vBackup === 'object' && !Array.isArray(vBackup) &&
      saida[chave] && typeof saida[chave] === 'object' && !Array.isArray(saida[chave])
    ) {
      saida[chave] = mesclarPreenchendoVazios(saida[chave], vBackup);
    }
  }
  return saida;
};