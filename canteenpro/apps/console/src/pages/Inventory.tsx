import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  AlertTriangle,
  Boxes,
  IndianRupee,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dt, inr, titleCase } from "@/lib/format";
import CrudPage from "@/components/CrudPage";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  Stat,
  Table,
  Tabs,
} from "@/components/ui";

export default function Inventory() {
  const { canteenId } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"stock" | "moves" | "suppliers">("stock");
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [newItem, setNewItem] = useState<any>(null);
  const [move, setMove] = useState<any>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["inventory", q, lowOnly],
    queryFn: () =>
      api.get("/tenant/inventory/items", { q, low: lowOnly || undefined }),
  });
  const { data: moves = [] } = useQuery({
    queryKey: ["stock-moves"],
    queryFn: () => api.get("/tenant/inventory/movements", { pageSize: 100 }),
    enabled: tab === "moves",
  });
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-all"],
    queryFn: () => api.get("/tenant/inventory/suppliers", { pageSize: 200 }),
  });

  const create = useMutation({
    mutationFn: (v: any) =>
      api.post("/tenant/inventory/items", {
        ...v,
        reorderLevel: Number(v.reorderLevel || 0),
        openingStock: Number(v.openingStock || 0),
        unitCost: Number(v.unitCost || 0),
      }),
    onSuccess: () => {
      toast.success("Item added");
      setNewItem(null);
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const record = useMutation({
    mutationFn: (v: any) =>
      api.post("/tenant/inventory/movements", {
        inventoryItemId: v.item.id,
        type: v.type,
        quantity: Number(v.quantity),
        unitCost: v.unitCost === "" ? undefined : Number(v.unitCost),
        supplierId: v.supplierId || null,
        canteenId,
        invoiceRef: v.invoiceRef || null,
        note: v.note || null,
      }),
    onSuccess: (r: any) => {
      toast.success(`Stock now ${r.currentStock}`);
      setMove(null);
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["stock-moves"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const value = items.reduce((a: number, i: any) => a + i.stockValue, 0);
  const low = items.filter((i: any) => i.isLow).length;

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Raw materials, purchases and kitchen issues. Average cost updates automatically on every purchase."
        actions={
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() =>
              setNewItem({
                name: "",
                unit: "kg",
                category: "",
                reorderLevel: "",
                openingStock: "",
                unitCost: "",
              })
            }
          >
            Add item
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Items tracked"
          value={items.length}
          icon={<Boxes className="h-5 w-5" />}
        />
        <Stat
          label="Stock value"
          value={inr(value)}
          icon={<IndianRupee className="h-5 w-5" />}
          tone="green"
        />
        <Stat
          label="Below reorder level"
          value={low}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={low ? "rose" : "green"}
        />
      </div>
      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        items={[
          { value: "stock", label: "Stock" },
          { value: "moves", label: "Stock movements" },
          { value: "suppliers", label: "Suppliers" },
        ]}
      />

      {tab === "stock" && (
        <Card padded={false}>
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
            <SearchInput
              className="min-w-[220px] flex-1"
              value={q}
              onChange={setQ}
              placeholder="Search ingredients…"
            />
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                className="accent-brand-700"
                checked={lowOnly}
                onChange={(e) => setLowOnly(e.target.checked)}
              />{" "}
              Low stock only
            </label>
          </div>
          <Table
            rows={items}
            columns={[
              {
                key: "name",
                header: "Item",
                render: (r: any) => (
                  <div>
                    <div className="font-semibold text-ink">{r.name}</div>
                    <div className="text-xs text-slate-500">
                      {r.category ?? "—"}
                    </div>
                  </div>
                ),
              },
              {
                key: "stock",
                header: "In stock",
                align: "right",
                render: (r: any) => (
                  <span
                    className={r.isLow ? "font-bold text-red-600" : "font-bold"}
                  >
                    {r.currentStock} {r.unit}
                  </span>
                ),
              },
              {
                key: "reorder",
                header: "Reorder at",
                align: "right",
                render: (r: any) => `${r.reorderLevel} ${r.unit}`,
              },
              {
                key: "cost",
                header: "Avg cost",
                align: "right",
                render: (r: any) => `${inr(r.avgCost, 2)}/${r.unit}`,
              },
              {
                key: "value",
                header: "Value",
                align: "right",
                render: (r: any) => inr(r.stockValue),
              },
              {
                key: "st",
                header: "",
                render: (r: any) => r.isLow && <Badge tone="red">Low</Badge>,
              },
              {
                key: "a",
                header: "",
                align: "right",
                render: (r: any) => (
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<ArrowDownToLine className="h-4 w-4" />}
                      onClick={() =>
                        setMove({
                          item: r,
                          type: "PURCHASE",
                          quantity: "",
                          unitCost: r.avgCost || "",
                          supplierId: "",
                          invoiceRef: "",
                          note: "",
                        })
                      }
                    >
                      In
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<ArrowUpFromLine className="h-4 w-4" />}
                      onClick={() =>
                        setMove({
                          item: r,
                          type: "CONSUMPTION",
                          quantity: "",
                          unitCost: "",
                          supplierId: "",
                          invoiceRef: "",
                          note: "",
                        })
                      }
                    >
                      Out
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      {tab === "moves" && (
        <Card padded={false}>
          <Table
            rows={moves}
            columns={[
              { key: "d", header: "Date", render: (r: any) => dt(r.createdAt) },
              { key: "i", header: "Item", render: (r: any) => r.item?.name },
              {
                key: "t",
                header: "Type",
                render: (r: any) => (
                  <Badge
                    tone={
                      ["PURCHASE", "RETURN"].includes(r.type)
                        ? "green"
                        : r.type === "WASTAGE"
                          ? "red"
                          : "slate"
                    }
                  >
                    {titleCase(r.type)}
                  </Badge>
                ),
              },
              {
                key: "q",
                header: "Qty",
                align: "right",
                render: (r: any) => `${r.quantity} ${r.item?.unit}`,
              },
              {
                key: "c",
                header: "Unit cost",
                align: "right",
                render: (r: any) =>
                  r.unitCost != null ? inr(r.unitCost, 2) : "—",
              },
              {
                key: "s",
                header: "Supplier / ref",
                render: (r: any) =>
                  [r.supplier?.name, r.invoiceRef]
                    .filter(Boolean)
                    .join(" · ") ||
                  r.note ||
                  "—",
              },
            ]}
          />
        </Card>
      )}

      {tab === "suppliers" && (
        <CrudPage
          cfg={{
            embedded: true,
            title: "Suppliers",
            endpoint: "/tenant/inventory/suppliers",
            queryKey: "suppliers",
            addLabel: "Add supplier",
            columns: [
              {
                key: "name",
                header: "Supplier",
                render: (r) => <span className="font-semibold">{r.name}</span>,
              },
              { key: "phone", header: "Phone" },
              { key: "email", header: "Email" },
              { key: "gstin", header: "GSTIN" },
            ],
            fields: [
              { name: "name", label: "Name", required: true },
              { name: "phone", label: "Phone" },
              { name: "email", label: "Email", type: "email" },
              { name: "gstin", label: "GSTIN" },
              { name: "address", label: "Address", type: "textarea" },
            ],
          }}
        />
      )}

      <Modal
        open={!!newItem}
        onClose={() => setNewItem(null)}
        title="Add inventory item"
        footer={
          <Button
            loading={create.isPending}
            onClick={() => create.mutate(newItem)}
          >
            Save
          </Button>
        }
      >
        {newItem && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name *" className="sm:col-span-2">
              <Input
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
                placeholder="Basmati rice"
              />
            </Field>
            <Field label="Unit">
              <Select
                value={newItem.unit}
                onChange={(e) =>
                  setNewItem({ ...newItem, unit: e.target.value })
                }
              >
                {["kg", "g", "L", "ml", "pcs", "packet", "box", "dozen"].map(
                  (u) => (
                    <option key={u}>{u}</option>
                  ),
                )}
              </Select>
            </Field>
            <Field label="Category">
              <Input
                value={newItem.category}
                onChange={(e) =>
                  setNewItem({ ...newItem, category: e.target.value })
                }
                placeholder="Grains"
              />
            </Field>
            <Field label="Opening stock">
              <Input
                type="number"
                value={newItem.openingStock}
                onChange={(e) =>
                  setNewItem({ ...newItem, openingStock: e.target.value })
                }
              />
            </Field>
            <Field label="Unit cost (₹)">
              <Input
                type="number"
                value={newItem.unitCost}
                onChange={(e) =>
                  setNewItem({ ...newItem, unitCost: e.target.value })
                }
              />
            </Field>
            <Field label="Reorder level" hint="Alert when stock falls to this">
              <Input
                type="number"
                value={newItem.reorderLevel}
                onChange={(e) =>
                  setNewItem({ ...newItem, reorderLevel: e.target.value })
                }
              />
            </Field>
          </div>
        )}
      </Modal>

      <Modal
        open={!!move}
        onClose={() => setMove(null)}
        title={`${move?.item?.name ?? ""} — stock entry`}
        footer={
          <Button
            loading={record.isPending}
            disabled={!Number(move?.quantity)}
            onClick={() => record.mutate(move)}
          >
            Save
          </Button>
        }
      >
        {move && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" className="sm:col-span-2">
              <Select
                value={move.type}
                onChange={(e) => setMove({ ...move, type: e.target.value })}
              >
                <option value="PURCHASE">Purchase (stock in)</option>
                <option value="RETURN">Return to stock (in)</option>
                <option value="CONSUMPTION">Issue to kitchen (out)</option>
                <option value="WASTAGE">Wastage / spoilage (out)</option>
                <option value="ADJUSTMENT">Stock count adjustment (+/-)</option>
              </Select>
            </Field>
            <Field
              label={`Quantity (${move.item.unit})`}
              hint={
                move.type === "ADJUSTMENT"
                  ? "Use a negative number to reduce"
                  : `Current: ${move.item.currentStock}`
              }
            >
              <Input
                type="number"
                autoFocus
                value={move.quantity}
                onChange={(e) => setMove({ ...move, quantity: e.target.value })}
              />
            </Field>
            {move.type === "PURCHASE" && (
              <Field label="Unit cost (₹)">
                <Input
                  type="number"
                  value={move.unitCost}
                  onChange={(e) =>
                    setMove({ ...move, unitCost: e.target.value })
                  }
                />
              </Field>
            )}
            {move.type === "PURCHASE" && (
              <Field label="Supplier">
                <Select
                  value={move.supplierId}
                  onChange={(e) =>
                    setMove({ ...move, supplierId: e.target.value })
                  }
                >
                  <option value="">—</option>
                  {suppliers?.items?.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {move.type === "PURCHASE" && (
              <Field label="Invoice / bill no.">
                <Input
                  value={move.invoiceRef}
                  onChange={(e) =>
                    setMove({ ...move, invoiceRef: e.target.value })
                  }
                />
              </Field>
            )}
            <Field label="Note" className="sm:col-span-2">
              <Input
                value={move.note}
                onChange={(e) => setMove({ ...move, note: e.target.value })}
              />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}
