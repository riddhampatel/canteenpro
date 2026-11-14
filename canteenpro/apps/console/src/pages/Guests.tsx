import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { UtensilsCrossed } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dOnly, inr, titleCase } from "@/lib/format";
import CrudPage from "@/components/CrudPage";
import { Badge, Button, Field, Modal, Select } from "@/components/ui";
import { Receipt } from "./Pos";

export default function Guests() {
  const { canteenId } = useAuth();
  const [serveFor, setServeFor] = useState<any>(null);
  const [mode, setMode] = useState("CASH");
  const [sessionId, setSessionId] = useState("");
  const [receipt, setReceipt] = useState<any>(null);
  const { data: canteens } = useQuery({
    queryKey: ["canteens"],
    queryFn: () => api.get("/tenant/canteens"),
  });
  const canteen = canteens?.find((c: any) => c.id === canteenId);
  const sessions = canteen?.sessions?.filter((s: any) => s.isActive) ?? [];

  const serve = useMutation({
    mutationFn: () =>
      api.post("/tenant/orders", {
        canteenId,
        consumerType: "GUEST",
        guestId: serveFor.id,
        mealSessionId: sessionId || null,
        paymentMode: mode,
      }),
    onSuccess: (o: any) => {
      toast.success(`Meal served to ${serveFor.name}`);
      setServeFor(null);
      setReceipt(o);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      {canteen && !canteen.allowGuests && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Guest meals are turned off for this canteen. Enable “Allow guests” in
          Settings → Canteens.
        </div>
      )}
      <CrudPage
        cfg={{
          title: "Guests & visitors",
          subtitle:
            "Register visitors, interview candidates and vendors. Every guest meal is stored for billing.",
          endpoint: "/tenant/guests",
          queryKey: "guests",
          canteenScoped: true,
          csv: true,
          addLabel: "Register guest",
          searchPlaceholder: "Search name, phone, company…",
          columns: [
            {
              key: "name",
              header: "Guest",
              render: (r) => (
                <div>
                  <div className="font-semibold text-ink">{r.name}</div>
                  <div className="text-xs text-slate-500">{r.phone ?? "—"}</div>
                </div>
              ),
            },
            { key: "company", header: "Company" },
            {
              key: "purpose",
              header: "Purpose",
              render: (r) =>
                r.purpose ? <Badge tone="sky">{r.purpose}</Badge> : "—",
            },
            {
              key: "validUntil",
              header: "Pass valid till",
              render: (r) => (r.validUntil ? dOnly(r.validUntil) : "Open"),
            },
            {
              key: "createdAt",
              header: "Registered",
              render: (r) => dOnly(r.createdAt),
            },
          ],
          rowActions: (r) => (
            <Button
              size="sm"
              variant="secondary"
              icon={<UtensilsCrossed className="h-4 w-4" />}
              onClick={() => setServeFor(r)}
            >
              Serve meal
            </Button>
          ),
          fields: [
            { name: "name", label: "Full name", required: true },
            { name: "phone", label: "Phone", type: "tel" },
            { name: "email", label: "Email", type: "email" },
            { name: "company", label: "Company" },
            {
              name: "purpose",
              label: "Purpose",
              type: "select",
              options: [
                "Client meeting",
                "Interview",
                "Vendor visit",
                "Contractor",
                "Auditor",
                "Training",
                "Other",
              ].map((v) => ({ value: v, label: v })),
            },
            {
              name: "idProof",
              label: "ID proof (last 4 / type)",
              placeholder: "e.g. Aadhaar xx12",
            },
            {
              name: "validUntil",
              label: "Pass valid until",
              type: "datetime-local",
              hint: "Leave empty for an open pass",
            },
          ],
        }}
      />
      <Modal
        open={!!serveFor}
        onClose={() => setServeFor(null)}
        size="sm"
        title={`Serve meal — ${serveFor?.name ?? ""}`}
        footer={
          <Button loading={serve.isPending} onClick={() => serve.mutate()}>
            Serve & bill
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Meal session">
            <Select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
            >
              <option value="">Current session</option>
              {sessions.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name} — guest price {inr(s.guestPrice)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Payment"
            hint="“Company” adds the meal to the client billing statement."
          >
            <Select value={mode} onChange={(e) => setMode(e.target.value)}>
              {["CASH", "UPI", "CARD", "COMPANY", "COMPLIMENTARY"].map((m) => (
                <option key={m} value={m}>
                  {titleCase(m)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>
      <Receipt order={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
