"use client";

import { useState } from "react";

export default function VerifyPage() {
  const [schoolEmail, setSchoolEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string>("");

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Requesting…");
    const res = await fetch("/api/verification/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolEmail }),
    });
    const json = await res.json();
    setStatus(res.ok ? "Code sent if eligible. Check your inbox." : `Error: ${json.error}`);
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Verifying…");
    const res = await fetch("/api/verification/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolEmail, code }),
    });
    const json = await res.json();
    setStatus(res.ok ? "Verified." : `Error: ${json.error}`);
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-semibold">Verify your school email</h1>
      <p className="mt-2 text-sm text-neutral-600">
        This proves mailbox control only. It is not SSO and does not prove enrollment.
      </p>
      <form onSubmit={requestCode} className="mt-6 space-y-3">
        <label className="block text-sm">
          School email
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={schoolEmail}
            onChange={(e) => setSchoolEmail(e.target.value)}
            type="email"
            required
          />
        </label>
        <button className="rounded bg-neutral-900 px-4 py-2 text-white" type="submit">
          Send code
        </button>
      </form>
      <form onSubmit={submitCode} className="mt-6 space-y-3">
        <label className="block text-sm">
          Code
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            required
          />
        </label>
        <button className="rounded bg-neutral-900 px-4 py-2 text-white" type="submit">
          Verify
        </button>
      </form>
      {status ? <p className="mt-4 text-sm">{status}</p> : null}
    </main>
  );
}
