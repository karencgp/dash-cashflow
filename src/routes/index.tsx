import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  Line,
  ComposedChart,
} from "recharts";
import extratoData from "@/data/extrato.json";
import { brl, brlExact, num } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  Receipt,
  Activity,
  Filter,
  RotateCcw,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fluxo de Caixa — Dashboard Financeiro" },
      {
        name: "description",
        content:
          "Dashboard interativo de fluxo de caixa com filtros, KPIs e análises por unidade, categoria e forma de pagamento.",
      },
      { property: "og:title", content: "Fluxo de Caixa — Dashboard Financeiro" },
      {
        property: "og:description",
        content: "Análise interativa de receitas e despesas a partir do extrato.",
      },
    ],
  }),
  component: Dashboard,
});

type Row = {
  Codigo_Transacao: string;
  Data: string;
  Data_Competencia: string;
  Tipo_Movimentacao: "Receita" | "Despesa";
  Natureza: string;
  Detalhes: string;
  Unidade: string;
  Cliente: string | null;
  Fornecedor: string | null;
  Forma_Pagamento: string;
  Valor: number;
  Saldo: number;
  Observacao: string | null;
};

const RAW = extratoData as Row[];

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const CHART = {
  receita: "var(--color-chart-1)",
  despesa: "var(--color-chart-2)",
  saldo: "var(--color-chart-3)",
  c4: "var(--color-chart-4)",
  c5: "var(--color-chart-5)",
};

function uniq<T>(arr: (T | null | undefined)[]): T[] {
  return Array.from(new Set(arr.filter((v): v is T => v != null))).sort();
}

