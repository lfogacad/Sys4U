const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

exports.gerarCensoUTI = onSchedule({
  schedule: "59 23 * * *",
  timeZone: "America/Porto_Velho", 
  memory: "512MiB" 
}, async () => {
  console.log("Iniciando varredura do Censo Diário, Qualidade e Rastreio de IRAS (PAV, IPCS-C e ITU-AC)...");

  try {
    const leitosSnapshot = await db.collection("leitos_uti").get();
    
    // Ajuste de fuso horário para Rondônia (UTC-4)
    const agora = new Date();
    agora.setHours(agora.getHours() - 4);
    
    // ========================================================
    // MOTOR DE TEMPO GERAL (D0 de análise da Madrugada)
    // ========================================================
    const datasJanelaPAV = [];
    for (let i = 0; i <= 3; i++) {
      const d = new Date(agora.getTime() - i * 86400000);
      datasJanelaPAV.push(d.toISOString().split('T')[0]); 
    }
    const d0 = datasJanelaPAV[0]; // Hoje
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
    let novosCasosITU = 0;

    leitosSnapshot.forEach((doc) => {
      const p = doc.data();
      const leitoId = doc.id;
      const leitoNumero = leitoId.replace('bed_', '');
      
      if (p.nome && p.status !== "Livre") {
        // ====================================================================
        // 1. DADOS ASSISTENCIAIS DO CENSO DIÁRIO
        // ====================================================================
        contadores.totalLeitosOcupados++;
        if (p.enfermagem?.identificacaoCorreta === true) contadores.pacientesIdentificados++;
        
        if (p.physio?.suporte === "VM" || p.fisioterapia?.suporte === "VM" || (p.dataIntubacao && !p.dataExtubacao)) {
            contadores.pacientesEmVM++;
        }

        if (p.enfermagem?.cvcData && !p.enfermagem?.cvcRetiradaData) contadores.pacientesComCVC++;
        if (p.enfermagem?.svdData && !p.enfermagem?.svdRetiradaData) contadores.pacientesComSVD++;
        if (p.enfermagem?.shileyData && !p.enfermagem?.shileyRetiradaData) contadores.pacientesComShiley++;

        // ====================================================================
        // 2. SNIFFER DE SUSPEITA DE PAV (ANVISA)
        // ====================================================================
        let dataIntStr = p.dataIntubacao || p.dataTraqueostomia;
        if (dataIntStr) {
          if (dataIntStr.includes('/')) dataIntStr = dataIntStr.split('/').reverse().join('-');
          const dataInt = new Date(`${dataIntStr}T12:00:00`);

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

            const varrerFebrePAV = (blocoBh) => {
              if (!blocoBh || !blocoBh.date || !blocoBh.vitals) return;
              const dataRefUS = blocoBh.date;
              if (datasJanelaPAV.includes(dataRefUS)) {
                const dataRefBR = dataRefUS.split('-').reverse().join('/');
                Object.keys(blocoBh.vitals).forEach(hora => {
                  const tempValue = blocoBh.vitals[hora]["Temp (ºC)"];
                  if (tempValue) {
                    const tempNum = Number(String(tempValue).replace(',', '.'));
                    if (tempNum >= 38.0 || tempNum <= 36.0) {
                      sisPositivo = true;
                      const msg = `Temp (${tempNum} ºC) registrada em ${dataRefBR} às ${hora}`;
                      if (!sisEvidencias.includes(msg)) {
                        sisEvidencias.push(msg);
                        datasEventosEncontrados.push(dataRefUS);
                      }
                    }
                  }
                });
              }
            };

            if (p.bh) varrerFebrePAV(p.bh);
            if (p.historico_bh && Array.isArray(p.historico_bh)) p.historico_bh.forEach(varrerFebrePAV);

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
              const timestamps = datasEventosEncontrados.map(d => new Date(`${d}T12:00:00`).getTime()).filter(n => !isNaN(n));
              const dataEventoDOE = new Date(Math.min(...timestamps));
              const dataEventoFormatada = dataEventoDOE.toISOString().split('T')[0];
              const diffVMnaDOE = Math.floor((dataEventoDOE - dataInt) / (1000 * 60 * 60 * 24));
              let atendeCriterioVM = diffVMnaDOE >= 2;

              if (atendeCriterioVM && p.dataExtubacao) {
                let dataExtStr = p.dataExtubacao.includes('/') ? p.dataExtubacao.split('/').reverse().join('-') : p.dataExtubacao;
                if (Math.floor((dataEventoDOE - new Date(`${dataExtStr}T12:00:00`)) / (1000 * 60 * 60 * 24)) > 1) atendeCriterioVM = false; 
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
                        radiologia: `Sim (Novo infiltrado) avaliado em ${datasBR_PAV[0]}`,
                        sistemicos: sisEvidencias, respiratorios: respEvidencias,
                        justificativa: `D.O.E da Infecção: ${dataEventoFormatada.split('-').reverse().join('/')} (D${diffVMnaDOE >= 0 ? diffVMnaDOE + 1 : '?'} de VM).`
                      },
                      timestampCriacao: admin.firestore.FieldValue.serverTimestamp()
                    });
                    novosCasosPAV++;
                  }
                });
                promessasAuditoria.push(promessaPAV);
              }
            }
          }
        }

        // ====================================================================
        // 3. SNIFFER DE SUSPEITA DE IPCS-C (CVC ou Shiley)
        // ====================================================================
        if (p.culturas && p.culturas.lista) {
          const hemoculturasPositivas = p.culturas.lista.filter(c => c.tipo?.toLowerCase().includes('hemocultura') && c.status === 'Positivo');
          const listaComensais = ['staphylococcus coagulase negativo', 'epidermidis', 'hominis', 'haemolyticus', 'saprophyticus', 'corynebacterium', 'bacillus', 'micrococcus', 'propionibacterium', 'cutibacterium'];

          for (const hemo of hemoculturasPositivas) {
            if (!hemo.dataColeta) continue;
            
            let dColetaStr = hemo.dataColeta.includes('/') ? hemo.dataColeta.split('/').reverse().join('-') : hemo.dataColeta;
            const dataColetaObj = new Date(`${dColetaStr}T12:00:00`);
            const mesCorrenteHemo = dColetaStr.slice(0,7);
            
            // Janela de 7 Dias
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
              criterioMicroAprovado = true;
            } else {
              if (hemo.amostrasPositivas !== 'multiplas') continue; 
              
              const varrerSistemicosIPCSC = (blocoBh) => {
                if (!blocoBh || !blocoBh.date) return;
                const dataRefUS = blocoBh.date;
                if (datasJanelaIPCSC.includes(dataRefUS)) {
                  const dataRef = dataRefUS.split('-').reverse().join('/');
                  const strBloco = JSON.stringify(blocoBh);

                  const regexTemp = /"Temp\s*\(ºC\)":\s*"?((?:3[8-9]|4\d)(?:[.,]\d+)?)"?/g;
                  let matchTemp;
                  while ((matchTemp = regexTemp.exec(strBloco)) !== null) {
                    criterioMicroAprovado = true;
                    const msg = `Febre (${matchTemp[1]} ºC) detectada no registro de ${dataRef}`;
                    if (!evidenciasSistemicasIPCS.includes(msg)) evidenciasSistemicasIPCS.push(msg);
                  }

                  const regexPAS = /"PAS":\s*"?([1-8]\d)"?/g;
                  let matchPAS;
                  while ((matchPAS = regexPAS.exec(strBloco)) !== null) {
                    criterioMicroAprovado = true;
                    const msg = `PAS Baixa (${matchPAS[1]} mmHg) detectada no registro de ${dataRef}`;
                    if (!evidenciasSistemicasIPCS.includes(msg)) evidenciasSistemicasIPCS.push(msg);
                  }

                  const regexNora = /"Noradrenalina":\s*"?([1-9]\d*(?:[.,]\d+)?|0[.,][1-9]\d*)"?/g;
                  let matchNora;
                  while ((matchNora = regexNora.exec(strBloco)) !== null) {
                    criterioMicroAprovado = true;
                    const msg = `Uso de DVA (Nora: ${matchNora[1]}) detectado no registro de ${dataRef}`;
                    if (!evidenciasSistemicasIPCS.includes(msg)) evidenciasSistemicasIPCS.push(msg);
                  }
                }
              };

              if (p.bh) varrerSistemicosIPCSC(p.bh);
              if (p.historico_bh && Array.isArray(p.historico_bh)) p.historico_bh.forEach(varrerSistemicosIPCSC);
            }

            if (!criterioMicroAprovado) continue;

            let dDispStr = null, dRetiradaStr = null;
            if (p.enfermagem?.cvcData) {
              dDispStr = p.enfermagem.cvcData; dRetiradaStr = p.enfermagem.cvcRetiradaData || null;
            } else if (p.enfermagem?.shileyData) {
              dDispStr = p.enfermagem.shileyData; dRetiradaStr = p.enfermagem.shileyRetiradaData || null;
            }

            if (!dDispStr) continue;

            let dDispStrNorm = dDispStr.includes('/') ? dDispStr.split('/').reverse().join('-') : dDispStr;
            const dataDispObj = new Date(`${dDispStrNorm}T12:00:00`);
            const diffDispColeta = Math.floor((dataColetaObj - dataDispObj) / (1000 * 60 * 60 * 24));
            let associadoDispositivo = diffDispColeta >= 2;

            if (associadoDispositivo && dRetiradaStr) {
              let dRetStrNorm = dRetiradaStr.includes('/') ? dRetiradaStr.split('/').reverse().join('-') : dRetiradaStr;
              if (Math.floor((dataColetaObj - new Date(`${dRetStrNorm}T12:00:00`)) / (1000 * 60 * 60 * 24)) > 1) associadoDispositivo = false;
            }

            if (associadoDispositivo) {
              const idAuditoria = `${p.cpf || leitoId}_ipcsc_${hemo.id || dColetaStr}`;
              const docRefIPCSC = db.collection("auditorias_ipcsc").doc(idAuditoria);
              const promessaIPCSC = docRefIPCSC.get().then(async (audDoc) => {
                if (!audDoc.exists) {
                  await docRefIPCSC.set({
                    id: idAuditoria, pacienteId: leitoId, cpf: p.cpf || "000.000.000-00",
                    nome: p.nome, leito: leitoNumero, mesReferencia: mesCorrenteHemo,
                    dataSuspeita: dColetaStr, dataEventoDOE: dColetaStr, status: "Suspeito",
                    evidencias: {
                      microbiologia: `Coleta em: ${dColetaStr.split('-').reverse().join('/')} | ${hemo.germe} (${isComensal ? 'Comensal em amostras múltiplas' : 'Patógeno Reconhecido'})`,
                      sistemicos: evidenciasSistemicasIPCS.length > 0 ? evidenciasSistemicasIPCS : ['Critério Clínico dispensado (Patógeno Reconhecido)'],
                      dispositivo: `Dispositivo (CVC/Shiley) inserido em ${dDispStrNorm.split('-').reverse().join('/')} (D${diffDispColeta >= 0 ? diffDispColeta + 1 : '?'} no dia da coleta)`,
                      justificativa: "Cruzamento automatizado: Hemocultura + Janela 7D + Dispositivo Central."
                    },
                    timestampCriacao: admin.firestore.FieldValue.serverTimestamp()
                  });
                  novosCasosIPCSC++;
                }
              });
              promessasAuditoria.push(promessaIPCSC);
            }
          }
        }

        // ====================================================================
        // 4. SNIFFER DE SUSPEITA DE ITU-AC (ANVISA)
        // ====================================================================
        if (p.culturas && p.culturas.lista) {
          const uroculturasPositivas = p.culturas.lista.filter(c => (c.tipo?.toLowerCase().includes('urocultura') || c.tipo?.toLowerCase().includes('urina')) && c.status === 'Positivo');

          for (const uro of uroculturasPositivas) {
            if (!uro.dataColeta) continue;

            const ufc = Number(uro.contagemUFC) || 0;
            const qtdEsp = Number(uro.qtdEspecies) || 1;
            if (ufc < 100000 || qtdEsp > 2) continue;

            let dColetaStr = uro.dataColeta.includes('/') ? uro.dataColeta.split('/').reverse().join('-') : uro.dataColeta;
            const dataColetaObj = new Date(`${dColetaStr}T12:00:00`);
            const mesCorrenteUro = dColetaStr.slice(0, 7);

            // Janela 7D
            const datasJanelaITU = [];
            for (let i = -3; i <= 3; i++) {
              const d = new Date(dataColetaObj.getTime() + i * 86400000);
              datasJanelaITU.push(d.toISOString().split('T')[0]);
            }

            // SVD Obrigatória
            if (!p.enfermagem?.svdData) continue;
            let dSvdStr = p.enfermagem.svdData.includes('/') ? p.enfermagem.svdData.split('/').reverse().join('-') : p.enfermagem.svdData;
            const dataSvdObj = new Date(`${dSvdStr}T12:00:00`);

            const diffSvdColeta = Math.floor((dataColetaObj - dataSvdObj) / (1000 * 60 * 60 * 24));
            let associadoSVD = diffSvdColeta >= 2;

            if (associadoSVD && p.enfermagem.svdRetiradaData) {
              let dSvdRetStr = p.enfermagem.svdRetiradaData.includes('/') ? p.enfermagem.svdRetiradaData.split('/').reverse().join('-') : p.enfermagem.svdRetiradaData;
              if (Math.floor((dataColetaObj - new Date(`${dSvdRetStr}T12:00:00`)) / (1000 * 60 * 60 * 24)) > 1) associadoSVD = false; 
            }

            if (!associadoSVD) continue;

            let evidenciasSistemicasITU = [];
            const varrerFebreITU = (blocoBh) => {
              if (!blocoBh || !blocoBh.date || !blocoBh.vitals) return;
              const dataRefUS = blocoBh.date;
              if (datasJanelaITU.includes(dataRefUS)) {
                const dataRefBR = dataRefUS.split('-').reverse().join('/');
                Object.keys(blocoBh.vitals).forEach(hora => {
                  const tempValue = blocoBh.vitals[hora]["Temp (ºC)"];
                  if (tempValue) {
                    const tempNum = Number(String(tempValue).replace(',', '.'));
                    if (tempNum >= 38.0) {
                      const msg = `Febre (${tempNum} ºC) registrada em ${dataRefBR} às ${hora}`;
                      if (!evidenciasSistemicasITU.includes(msg)) evidenciasSistemicasITU.push(msg);
                    }
                  }
                });
              }
            };

            if (p.bh) varrerFebreITU(p.bh);
            if (p.historico_bh && Array.isArray(p.historico_bh)) p.historico_bh.forEach(varrerFebreITU);

            const idAuditoria = `${p.cpf || leitoId}_itu_${uro.id || dColetaStr}`;
            const docRefITU = db.collection("auditorias_itu").doc(idAuditoria);

            const promessaITU = docRefITU.get().then(async (audDoc) => {
              if (!audDoc.exists) {
                await docRefITU.set({
                  id: idAuditoria, pacienteId: leitoId, nome: p.nome, leito: leitoNumero, mesReferencia: mesCorrenteUro,
                  dataSuspeita: dColetaStr, dataEventoDOE: dColetaStr, status: "Suspeito",
                  evidencias: {
                    microbiologia: `Coleta em: ${dColetaStr.split('-').reverse().join('/')} | ${uro.germe} (UFC: ${ufc})`,
                    sistemicos: evidenciasSistemicasITU.length > 0 ? evidenciasSistemicasITU : ["Nenhuma febre >38ºC detectada na janela de 7 dias"],
                    dispositivo: `SVD inserida em ${dSvdStr.split('-').reverse().join('/')} (D${diffSvdColeta >= 0 ? diffSvdColeta + 1 : '?'} no dia da coleta)`,
                    justificativa: "Cruzamento automatizado: Urocultura (UFC≥10⁵, max 2 esp) associada a tempo de SVD compatível com ITU-AC."
                  },
                  timestampCriacao: admin.firestore.FieldValue.serverTimestamp()
                });
                novosCasosITU++;
              }
            });
            promessasAuditoria.push(promessaITU);
          }
        }
      }
    });

    await Promise.all(promessasAuditoria);
    await db.collection("censo_diario").add(contadores);
    console.log(`✅ Fechamento concluído com sucesso. Casos capturados nesta madrugada: PAV=${novosCasosPAV}, IPCS-C=${novosCasosIPCSC}, ITU-AC=${novosCasosITU}.`);
    
  } catch (error) {
    console.error("❌ Erro fatal no fechamento do servidor:", error);
  }
});