import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { marked } from "marked";
import { Plus, Eye, Code2, Star, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { dOnly, dt, inr, titleCase } from "@/lib/format";
import CrudPage, {
  FormFields,
  toBody,
  type FieldDef,
} from "@/components/CrudPage";
import {
  Badge,
  Button,
  Card,
  ConfirmButton,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Table,
  Tabs,
  Textarea,
  statusTone,
} from "@/components/ui";

const WEBSITE = import.meta.env.VITE_WEBSITE_URL || "http://localhost:3000";

export const PlansPage = () => (
  <CrudPage
    cfg={{
      title: "Plans",
      subtitle:
        "Pricing shown on the website and in the canteen Billing page. Limits are enforced by the API (-1 = unlimited).",
      endpoint: "/platform/plans",
      queryKey: "p-plans",
      addLabel: "Add plan",
      noDelete: true,
      defaults: {
        trialDays: 14,
        maxCanteens: 1,
        maxEmployees: 200,
        maxStaffUsers: 3,
        isActive: true,
        features: {},
        highlights: [],
      },
      columns: [
        {
          key: "name",
          header: "Plan",
          render: (r) => (
            <div className="flex items-center gap-2 font-semibold">
              {r.name}
              {r.isPopular && (
                <Badge tone="violet">
                  <Sparkles className="h-3 w-3" />
                  Popular
                </Badge>
              )}
            </div>
          ),
        },
        {
          key: "code",
          header: "Code",
          render: (r) => <span className="font-mono text-xs">{r.code}</span>,
        },
        {
          key: "pm",
          header: "Monthly",
          align: "right",
          render: (r) => inr(r.priceMonthly),
        },
        {
          key: "py",
          header: "Yearly",
          align: "right",
          render: (r) => inr(r.priceYearly),
        },
        {
          key: "l",
          header: "Limits",
          render: (r) => (
            <span className="text-xs">
              {r.maxCanteens < 0 ? "∞" : r.maxCanteens} canteens ·{" "}
              {r.maxEmployees < 0 ? "∞" : r.maxEmployees} emp ·{" "}
              {r.maxStaffUsers < 0 ? "∞" : r.maxStaffUsers} staff
            </span>
          ),
        },
        { key: "t", header: "Trial", render: (r) => `${r.trialDays} days` },
        {
          key: "s",
          header: "Status",
          render: (r) => (
            <Badge tone={r.isActive ? "green" : "slate"}>
              {r.isActive ? "Active" : "Hidden"}
            </Badge>
          ),
        },
      ],
      fields: [
        { name: "name", label: "Name", required: true },
        {
          name: "code",
          label: "Code (url-safe)",
          required: true,
          hint: "e.g. growth — used in signup links",
        },
        { name: "tagline", label: "Tagline", span: 2 },
        {
          name: "priceMonthly",
          label: "Monthly price (₹)",
          type: "number",
          required: true,
        },
        {
          name: "priceYearly",
          label: "Yearly price (₹)",
          type: "number",
          required: true,
        },
        { name: "maxCanteens", label: "Max canteens", type: "number" },
        { name: "maxEmployees", label: "Max employees", type: "number" },
        { name: "maxStaffUsers", label: "Max staff users", type: "number" },
        { name: "trialDays", label: "Trial days", type: "number" },
        { name: "sortOrder", label: "Sort order", type: "number" },
        { name: "features", label: "Included features", type: "features" },
        {
          name: "highlights",
          label: "Website bullet points (one per line)",
          type: "lines",
        },
        {
          name: "isPopular",
          label: "Highlight as most popular",
          type: "toggle",
        },
        { name: "isActive", label: "Visible / purchasable", type: "toggle" },
      ],
    }}
  />
);

export const CouponsPage = () => (
  <CrudPage
    cfg={{
      title: "Coupons",
      subtitle: "Discount codes customers can apply at checkout.",
      endpoint: "/platform/coupons",
      queryKey: "p-coupons",
      addLabel: "Add coupon",
      defaults: { isActive: true },
      modalSize: "md",
      columns: [
        {
          key: "code",
          header: "Code",
          render: (r) => <span className="font-mono font-bold">{r.code}</span>,
        },
        {
          key: "d",
          header: "Discount",
          render: (r) => (r.percentOff ? `${r.percentOff}%` : inr(r.amountOff)),
        },
        {
          key: "u",
          header: "Used",
          render: (r) =>
            `${r.redeemedCount}${r.maxRedemptions ? " / " + r.maxRedemptions : ""}`,
        },
        {
          key: "v",
          header: "Valid until",
          render: (r) => (r.validUntil ? dOnly(r.validUntil) : "No expiry"),
        },
        {
          key: "s",
          header: "Status",
          render: (r) => (
            <Badge tone={r.isActive ? "green" : "slate"}>
              {r.isActive ? "Active" : "Off"}
            </Badge>
          ),
        },
      ],
      fields: [
        { name: "code", label: "Code", required: true },
        { name: "description", label: "Description" },
        {
          name: "percentOff",
          label: "% off",
          type: "number",
          hint: "Use either % or amount",
        },
        { name: "amountOff", label: "Amount off (₹)", type: "number" },
        { name: "maxRedemptions", label: "Max redemptions", type: "number" },
        { name: "validUntil", label: "Valid until", type: "date" },
        { name: "isActive", label: "Active", type: "toggle" },
      ],
    }}
  />
);

export const LeadsPage = () => {
  const [status, setStatus] = useState("");
  return (
    <CrudPage
      cfg={{
        title: "Leads",
        subtitle: "Contact & demo requests from the website.",
        endpoint: "/platform/leads",
        queryKey: "p-leads",
        addLabel: "Add lead",
        query: { status },
        filters: (
          <Select
            className="w-48"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {["NEW", "CONTACTED", "DEMO_SCHEDULED", "CONVERTED", "LOST"].map(
              (s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ),
            )}
          </Select>
        ),
        columns: [
          {
            key: "n",
            header: "Lead",
            render: (r) => (
              <div>
                <div className="font-semibold">{r.name}</div>
                <div className="text-xs text-slate-500">
                  {r.email} · {r.phone ?? ""}
                </div>
              </div>
            ),
          },
          {
            key: "company",
            header: "Company",
            render: (r) => (
              <div>
                {r.company ?? "—"}
                <div className="text-xs text-slate-500">
                  {r.employees ? `${r.employees} employees` : ""}
                </div>
              </div>
            ),
          },
          {
            key: "type",
            header: "Type",
            render: (r) => (
              <Badge tone={r.type === "demo" ? "violet" : "sky"}>
                {titleCase(r.type)}
              </Badge>
            ),
          },
          {
            key: "message",
            header: "Message",
            render: (r) => (
              <span className="line-clamp-2 max-w-xs text-xs text-slate-600">
                {r.message}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (r) => (
              <Badge tone={statusTone(r.status)}>{titleCase(r.status)}</Badge>
            ),
          },
          { key: "c", header: "Received", render: (r) => dt(r.createdAt) },
        ],
        fields: [
          { name: "name", label: "Name", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "phone", label: "Phone" },
          { name: "company", label: "Company" },
          { name: "employees", label: "Employees" },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: [
              "NEW",
              "CONTACTED",
              "DEMO_SCHEDULED",
              "CONVERTED",
              "LOST",
            ].map((s) => ({ value: s, label: titleCase(s) })),
          },
          { name: "message", label: "Message", type: "textarea" },
          { name: "notes", label: "Internal notes", type: "textarea" },
        ],
      }}
    />
  );
};

export const PagesPage = () => (
  <CrudPage
    cfg={{
      title: "Website pages",
      subtitle:
        "Legal & static pages rendered on the website at /p/<slug> (privacy-policy, terms, refund-policy…).",
      endpoint: "/platform/pages",
      queryKey: "p-pages",
      addLabel: "Add page",
      defaults: { status: "PUBLISHED" },
      modalSize: "xl",
      columns: [
        { key: "title", header: "Title", render: (r) => <b>{r.title}</b> },
        {
          key: "slug",
          header: "URL",
          render: (r) => (
            <a
              className="text-brand-700 hover:underline"
              href={`${WEBSITE}/p/${r.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              /p/{r.slug}
            </a>
          ),
        },
        {
          key: "status",
          header: "Status",
          render: (r) => (
            <Badge tone={statusTone(r.status)}>{titleCase(r.status)}</Badge>
          ),
        },
        { key: "u", header: "Updated", render: (r) => dt(r.updatedAt) },
      ],
      fields: [
        { name: "title", label: "Title", required: true },
        { name: "slug", label: "Slug", required: true },
        { name: "seoDescription", label: "SEO description", span: 2 },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "PUBLISHED", label: "Published" },
            { value: "DRAFT", label: "Draft" },
          ],
        },
        { name: "content", label: "Content (Markdown)", type: "markdown" },
      ],
    }}
  />
);

export const TestimonialsPage = () => (
  <CrudPage
    cfg={{
      title: "Testimonials",
      subtitle:
        "Add only genuine quotes from real customers who agreed to be featured. The website hides this section when empty.",
      endpoint: "/platform/testimonials",
      queryKey: "p-testimonials",
      addLabel: "Add testimonial",
      defaults: { rating: 5, isActive: true },
      columns: [
        {
          key: "n",
          header: "Customer",
          render: (r) => (
            <div>
              <div className="font-semibold">{r.name}</div>
              <div className="text-xs text-slate-500">
                {[r.role, r.company].filter(Boolean).join(", ")}
              </div>
            </div>
          ),
        },
        {
          key: "q",
          header: "Quote",
          render: (r) => (
            <span className="line-clamp-2 max-w-md text-sm">{r.quote}</span>
          ),
        },
        {
          key: "r",
          header: "Rating",
          render: (r) => (
            <span className="flex">
              {Array.from({ length: r.rating }).map((_, i) => (
                <Star
                  key={i}
                  className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                />
              ))}
            </span>
          ),
        },
        {
          key: "s",
          header: "Shown",
          render: (r) => (
            <Badge tone={r.isActive ? "green" : "slate"}>
              {r.isActive ? "Yes" : "No"}
            </Badge>
          ),
        },
      ],
      fields: [
        { name: "name", label: "Name", required: true },
        { name: "role", label: "Role" },
        { name: "company", label: "Company" },
        { name: "rating", label: "Rating (1-5)", type: "number" },
        { name: "avatarUrl", label: "Photo URL", span: 2 },
        { name: "quote", label: "Quote", type: "textarea", required: true },
        { name: "sortOrder", label: "Sort order", type: "number" },
        { name: "isActive", label: "Show on website", type: "toggle" },
      ],
    }}
  />
);

export const FaqsPage = () => (
  <CrudPage
    cfg={{
      title: "FAQs",
      subtitle:
        "Shown on the home, pricing and FAQ pages (also used for FAQ rich results in Google).",
      endpoint: "/platform/faqs",
      queryKey: "p-faqs",
      addLabel: "Add FAQ",
      defaults: { group: "general", isActive: true },
      columns: [
        { key: "q", header: "Question", render: (r) => <b>{r.question}</b> },
        { key: "g", header: "Group", render: (r) => <Badge>{r.group}</Badge> },
        { key: "o", header: "Order", render: (r) => r.sortOrder },
        {
          key: "s",
          header: "Shown",
          render: (r) => (
            <Badge tone={r.isActive ? "green" : "slate"}>
              {r.isActive ? "Yes" : "No"}
            </Badge>
          ),
        },
      ],
      fields: [
        { name: "question", label: "Question", required: true, span: 2 },
        { name: "answer", label: "Answer", type: "textarea", required: true },
        {
          name: "group",
          label: "Group",
          type: "select",
          options: ["general", "product", "pricing"].map((g) => ({
            value: g,
            label: titleCase(g),
          })),
        },
        { name: "sortOrder", label: "Sort order", type: "number" },
        { name: "isActive", label: "Show", type: "toggle" },
      ],
    }}
  />
);

/* ------------------------------------------------------------------ Blog */
const postFields = (cats: any[]): FieldDef[] => [
  { name: "title", label: "Title", required: true, span: 2 },
  { name: "slug", label: "Slug", hint: "Auto from title if empty" },
  {
    name: "categoryId",
    label: "Category",
    type: "select",
    options: cats.map((c) => ({ value: c.id, label: c.name })),
  },
  { name: "excerpt", label: "Excerpt", type: "textarea" },
  { name: "coverImage", label: "Cover image URL", span: 2 },
  { name: "tags", label: "Tags", type: "tags", hint: "Comma separated" },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "DRAFT", label: "Draft" },
      { value: "PUBLISHED", label: "Published" },
    ],
  },
  { name: "seoTitle", label: "SEO title", hint: "≤ 60 characters" },
  {
    name: "seoDescription",
    label: "SEO description",
    hint: "≤ 160 characters",
  },
];

export function BlogPage() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<any>(null);
  const [view, setView] = useState<"write" | "preview">("write");
  const [newCat, setNewCat] = useState("");
  const { data: posts = [] } = useQuery({
    queryKey: ["p-posts"],
    queryFn: () => api.get("/platform/blog/posts"),
  });
  const { data: cats } = useQuery({
    queryKey: ["p-cats"],
    queryFn: () => api.get("/platform/blog/categories", { pageSize: 100 }),
  });
  const fields = postFields(cats?.items ?? []);
  const open = async (id?: string) => {
    setView("write");
    setEdit(
      id
        ? await api.get(`/platform/blog/posts/${id}`)
        : {
            status: "DRAFT",
            content: "## Introduction\n\nWrite your article here…",
            tags: [],
          },
    );
  };
  const save = useMutation({
    mutationFn: (v: any) => {
      const body = {
        ...toBody(fields, v),
        content: v.content,
        slug: v.slug || undefined,
      };
      return v.id
        ? api.patch(`/platform/blog/posts/${v.id}`, body)
        : api.post("/platform/blog/posts", body);
    },
    onSuccess: () => {
      toast.success("Post saved");
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["p-posts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <>
      <PageHeader
        title="Blog"
        subtitle="SEO articles that bring canteen owners to your website."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => open()}>
            New post
          </Button>
        }
      />
      <Card padded={false}>
        <Table
          rows={posts}
          onRowClick={(r: any) => open(r.id)}
          columns={[
            {
              key: "t",
              header: "Title",
              render: (r: any) => (
                <div>
                  <div className="font-semibold text-ink">{r.title}</div>
                  <div className="text-xs text-slate-500">/blog/{r.slug}</div>
                </div>
              ),
            },
            {
              key: "c",
              header: "Category",
              render: (r: any) => r.category?.name ?? "—",
            },
            {
              key: "s",
              header: "Status",
              render: (r: any) => (
                <Badge tone={statusTone(r.status)}>{titleCase(r.status)}</Badge>
              ),
            },
            {
              key: "p",
              header: "Published",
              render: (r: any) => dOnly(r.publishedAt),
            },
            {
              key: "r",
              header: "Read",
              render: (r: any) => `${r.readingMinutes} min`,
            },
            {
              key: "v",
              header: "",
              render: (r: any) =>
                r.status === "PUBLISHED" && (
                  <a
                    onClick={(e) => e.stopPropagation()}
                    href={`${WEBSITE}/blog/${r.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-brand-700"
                  >
                    View ↗
                  </a>
                ),
            },
            {
              key: "x",
              header: "",
              render: (r: any) => (
                <div onClick={(e) => e.stopPropagation()}>
                  <ConfirmButton
                    size="sm"
                    variant="ghost"
                    message="Delete this post?"
                    onConfirm={async () => {
                      await api.del(`/platform/blog/posts/${r.id}`);
                      qc.invalidateQueries({ queryKey: ["p-posts"] });
                    }}
                  >
                    Delete
                  </ConfirmButton>
                </div>
              ),
            },
          ]}
        />
      </Card>
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
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="New category"
          />
          <Button
            variant="secondary"
            onClick={async () => {
              if (!newCat) return;
              await api.post("/platform/blog/categories", { name: newCat });
              setNewCat("");
              qc.invalidateQueries({ queryKey: ["p-cats"] });
            }}
          >
            Add
          </Button>
        </div>
      </Card>
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        size="xl"
        title={edit?.id ? "Edit post" : "New post"}
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
          <div className="space-y-5">
            <FormFields fields={fields} value={edit} onChange={setEdit} />
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  Content (Markdown)
                </span>
                <Tabs
                  value={view}
                  onChange={setView}
                  items={[
                    {
                      value: "write",
                      label: (
                        <span className="flex items-center gap-1">
                          <Code2 className="h-3.5 w-3.5" />
                          Write
                        </span>
                      ),
                    },
                    {
                      value: "preview",
                      label: (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
              {view === "write" ? (
                <Textarea
                  className="min-h-[420px] font-mono text-xs"
                  value={edit.content}
                  onChange={(e) =>
                    setEdit({ ...edit, content: e.target.value })
                  }
                />
              ) : (
                <div
                  className="prose-preview min-h-[420px] rounded-xl border border-slate-200 p-5 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: marked.parse(edit.content ?? "") as string,
                  }}
                />
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ Admin users */
export function UsersPage() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<any>(null);
  const { data = [] } = useQuery({
    queryKey: ["p-users"],
    queryFn: () => api.get("/platform/users"),
  });
  const save = useMutation({
    mutationFn: (v: any) =>
      v.id
        ? api.patch(`/platform/users/${v.id}`, {
            name: v.name,
            role: v.role,
            isActive: v.isActive,
            ...(v.password ? { password: v.password } : {}),
          })
        : api.post("/platform/users", v),
    onSuccess: () => {
      toast.success("Saved");
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["p-users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <>
      <PageHeader
        title="Admin users"
        subtitle="People who can access this Super Admin panel."
        actions={
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() =>
              setEdit({
                name: "",
                email: "",
                password: "",
                role: "SUPPORT",
                isActive: true,
              })
            }
          >
            Add admin
          </Button>
        }
      />
      <Card padded={false}>
        <Table
          rows={data}
          onRowClick={(r: any) => setEdit({ ...r, password: "" })}
          columns={[
            {
              key: "n",
              header: "Name",
              render: (r: any) => (
                <div>
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-xs text-slate-500">{r.email}</div>
                </div>
              ),
            },
            {
              key: "r",
              header: "Role",
              render: (r: any) => (
                <Badge tone="brand">{titleCase(r.role)}</Badge>
              ),
            },
            {
              key: "l",
              header: "Last login",
              render: (r: any) => dt(r.lastLoginAt),
            },
            {
              key: "s",
              header: "Status",
              render: (r: any) => (
                <Badge tone={r.isActive ? "green" : "slate"}>
                  {r.isActive ? "Active" : "Disabled"}
                </Badge>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? "Edit admin" : "Add admin"}
        footer={
          <Button loading={save.isPending} onClick={() => save.mutate(edit)}>
            Save
          </Button>
        }
      >
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                disabled={!!edit.id}
                value={edit.email}
                onChange={(e) => setEdit({ ...edit, email: e.target.value })}
              />
            </Field>
            <Field
              label="Role"
              hint="Support: customers & payments. Content editor: website only."
            >
              <Select
                value={edit.role}
                onChange={(e) => setEdit({ ...edit, role: e.target.value })}
              >
                {["SUPER_ADMIN", "SUPPORT", "CONTENT_EDITOR"].map((r) => (
                  <option key={r} value={r}>
                    {titleCase(r)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={edit.id ? "New password (optional)" : "Password"}>
              <Input
                type="password"
                value={edit.password}
                onChange={(e) => setEdit({ ...edit, password: e.target.value })}
              />
            </Field>
            {edit.id && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={edit.isActive}
                  onChange={(e) =>
                    setEdit({ ...edit, isActive: e.target.checked })
                  }
                />{" "}
                Active
              </label>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
