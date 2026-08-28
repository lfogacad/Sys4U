import React from 'react';
import { FileText } from 'lucide-react';

const RelatorioChecklistIOT = ({ checklists, mesAno, metricas, acessosMes }) => {
  // Análise dos itens de conformidade mais falhos
  const analiseItens = {};
  let totalItens = 0;
  let totalCumpridos = 0;

  checklists.forEach(c => {
    if (!c.itens || !Array.isArray(c.itens)) return;
    c.itens.forEach(item => {
      totalItens++;
      if (item.cumprida) totalCumpridos++;
      
      const nome = item.label || item.key || `Item`;
      if (!analiseItens[nome]) {
        analiseItens[nome] = { total: 0, cumpridas: 0, falhas: 0 };
      }
      analiseItens[nome].total++;
      if (item.cumprida) {
        analiseItens[nome].cumpridas++;
      } else {
        analiseItens[nome].falhas++;
      }
    });
  });

  // Ordena itens por taxa de falha (decrescente)
  const itensOrdenados = Object.entries(analiseItens)
    .map(([nome, dados]) => ({
      nome,
      ...dados,
      taxaFalha: dados.total > 0 ? Math.round((dados.falhas / dados.total) * 100) : 0,
    }))
    .sort((a, b) => b.taxaFalha - a.taxaFalha);

  const [ano, mes] = mesAno ? mesAno.split('-') : ['', ''];
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const nomeMes = meses[parseInt(mes) - 1] || mes;

  const totalChecklists = checklists.length;
  const total100Porcento = checklists.filter(c => c.todasCumpridas).length;
  const cobertura = acessosMes > 0 ? Math.round((totalChecklists / acessosMes) * 100) : 0;
  const conformidadeGeral = totalItens > 0 ? Math.round((totalCumpridos / totalItens) * 100) : 0;
  const totalReintubacoes48h = checklists.filter(c => c.reintubacao48h).length;
  const totalVNI = checklists.filter(c => c.vni).length;

  return (
    <div className="text-slate-800" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Cabeçalho institucional */}
      <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
        <h1 className="text-xl font-bold uppercase tracking-wide">Relatório de Checklists IOT</h1>
        <p className="text-sm text-slate-500 mt-1">Prevenção de Pneumonia Associada à Ventilação Mecânica (PAV)</p>
        <p className="text-sm text-slate-500 mt-1">Período: {nomeMes} / {ano}</p>
        <p className="text-xs text-slate-400 mt-0.5">Emitido em: {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      {/* Resumo executivo */}
      <div className="mb-6">
        <h2 className="text-base font-bold border-b border-slate-300 pb-1 mb-3">1. Resumo do Período</h2>
        <table className="w-full text-sm border-collapse">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="py-1.5 font-semibold w-64">Total de checklists registrados</td>
              <td className="py-1.5">{totalChecklists}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-1.5 font-semibold">Total de intubações realizadas</td>
              <td className="py-1.5">{acessosMes}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-1.5 font-semibold">Taxa de cobertura</td>
              <td className="py-1.5">{cobertura}%</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-1.5 font-semibold">Checklists com 100% de conformidade</td>
              <td className="py-1.5">{total100Porcento} ({totalChecklists > 0 ? Math.round((total100Porcento / totalChecklists) * 100) : 0}%)</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-1.5 font-semibold">Conformidade geral (itens)</td>
              <td className="py-1.5">{conformidadeGeral}% ({totalCumpridos}/{totalItens} itens)</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-1.5 font-semibold w-64">Reintubações &lt;48h</td>
              <td className="py-1.5">{totalReintubacoes48h}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-1.5 font-semibold">VNI realizado/considerado</td>
              <td className="py-1.5">{totalVNI}</td>
            </tr>                        
          </tbody>
        </table>
      </div>

      {/* Análise de itens de conformidade */}
      <div className="mb-6">
        <h2 className="text-base font-bold border-b border-slate-300 pb-1 mb-3">2. Análise de Conformidade</h2>
        
        {itensOrdenados.length > 0 ? (
          <>
            <table className="w-full text-sm border-collapse mb-3">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300">
                  <th className="text-left p-2 font-bold">Item de Boa Prática</th>
                  <th className="text-center p-2 font-bold">Total</th>
                  <th className="text-center p-2 font-bold">Cumpridos</th>
                  <th className="text-center p-2 font-bold">Falhas</th>
                  <th className="text-center p-2 font-bold">Taxa de Falha</th>
                </tr>
              </thead>
              <tbody>
                {itensOrdenados.map((b, i) => (
                  <tr key={i} className={`border-b border-slate-200 ${b.taxaFalha > 0 ? 'bg-red-50' : ''}`}>
                    <td className="p-2 font-medium">{b.nome}</td>
                    <td className="p-2 text-center">{b.total}</td>
                    <td className="p-2 text-center">{b.cumpridas}</td>
                    <td className="p-2 text-center">{b.falhas}</td>
                    <td className={`p-2 text-center font-bold ${b.taxaFalha > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                      {b.taxaFalha}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          </>
        ) : (
          <p className="text-sm text-slate-500 italic">Nenhum checklist com itens detalhados registrado no período.</p>
        )}
      </div>

      {/* Listagem de checklists */}
      <div className="mb-6">
        <h2 className="text-base font-bold border-b border-slate-300 pb-1 mb-3">3. Checklists Registrados</h2>
        
        {checklists.length > 0 ? (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300">
                <th className="text-left p-2 font-bold">Paciente</th>
                <th className="text-left p-2 font-bold">Data</th>
                <th className="text-left p-2 font-bold">Local</th>
                <th className="text-left p-2 font-bold">Tentativa</th>
                <th className="text-left p-2 font-bold">Médico</th>
                <th className="text-center p-2 font-bold">Conformidade</th>
                <th className="text-center p-2 font-bold">VNI</th>
              </tr>
            </thead>
            <tbody>
              {checklists.map((c, i) => (
                <tr key={c.id} className={`border-b border-slate-200 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="p-2">{c.paciente}</td>
                  <td className="p-2">{c.data?.split('-').reverse().join('/')} {c.horario}</td>
                  <td className="p-2">{c.localInsercao}</td>
                  <td className="p-2">{c.tentativa}</td>
                  <td className="p-2">{c.medico}</td>
                  <td className="p-2 text-center">
                    <span className={c.todasCumpridas ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                      {c.cumpridas}/{c.total}
                    </span>
                  </td>
                  <td className="p-2 text-center">{c.vni ? 'Sim' : 'Não'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-500 italic">Nenhum checklist registrado no período.</p>
        )}
      </div>

      {/* Rodapé */}
      <div className="border-t border-slate-300 pt-3 mt-6 text-xs text-slate-400 text-center">
        <p>Relatório gerado automaticamente pelo sistema de gestão de leitos UTI</p>
        <p className="mt-0.5">Documento institucional — UTI Municipal de Ariquemes</p>
      </div>
    </div>
  );
};

export default RelatorioChecklistIOT;