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
  console.log("Iniciando varredura do Censo Diário, Qualidade e Rastreio de PAV (Regra ANVISA)...");

  try {
    const leitosSnapshot = await db.collection("leitos_uti").get();
    
    // Ajuste de fuso horário para Rondônia (UTC-4)
    const agora = new Date();
    agora.setHours(agora.getHours() - 4);
    
    // ========================================================
    // MOTOR DE TEMPO: JANELA DE INFECÇÃO (D0 a D-3)
    // ========================================================
    const datasJanela = [];
    for (let i = 0; i <= 3; i++) {
      const d = new Date(agora.getTime() - i * 86400000);
      datasJanela.push(d.toISOString().split('T')[0]); // Formato YYYY-MM-DD
    }
    
    const d0 = datasJanela[0]; // Hoje
    const mesCorrente = d0.slice(0, 7);
    
    const datasBR = datasJanela.map(d => d.split('-').reverse().join('/'));
    const datasBRCurtas = datasBR.map(d => d.substring(0, 5));

    let contadores = {
      data: d0,
      totalLeitosOcupados: 0,
      pacientesEmVM: 0,
      pacientesComCVC: 0,
      pacientesComSVD: 0,
      pacientesComShiley: 0,
      pacientesIdentificados: 0, 
      timestampProcessamento: admin.firestore.FieldValue.serverTimestamp()
    };

    const promessasPAV = [];
    let novosCasosPAV = 0;

    leitosSnapshot.forEach((doc) => {
      const p = doc.data();
      const leitoId = doc.id;
      const leitoNumero = leitoId.replace('bed_', '');
      
      if (p.nome && p.status !== "Livre") {
        contadores.totalLeitosOcupados++;

        // Indicadores Assistenciais (Qualidade)
        if (p.enfermagem?.identificacaoCorreta === true) contadores.pacientesIdentificados++;
        if (p.fisioterapia?.ventilacao?.suporte === "VM" || p.fisioterapia?.suporte === "VM") contadores.pacientesEmVM++;
        if (p.enfermagem?.cvcData && !p.enfermagem?.cvcRetiradaData) contadores.pacientesComCVC++;
        if (p.enfermagem?.svdData && !p.enfermagem?.svdRetiradaData) contadores.pacientesComSVD++;
        if (p.enfermagem?.shileyData && !p.enfermagem?.shileyRetiradaData) contadores.pacientesComShiley++;

        // ====================================================================
        // 🚨 SNIFFER DE SUSPEITA DE PAV (JANELA + D.O.E)
        // ====================================================================
        if (p.dataIntubacao) {
          let dataIntStr = p.dataIntubacao;
          if (dataIntStr.includes('/')) dataIntStr = dataIntStr.split('/').reverse().join('-');
          const dataInt = new Date(dataIntStr);

          // O Raio-X Novo no dia atual é obrigatório
          const radPositivo = p.medical?.novoInfiltrado === 'sim' || p.novoInfiltrado === 'sim';

          if (radPositivo) {
            let sisPositivo = false;
            let sisEvidencias = [];
            let respCount = 0;
            let respEvidencias = [];
            let datasEventosEncontrados = [d0];

            // 1. SINAIS SISTÊMICOS (LEUCÓCITOS NA JANELA)
            if (p.examHistory) {
              Object.keys(p.examHistory).forEach(dt => {
                if (datasJanela.includes(dt) || datasBR.includes(dt) || datasBRCurtas.includes(dt)) {
                  const leucoStr = p.examHistory[dt]?.["Leucócitos"];
                  if (leucoStr) {
                    const leuco = parseFloat(leucoStr.toString().replace(/\./g, '').replace(',', '.'));
                    if (leuco < 4000 || leuco > 12000) {
                      sisPositivo = true;
                      sisEvidencias.push(`Leucócitos (${leuco}) aferidos em ${dt}`);
                      
                      let dtNorm = dt;
                      if (dt.includes('/')) dtNorm = dt.split('/').reverse().join('-');
                      if (dtNorm.length === 5) dtNorm = `${d0.split('-')[0]}-${dtNorm}`;
                      datasEventosEncontrados.push(dtNorm);
                    }
                  }
                }
              });
            }

            // 1B. SINAIS SISTÊMICOS (FEBRE DE HOJE)
            const strPaciente = JSON.stringify(p);
            const regexTemp = /"Temp\s*\(ºC\)":\s*"?((?:3[8-9]|4\d)(?:[.,]\d+)?)"?/g;
            let matchTemp;
            while ((matchTemp = regexTemp.exec(strPaciente)) !== null) {
              sisPositivo = true;
              if (!sisEvidencias.includes(`Febre (${matchTemp[1]} ºC)`)) {
                sisEvidencias.push(`Febre (${matchTemp[1]} ºC) registrada em ${datasBR[0]}`);
                datasEventosEncontrados.push(d0);
              }
            }

            // 2. SINAIS RESPIRATÓRIOS (SECREÇÃO)
            const asp = p.physio?.secrecaoAspecto?.toLowerCase() || "";
            const col = p.physio?.secrecaoColoracao?.toLowerCase() || "";
            const qtd = p.physio?.secrecaoQtd?.toLowerCase() || "";
            
            if (asp.includes('espessa') || col.includes('purulenta') || col.includes('esverdeada') || qtd.includes('moderada') || qtd.includes('abundante')) {
              respCount++;
              respEvidencias.push(`Secreção anormal (${asp}/${col}/${qtd}) avaliada em ${datasBR[0]}`);
              datasEventosEncontrados.push(d0);
            }

            // 2B. SINAIS RESPIRATÓRIOS (GASOMETRIA NA JANELA)
            if (p.gasometriaHistory) {
              let menorPF = 999;
              let dataMenorPF = "";
              
              Object.keys(p.gasometriaHistory).forEach(colGaso => {
                const isRecente = datasJanela.some(d => colGaso.includes(d)) || 
                                  datasBR.some(d => colGaso.includes(d)) ||
                                  datasBRCurtas.some(d => colGaso.includes(d));
                
                if (isRecente) {
                  const pf = parseFloat(p.gasometriaHistory[colGaso]?.["P/F"]);
                  if (pf && pf <= 240 && pf < menorPF) {
                    menorPF = pf;
                    dataMenorPF = colGaso;
                  }
                }
              });
              
              if (menorPF <= 240) {
                respCount++;
                respEvidencias.push(`Relação P/F baixa (${menorPF}) colhida em ${dataMenorPF}`);
                
                let dataGasoNorm = d0;
                datasJanela.forEach(dj => { if (dataMenorPF.includes(dj)) dataGasoNorm = dj; });
                datasBR.forEach(dbr => { if (dataMenorPF.includes(dbr)) dataGasoNorm = dbr.split('/').reverse().join('-'); });
                datasEventosEncontrados.push(dataGasoNorm);
              }
            }

            // 3. DETERMINAÇÃO DA D.O.E. E COMPROVAÇÃO DA VM
            if (sisPositivo && respCount >= 2) {
              const timestamps = datasEventosEncontrados.map(d => new Date(d).getTime()).filter(n => !isNaN(n));
              const dataEventoDOE = new Date(Math.min(...timestamps));
              const dataEventoFormatada = dataEventoDOE.toISOString().split('T')[0];

              const diffVMnaDOE = Math.floor((dataEventoDOE - dataInt) / (1000 * 60 * 60 * 24));
              let atendeCriterioVM = diffVMnaDOE >= 2;

              if (atendeCriterioVM && p.dataExtubacao) {
                let dataExtStr = p.dataExtubacao;
                if (dataExtStr.includes('/')) dataExtStr = dataExtStr.split('/').reverse().join('-');
                const diffExtDOE = Math.floor((dataEventoDOE - new Date(dataExtStr)) / (1000 * 60 * 60 * 24));
                if (diffExtDOE > 1) atendeCriterioVM = false; 
              }

              if (atendeCriterioVM) {
                const idAuditoria = `${p.cpf || leitoId}_pav_${mesCorrente}`;
                const docAuditoriaRef = db.collection("auditorias_pav").doc(idAuditoria);
                
                const promessa = docAuditoriaRef.get().then(async (audDoc) => {
                  if (!audDoc.exists) {
                    await docAuditoriaRef.set({
                      id: idAuditoria,
                      pacienteId: leitoId,
                      cpf: p.cpf || "000.000.000-00",
                      nome: p.nome,
                      leito: leitoNumero,
                      mesReferencia: mesCorrente,
                      dataSuspeita: d0,
                      dataEventoDOE: dataEventoFormatada,
                      status: "Suspeito",
                      evidencias: {
                        radiologia: `Sim (Novo infiltrado / Progressão) mapeado em ${datasBR[0]}`,
                        sistemicos: sisEvidencias,
                        respiratorios: respEvidencias,
                        justificativa: `D.O.E da Infecção: ${dataEventoFormatada.split('-').reverse().join('/')} (Paciente já estava no D${diffVMnaDOE + 1} de VM).`
                      },
                      timestampCriacao: admin.firestore.FieldValue.serverTimestamp()
                    });
                    novosCasosPAV++;
                    console.log(`🚨 [VIGILÂNCIA]: Suspeita de PAV gerada para ${p.nome} (DOE: ${dataEventoFormatada})`);
                  }
                });
                promessasPAV.push(promessa);
              }
            }
          }
        }
      }
    });

    // Executa todos os salvamentos pendentes
    await Promise.all(promessasPAV);

    // Salva o censo diário global
    await db.collection("censo_diario").add(contadores);
    console.log(`✅ Censo Diário salvo. Foram detectados ${novosCasosPAV} novos alertas de PAV nesta madrugada!`);
    
  } catch (error) {
    console.error("❌ Erro ao rodar o fechamento do censo e rastreio de PAV:", error);
  }
});