function Dashboard() {
  const allUnidades = useMemo(() => uniq(RAW.map((r) => r.Unidade)), []);
  const allNaturezas = useMemo(() => uniq(RAW.map((r) => r.Natureza)), []);
  const allFormas = useMemo(() => uniq(RAW.map((r) => r.Forma_Pagamento)), []);
  const allMeses = useMemo(
    () =>
      uniq(RAW.map((r) => r.Data.slice(0, 7))).map((m) => ({
        v: m,
        label: `${MESES[+m.slice(5, 7) - 1]}/${m.slice(2, 4)}`,
      })),
    []
  );

  const [unidade, setUnidade] = useState("todas");
  const [natureza, setNatureza] = useState("todas");
  const [forma, setForma] = useState("todas");
  const [tipo, setTipo] = useState("todos");
  const [mesIni, setMesIni] = useState(allMeses[0].v);
  const [mesFim, setMesFim] = useState(allMeses[allMeses.length - 1].v);

  const filtered = useMemo(() => {
    return RAW.filter((r) => {
      const m = r.Data.slice(0, 7);
      if (m < mesIni || m > mesFim) return false;
      if (unidade !== "todas" && r.Unidade !== unidade) return false;
      if (natureza !== "todas" && r.Natureza !== natureza) return false;
      if (forma !== "todas" && r.Forma_Pagamento !== forma) return false;
      if (tipo !== "todos" && r.Tipo_Movimentacao !== tipo) return false;
      return true;
    });
  }, [unidade, natureza, forma, tipo, mesIni, mesFim]);

  const kpis = useMemo(() => {
    let receita = 0,
      despesa = 0,
      qtdR = 0,
      qtdD = 0;
    for (const r of filtered) {
      if (r.Tipo_Movimentacao === "Receita") {
        receita += r.Valor;
        qtdR++;
      } else {
        despesa += r.Valor;
        qtdD++;
      }
    }
    const saldo = receita - despesa;
    const margem = receita > 0 ? (saldo / receita) * 100 : 0;
    return { receita, despesa, saldo, margem, qtdR, qtdD, total: filtered.length };
  }, [filtered]);

  const mensal = useMemo(() => {
    const map = new Map<string, { mes: string; receita: number; despesa: number }>();
    for (const r of filtered) {
      const m = r.Data.slice(0, 7);
      if (!map.has(m)) map.set(m, { mes: m, receita: 0, despesa: 0 });
      const o = map.get(m)!;
      if (r.Tipo_Movimentacao === "Receita") o.receita += r.Valor;
      else o.despesa += r.Valor;
    }
    const arr = Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes));
    let acc = 0;
    return arr.map((o) => {
      const saldo = o.receita - o.despesa;
      acc += saldo;
      return {
        ...o,
        saldo,
        acumulado: acc,
        label: `${MESES[+o.mes.slice(5, 7) - 1]}/${o.mes.slice(2, 4)}`,
      };
    });
  }, [filtered]);

  const porUnidade = useMemo(() => {
    const map = new Map<string, { unidade: string; receita: number; despesa: number }>();
    for (const r of filtered) {
      if (!map.has(r.Unidade)) map.set(r.Unidade, { unidade: r.Unidade, receita: 0, despesa: 0 });
      const o = map.get(r.Unidade)!;
      if (r.Tipo_Movimentacao === "Receita") o.receita += r.Valor;
      else o.despesa += r.Valor;
    }
    return Array.from(map.values()).map((o) => ({ ...o, saldo: o.receita - o.despesa }));
  }, [filtered]);

  const porForma = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) map.set(r.Forma_Pagamento, (map.get(r.Forma_Pagamento) ?? 0) + r.Valor);
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const topDespesas = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      if (r.Tipo_Movimentacao !== "Despesa") continue;
      const cat = r.Detalhes.split("_").slice(0, 2).join(" / ");
      map.set(cat, (map.get(cat) ?? 0) + r.Valor);
    }
    return Array.from(map, ([categoria, valor]) => ({ categoria, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);
  }, [filtered]);

  const topReceitas = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      if (r.Tipo_Movimentacao !== "Receita" || !r.Cliente) continue;
      map.set(r.Cliente, (map.get(r.Cliente) ?? 0) + r.Valor);
    }
    return Array.from(map, ([cliente, valor]) => ({ cliente, valor })).sort(
      (a, b) => b.valor - a.valor
    );
  }, [filtered]);

  const topFornecedores = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      if (r.Tipo_Movimentacao !== "Despesa" || !r.Fornecedor) continue;
      map.set(r.Fornecedor, (map.get(r.Fornecedor) ?? 0) + r.Valor);
    }
    return Array.from(map, ([fornecedor, valor]) => ({ fornecedor, valor })).sort(
      (a, b) => b.valor - a.valor
    );
  }, [filtered]);

  const ultimas = useMemo(
    () =>
      [...filtered]
        .sort((a, b) => b.Data.localeCompare(a.Data))
        .slice(0, 12),
    [filtered]
  );

  const reset = () => {
    setUnidade("todas");
    setNatureza("todas");
    setForma("todas");
    setTipo("todos");
    setMesIni(allMeses[0].v);
    setMesFim(allMeses[allMeses.length - 1].v);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8 lg:px-10">
      <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-primary" />
            Painel Financeiro
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Fluxo de Caixa
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {num(RAW.length)} lançamentos · período {allMeses[0].label} — {allMeses[allMeses.length - 1].label}
          </p>
        </div>
        <Badge variant="secondary" className="self-start sm:self-auto">
          {num(kpis.total)} de {num(RAW.length)} transações no recorte atual
        </Badge>
      </header>

      {/* Filtros */}
      <Card className="mb-6 border-border/60 bg-card/70 p-4 backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4 text-primary" /> Filtros
          </div>
          <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Limpar
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <FilterSelect label="Mês inicial" value={mesIni} onChange={setMesIni} options={allMeses.map((m) => ({ v: m.v, label: m.label }))} />
          <FilterSelect label="Mês final" value={mesFim} onChange={setMesFim} options={allMeses.map((m) => ({ v: m.v, label: m.label }))} />
          <FilterSelect label="Unidade" value={unidade} onChange={setUnidade} options={[{ v: "todas", label: "Todas" }, ...allUnidades.map((u) => ({ v: u, label: u }))]} />
          <FilterSelect label="Tipo" value={tipo} onChange={setTipo} options={[{ v: "todos", label: "Todos" }, { v: "Receita", label: "Receita" }, { v: "Despesa", label: "Despesa" }]} />
          <FilterSelect label="Natureza" value={natureza} onChange={setNatureza} options={[{ v: "todas", label: "Todas" }, ...allNaturezas.map((n) => ({ v: n, label: n }))]} />
          <FilterSelect label="Forma de pagamento" value={forma} onChange={setForma} options={[{ v: "todas", label: "Todas" }, ...allFormas.map((f) => ({ v: f, label: f }))]} />
        </div>
      </Card>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={<ArrowUpRight className="h-4 w-4" />} label="Receita total" value={brl(kpis.receita)} sub={`${num(kpis.qtdR)} entradas`} tone="success" />
        <KpiCard icon={<ArrowDownRight className="h-4 w-4" />} label="Despesa total" value={brl(kpis.despesa)} sub={`${num(kpis.qtdD)} saídas`} tone="danger" />
        <KpiCard icon={<Wallet className="h-4 w-4" />} label="Saldo do período" value={brl(kpis.saldo)} sub={kpis.saldo >= 0 ? "Resultado positivo" : "Resultado negativo"} tone={kpis.saldo >= 0 ? "success" : "danger"} />
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Margem líquida" value={`${kpis.margem.toFixed(1)}%`} sub="Saldo / Receita" tone="neutral" />
      </div>

      {/* Linha temporal */}
      <Card className="mb-6 border-border/60 bg-card/70 p-5">
        <SectionTitle title="Fluxo mensal" subtitle="Receitas, despesas e saldo acumulado por mês" />
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={mensal} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.receita} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={CHART.receita} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.despesa} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={CHART.despesa} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => brl(v).replace("R$", "")} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area type="monotone" dataKey="receita" name="Receita" stroke={CHART.receita} fill="url(#gR)" strokeWidth={2} />
              <Area type="monotone" dataKey="despesa" name="Despesa" stroke={CHART.despesa} fill="url(#gD)" strokeWidth={2} />
              <Line type="monotone" dataKey="acumulado" name="Saldo acumulado" stroke={CHART.saldo} strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/70 p-5 lg:col-span-2">
          <SectionTitle title="Resultado por unidade" subtitle="Comparativo de receita e despesa por unidade" />
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porUnidade}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="unidade" stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => brl(v).replace("R$", "")} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="receita" name="Receita" fill={CHART.receita} radius={[6, 6, 0, 0]} />
                <Bar dataKey="despesa" name="Despesa" fill={CHART.despesa} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/70 p-5">
          <SectionTitle title="Por forma de pagamento" subtitle="Volume transacionado" />
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porForma} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {porForma.map((_, i) => (
                    <Cell key={i} fill={[CHART.receita, CHART.despesa, CHART.saldo, CHART.c4, CHART.c5][i % 5]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/70 p-5">
          <SectionTitle title="Top categorias de despesa" subtitle="Maiores saídas agrupadas" />
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDespesas} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => brl(v).replace("R$", "")} />
                <YAxis type="category" dataKey="categoria" stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} fontSize={11} width={140} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="valor" name="Despesa" fill={CHART.despesa} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/70 p-5">
          <SectionTitle title="Receita por cliente" subtitle="Concentração de entradas" />
          <div className="space-y-3">
            {topReceitas.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem receitas no recorte.</p>
            )}
            {topReceitas.map((c) => {
              const max = topReceitas[0].valor;
              return (
                <div key={c.cliente}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{c.cliente}</span>
                    <span className="tabular-nums text-muted-foreground">{brl(c.valor)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(c.valor / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6">
            <SectionTitle title="Despesa por fornecedor" subtitle="" />
            <div className="space-y-3">
              {topFornecedores.map((c) => {
                const max = topFornecedores[0].valor;
                return (
                  <div key={c.fornecedor}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{c.fornecedor}</span>
                      <span className="tabular-nums text-muted-foreground">{brl(c.valor)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(c.valor / max) * 100}%`, background: CHART.despesa }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Extrato */}
      <Card className="border-border/60 bg-card/70 p-5">
        <SectionTitle
          title="Últimos lançamentos"
          subtitle={`Mostrando ${ultimas.length} de ${num(kpis.total)} no recorte`}
        />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead>Código</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Contraparte</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ultimas.map((r) => (
                <TableRow key={r.Codigo_Transacao} className="border-border/40">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {r.Codigo_Transacao}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.Data.split("-").reverse().join("/")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        r.Tipo_Movimentacao === "Receita"
                          ? "border-primary/40 text-primary"
                          : "border-destructive/40 text-destructive"
                      }
                    >
                      {r.Tipo_Movimentacao}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate text-sm" title={r.Detalhes}>
                    {r.Detalhes.replaceAll("_", " · ")}
                  </TableCell>
                  <TableCell className="text-sm">{r.Unidade}</TableCell>
                  <TableCell className="text-sm">{r.Cliente ?? r.Fornecedor ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.Forma_Pagamento}</TableCell>
                  <TableCell
                    className={`text-right font-medium tabular-nums ${
                      r.Tipo_Movimentacao === "Receita" ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {r.Tipo_Movimentacao === "Receita" ? "+" : "−"} {brlExact(r.Valor)}
                  </TableCell>
                </TableRow>
              ))}
              {ultimas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Nenhum lançamento para os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <footer className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Receipt className="h-3.5 w-3.5" />
        Dados extraídos de <span className="font-medium text-foreground">AULA 1 - BD.xlsx</span>
      </footer>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-input/60">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.v} value={o.v}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: "success" | "danger" | "neutral";
}) {
  const tones = {
    success: "text-primary bg-primary/10 ring-primary/20",
    danger: "text-destructive bg-destructive/10 ring-destructive/20",
    neutral: "text-foreground bg-secondary ring-border",
  } as const;
  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/70 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={`rounded-full p-2 ring-1 ${tones[tone]}`}>{icon}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </Card>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover/95 p-3 text-xs shadow-xl backdrop-blur">
      {label && <div className="mb-1.5 font-medium">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium tabular-nums">{brlExact(p.value)}</span>
        </div>
      ))}
    </div>
  );
}
