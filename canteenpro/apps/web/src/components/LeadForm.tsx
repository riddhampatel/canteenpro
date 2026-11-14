"use client";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { post } from "@/lib/client";

export function LeadForm({ type = "contact" }: { type?: "contact" | "demo" }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");
  if (state === "done")
    return (
      <div className="rounded-3xl bg-leaf-50 p-8">
        <CheckCircle2 className="h-8 w-8 text-leaf" />
        <h3 className="mt-3 text-2xl font-bold">
          {type === "demo" ? "Demo request received" : "Message received"}
        </h3>
        <p className="mt-2 text-navy-600">
          We’ll get back to you within one working day. For anything urgent,
          message us on WhatsApp.
        </p>
      </div>
    );
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr("");
        setState("busy");
        const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<
          string,
          string
        >;
        try {
          await post("/public/leads", {
            ...f,
            type,
            source:
              typeof window !== "undefined"
                ? window.location.pathname
                : undefined,
          });
          setState("done");
        } catch (x: any) {
          setErr(x.message);
          setState("idle");
        }
      }}
    >
      <label>
        <span className="label">Your name</span>
        <input name="name" required minLength={2} className="field" />
      </label>
      <label>
        <span className="label">Work email</span>
        <input name="email" type="email" required className="field" />
      </label>
      <label>
        <span className="label">Phone</span>
        <input name="phone" className="field" placeholder="+91" />
      </label>
      <label>
        <span className="label">Company / canteen</span>
        <input name="company" className="field" />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Employees eating daily</span>
        <select name="employees" className="field">
          <option value="">Choose a range</option>
          {[
            "Under 100",
            "100–300",
            "300–1,000",
            "1,000–5,000",
            "More than 5,000",
          ].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </label>
      <label className="sm:col-span-2">
        <span className="label">
          {type === "demo" ? "What would you like to see?" : "How can we help?"}
        </span>
        <textarea name="message" rows={4} className="field h-auto py-3" />
      </label>
      {err && (
        <p className="text-sm font-semibold text-red-700 sm:col-span-2">
          {err}
        </p>
      )}
      <button className="btn-navy sm:col-span-2" disabled={state === "busy"}>
        {state === "busy"
          ? "Sending…"
          : type === "demo"
            ? "Request demo"
            : "Send message"}
      </button>
    </form>
  );
}
