import { clsx } from "clsx";

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  changeUp?: boolean;
  icon: React.ReactNode;
  accent?: "blue" | "green" | "orange" | "purple" | "red";
}

const accents = {
  blue:   "bg-blue-50 text-blue-600",
  green:  "bg-green-50 text-green-600",
  orange: "bg-orange-50 text-orange-600",
  purple: "bg-purple-50 text-purple-600",
  red:    "bg-red-50 text-red-600",
};

export default function KpiCard({
  title, value, change, changeUp, icon, accent = "blue",
}: KpiCardProps) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={clsx("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", accents[accent])}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
        {change && (
          <p className={clsx("text-xs font-medium mt-1", changeUp ? "text-green-600" : "text-red-500")}>
            {changeUp ? "▲" : "▼"} {change} vs. mês anterior
          </p>
        )}
      </div>
    </div>
  );
}
