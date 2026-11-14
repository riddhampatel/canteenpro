import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import clsx from "clsx";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  QrCode,
  Pencil,
  Power,
  Trash2,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  addDays,
  dayMonth,
  FOOD_TYPES,
  inr,
  sessionColor,
  titleCase,
  today,
  weekday,
} from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  Table,
  Tabs,
  Textarea,
  Toggle,
} from "@/components/ui";
import { DailyQrModal } from "./Counter";

const mondayOf = (d: string) => {
  const dt = new Date(d + "T00:00:00");
  const wd = (dt.getDay() + 6) % 7;
  return addDays(d, -wd);
};
const FoodDot = ({ t }: { t: string }) => (
  <span
    className={clsx(
      "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
      t === "NON_VEG"
        ? "bg-red-600"
        : t === "EGG"
          ? "bg-amber-500"
          : "bg-emerald-600",
    )}
  />
);

/* ------------------------------------------------------------------ planner */
function Planner() {
  const { canteenId } = useAuth();
  const qc = useQueryClient();
  const [week, setWeek] = useState(mondayOf(today()));
  const [cell, setCell] = useState<any>(null);
  const to = addDays(week, 6);
  const { data } = useQuery({
    queryKey: ["daily", canteenId, week],
    queryFn: () => api.get("/tenant/menu/daily", { canteenId, from: week, to }),
  });
  const { data: items = [] } = useQuery({
    queryKey: ["menu-items", "active"],
    queryFn: () => api.get("/tenant/menu/items", { active: true }),
  });

  const copy = useMutation({
    mutationFn: () =>
      api.post("/tenant/menu/daily/copy", {
        canteenId,
        fromDate: addDays(week, -7),
        toDate: week,
        days: 7,
      }),
    onSuccess: (r: any) => {
      toast.success(`Copied ${r.copied} menus from last week`);
      qc.invalidateQueries({ queryKey: ["daily"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const sessions = data?.days?.[0]?.sessions?.map((s: any) => s.session) ?? [];
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<ChevronLeft className="h-4 w-4" />}
            onClick={() => setWeek(addDays(week, -7))}
          />
          <div className="min-w-45 text-center font-bold">
            {dayMonth(week)} – {dayMonth(to)}
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<ChevronRight className="h-4 w-4" />}
            onClick={() => setWeek(addDays(week, 7))}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeek(mondayOf(today()))}
          >
            This week
          </Button>
        </div>
        <Button
          variant="outline"
          icon={<Copy className="h-4 w-4" />}
          loading={copy.isPending}
          onClick={() => copy.mutate()}
        >
          Copy last week's menu
        </Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
        <table className="w-full min-w-245 table-fixed text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="w-36 p-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                Session
              </th>
              {data?.days?.map((d: any) => (
                <th
                  key={d.date}
                  className={clsx(
                    "p-3 text-left",
                    d.date === today() && "bg-brand-50",
                  )}
                >
                  <div className="text-xs font-bold uppercase text-slate-500">
                    {weekday(d.date)}
                  </div>
                  <div
                    className={clsx(
                      "text-sm font-bold",
                      d.date === today() ? "text-brand-700" : "text-ink",
                    )}
                  >
                    {dayMonth(d.date)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((s: any, si: number) => (
              <tr
                key={s.id}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="p-3 align-top">
                  <div className="flex items-center gap-2 font-bold">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: sessionColor(s.name, si) }}
                    />
                    {s.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {s.startTime}-{s.endTime}
                  </div>
                </td>
                {data.days.map((d: any) => {
                  const c = d.sessions.find((x: any) => x.session.id === s.id);
                  return (
                    <td
                      key={d.date}
                      className={clsx(
                        "p-2 align-top",
                        d.date === today() && "bg-brand-50/50",
                      )}
                    >
                      <button
                        onClick={() => setCell({ date: d.date, ...c })}
                        className={clsx(
                          "min-h-23 w-full rounded-xl border p-2 text-left transition hover:border-brand-300 hover:shadow-sm",
                          c.items.length
                            ? "border-slate-200 bg-white"
                            : "border-dashed border-slate-300 bg-slate-50/50",
                        )}
                      >
                        {c.items.length ? (
                          <div className="space-y-1">
                            {c.items.slice(0, 4).map((i: any) => (
                              <div
                                key={i.id}
                                className={clsx(
                                  "flex items-center gap-1.5 text-xs",
                                  !i.isAvailable && "line-through opacity-50",
                                )}
                              >
                                <FoodDot t={i.foodType} />
                                <span className="truncate">{i.name}</span>
                              </div>
                            ))}
                            {c.items.length > 4 && (
                              <div className="text-xs text-slate-400">
                                +{c.items.length - 4} more
                              </div>
                            )}
                            {!c.isPublished && (
                              <Badge tone="amber" className="mt-1">
                                Draft
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <div className="grid h-full min-h-19 place-items-center text-xs font-semibold text-slate-400">
                            <span className="flex items-center gap-1">
                              <Plus className="h-3.5 w-3.5" /> Add items
                            </span>
                          </div>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {cell && (
        <CellEditor cell={cell} items={items} onClose={() => setCell(null)} />
      )}
    </>
  );
}

function CellEditor({
  cell,
  items,
  onClose,
}: {
  cell: any;
  items: any[];
  onClose: () => void;
}) {
  const { canteenId } = useAuth();
  const qc = useQueryClient();
  const [rows, setRows] = useState<any[]>(
    cell.items.map((i: any) => ({
      menuItemId: i.menuItemId,
      name: i.name,
      foodType: i.foodType,
      basePrice: i.basePrice,
      priceOverride: i.priceOverride ?? "",
      plannedQty: i.plannedQty ?? "",
      isAvailable: i.isAvailable,
    })),
  );
  const [published, setPublished] = useState(
    cell.dailyMenuId ? cell.isPublished : true,
  );
  const [notify, setNotify] = useState(false);
  const [pick, setPick] = useState("");
  const available = items.filter(
    (i) => !rows.find((r) => r.menuItemId === i.id),
  );
  const save = useMutation({
    mutationFn: () =>
      api.put("/tenant/menu/daily", {
        canteenId,
        mealSessionId: cell.session.id,
        date: cell.date,
        isPublished: published,
        notify,
        items: rows.map((r) => ({
          menuItemId: r.menuItemId,
          priceOverride:
            r.priceOverride === "" ? null : Number(r.priceOverride),
          plannedQty: r.plannedQty === "" ? null : Number(r.plannedQty),
          isAvailable: r.isAvailable,
        })),
      }),
    onSuccess: () => {
      toast.success("Menu saved");
      qc.invalidateQueries({ queryKey: ["daily"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`${cell.session.name} · ${weekday(cell.date)} ${dayMonth(cell.date)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>
            Save menu
          </Button>
        </>
      }
    >
      <div className="mb-4 flex gap-2">
        <Select value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">Add a dish…</option>
          {available.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} — {inr(i.price)}{" "}
              {i.category ? `(${i.category.name})` : ""}
            </option>
          ))}
        </Select>
        <Button
          disabled={!pick}
          icon={<Plus className="h-4 w-4" />}
          onClick={() => {
            const i = items.find((x) => x.id === pick);
            setRows([
              ...rows,
              {
                menuItemId: i.id,
                name: i.name,
                foodType: i.foodType,
                basePrice: i.price,
                priceOverride: "",
                plannedQty: "",
                isAvailable: true,
              },
            ]);
            setPick("");
          }}
        >
          Add
        </Button>
      </div>
      {rows.length === 0 ? (
        <Empty
          title="No dishes yet"
          text="Add dishes from your catalog. Employees see this menu in the app."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((r, idx) => (
            <div
              key={r.menuItemId}
              className="grid grid-cols-12 items-center gap-2 rounded-xl border border-slate-100 p-2.5"
            >
              <div className="col-span-12 flex items-center gap-2 sm:col-span-5">
                <FoodDot t={r.foodType} />
                <span
                  className={clsx(
                    "font-semibold",
                    !r.isAvailable && "line-through opacity-50",
                  )}
                >
                  {r.name}
                </span>
              </div>
              <Input
                className="col-span-4 sm:col-span-2 h-9"
                type="number"
                placeholder={`₹${r.basePrice}`}
                value={r.priceOverride}
                onChange={(e) =>
                  setRows(
                    rows.map((x, i) =>
                      i === idx ? { ...x, priceOverride: e.target.value } : x,
                    ),
                  )
                }
                title="Price for this day (optional)"
              />
              <Input
                className="col-span-4 sm:col-span-2 h-9"
                type="number"
                placeholder="Qty plan"
                value={r.plannedQty}
                onChange={(e) =>
                  setRows(
                    rows.map((x, i) =>
                      i === idx ? { ...x, plannedQty: e.target.value } : x,
                    ),
                  )
                }
                title="Planned quantity"
              />
              <div className="col-span-4 flex items-center justify-end gap-1 sm:col-span-3">
                <button
                  title={r.isAvailable ? "Mark sold out" : "Mark available"}
                  onClick={() =>
                    setRows(
                      rows.map((x, i) =>
                        i === idx ? { ...x, isAvailable: !x.isAvailable } : x,
                      ),
                    )
                  }
                  className={clsx(
                    "rounded-lg p-2",
                    r.isAvailable
                      ? "text-emerald-600 hover:bg-emerald-50"
                      : "text-slate-400 hover:bg-slate-100",
                  )}
                >
                  <Power className="h-4 w-4" />
                </button>
                <button
                  title="Remove"
                  onClick={() => setRows(rows.filter((_, i) => i !== idx))}
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 px-4 py-3">
          <Toggle
            checked={published}
            onChange={setPublished}
            label="Published"
            description="Visible in the employee app"
          />
        </div>
        <div className="rounded-xl border border-slate-200 px-4 py-3">
          <Toggle
            checked={notify}
            onChange={setNotify}
            label="Notify employees"
            description="Send a push notification"
          />
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ catalog */
const emptyItem = {
  name: "",
  categoryId: "",
  description: "",
  imageUrl: "",
  price: "",
  guestPrice: "",
  costPrice: "",
  foodType: "VEG",
  calories: "",
  prepMinutes: "",
  tags: "",
  highlights: "",
  isActive: true,
};

function Catalog() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<any>(null);
  const [newCat, setNewCat] = useState("");
  const { data: items = [] } = useQuery({
    queryKey: ["menu-items", "all"],
    queryFn: () => api.get("/tenant/menu/items"),
  });
  const { data: cats } = useQuery({
    queryKey: ["menu-cats"],
    queryFn: () => api.get("/tenant/menu/categories", { pageSize: 100 }),
  });
  const shown = items.filter(
    (i: any) => !q || i.name.toLowerCase().includes(q.toLowerCase()),
  );
  const editable = can("OWNER", "MANAGER", "KITCHEN");

  const save = useMutation({
    mutationFn: (v: any) => {
      const body = {
        name: v.name,
        categoryId: v.categoryId || null,
        description: v.description || null,
        imageUrl: v.imageUrl || "",
        price: Number(v.price),
        guestPrice: v.guestPrice === "" ? null : Number(v.guestPrice),
        costPrice: v.costPrice === "" ? null : Number(v.costPrice),
        foodType: v.foodType,
        calories: v.calories === "" ? null : Number(v.calories),
        prepMinutes: v.prepMinutes === "" ? null : Number(v.prepMinutes),
        tags: String(v.tags || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        highlights: String(v.highlights || "")
          .split("\n")
          .map((s: string) => s.trim())
          .filter(Boolean),
        isActive: v.isActive,
      };
      return v.id
        ? api.patch(`/tenant/menu/items/${v.id}`, body)
        : api.post("/tenant/menu/items", body);
    },
    onSuccess: () => {
      toast.success("Item saved");
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["menu-items"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const toggle = async (i: any) => {
    await api.patch(`/tenant/menu/items/${i.id}`, { isActive: !i.isActive });
    qc.invalidateQueries({ queryKey: ["menu-items"] });
  };
  const addCat = async () => {
    if (!newCat.trim()) return;
    await api
      .post("/tenant/menu/categories", { name: newCat.trim() })
      .catch((e) => toast.error(e.message));
    setNewCat("");
    qc.invalidateQueries({ queryKey: ["menu-cats"] });
  };

  return (
    <>
      <Card
        padded={false}
        title="Dish catalog"
        actions={
          editable && (
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setEdit({ ...emptyItem })}
            >
              Add dish
            </Button>
          )
        }
      >
        <div className="border-b border-slate-100 p-4">
          <SearchInput value={q} onChange={setQ} placeholder="Search dishes…" />
        </div>
        <Table
          rows={shown}
          onRowClick={
            editable
              ? (r: any) =>
                  setEdit({
                    ...r,
                    categoryId: r.categoryId ?? "",
                    guestPrice: r.guestPrice ?? "",
                    costPrice: r.costPrice ?? "",
                    calories: r.calories ?? "",
                    prepMinutes: r.prepMinutes ?? "",
                    imageUrl: r.imageUrl ?? "",
                    description: r.description ?? "",
                    tags: r.tags.join(", "),
                    highlights: r.highlights.join("\n"),
                  })
              : undefined
          }
          columns={[
            {
              key: "name",
              header: "Dish",
              render: (r: any) => (
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 overflow-hidden rounded-xl bg-linear-to-br from-brand-50 to-amber-50">
                    {r.imageUrl ? (
                      <img
                        src={r.imageUrl}
                        className="h-full w-full object-cover"
                        alt=""
                      />
                    ) : (
                      <div className="grid h-full place-items-center">🍽️</div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-ink">
                      <FoodDot t={r.foodType} />
                      {r.name}
                    </div>
                    <div className="line-clamp-1 max-w-xs text-xs text-slate-500">
                      {r.description}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: "cat",
              header: "Category",
              render: (r: any) => r.category?.name ?? "—",
            },
            {
              key: "price",
              header: "Employee",
              align: "right",
              render: (r: any) => (
                <span className="font-semibold">{inr(r.price)}</span>
              ),
            },
            {
              key: "guestPrice",
              header: "Guest",
              align: "right",
              render: (r: any) =>
                r.guestPrice != null ? inr(r.guestPrice) : "—",
            },
            {
              key: "costPrice",
              header: "Food cost",
              align: "right",
              render: (r: any) =>
                r.costPrice != null ? inr(r.costPrice) : "—",
            },
            {
              key: "kcal",
              header: "kcal",
              align: "right",
              render: (r: any) => r.calories ?? "—",
            },
            {
              key: "active",
              header: "Active",
              render: (r: any) => (
                <div onClick={(e) => e.stopPropagation()}>
                  <Toggle
                    checked={r.isActive}
                    onChange={() => toggle(r)}
                    disabled={!editable}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>
      {editable && (
        <Card className="mt-6" title="Categories">
          <div className="flex flex-wrap gap-2">
            {cats?.items?.map((c: any) => (
              <Badge key={c.id} tone="brand" className="py-1 text-sm">
                {c.name}
              </Badge>
            ))}
          </div>
          <div className="mt-4 flex max-w-md gap-2">
            <Input
              placeholder="New category"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
            />
            <Button variant="secondary" onClick={addCat}>
              Add
            </Button>
          </div>
        </Card>
      )}
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        size="lg"
        title={edit?.id ? "Edit dish" : "Add dish"}
        footer={
          <>
            <Button variant="outline" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button loading={save.isPending} onClick={() => save.mutate(edit)}>
              Save
            </Button>
          </>
        }
      >
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Dish name *" className="sm:col-span-2">
              <Input
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </Field>
            <Field label="Category">
              <Select
                value={edit.categoryId}
                onChange={(e) =>
                  setEdit({ ...edit, categoryId: e.target.value })
                }
              >
                <option value="">—</option>
                {cats?.items?.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Type">
              <Select
                value={edit.foodType}
                onChange={(e) => setEdit({ ...edit, foodType: e.target.value })}
              >
                {FOOD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {titleCase(t)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Employee price (₹) *">
              <Input
                type="number"
                value={edit.price}
                onChange={(e) => setEdit({ ...edit, price: e.target.value })}
              />
            </Field>
            <Field label="Guest price (₹)" hint="Defaults to employee price">
              <Input
                type="number"
                value={edit.guestPrice}
                onChange={(e) =>
                  setEdit({ ...edit, guestPrice: e.target.value })
                }
              />
            </Field>
            <Field label="Food cost (₹)" hint="Used for margin reports">
              <Input
                type="number"
                value={edit.costPrice}
                onChange={(e) =>
                  setEdit({ ...edit, costPrice: e.target.value })
                }
              />
            </Field>
            <Field label="Calories">
              <Input
                type="number"
                value={edit.calories}
                onChange={(e) => setEdit({ ...edit, calories: e.target.value })}
              />
            </Field>
            <Field
              label="Image URL"
              className="sm:col-span-2"
              hint="Paste a link to the dish photo (shown in POS and employee app)"
            >
              <Input
                value={edit.imageUrl}
                onChange={(e) => setEdit({ ...edit, imageUrl: e.target.value })}
              />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea
                value={edit.description}
                onChange={(e) =>
                  setEdit({ ...edit, description: e.target.value })
                }
              />
            </Field>
            <Field label="Tags" hint="Comma separated — e.g. Light, High Fibre">
              <Input
                value={edit.tags}
                onChange={(e) => setEdit({ ...edit, tags: e.target.value })}
              />
            </Field>
            <Field label="Prep time (min)">
              <Input
                type="number"
                value={edit.prepMinutes}
                onChange={(e) =>
                  setEdit({ ...edit, prepMinutes: e.target.value })
                }
              />
            </Field>
            <Field
              label="Highlights"
              className="sm:col-span-2"
              hint="One per line — shown on the dish details screen"
            >
              <Textarea
                value={edit.highlights}
                onChange={(e) =>
                  setEdit({ ...edit, highlights: e.target.value })
                }
              />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ sessions */
function Sessions() {
  const { canteenId, can } = useAuth();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<any>(null);
  const { data: canteens } = useQuery({
    queryKey: ["canteens"],
    queryFn: () => api.get("/tenant/canteens"),
  });
  const canteen = canteens?.find((c: any) => c.id === canteenId);
  const save = useMutation({
    mutationFn: (v: any) => {
      const body = {
        name: v.name,
        startTime: v.startTime,
        endTime: v.endTime,
        optInCutoff: v.optInCutoff || null,
        employeePrice: Number(v.employeePrice),
        companySubsidy: Number(v.companySubsidy),
        guestPrice: Number(v.guestPrice),
        mealsPerDay: Number(v.mealsPerDay),
        sortOrder: Number(v.sortOrder ?? 0),
        isActive: v.isActive,
      };
      return v.id
        ? api.patch(`/tenant/canteens/${canteenId}/sessions/${v.id}`, body)
        : api.post(`/tenant/canteens/${canteenId}/sessions`, body);
    },
    onSuccess: () => {
      toast.success("Session saved");
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["canteens"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const editable = can("OWNER", "MANAGER");
  return (
    <>
      <Card
        padded={false}
        title={
          <div>
            <h3 className="font-bold">Meal sessions & pricing</h3>
            <p className="text-xs text-slate-500">
              Fixed-meal price split between employee and company. Used for QR,
              biometric and counter serving.
            </p>
          </div>
        }
        actions={
          editable && (
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() =>
                setEdit({
                  name: "",
                  startTime: "12:00",
                  endTime: "14:00",
                  optInCutoff: "",
                  employeePrice: 0,
                  companySubsidy: 0,
                  guestPrice: 0,
                  mealsPerDay: 1,
                  sortOrder: (canteen?.sessions?.length ?? 0) + 1,
                  isActive: true,
                })
              }
            >
              Add session
            </Button>
          )
        }
      >
        <Table
          rows={canteen?.sessions ?? []}
          onRowClick={
            editable
              ? (r: any) => setEdit({ ...r, optInCutoff: r.optInCutoff ?? "" })
              : undefined
          }
          columns={[
            {
              key: "name",
              header: "Session",
              render: (r: any, i) => (
                <div className="flex items-center gap-2 font-semibold">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: sessionColor(r.name, i) }}
                  />
                  {r.name}
                </div>
              ),
            },
            {
              key: "time",
              header: "Timing",
              render: (r: any) => (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {r.startTime} - {r.endTime}
                </span>
              ),
            },
            {
              key: "cut",
              header: "Opt-in closes",
              render: (r: any) => r.optInCutoff ?? "—",
            },
            {
              key: "emp",
              header: "Employee pays",
              align: "right",
              render: (r: any) => inr(r.employeePrice),
            },
            {
              key: "sub",
              header: "Company pays",
              align: "right",
              render: (r: any) => inr(r.companySubsidy),
            },
            {
              key: "guest",
              header: "Guest price",
              align: "right",
              render: (r: any) => inr(r.guestPrice),
            },
            {
              key: "mpd",
              header: "Meals/day",
              align: "center",
              render: (r: any) => r.mealsPerDay,
            },
            {
              key: "st",
              header: "Status",
              render: (r: any) => (
                <Badge tone={r.isActive ? "green" : "slate"}>
                  {r.isActive ? "Active" : "Off"}
                </Badge>
              ),
            },
            {
              key: "e",
              header: "",
              render: () =>
                editable && <Pencil className="h-4 w-4 text-slate-400" />,
            },
          ]}
        />
      </Card>
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? "Edit session" : "Add session"}
        footer={
          <Button loading={save.isPending} onClick={() => save.mutate(edit)}>
            Save
          </Button>
        }
      >
        {edit && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name" className="sm:col-span-3">
              <Input
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </Field>
            <Field label="Starts">
              <Input
                type="time"
                value={edit.startTime}
                onChange={(e) =>
                  setEdit({ ...edit, startTime: e.target.value })
                }
              />
            </Field>
            <Field label="Ends">
              <Input
                type="time"
                value={edit.endTime}
                onChange={(e) => setEdit({ ...edit, endTime: e.target.value })}
              />
            </Field>
            <Field label="Opt-in closes">
              <Input
                type="time"
                value={edit.optInCutoff}
                onChange={(e) =>
                  setEdit({ ...edit, optInCutoff: e.target.value })
                }
              />
            </Field>
            <Field label="Employee pays (₹)">
              <Input
                type="number"
                value={edit.employeePrice}
                onChange={(e) =>
                  setEdit({ ...edit, employeePrice: e.target.value })
                }
              />
            </Field>
            <Field label="Company pays (₹)">
              <Input
                type="number"
                value={edit.companySubsidy}
                onChange={(e) =>
                  setEdit({ ...edit, companySubsidy: e.target.value })
                }
              />
            </Field>
            <Field label="Guest price (₹)">
              <Input
                type="number"
                value={edit.guestPrice}
                onChange={(e) =>
                  setEdit({ ...edit, guestPrice: e.target.value })
                }
              />
            </Field>
            <Field label="Meals per employee / day">
              <Input
                type="number"
                min={1}
                value={edit.mealsPerDay}
                onChange={(e) =>
                  setEdit({ ...edit, mealsPerDay: e.target.value })
                }
              />
            </Field>
            <Field label="Order">
              <Input
                type="number"
                value={edit.sortOrder}
                onChange={(e) =>
                  setEdit({ ...edit, sortOrder: e.target.value })
                }
              />
            </Field>
            <div className="flex items-end">
              <Toggle
                checked={edit.isActive}
                onChange={(v) => setEdit({ ...edit, isActive: v })}
                label="Active"
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

export default function MenuPage() {
  const [tab, setTab] = useState<"planner" | "catalog" | "sessions">("planner");
  const [qr, setQr] = useState(false);
  return (
    <>
      <PageHeader
        title="Menu management"
        subtitle="Plan the week, manage dishes and set meal timings & pricing."
        actions={
          <Button
            icon={<QrCode className="h-4 w-4" />}
            onClick={() => setQr(true)}
          >
            Generate daily QR
          </Button>
        }
      />
      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        items={[
          { value: "planner", label: "Weekly planner" },
          { value: "catalog", label: "Dish catalog" },
          { value: "sessions", label: "Sessions & pricing" },
        ]}
      />
      {tab === "planner" && <Planner />}
      {tab === "catalog" && <Catalog />}
      {tab === "sessions" && <Sessions />}
      <DailyQrModal open={qr} onClose={() => setQr(false)} />
    </>
  );
}

// keep tree-shaking quiet
void useMemo;
