"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { apiFetch } from "./api-client";

function ReportBlockForm({ kind, targetId, targetName }: { kind: "block" | "report"; targetId: string; targetName: string }) {
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [open, setOpen] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const result = await apiFetch(`/api/${kind}s`, {
      method: "POST",
      body: JSON.stringify({ targetId, reason }),
    });
    if ("error" in result) {
      setStatus("error");
      return;
    }
    setStatus("done");
    setOpen(false);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {kind === "block" ? "Block" : "Report"}
      </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {kind === "block" ? `Block ${targetName}?` : `Report ${targetName}?`}
          </DialogTitle>
          <DialogDescription>
            {kind === "block"
              ? "Blocking is enforced for your account. They cannot send new introductions to you."
              : "Reports go to community review. No employment or payment dispute tooling — collaboration conduct only."}
          </DialogDescription>
        </DialogHeader>
        {status === "done" ? (
          <p role="status" className="text-sm text-green-700">
            {kind === "block" ? "Blocked. This takes effect immediately." : "Reported. Thank you — review is simulated in demo mode."}
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${kind}-reason-${targetId}`}>Reason (required)</Label>
              <Textarea
                id={`${kind}-reason-${targetId}`}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Brief, factual reason"
                maxLength={500}
              />
            </div>
            {status === "error" ? (
              <p role="alert" className="text-sm text-[#9e353c]">
                Service unavailable in demo mode — your entry was kept in this dialog. Try again when the API is connected.
              </p>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : kind === "block" ? "Confirm block" : "Submit report"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}

export function BlockReportDialogs({ targetId, targetName }: { targetId: string; targetName: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ReportBlockForm kind="block" targetId={targetId} targetName={targetName} />
      <ReportBlockForm kind="report" targetId={targetId} targetName={targetName} />
    </div>
  );
}
