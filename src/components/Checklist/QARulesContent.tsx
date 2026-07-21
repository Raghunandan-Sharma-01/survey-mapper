import { TabData } from '../../types/qa';
import { sanitizeInlineHtml } from '../../utils/sanitizeHtml';

interface QARulesContentProps {
  currentTabData: TabData;
  activeSubTabs: Record<string, string>;
  onSubTabClick: (mainTabId: string, subId: string) => void;
}

export default function QARulesContent({ currentTabData, activeSubTabs, onSubTabClick }: QARulesContentProps) {
  return (
    <div className="animate-in fade-in duration-300 flex flex-col h-full" key={currentTabData.id}>
      
      {/* Header & Description (Stays at the top of the scroll area) */}
      <div className="mb-4 flex-shrink-0">
        <h2 className="text-xl font-bold text-slate-800 mb-1">
          {currentTabData.heading}
        </h2>
        {currentTabData.description && (
          <p className="text-sm text-slate-500 max-w-3xl">
            {currentTabData.description}
          </p>
        )}
      </div>

      {/* Sub-Category Navigation (Pills) */}
      {currentTabData.categories && currentTabData.categories.length > 0 ? (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-dashed border-slate-200 flex-shrink-0">
            {currentTabData.categories.map((cat) => {
              const isSubActive = activeSubTabs[currentTabData.id] === cat.subId;
              return (
                <button
                  key={cat.subId}
                  onClick={() => onSubTabClick(currentTabData.id, cat.subId)}
                  className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${
                    isSubActive
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600 ring-offset-2'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {cat.title}
                </button>
              );
            })}
          </div>

          {/* THE INTERNAL SCROLL AREA FOR THE LIST */}
          <div className="flex-1 overflow-y-auto pr-2 pb-4">
            {currentTabData.categories.map((cat) => {
              if (activeSubTabs[currentTabData.id] !== cat.subId) return null;
              return (
                <ul key={cat.subId} className="flex flex-col gap-2.5 animate-in slide-in-from-bottom-2 duration-300">
                  {cat.items.map((item, idx) => (
                    <li 
                      key={idx} 
                      className="bg-white border border-slate-200 border-l-4 border-l-blue-500 p-3 rounded text-sm sm:text-base text-slate-700 leading-snug hover:shadow-md transition-shadow"
                      dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(item) }}
                    />
                  ))}
                </ul>
              );
            })}
          </div>
        </div>
      ) : (
        // Fallback for flat lists (like the Data Scan tab)
        <div className="flex-1 overflow-y-auto pr-2 pb-4">
          <ul className="flex flex-col gap-2.5">
            {currentTabData.items && currentTabData.items.length > 0 ? (
              currentTabData.items.map((item, idx) => (
                <li 
                  key={idx} 
                  className="bg-white border border-slate-200 border-l-4 border-l-blue-500 p-3 rounded text-sm sm:text-base text-slate-700 leading-snug hover:shadow-md transition-shadow"
                  dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(item) }}
                />
              ))
            ) : (
              <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                <p className="italic text-sm text-slate-500">No rules defined for this section yet.</p>
              </div>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}