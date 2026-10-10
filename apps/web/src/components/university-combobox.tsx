"use client";

import { useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function UniversityCombobox({
  value,
  onChange,
  options,
  myUniversity,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  myUniversity?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    return options.filter((u) => !q || u.toLowerCase().includes(q));
  }, [value, options]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div className="relative">
      <Label htmlFor="university-combo">University</Label>
      <div className="relative">
        <Input
          id="university-combo"
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Search universities or type @my-university"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, Math.max(filtered.length - 1, 0)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && open && filtered[active]) {
              e.preventDefault();
              pick(filtered[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="pr-10"
        />
        <button
          type="button"
          aria-label="Show university options"
          onClick={() => setOpen((o) => !o)}
          className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-md text-[#786989] hover:bg-[#f2eafe] hover:text-[#7541e9]"
        >
          <svg viewBox="0 0 12 12" aria-hidden="true" className={cn("size-3 transition-transform", open && "rotate-180")}>
            <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Universities"
          className="absolute right-0 left-0 z-40 mt-1.5 max-h-60 overflow-auto rounded-xl border border-[#e7dcef] bg-white p-1.5 shadow-xl"
        >
          {myUniversity ? (
            <li
              id={`${listId}-my`}
              role="option"
              aria-selected={value === "@my-university"}
              onMouseDown={(e) => {
                e.preventDefault();
                pick("@my-university");
              }}
              className="cursor-pointer rounded-lg px-2.5 py-2 text-sm hover:bg-[#f2eafe]"
            >
              <span className="font-semibold text-[#7541e9]">@my-university</span>
              <span className="block text-xs text-[#786989]">{myUniversity}</span>
            </li>
          ) : null}
          {filtered.length === 0 ? (
            <li className="px-2.5 py-2 text-sm text-[#786989]" role="option" aria-selected="false">
              No matches — filters narrow visible results only.
            </li>
          ) : (
            filtered.map((u, i) => (
              <li
                key={u}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={value === u}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(u);
                }}
                className={cn("cursor-pointer rounded-lg px-2.5 py-2 text-sm", i === active && "bg-[#f2eafe]")}
              >
                {u}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
