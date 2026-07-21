import { ConvertedOption } from "../../types/logic";

interface OptionRowProps {
  opt: ConvertedOption;
  /** When the option's condition is shown as a group header, hide the inline tag. */
  hideLogic?: boolean;
}

export function OptionRow({ opt, hideLogic }: OptionRowProps) {
  const rule = hideLogic ? null : opt.showLogic?.text || opt.terminateLogic?.text || null;
  return (
    <li className="flex items-start gap-2 py-1 text-sm">
      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 mt-0.5">{opt.id}</span>
      <span className="text-slate-800 flex-1">{opt.text}</span>
      {rule && (
        <span className="ml-auto shrink-0 max-w-[45%] text-[10px] text-amber-800 bg-amber-100 rounded px-1.5 py-0.5">{rule}</span>
      )}
    </li>
  );
}
