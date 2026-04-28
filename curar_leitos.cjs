const admin = require('firebase-admin');
const serviceAccount = require('./chave-firebase.json');

const NOME_COLECAO = 'leitos_uti'; 

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function diagnostico() {
  console.log("--- INICIANDO DIAGNÓSTICO DE DADOS ---");
  const snapshot = await db.collection(NOME_COLECAO).get();
  
  if (snapshot.empty) {
    console.log("⚠️ ATENÇÃO: NENHUM leito encontrado na coleção 'leitos_uti'.");
    console.log("Verifique se o nome da coleção está correto ou se a chave-firebase.json é do projeto novo.");
    return;
  }

  snapshot.forEach(doc => {
    const d = doc.data();
    console.log(`\n🏥 Paciente: ${d.nome || 'Sem Nome'}`);
    console.log(`   - Tem BH? ${d.bh ? '✅' : '❌'}`);
    if (d.bh) {
      console.log(`   - Tem Ganhos? ${d.bh.gains ? '✅' : '❌'}`);
      console.log(`   - Tem Perdas? ${d.bh.losses ? '✅' : '❌'}`);
      console.log(`   - Tem Sinais Vitais? ${d.bh.vitals ? '✅' : '❌'}`);
    }
  });
}

diagnostico();