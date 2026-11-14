import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Send, Megaphone } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dt, titleCase } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
  statusTone,
} from "@/components/ui";

export default function Announcements() {
  const { canteenId } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({
    audience: "CANTEEN",
    targetId: "",
    title: "",
    body: "",
    type: "GENERAL",
  });
  const { data: list = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/tenant/notifications"),
  });
  const { data: depts } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get("/tenant/departments", { pageSize: 200 }),
  });
  const send = useMutation({
    mutationFn: () =>
      api.post("/tenant/notifications", {
        ...f,
        canteenId,
        targetId: f.targetId || null,
      }),
    onSuccess: (n: any) => {
      toast.success(
        n.pushStatus === "SENT"
          ? "Announcement sent"
          : "Saved in app inbox (push not configured)",
      );
      setF({ ...f, title: "", body: "" });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const templates = [
    {
      t: "Today's lunch menu is live 🍽️",
      b: "Check the app for today's menu and opt in before the cut-off.",
      type: "MENU",
    },
    {
      t: "Canteen closed tomorrow",
      b: "The canteen will remain closed tomorrow due to maintenance. Sorry for the inconvenience.",
      type: "SYSTEM",
    },
    {
      t: "Festival special 🎉",
      b: "Special festive thali at lunch today!",
      type: "MENU",
    },
  ];
  return (
    <>
      <PageHeader
        title="Announcements"
        subtitle="Push notifications + in-app inbox for your employees."
      />
      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-2 h-fit" title="New announcement">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <button
                  key={t.t}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                  onClick={() =>
                    setF({ ...f, title: t.t, body: t.b, type: t.type })
                  }
                >
                  {t.t}
                </button>
              ))}
            </div>
            <Field label="Send to">
              <Select
                value={f.audience}
                onChange={(e) =>
                  setF({ ...f, audience: e.target.value, targetId: "" })
                }
              >
                <option value="CANTEEN">Employees of this canteen</option>
                <option value="ALL_EMPLOYEES">
                  All employees (all canteens)
                </option>
                <option value="DEPARTMENT">A department</option>
              </Select>
            </Field>
            {f.audience === "DEPARTMENT" && (
              <Field label="Department">
                <Select
                  value={f.targetId}
                  onChange={(e) => setF({ ...f, targetId: e.target.value })}
                >
                  <option value="">Select…</option>
                  {depts?.items?.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Type">
              <Select
                value={f.type}
                onChange={(e) => setF({ ...f, type: e.target.value })}
              >
                {["GENERAL", "MENU", "REMINDER", "SYSTEM"].map((t) => (
                  <option key={t} value={t}>
                    {titleCase(t)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Title">
              <Input
                maxLength={80}
                value={f.title}
                onChange={(e) => setF({ ...f, title: e.target.value })}
              />
            </Field>
            <Field label="Message">
              <Textarea
                maxLength={400}
                value={f.body}
                onChange={(e) => setF({ ...f, body: e.target.value })}
              />
            </Field>
            <Button
              className="w-full"
              icon={<Send className="h-4 w-4" />}
              disabled={f.title.length < 2 || f.body.length < 2}
              loading={send.isPending}
              onClick={() => send.mutate()}
            >
              Send
            </Button>
          </div>
        </Card>
        <Card className="xl:col-span-3" title="Sent" padded={false}>
          {!list.length ? (
            <Empty
              icon={<Megaphone className="h-6 w-6" />}
              title="No announcements yet"
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {list.map((n: any) => (
                <div key={n.id} className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="brand">{titleCase(n.type)}</Badge>
                    <span className="font-semibold">{n.title}</span>
                    <span className="ml-auto text-xs text-slate-400">
                      {dt(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                  <div className="mt-2 flex gap-2 text-xs text-slate-500">
                    <span>{titleCase(n.audience)}</span>·
                    <Badge tone={statusTone(n.pushStatus)}>
                      Push {titleCase(n.pushStatus ?? "n/a")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
