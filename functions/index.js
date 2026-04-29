const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

exports.gerarCensoUTI = onSchedule({
  schedule: "59 23 * * *",
  timeZone: "America/Porto_Velho", 
  memory: "256MiB"
}, async () => {
  console.log("Iniciando varredura do Censo Diário e Qualidade...");

  try {
    const leitosSnapshot = await db.collection("leitos_uti").get();
    
    const agora = new Date();
    agora.setHours(agora.getHours() - 4);
    const [dia, mes, ano] = hoje.split("/");
    const dataFormatada = agora.toISOString().split('T')[0];

    let contadores = {
      data: dataFormatada,
      totalLeitosOcupados: 0,
      pacientesEmVM: 0,
      pacientesComCVC: 0,
      pacientesComSVD: 0,
      pacientesComShiley: 0,
      // --- NOVO INDICADOR DE QUALIDADE ---
      pacientesIdentificados: 0, 
      timestampProcessamento: admin.firestore.FieldValue.serverTimestamp()
    };

    leitosSnapshot.forEach((doc) => {
      const p = doc.data();
      
      if (p.nome && p.status !== "Livre") {
        contadores.totalLeitosOcupados++;

        // Contagem de Identificação (Qualidade)
        if (p.enfermagem?.identificacaoCorreta === true) {
          contadores.pacientesIdentificados++;
        }

        // Suporte Ventilatório
        if (p.fisioterapia?.ventilacao?.suporte === "VM") {
          contadores.pacientesEmVM++;
        }

        // Dispositivos Invasivos
        if (p.enfermagem?.cvcData && !p.enfermagem?.cvcRetiradaData) {
          contadores.pacientesComCVC++;
        }

        if (p.enfermagem?.svdData && !p.enfermagem?.svdRetiradaData) {
          contadores.pacientesComSVD++;
        }
        
        if (p.enfermagem?.shileyData && !p.enfermagem?.shileyRetiradaData) {
          contadores.pacientesComShiley++;
        }
      }
    });

    // Salva o censo completo com o dado de identificação
    await db.collection("censo_diario").add(contadores);

    console.log(`✅ Censo e Qualidade do dia ${dataFormatada} salvos com sucesso!`);
    
  } catch (error) {
    console.error("❌ Erro ao rodar o fechamento do censo:", error);
  }
});