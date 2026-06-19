interface RatioRowProps {
  label: string;
  value: string;
  benchmark?: string;
  status: "good" | "warn" | "bad";
}

const statusStyle = {
  good: "text-green-600 bg-green-50",
  warn: "text-yellow-700 bg-yellow-50",
  bad:  "text-red-600 bg-red-50",
};

function RatioRow({ label, value, benchmark, status }: RatioRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-3">
        {benchmark && <span className="text-xs text-gray-400">Ref: {benchmark}</span>}
        <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${statusStyle[status]}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

export default function FinancialRatios() {
  return (
    <div className="card">
      <div className="card-header">
        <h3>Indicadores Financeiros</h3>
        <p className="text-xs text-gray-500 mt-0.5">KPIs — 31/10/2024</p>
      </div>
      <div className="card-body py-0">
        <RatioRow label="Liquidez Geral"             value="1,82"  benchmark="> 1,5"  status="good" />
        <RatioRow label="Liquidez Reduzida"           value="1,24"  benchmark="> 1,0"  status="good" />
        <RatioRow label="Autonomia Financeira"        value="42,3%" benchmark="> 30%"  status="good" />
        <RatioRow label="Rentabilidade dos Activos"   value="8,4%"  benchmark="> 5%"   status="good" />
        <RatioRow label="Rentabilidade dos Capitais"  value="14,7%" benchmark="> 10%"  status="good" />
        <RatioRow label="Margem EBITDA"               value="22,1%" benchmark="> 15%"  status="good" />
        <RatioRow label="Prazo Médio de Recebimento"  value="38 d"  benchmark="< 45d"  status="good" />
        <RatioRow label="Prazo Médio de Pagamento"    value="52 d"  benchmark="30-60d" status="warn" />
        <RatioRow label="Rotação de Inventário"       value="6,2x"  benchmark="> 4x"   status="good" />
        <RatioRow label="Fundo de Maneio"             value="85,4M Kz"              status="good" />
      </div>
    </div>
  );
}
