import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

const ImportadorEscala = ({ categoria = "Médico Plantonista" }) => {
  const [file, setFile] = useState(null);
  const [mes, setMes] = useState("");
  const [ano, setAno] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [status, setStatus] = useState("idle"); // idle, processing, success, error

  // Dicionário de Tradução dos Plantões
  const dicionarioTurnos = {
    'D': { nome: 'Plantão Dia', inicio: '07:00', fim: '19:00', horas: 12, tipo: 'plantonista' },
    'N': { nome: 'Plantão Noite', inicio: '19:00', fim: '07:00', horas: 12, tipo: 'plantonista' },
    'DN': { nome: 'Plantão 24h', inicio: '07:00', fim: '07:00', horas: 24, tipo: 'plantonista' },
    'M': { nome: 'Plantão Manhã', inicio: '07:00', fim: '13:00', horas: 6, tipo: 'plantonista' },
    'T': { nome: 'Plantão Tarde', inicio: '13:00', fim: '19:00', horas: 6, tipo: 'plantonista' },
    'V': { nome: 'Visita Médica', inicio: '07:00', fim: '13:00', horas: 6, tipo: 'visita' },
  };

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus("idle");
      setPreviewData([]);
    }
  };

  const processarPlanilha = async () => {
    if (!file) return;
    setIsProcessing(true);
    setStatus("processing");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Converte a planilha para um array de arrays (linhas e colunas)
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        const plantoesExtraidos = [];
        let indexLinhaDias = -1;
        let colunasDias = {}; // Mapeia { indice_coluna: "01", indice_coluna: "02" }
        let lendoNefrologia = false;

        // Passo 1: Encontrar onde começam os dias
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          if (row.length > 0 && typeof row[0] === 'string' && row[0].includes("NOME DO SERVIDOR")) {
            // A próxima linha (i+1) contém os números dos dias (01, 02, 03...)
            indexLinhaDias = i + 1;
            const linhaDias = data[indexLinhaDias];
            
            // Mapeia em qual coluna está cada dia
            linhaDias.forEach((val, colIndex) => {
              if (val && !isNaN(parseInt(val))) {
                colunasDias[colIndex] = String(val).padStart(2, '0');
              }
            });
            break;
          }
        }

        if (indexLinhaDias === -1) {
          throw new Error("Não foi possível encontrar a linha 'NOME DO SERVIDOR'. O formato da planilha está incorreto.");
        }

        // Passo 2: Varrer os nomes e extrair as letrinhas
        for (let i = indexLinhaDias + 1; i < data.length; i++) {
          const row = data[i];
          const nomeServidor = row[0];

          // Condições de parada ou pulo
          if (!nomeServidor) continue; // Linha vazia
          if (typeof nomeServidor === 'string' && nomeServidor.includes("MÉDICO NEFROLOGISTA")) {
            lendoNefrologia = true;
            continue;
          }
          if (typeof nomeServidor === 'string' && nomeServidor.includes("LEGENDA")) break; // Fim da tabela
          if (lendoNefrologia) continue; // Ignora tudo que for da Nefro

          // Limpa o nome (remove espaços extras)
          const nomeLimpo = String(nomeServidor).trim();

          // Varre as colunas mapeadas como "Dias" para este médico
          Object.keys(colunasDias).forEach(colIndex => {
            const dia = colunasDias[colIndex];
            const siglaTurno = row[colIndex];

            // Se tem algo escrito (D, N, V, etc) e está no nosso dicionário
            if (siglaTurno && typeof siglaTurno === 'string') {
              const siglaLimpa = siglaTurno.trim().toUpperCase();
              
              if (dicionarioTurnos[siglaLimpa]) {
                const turnoObj = dicionarioTurnos[siglaLimpa];
                const dataFormatada = `${ano}-${mes}-${dia}`; // Formato ISO AAAA-MM-DD para o banco

                plantoesExtraidos.push({
                  nome: nomeLimpo,
                  categoria: categoria,
                  data: dataFormatada,
                  sigla: siglaLimpa,
                  turno: turnoObj.nome,
                  horario: `${turnoObj.inicio} às ${turnoObj.fim}`,
                  tipo: turnoObj.tipo
                });
              }
            }
          });
        }

        setPreviewData(plantoesExtraidos);
        setStatus("success");
      } catch (error) {
        console.error("Erro ao ler planilha:", error);
        setStatus("error");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const salvarNoFirebase = async () => {
    if (previewData.length === 0) return;
    setIsProcessing(true); 
    
    try {
      const batch = writeBatch(db);
      const escalasRef = collection(db, "escalas");

      previewData.forEach(plantao => {
        // CRIA UM "RG" ÚNICO PARA O PLANTÃO: Ex: 2026-05-08_Médico_Azenair_DN
        // Se clicar 10 vezes, o RG será o mesmo, logo o Firebase não duplica, apenas sobrepõe.
        const nomeSemEspaco = plantao.nome.replace(/\s+/g, '');
        const idUnico = `${plantao.data}_${categoria}_${nomeSemEspaco}_${plantao.sigla}`;
        
        const novoDocRef = doc(escalasRef, idUnico); 
        
        const dadosCompletos = {
          ...plantao,
          cadastradoEm: new Date().toISOString(),
          status: "Confirmado"
        };
        
        // O merge: true garante que ele atualize os dados em vez de apagar algo que já lá estava
        batch.set(novoDocRef, dadosCompletos, { merge: true });
      });

      await batch.commit();
      
      alert(`✅ SUCESSO! ${previewData.length} plantões gravados com sucesso sem duplicações.`);
      setStatus("idle");
      setPreviewData([]);
      setFile(null);
      
    } catch (error) {
      console.error("Erro grave ao gravar na base de dados:", error);
      alert("❌ Ocorreu um erro ao gravar. Verifique a consola.");
      setStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
          <FileSpreadsheet className="text-emerald-500" />
          Importar Escala Mensal (.xlsx, .csv)
        </h3>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {/* SELETOR DE MÊS */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Mês Ref.</label>
            <select 
              value={mes} 
              onChange={(e) => setMes(e.target.value)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-700 cursor-pointer"
            >
              <option value="">Selecione</option>
              <option value="01">Janeiro</option>
              <option value="02">Fevereiro</option>
              <option value="03">Março</option>
              <option value="04">Abril</option>
              <option value="05">Maio</option>
              <option value="06">Junho</option>
              <option value="07">Julho</option>
              <option value="08">Agosto</option>
              <option value="09">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>
          </div>
          
          {/* SELETOR DE ANO */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Ano Ref.</label>
            <select 
              value={ano} 
              onChange={(e) => setAno(e.target.value)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-700 cursor-pointer"
            >
              <option value="">Selecione</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
              <option value="2028">2029</option>
              <option value="2028">2030</option>
            </select>
          </div>
          
          {/* CAMPO DE ARQUIVO */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Arquivo</label>
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload} 
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 cursor-pointer" 
            />
          </div>
        </div>

      {status === "idle" && file && (
        <button onClick={processarPlanilha} disabled={isProcessing} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-colors">
          {isProcessing ? <Loader2 className="animate-spin" /> : <Upload size={18} />}
          Ler Planilha e Gerar Escala
        </button>
      )}

      {status === "error" && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle /> Erro ao ler a planilha. Verifique se o formato está no padrão da UTI.
        </div>
      )}

      {status === "success" && previewData.length > 0 && (
        <div className="mt-6 border-t border-slate-100 pt-6 animate-fadeIn">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="font-bold text-emerald-700 flex items-center gap-2"><CheckCircle size={18} /> Leitura Concluída!</h4>
              <p className="text-sm text-slate-500">{previewData.length} plantões identificados.</p>
            </div>
            <button onClick={salvarNoFirebase} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-bold transition-colors">
              Confirmar e Salvar no Banco
            </button>
          </div>
          
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-60 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-400 font-bold border-b border-slate-200">
                  <th className="pb-2">Data</th>
                  <th className="pb-2">Profissional</th>
                  <th className="pb-2">Turno</th>
                  <th className="pb-2">Horário</th>
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 10).map((p, idx) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 font-mono text-xs">{p.data}</td>
                    <td className="py-2 font-bold text-slate-700 truncate max-w-[150px]">{p.nome}</td>
                    <td className="py-2"><span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-xs font-bold text-slate-600">{p.sigla} - {p.turno}</span></td>
                    <td className="py-2 text-slate-500">{p.horario}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 10 && <p className="text-center text-xs text-slate-400 mt-4 italic">Mostrando apenas os 10 primeiros registros...</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportadorEscala;