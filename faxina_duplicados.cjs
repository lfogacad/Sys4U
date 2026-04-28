const admin = require('firebase-admin');
const serviceAccount = require('./chave-firebase.json');

const NOME_COLECAO = 'leitos_uti'; 

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function faxina() {
  console.log("--- INICIANDO FAXINA DE DUPLICADOS ---");
  const snapshot = await db.collection(NOME_COLECAO).get();
  
  const pacientesEncontrados = new Set();
  let apagados = 0;

  for (const doc of snapshot.docs) {
    const dados = doc.data();
    const nomeIdentificador = dados.nome?.trim().toUpperCase();

    if (pacientesEncontrados.has(nomeIdentificador)) {
      // Se o nome já apareceu antes, este documento é uma cópia. Apagamos.
      await db.collection(NOME_COLECAO).doc(doc.id).delete();
      console.log(`🗑️ Cópia de [${nomeIdentificador}] removida.`);
      apagados++;
    } else {
      // Primeira vez que vemos este nome, vamos manter este documento.
      pacientesEncontrados.add(nomeIdentificador);
    }
  }

  console.log(`\n✨ Faxina concluída! ${apagados} documentos duplicados foram eliminados.`);
  console.log(`Sua UTI agora tem ${pacientesEncontrados.size} pacientes únicos.`);
}

faxina();