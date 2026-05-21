const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

exports.gerarCensoUTI = onSchedule({
  schedule: "59 23 * * *",
  timeZone: "America/Porto_Velho", 
  memory: "512MiB" // Aumentei um pouco a memória pois agora temos duas redes neurais rodando
}, async () => {
  console.log("Iniciando varredura do Censo Diário, Qualidade, PAV e IPCS-C...");

  try {
    const leitosSnapshot = await db.collection("leitos_uti").get();
    
    // Ajuste de fuso horário para Rondônia (UTC-4)
    const agora = new Date();
    agora.setHours(agora.getHours() - 4);
    
    // ========================================================
    // MOTOR DE TEMPO GERAL (PAV)
    // ========================================================
    const datasJanelaPAV = [];
    for (let i = 0; i <= 3; i++) {
      const d = new Date(agora.getTime() - i * 86400000);
      datasJanelaPAV.push(d.toISOString().split('T')[0]); 
    }
    const d0 = datasJanelaPAV[0]; 
    const mesCorrente = d0.slice(0, 7);
    const datasBR_PAV = datasJanelaPAV.map(d => d.split('-').reverse().join('/'));
    const datasBRCurtas_PAV = datasBR_PAV.map(d => d.substring(0, 5));

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

    const promessasAuditoria = [];
    let novosCasosPAV = 0;
    let novosCasosIPCSC = 0;

    leitosSnapshot.forEach((doc) => {
      const p = doc.data();
      const leitoId = doc.id;
      const leitoNumero = leitoId.replace('bed_', '');
      
      if (p.nome && p.status !== "Livre") {
        // ====================================================================
        // 1. INDICADORES ASSISTENCIAIS E CENSO
        // ====================================================================
        contadores.totalLeitosOcupados++;
        if (p.enfermagem?.identificacaoCorreta === true) contadores.pacientesIdentificados++;
        if (p.fisioterapia?.ventilacao?.suporte === "VM" || p.fisioterapia?.suporte === "VM") contadores.pacientesEmVM++;
        if (p.enfermagem?.cvcData && !p.enfermagem?.cvcRetiradaData) contadores.pacientesComCVC++;
        if (p.enfermagem?.svdData && !p.enfermagem?.svdRetiradaData) contadores.pacientesComSVD++;
        if (p.enfermagem?.shileyData && !p.enfermagem?.shileyRetiradaData) contadores.pacientesComShiley++;

        // ====================================================================
        // 2. SNIFFER DE SUSPEITA DE PAV
        // ====================================================================
        if (p.dataIntubacao) {
          let dataIntStr = p.dataIntubacao;
          if (dataIntStr.includes('/')) dataIntStr = dataIntStr.split('/').reverse().join('-');
          const dataInt = new Date(dataIntStr);

          const radPositivo = p.medical?.novoInfiltrado === 'sim' || p.novoInfiltrado === 'sim';

          if (radPositivo) {
            let sisPositivo = false, sisEvidencias = [], respCount = 0, respEvidencias = [], datasEventosEncontrados = [d0];

            if (p.examHistory) {
              Object.keys(p.examHistory).forEach(dt => {
                if (datasJanelaPAV.includes(dt) || datasBR_PAV.includes(dt) || datasBRCurtas_PAV.includes(dt)) {
                  const leucoStr = p.examHistory[dt]?.["Leucócitos"];
                  if (leucoStr) {
                    const leuco = parseFloat(leucoStr.toString().replace(/\./g, '').replace(',', '.'));
                    if (leuco < 4000 || leuco > 12000) {
                      sisPositivo = true; sisEvidencias.push(`Leucócitos (${leuco}) em ${dt}`);
                      let dtNorm = dt.includes('/') ? dt.split('/').reverse().join('-') : dt;
                      if (dtNorm.length === 5) dtNorm = `${d0.split('-')[0]}-${dtNorm}`;
                      datasEventosEncontrados.push(dtNorm);
                    }
                  }
                }
              });
            }

            const strPaciente = JSON.stringify(p);
            const regexTemp = /"Temp\s*\(ºC\)":\s*"?((?:3[8-9]|4\d)(?:[.,]\d+)?)"?/g;
            let matchTemp;
            while ((matchTemp = regexTemp.exec(strPaciente)) !== null) {
              sisPositivo = true;
              if (!sisEvidencias.includes(`Febre (${matchTemp[1]} ºC)`)) {
                sisEvidencias.push(`Febre (${matchTemp[1]} ºC) em ${datasBR_PAV[0]}`);
                datasEventosEncontrados.push(d0);
              }
            }

            const asp = p.physio?.secrecaoAspecto?.toLowerCase() || "";
            const col = p.physio?.secrecaoColoracao?.toLowerCase() || "";
            const qtd = p.physio?.secrecaoQtd?.toLowerCase() || "";
            if (asp.includes('espessa') || col.includes('purulenta') || col.includes('esverdeada') || qtd.includes('moderada') || qtd.includes('abundante')) {
              respCount++; respEvidencias.push(`Secreção anormal (${asp}/${col}/${qtd}) em ${datasBR_PAV[0]}`);
              datasEventosEncontrados.push(d0);
            }

            if (p.gasometriaHistory) {
              let menorPF = 999; let dataMenorPF = "";
              Object.keys(p.gasometriaHistory).forEach(colGaso => {
                if (datasJanelaPAV.some(d => colGaso.includes(d)) || datasBR_PAV.some(d => colGaso.includes(d)) || datasBRCurtas_PAV.some(d => colGaso.includes(d))) {
                  const pf = parseFloat(p.gasometriaHistory[colGaso]?.["P/F"]);
                  if (pf && pf <= 240 && pf < menorPF) { menorPF = pf; dataMenorPF = colGaso; }
                }
              });
              if (menorPF <= 240) {
                respCount++; respEvidencias.push(`P/F baixa (${menorPF}) em ${dataMenorPF}`);
                let dataGasoNorm = d0;
                datasJanelaPAV.forEach(dj => { if (dataMenorPF.includes(dj)) dataGasoNorm = dj; });
                datasBR_PAV.forEach(dbr => { if (dataMenorPF.includes(dbr)) dataGasoNorm = dbr.split('/').reverse().join('-'); });
                datasEventosEncontrados.push(dataGasoNorm);
              }
            }

            if (sisPositivo && respCount >= 2) {
              const timestamps = datasEventosEncontrados.map(d => new Date(d).getTime()).filter(n => !isNaN(n));
              const dataEventoDOE = new Date(Math.min(...timestamps));
              const dataEventoFormatada = dataEventoDOE.toISOString().split('T')[0];
              const diffVMnaDOE = Math.floor((dataEventoDOE - dataInt) / (1000 * 60 * 60 * 24));
              let atendeCriterioVM = diffVMnaDOE >= 2;

              if (atendeCriterioVM && p.dataExtubacao) {
                let dataExtStr = p.dataExtubacao.includes('/') ? p.dataExtubacao.split('/').reverse().join('-') : p.dataExtubacao;
                if (Math.floor((dataEventoDOE - new Date(dataExtStr)) / (1000 * 60 * 60 * 24)) > 1) atendeCriterioVM = false; 
              }

              if (atendeCriterioVM) {
                const idAuditoria = `${p.cpf || leitoId}_pav_${mesCorrente}`;
                const docAuditoriaRef = db.collection("auditorias_pav").doc(idAuditoria);
                const promessaPAV = docAuditoriaRef.get().then(async (audDoc) => {
                  if (!audDoc.exists) {
                    await docAuditoriaRef.set({
                      id: idAuditoria, pacienteId: leitoId, cpf: p.cpf || "000.000.000-00", nome: p.nome,
                      leito: leitoNumero, mesReferencia: mesCorrente, dataSuspeita: d0, dataEventoDOE: dataEventoFormatada,
                      status: "Suspeito",
                      evidencias: {
                        radiologia: `Sim (Novo infiltrado / Progressão) em ${datasBR_PAV[0]}`,
                        sistemicos: sisEvidencias, respiratorios: respEvidencias,
                        justificativa: `D.O.E da Infecção: ${dataEventoFormatada.split('-').reverse().join('/')} (D${diffVMnaDOE + 1} de VM).`
                      },
                      timestampCriacao: admin.firestore.FieldValue.serverTimestamp()
                    });
                    novosCasosPAV++;
                    console.log(`🚨 [PAV]: Suspeita gerada para ${p.nome}`);
                  }
                });
                promessasAuditoria.push(promessaPAV);
              }
            }
          }
        }

        // ====================================================================
        // 3. SNIFFER DE SUSPEITA DE IPCS-C
        // ====================================================================
        if (p.culturas && p.culturas.lista) {
          const hemoculturasPositivas = p.culturas.lista.filter(c => c.tipo?.toLowerCase().includes('hemocultura') && c.status === 'Positivo');
          const listaComensais = ['staphylococcus coagulase negativo', 'epidermidis', 'hominis', 'haemolyticus', 'saprophyticus', 'corynebacterium', 'bacillus', 'micrococcus', 'propionibacterium', 'cutibacterium'];

          for (const hemo of hemoculturasPositivas) {
            if (!hemo.dataColeta) continue;
            
            let dColetaStr = hemo.dataColeta.includes('/') ? hemo.dataColeta.split('/').reverse().join('-') : hemo.dataColeta;
            // Dica de servidor: Ao adicionar T12:00:00 garantimos que o fuso horário não jogue a data para o dia anterior
            const dataColetaObj = new Date(`${dColetaStr}T12:00:00`); 
            const mesCorrenteHemo = dColetaStr.slice(0,7);
            
            // Janela de 7 Dias: D-3 a D+3 da Coleta
            const datasJanelaIPCSC = [];
            for (let i = -3; i <= 3; i++) {
              const d = new Date(dataColetaObj.getTime() + i * 86400000);
              datasJanelaIPCSC.push(d.toISOString().split('T')[0]);
            }

            const nomeGerme = hemo.germe?.toLowerCase() || "";
            const isComensal = listaComensais.some(c => nomeGerme.includes(c));
            
            let criterioMicroAprovado = false;
            let evidenciasSistemicasIPCS = [];

            if (!isComensal) {
              criterioMicroAprovado = true; // Patógeno real passa direto
            } else {
              // Comensal exige amostras múltiplas E sinal clínico na janela 7D
              if (hemo.amostrasPositivas !== 'multiplas') continue; 
              
              let temSinalSistemico = false;
              const strPaciente = JSON.stringify(p);
              
              datasJanelaIPCSC.forEach(dj => {
                // Caçando Febre
                const regexFebre = /"Temp\s*\(ºC\)":\s*"?((?:3[8-9]|4\d)(?:[.,]\d+)?)"?/g;
                let matchTemp;
                while ((matchTemp = regexTemp.exec(strPaciente)) !== null) {
                  temSinalSistemico = true;
                  if (!evidenciasSistemicasIPCS.includes(`Febre (${matchTemp[1]} ºC)`)) evidenciasSistemicasIPCS.push(`Febre (${matchTemp[1]} ºC) detectada`);
                }
                // Caçando Hipotensão (PAS < 90)
                const regexPAS = /"PAS":\s*"?([1-8]\d)"?/g; 
                let matchPAS;
                while ((matchPAS = regexPAS.exec(strPaciente)) !== null) {
                  temSinalSistemico = true;
                  if (!evidenciasSistemicasIPCS.includes(`PAS Baixa (${matchPAS[1]})`)) evidenciasSistemicasIPCS.push(`PAS Baixa (${matchPAS[1]}) detectada`);
                }
                // Caçando DVA
                const regexNora = /"Noradrenalina":\s*"?([1-9]\d*(?:[.,]\d+)?|0[.,][1-9]\d*)"?/g;
                let matchNora;
                while ((matchNora = regexNora.exec(strPaciente)) !== null) {
                  temSinalSistemico = true;
                  if (!evidenciasSistemicasIPCS.includes(`Uso de DVA (Noradrenalina: ${matchNora[1]})`)) evidenciasSistemicasIPCS.push(`Uso de DVA (Noradrenalina: ${matchNora[1]}) detectado`);
                }
              });

              if (temSinalSistemico) criterioMicroAprovado = true;
            }

            if (!criterioMicroAprovado) continue;

            // Associação ao CVC
            if (!p.enfermagem?.cvcData) continue;
            let dCvcStr = p.enfermagem.cvcData.includes('/') ? p.enfermagem.cvcData.split('/').reverse().join('-') : p.enfermagem.cvcData;
            const dataCvcObj = new Date(`${dCvcStr}T12:00:00`);
            
            const diffCvcColeta = Math.floor((dataColetaObj - dataCvcObj) / (1000 * 60 * 60 * 24));
            let associadoCVC = diffCvcColeta >= 2;

            if (associadoCVC && p.enfermagem.cvcRetiradaData) {
              let dCvcRetStr = p.enfermagem.cvcRetiradaData.includes('/') ? p.enfermagem.cvcRetiradaData.split('/').reverse().join('-') : p.enfermagem.cvcRetiradaData;
              const diffRetColeta = Math.floor((dataColetaObj - new Date(`${dCvcRetStr}T12:00:00`)) / (1000 * 60 * 60 * 24));
              if (diffRetColeta > 1) associadoCVC = false; 
            }

            if (associadoCVC) {
              const idAuditoria = `${p.cpf || leitoId}_ipcsc_${hemo.id || dColetaStr}`;
              const docRefIPCSC = db.collection("auditorias_ipcsc").doc(idAuditoria);
              
              const promessaIPCSC = docRefIPCSC.get().then(async (audDoc) => {
                if (!audDoc.exists) {
                  await docRefIPCSC.set({
                    id: idAuditoria, pacienteId: leitoId, cpf: p.cpf || "000.000.000-00",
                    nome: p.nome, leito: leitoNumero, mesReferencia: mesCorrenteHemo,
                    dataSuspeita: dColetaStr, dataEventoDOE: dColetaStr, status: "Suspeito",
                    evidencias: {
                      microbiologia: `${hemo.germe} (${isComensal ? 'Comensal em amostras múltiplas' : 'Patógeno Reconhecido'})`,
                      sistemicos: evidenciasSistemicasIPCS.length > 0 ? evidenciasSistemicasIPCS : ['Critério Clínico dispensado (Patógeno Reconhecido)'],
                      dispositivo: `CVC inserido em ${dCvcStr.split('-').reverse().join('/')} (D${diffCvcColeta + 1} no dia da coleta)`,
                      justificativa: "Cruzamento automatizado: Hemocultura + Janela 7D + CVC."
                    },
                    timestampCriacao: admin.firestore.FieldValue.serverTimestamp()
                  });
                  novosCasosIPCSC++;
                  console.log(`🚨 [IPCS-C]: Suspeita gerada para ${p.nome}`);
                }
              });
              promessasAuditoria.push(promessaIPCSC);
            }
          }
        }
      }
    });

    // Aguarda TODAS as gravações (PAV e IPCS-C) terminarem
    await Promise.all(promessasAuditoria);

    // Salva o censo diário global
    await db.collection("censo_diario").add(contadores);
    console.log(`✅ Fechamento concluído. Capturados: ${novosCasosPAV} PAVs e ${novosCasosIPCSC} IPCS-Cs.`);
    
  } catch (error) {
    console.error("❌ Erro fatal no fechamento do servidor:", error);
  }
});