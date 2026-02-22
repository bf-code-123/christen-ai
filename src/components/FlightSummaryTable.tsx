import { motion } from "framer-motion";
import { Plane } from "lucide-react";

interface FlightSummaryTableProps {
  flightSummary: Record<string, Record<string, number | null>>;
  resortNames: string[];
}

const FlightSummaryTable = ({ flightSummary, resortNames }: FlightSummaryTableProps) => {
  if (!flightSummary || Object.keys(flightSummary).length === 0) return null;

  const guests = Object.keys(flightSummary);

  // Find cheapest resort per guest
  const cheapest: Record<string, string> = {};
  guests.forEach((guest) => {
    let min = Infinity;
    let best = "";
    resortNames.forEach((resort) => {
      const cost = flightSummary[guest]?.[resort];
      if (cost != null && cost < min) {
        min = cost;
        best = resort;
      }
    });
    if (best) cheapest[guest] = best;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-strong rounded-2xl overflow-hidden"
    >
      <div className="p-5 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Per-Guest Flight Summary</h3>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Guest</th>
              {resortNames.map((name) => (
                <th key={name} className="text-center p-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  {name.length > 15 ? name.slice(0, 15) + "…" : name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {guests.map((guest) => (
              <tr key={guest} className="border-b border-border/10">
                <td className="p-3 text-xs font-medium text-foreground whitespace-nowrap">{guest}</td>
                {resortNames.map((resort) => {
                  const cost = flightSummary[guest]?.[resort];
                  const isCheapest = cheapest[guest] === resort;
                  return (
                    <td
                      key={resort}
                      className={`text-center p-3 text-xs font-medium ${
                        isCheapest
                          ? "text-success font-bold bg-success/5"
                          : "text-foreground"
                      }`}
                    >
                      {cost != null ? `$${cost.toLocaleString()}` : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default FlightSummaryTable;
