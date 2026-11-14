import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dOnly, inr } from "@/lib/format";
import CrudPage from "@/components/CrudPage";
import { Badge } from "@/components/ui";

const today = () => new Date().toISOString().slice(0, 10);

export function WastePage() {
  const { canteenId } = useAuth();
  const { data: canteens } = useQuery({
    queryKey: ["canteens"],
    queryFn: () => api.get("/tenant/canteens"),
  });
  const sessions =
    canteens?.find((c: any) => c.id === canteenId)?.sessions ?? [];
  const sName = (id: string) =>
    sessions.find((s: any) => s.id === id)?.name ?? "—";
  return (
    <CrudPage
      cfg={{
        title: "Food waste log",
        subtitle:
          "Log prepared vs wasted quantity every session. Tracking waste is the fastest way to cut food cost.",
        endpoint: "/tenant/waste",
        queryKey: "waste",
        canteenScoped: true,
        addLabel: "Log waste",
        defaults: { date: today() },
        columns: [
          { key: "date", header: "Date", render: (r) => dOnly(r.date) },
          {
            key: "s",
            header: "Session",
            render: (r) => sName(r.mealSessionId),
          },
          {
            key: "preparedQtyKg",
            header: "Prepared (kg)",
            align: "right",
            render: (r) => r.preparedQtyKg ?? "—",
          },
          {
            key: "wastedQtyKg",
            header: "Wasted (kg)",
            align: "right",
            render: (r) => (
              <span className="font-bold text-red-600">{r.wastedQtyKg}</span>
            ),
          },
          {
            key: "pct",
            header: "Waste %",
            align: "right",
            render: (r) =>
              r.preparedQtyKg
                ? `${((r.wastedQtyKg / r.preparedQtyKg) * 100).toFixed(1)}%`
                : "—",
          },
          {
            key: "reason",
            header: "Reason",
            render: (r) =>
              r.reason ? <Badge tone="amber">{r.reason}</Badge> : "—",
          },
        ],
        fields: [
          { name: "date", label: "Date", type: "date", required: true },
          {
            name: "mealSessionId",
            label: "Session",
            type: "select",
            options: sessions.map((s: any) => ({ value: s.id, label: s.name })),
          },
          { name: "preparedQtyKg", label: "Prepared (kg)", type: "number" },
          {
            name: "wastedQtyKg",
            label: "Wasted (kg)",
            type: "number",
            required: true,
          },
          {
            name: "reason",
            label: "Reason",
            type: "select",
            options: [
              "Over-production",
              "Plate waste",
              "Spoilage",
              "Quality issue",
              "Other",
            ].map((v) => ({ value: v, label: v })),
          },
          { name: "note", label: "Note", type: "textarea" },
        ],
      }}
    />
  );
}

export function ExpensesPage() {
  const { can } = useAuth();
  return (
    <CrudPage
      cfg={{
        title: "Expenses",
        subtitle:
          "Gas, electricity, rent, salaries and other running costs — they feed the monthly P&L report.",
        endpoint: "/tenant/expenses",
        queryKey: "expenses",
        canteenScoped: true,
        csv: true,
        addLabel: "Add expense",
        canWrite: can("OWNER", "MANAGER"),
        defaults: { date: today() },
        columns: [
          { key: "date", header: "Date", render: (r) => dOnly(r.date) },
          {
            key: "category",
            header: "Category",
            render: (r) => <Badge tone="brand">{r.category}</Badge>,
          },
          { key: "paidTo", header: "Paid to" },
          { key: "note", header: "Note" },
          {
            key: "amount",
            header: "Amount",
            align: "right",
            render: (r) => <span className="font-bold">{inr(r.amount)}</span>,
          },
        ],
        fields: [
          { name: "date", label: "Date", type: "date", required: true },
          {
            name: "category",
            label: "Category",
            type: "select",
            required: true,
            options: [
              "Gas",
              "Electricity",
              "Water",
              "Rent",
              "Salary",
              "Maintenance",
              "Packaging",
              "Cleaning",
              "Transport",
              "Other",
            ].map((v) => ({ value: v, label: v })),
          },
          {
            name: "amount",
            label: "Amount (₹)",
            type: "number",
            required: true,
          },
          { name: "paidTo", label: "Paid to" },
          { name: "note", label: "Note", type: "textarea" },
        ],
      }}
    />
  );
}
