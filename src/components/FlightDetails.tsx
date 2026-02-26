import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, ChevronDown } from "lucide-react";

const AIRLINE_NAMES: Record<string, string> = {
  AA: "American Airlines", UA: "United Airlines", DL: "Delta Air Lines",
  AS: "Alaska Airlines", B6: "JetBlue", WN: "Southwest Airlines",
  BA: "British Airways", LH: "Lufthansa", AF: "Air France",
  KL: "KLM", SQ: "Singapore Airlines", QF: "Qantas",
  AC: "Air Canada", WS: "WestJet", NH: "ANA", JL: "JAL",
  CX: "Cathay Pacific", EK: "Emirates", TK: "Turkish Airlines",
  IB: "Iberia", SK: "SAS", LX: "Swiss", OS: "Austrian",
  AY: "Finnair", QR: "Qatar Airways", OZ: "Asiana",
  KE: "Korean Air", MU: "China Eastern", CA: "Air China",
  SN: "Brussels Airlines", TP: "TAP Air Portugal",
};

const ALLIANCE_LABELS: Record<string, string> = {
  AA: "Oneworld", BA: "Oneworld", IB: "Oneworld", CX: "Oneworld",
  QF: "Oneworld", JL: "Oneworld", AY: "Oneworld", MH: "Oneworld",
  QR: "Oneworld", AS: "Oneworld",
  UA: "Star Alliance", LH: "Star Alliance", SQ: "Star Alliance",
  AC: "Star Alliance", TK: "Star Alliance", LX: "Star Alliance",
  OS: "Star Alliance", SK: "Star Alliance", NH: "Star Alliance",
  CA: "Star Alliance", OZ: "Star Alliance",
  DL: "SkyTeam", AF: "SkyTeam", KL: "SkyTeam", KE: "SkyTeam",
  MU: "SkyTeam", CZ: "SkyTeam", AM: "SkyTeam",
};

function parseDuration(iso: string): string {
  if (!iso) return "";
  const h = iso.match(/(\d+)H/)?.[1];
  const m = iso.match(/(\d+)M/)?.[1];
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.join(" ") || iso;
}

function fmtTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

interface FlightSegment {
  carrierCode: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
}

interface FlightLeg {
  departure: string;
  arrival: string;
  duration: string;
  stops: number;
  segments: FlightSegment[];
}

interface FlightOption {
  price: number;
  currency: string;
  airlines: string[];
  originAirport: string;
  outbound: FlightLeg;
  return: FlightLeg;
}

interface FlightPicks {
  cheapest: FlightOption | null;
  mostDirect: FlightOption | null;
}

const FlightLegDisplay = ({ leg, label }: { leg: FlightLeg; label: string }) => (
  <div className="space-y-1">
    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</div>
    <div className="flex items-center gap-1.5 text-xs text-foreground">
      <span className="font-medium">{fmtTime(leg.departure)}</span>
      <span className="text-muted-foreground">→</span>
      <span className="font-medium">{fmtTime(leg.arrival)}</span>
    </div>
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
      <span>{parseDuration(leg.duration)}</span>
      {leg.stops === 0 ? (
        <span className="bg-success/15 text-success font-semibold px-1.5 py-0.5 rounded-full">Nonstop</span>
      ) : (
        <span>{leg.stops} stop{leg.stops > 1 ? "s" : ""}</span>
      )}
    </div>
  </div>
);

const FlightCard = ({
  option,
  label,
  isSole,
}: {
  option: FlightOption;
  label: string;
  isSole: boolean;
}) => {
  const primaryCarrier = option.airlines[0] ?? "";
  const airlineName = AIRLINE_NAMES[primaryCarrier] ?? primaryCarrier;
  const alliance = ALLIANCE_LABELS[primaryCarrier];
  const displayLabel = isSole ? "Best Option" : label;

  return (
    <div className="glass rounded-lg p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{displayLabel}</span>
          {alliance && (
            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
              {alliance}
            </span>
          )}
        </div>
        <span className="text-sm font-black text-foreground">${option.price.toLocaleString()}</span>
      </div>
      <div className="text-[10px] text-muted-foreground">{airlineName}</div>
      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
        <FlightLegDisplay leg={option.outbound} label={`${option.originAirport} → dest`} />
        <FlightLegDisplay leg={option.return} label="Return" />
      </div>
    </div>
  );
};

const GuestFlightCard = ({
  guestName,
  picks,
}: {
  guestName: string;
  picks: FlightPicks;
}) => {
  const [open, setOpen] = useState(false);
  const hasMostDirect = picks.mostDirect !== null;
  const isSole = !hasMostDirect;

  return (
    <div className="glass rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Plane className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground">{guestName}</span>
          {picks.cheapest && (
            <span className="text-xs text-muted-foreground">
              from ${picks.cheapest.price.toLocaleString()}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {picks.cheapest && (
                <FlightCard option={picks.cheapest} label="Cheapest" isSole={isSole} />
              )}
              {picks.mostDirect && (
                <FlightCard option={picks.mostDirect} label="Most Direct" isSole={false} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface FlightDetailsProps {
  realFlights?: Record<string, FlightPicks>;
  resortName: string;
}

const FlightDetails = ({ realFlights, resortName }: FlightDetailsProps) => {
  if (!realFlights || Object.keys(realFlights).length === 0) return null;

  const entries = Object.entries(realFlights).filter(
    ([, picks]) => picks.cheapest || picks.mostDirect
  );
  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Plane className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Real Flight Options</span>
        <span className="text-[10px] text-muted-foreground">to {resortName}</span>
      </div>
      <div className="space-y-2">
        {entries.map(([guestName, picks]) => (
          <GuestFlightCard key={guestName} guestName={guestName} picks={picks} />
        ))}
      </div>
    </div>
  );
};

export default FlightDetails;
