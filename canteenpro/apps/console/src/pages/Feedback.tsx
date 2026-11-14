import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Star, MessageSquareReply } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dt } from "@/lib/format";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  PageHeader,
  Select,
  Stat,
} from "@/components/ui";

const Stars = ({ n }: { n: number }) => (
  <span className="flex">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i <= n ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
      />
    ))}
  </span>
);

export default function Feedback() {
  const { canteenId } = useAuth();
  const qc = useQueryClient();
  const [max, setMax] = useState("");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const { data } = useQuery({
    queryKey: ["feedback", canteenId, max],
    queryFn: () =>
      api.get("/tenant/feedback", { canteenId, maxRating: max, pageSize: 100 }),
  });
  const reply = useMutation({
    mutationFn: (id: string) =>
      api.post(`/tenant/feedback/${id}/reply`, { reply: replies[id] }),
    onSuccess: () => {
      toast.success("Reply sent to employee");
      qc.invalidateQueries({ queryKey: ["feedback"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <>
      <PageHeader
        title="Feedback"
        subtitle="Ratings and comments from employees in the app. Reply to close the loop."
        actions={
          <Select
            className="w-44"
            value={max}
            onChange={(e) => setMax(e.target.value)}
          >
            <option value="">All ratings</option>
            <option value="2">2★ and below</option>
            <option value="3">3★ and below</option>
          </Select>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Stat
          label="Average rating"
          value={
            <span className="flex items-center gap-2">
              {(data?.avg ?? 0).toFixed(1)}{" "}
              <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
            </span>
          }
          tone="amber"
        />
        <Stat label="Responses" value={data?.total ?? 0} />
      </div>
      <Card padded={false}>
        {!data?.items?.length ? (
          <Empty
            title="No feedback yet"
            text="Employees can rate meals from the app's history screen."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {data.items.map((f: any) => (
              <div key={f.id} className="flex gap-4 p-5">
                <Avatar name={f.employee?.name ?? "Anonymous"} />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold">
                      {f.employee?.name ?? "Anonymous"}
                    </span>
                    <Stars n={f.rating} />
                    {f.menuItem && (
                      <span className="text-xs text-slate-500">
                        on {f.menuItem.name}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {dt(f.createdAt)}
                    </span>
                  </div>
                  {f.comment && (
                    <p className="mt-1 text-sm text-slate-700">{f.comment}</p>
                  )}
                  {f.reply ? (
                    <div className="mt-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900">
                      <b>Your reply:</b> {f.reply}
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <Input
                        className="h-9"
                        placeholder="Write a reply…"
                        value={replies[f.id] ?? ""}
                        onChange={(e) =>
                          setReplies({ ...replies, [f.id]: e.target.value })
                        }
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<MessageSquareReply className="h-4 w-4" />}
                        disabled={!replies[f.id]}
                        onClick={() => reply.mutate(f.id)}
                      >
                        Reply
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
