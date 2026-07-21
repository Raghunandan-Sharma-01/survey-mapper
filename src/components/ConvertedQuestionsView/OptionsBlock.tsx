import React from "react";
import { ConvertedOption } from "../../types/logic";
import { OptionRow } from "./OptionRow";

/**
 * Renders a question's options. Consecutive options that share the same
 * show/terminate condition (a "group") get one condition header; unique
 * per-option conditions stay as an inline tag on the row.
 */
export function OptionsBlock({ options }: { options: ConvertedOption[] }) {
  if (options.length === 0) return null;
  const keyOf = (o?: ConvertedOption) => (o ? o.showLogic?.text || o.terminateLogic?.text || null : null);

  return (
    <ul className="divide-y divide-slate-100">
      {options.map((o, i) => {
        const k = keyOf(o);
        const prevSame = i > 0 && keyOf(options[i - 1]) === k;
        const nextSame = i < options.length - 1 && keyOf(options[i + 1]) === k;
        const inGroup = !!k && (prevSame || nextSame); // shared by a neighbor → it's a group
        const groupStart = inGroup && !prevSame; // first row of the run
        return (
          <React.Fragment key={o.id}>
            {groupStart && (
              <li className="pt-2 pb-1">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                  {k}
                </span>
              </li>
            )}
            <OptionRow opt={o} hideLogic={inGroup} />
          </React.Fragment>
        );
      })}
    </ul>
  );
}
