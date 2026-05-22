import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

const RelatorioANVISA = ({ db, mesAno }) => {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    const processarRelatorio = async () => {
      if (!db || !mesAno) return;

      try {
        // 1. CENSO (Denominadores)
        const snapCenso = await getDocs(query(collection(db, "censo_diario"), where("data", ">=", `${mesAno}-01`), where("data", "<=", `${mesAno}-31`)));
        let totais = { vm: 0, cvc: 0, svd: 0, pacientesDia: 0 };
        snapCenso.forEach(d => {
          const c = d.data();
          totais.vm += (Number(c.pacientesEmVM) || 0);
          totais.cvc += (Number(c.pacientesComCVC) || 0);
          totais.svd += (Number(c.pacientesComSVD) || 0);
          totais.pacientesDia += (Number(c.totalLeitosOcupados) || 0);
        });

        // 2. IRAS (Apenas Numeradores das Taxas)
        const auditorias = [
          { col: "auditorias_pav", tipo: "PAV" },
          { col: "auditorias_ipcsc", tipo: "IPCS-C" },
          { col: "auditorias_itu", tipo: "ITU-AC" }
        ];
        
        let casos = { pav: 0, ipcsc: 0, itu: 0 };
        for (const { col, tipo } of auditorias) {
           const snap = await getDocs(query(collection(db, col), where("mesReferencia", "==", mesAno), where("status", "==", "Confirmado")));
           snap.forEach(() => {
               if (tipo === "PAV") casos.pav++;
               if (tipo === "IPCS-C") casos.ipcsc++;
               if (tipo === "ITU-AC") casos.itu++;
           });
        }

        // 3. MICROBIOLOGIA (Lendo direto do seu Painel de Culturas Globais)
        let germes = [];
        // Traz apenas as culturas positivas para economizar dados
        const snapCulturas = await getDocs(query(collection(db, "culturas_globais"), where("status", "==", "Positivo")));
        
        snapCulturas.forEach(d => {
            const c = d.data();
            const dataRef = c.dataResultado || c.dataColeta || "";
            
            // Filtra se a cultura pertence ao mês selecionado no relatório
            if (dataRef.startsWith(mesAno)) {
                
                // REGRA NOTIVISA: É IRAS ou é Bactéria Multirresistente?
                const isIRAS = c.irasAssociada && c.irasAssociada !== "Colonizacao" && c.irasAssociada !== "Não classificado";
                const isMDR = c.mecanismoResistencia && c.mecanismoResistencia !== "Não identificado" && c.mecanismoResistencia !== "Não se aplica" && c.mecanismoResistencia !== "Outro";

                if (isIRAS || isMDR) {
                    germes.push({ 
                        tipo: c.tipo, 
                        leito: c.leito, 
                        germe: c.germe,
                        mecanismo: c.mecanismoResistencia || "Não testado/identificado",
                        classificacao: c.irasAssociada || "Colonização (MDR isolado)",
                        resistentes: c.resistentes || []
                    });
                }
            }
        });

        // 4. CONSUMO (DDD e Álcool)
        let consumo = { listaDDD: [], alcool: "0.0" };
        const docIndicadoresRef = doc(db, "indicadores_ccih", `mes_${mesAno}`);
        const docIndicadoresSnap = await getDoc(docIndicadoresRef);
        
        if (docIndicadoresSnap.exists()) {
            const dataInd = docIndicadoresSnap.data();
            if (dataInd.alcool?.resultadoDensidade) {
                consumo.alcool = dataInd.alcool.resultadoDensidade.toFixed(1);
            }
            Object.keys(dataInd).forEach(key => {
                if (key.startsWith('ddd_')) {
                    const nomeAtb = key.replace('ddd_', '').replace(/_/g, ' ').toUpperCase();
                    consumo.listaDDD.push({
                        nome: nomeAtb,
                        valor: dataInd[key].resultadoDI.toFixed(2)
                    });
                }
            });
        }

        setDados({ totais, casos, germes, consumo });
      } catch (error) {
        console.error("Erro ao processar relatório:", error);
      }
    };
    processarRelatorio();
  }, [db, mesAno]);

  if (!dados) return <div className="p-10 font-bold text-slate-500 animate-pulse text-center">Calculando taxas e compilando formulário ANVISA...</div>;

  const calcDI = (casos, dias) => dias > 0 ? ((casos / dias) * 1000).toFixed(2) : "0.00";
  const calcTaxaUso = (dias, pacDia) => pacDia > 0 ? ((dias / pacDia) * 100).toFixed(1) : "0.0";

  return (
    <div className="print-area p-10 bg-white text-black min-h-[297mm] w-[210mm] shadow-lg mx-auto border border-gray-200">
      <div className="border-b-2 border-black pb-4 mb-8">
        <h1 className="text-2xl font-black uppercase">Relatório Mensal de IRAS - CCIH</h1>
        <p className="text-sm font-bold mt-1 text-gray-700">Mês de Referência: {mesAno.split('-').reverse().join('/')}</p>
      </div>

      {/* BLOCO 1: DENOMINADORES E TAXAS DE USO */}
      <section className="mb-8">
        <h2 className="font-bold border-b border-gray-400 mb-2 text-lg uppercase bg-gray-100 p-1">1. Exposição ao Risco (Denominadores)</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr>
                <td className="py-1">Total Pacientes-Dia:</td>
                <td className="font-bold py-1 text-right">{dados.totais.pacientesDia}</td>
                <td className="w-1/3"></td>
            </tr>
            <tr className="border-t border-gray-100">
                <td className="py-1">Dias de Ventilação Mecânica (VM):</td>
                <td className="font-bold py-1 text-right">{dados.totais.vm}</td>
                <td className="text-right text-xs text-gray-500 font-bold">Taxa de Uso: {calcTaxaUso(dados.totais.vm, dados.totais.pacientesDia)}%</td>
            </tr>
            <tr className="border-t border-gray-100">
                <td className="py-1">Dias de Cateter Central (CVC):</td>
                <td className="font-bold py-1 text-right">{dados.totais.cvc}</td>
                <td className="text-right text-xs text-gray-500 font-bold">Taxa de Uso: {calcTaxaUso(dados.totais.cvc, dados.totais.pacientesDia)}%</td>
            </tr>
            <tr className="border-t border-gray-100">
                <td className="py-1">Dias de Sonda Vesical (SVD):</td>
                <td className="font-bold py-1 text-right">{dados.totais.svd}</td>
                <td className="text-right text-xs text-gray-500 font-bold">Taxa de Uso: {calcTaxaUso(dados.totais.svd, dados.totais.pacientesDia)}%</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* BLOCO 2: TAXAS E NUMERADORES */}
      <section className="mb-8">
        <h2 className="font-bold border-b border-gray-400 mb-2 text-lg uppercase bg-gray-100 p-1">2. Indicadores de Infecção (Taxas e Casos)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-600">
                <th className="pb-2">Topografia</th>
                <th className="pb-2 text-center">Nº Casos Confirmados</th>
                <th className="pb-2 text-right">Densidade de Incidência (DI)*</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-200">
                <td className="py-2 font-bold">PAV (Pneumonia)</td>
                <td className="text-center font-black text-red-600 text-base">{dados.casos.pav}</td>
                <td className="text-right font-black text-red-600 text-base">{calcDI(dados.casos.pav, dados.totais.vm)}</td>
            </tr>
            <tr className="border-t border-gray-100">
                <td className="py-2 font-bold">IPCS-C (Corrente Sanguínea)</td>
                <td className="text-center font-black text-red-600 text-base">{dados.casos.ipcsc}</td>
                <td className="text-right font-black text-red-600 text-base">{calcDI(dados.casos.ipcsc, dados.totais.cvc)}</td>
            </tr>
            <tr className="border-t border-gray-100">
                <td className="py-2 font-bold">ITU-AC (Trato Urinário)</td>
                <td className="text-center font-black text-red-600 text-base">{dados.casos.itu}</td>
                <td className="text-right font-black text-red-600 text-base">{calcDI(dados.casos.itu, dados.totais.svd)}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-[10px] text-gray-500 mt-2 italic">* DI = (Nº Casos Confirmados / Dias de Dispositivo) x 1000</p>
      </section>

      {/* BLOCO 3: PERFIL MICROBIOLÓGICO REFORMULADO */}
      <section className="mb-8">
        <h2 className="font-bold border-b border-gray-400 mb-2 text-lg uppercase bg-gray-100 p-1">3. Perfil Microbiológico (Notivisa)</h2>
        {dados.germes.length === 0 ? (
            <p className="text-sm italic text-gray-500 p-2">Nenhum isolado microbiológico de notificação compulsória (MDR ou IRAS) neste mês.</p>
        ) : (
            <ul className="text-sm space-y-3">
                {dados.germes.map((g, idx) => (
                    <li key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-300 shadow-sm break-inside-avoid">
                        <div className="flex justify-between items-start border-b border-gray-200 pb-1 mb-2">
                           <span className="font-black text-red-800 uppercase">[{g.tipo}] Leito {g.leito}</span>
                           <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200">{g.classificacao}</span>
                        </div>
                        <p className="font-black text-base mb-1 text-gray-800">{g.germe}</p>
                        <p className="text-xs mb-1">
                            <span className="font-bold text-gray-600">Mecanismo de Resistência:</span>{' '}
                            <span className={g.mecanismo !== "Não testado/identificado" ? "text-red-600 font-bold" : "text-gray-600"}>{g.mecanismo}</span>
                        </p>
                        <p className="text-xs">
                            <span className="font-bold text-gray-600">Resistente a:</span>{' '}
                            {g.resistentes.length > 0 ? g.resistentes.join(', ') : 'Sem resistências relatadas'}
                        </p>
                    </li>
                ))}
            </ul>
        )}
      </section>

      {/* BLOCO 4: CONSUMO E INDICADORES DE PROCESSO */}
      <section className="mb-8">
        <h2 className="font-bold border-b border-gray-400 mb-2 text-lg uppercase bg-gray-100 p-1">4. Indicadores de Processo e Consumo</h2>
        <div className="text-sm p-4 border border-gray-300 rounded-lg">
           
           <p className="flex justify-between border-b border-gray-100 pb-2 mb-2">
               <strong>Consumo de Álcool Gel:</strong> 
               <span className="text-emerald-700 font-black">{dados.consumo.alcool} g / pac-dia</span>
           </p>

           <strong className="block mt-4 mb-2 text-indigo-800">Consumo de Antimicrobianos (DDD/1000 pac-dia):</strong>
           {dados.consumo.listaDDD.length === 0 ? (
               <p className="text-gray-500 italic text-xs">Nenhum registro de DDD salvo neste mês.</p>
           ) : (
               <table className="w-full mt-2 text-sm bg-indigo-50/30">
                 <tbody>
                    {dados.consumo.listaDDD.map((atb, idx) => (
                       <tr key={idx} className="border-b border-indigo-100/50">
                          <td className="py-1 text-gray-700">{atb.nome}</td>
                          <td className="py-1 text-right font-black text-indigo-700">{atb.valor}</td>
                       </tr>
                    ))}
                 </tbody>
               </table>
           )}
           <p className="text-[10px] text-gray-400 mt-4 italic text-center">* Os dados de consumo são calculados conforme a padronização da OMS.</p>
        </div>
      </section>
      
      <div className="mt-20 pt-10 border-t border-black text-center text-sm font-bold">
        <p>__________________________________________</p>
        <p className="mt-1">Responsável Técnico / Médico CCIH</p>
      </div>
    </div>
  );
};

export default RelatorioANVISA;