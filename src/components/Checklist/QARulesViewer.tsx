import React, { useState, useEffect } from 'react';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface Category {
  subId: string;
  title: string;
  items: string[];
}

export interface TabData {
  id: string;
  title: string;
  heading: string;
  description?: string;
  categories?: Category[];
  items?: string[]; // Fallback for flat lists (e.g., datascan.json)
}

// ==========================================
// COMPONENT
// ==========================================

export default function QARulesViewer(): React.ReactElement {
  const [tabsData, setTabsData] = useState<TabData[]>([]);
  const [activeMainTab, setActiveMainTab] = useState<string | null>(null);
  const [activeSubTabs, setActiveSubTabs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const filesToLoad: string[] = ['./json/sp.json', './json/dp.json', './json/datascan.json'];

    const fetchData = async () => {
      try {
        const results = await Promise.allSettled(
          filesToLoad.map(async (file) => {
            const res = await fetch(file);
            if (!res.ok) throw new Error(`Failed to load ${file}: ${res.statusText}`);
            return (await res.json()) as TabData;
          })
        );

        const successfulTabs: TabData[] = [];
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            successfulTabs.push(result.value);
          } else if (result.status === 'rejected') {
            console.warn("Non-critical failed fetch:", result.reason);
          }
        });

        if (successfulTabs.length === 0) {
          setError("Unable to load any survey rules. Please check your network or JSON files.");
        } else {
          setTabsData(successfulTabs);
          setActiveMainTab(successfulTabs[0].id);
          
          // Pre-select the first sub-tab for every main tab that has categories
          const initialSubTabs: Record<string, string> = {};
          successfulTabs.forEach((tab) => {
            if (tab.categories && tab.categories.length > 0) {
              initialSubTabs[tab.id] = tab.categories[0].subId;
            }
          });
          setActiveSubTabs(initialSubTabs);
        }
      } catch (err) {
        setError("A critical error occurred while loading data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleMainTabClick = (tabId: string): void => {
    setActiveMainTab(tabId);
  };

  const handleSubTabClick = (mainTabId: string, subId: string): void => {
    setActiveSubTabs((prev) => ({ ...prev, [mainTabId]: subId }));
  };

  // --- RENDER LOADERS & ERRORS ---
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50 text-blue-600 font-bold text-lg">
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading Survey Rules...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex justify-center items-start">
        <div className="max-w-3xl w-full p-3 bg-red-50 text-red-700 border border-red-300 rounded-md text-center shadow-sm">
          <p className="font-semibold text-sm">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const currentTabData = tabsData.find((tab) => tab.id === activeMainTab);

  // --- MAIN RENDER ---
  return (
    // Compact Wrapper
    <div className="min-h-screen bg-slate-50 py-4 px-2 sm:px-4 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
        
        {/* Tighter Main Title */}
        <h1 className="text-2xl font-bold text-center text-slate-900 mb-4 tracking-tight">
          QA Survey Checking Rules
        </h1>

        {/* --- Main Tab Navigation --- */}
        <div className="flex flex-wrap gap-1 border-b-2 border-slate-200 mb-5">
          {tabsData.map((tab) => {
            const isActive = activeMainTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleMainTabClick(tab.id)}
                className={`px-4 py-2 font-semibold text-sm transition-colors duration-200 border-b-4 -mb-[2px] ${
                  isActive
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg'
                }`}
              >
                {tab.title}
              </button>
            );
          })}
        </div>

        {/* --- Active Tab Content Area --- */}
        {currentTabData && (
          <div className="animate-in fade-in duration-300" key={currentTabData.id}>
            <div className="mb-4">
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
              <>
                <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-dashed border-slate-200">
                  {currentTabData.categories.map((cat) => {
                    const isSubActive = activeSubTabs[currentTabData.id] === cat.subId;
                    return (
                      <button
                        key={cat.subId}
                        onClick={() => handleSubTabClick(currentTabData.id, cat.subId)}
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

                {/* Sub-Category Rules List */}
                {currentTabData.categories.map((cat) => {
                  if (activeSubTabs[currentTabData.id] !== cat.subId) return null;
                  return (
                    <ul key={cat.subId} className="flex flex-col gap-2.5 animate-in slide-in-from-bottom-2 duration-300">
                      {cat.items.map((item, idx) => (
                        <li 
                          key={idx} 
                          className="bg-white border border-slate-200 border-l-4 border-l-blue-500 p-3 rounded text-sm sm:text-base text-slate-700 leading-snug hover:shadow-md transition-shadow"
                          dangerouslySetInnerHTML={{ __html: item }} 
                        />
                      ))}
                    </ul>
                  );
                })}
              </>
            ) : (
              // Fallback for flat lists (like the Data Scan tab)
              <ul className="flex flex-col gap-2.5">
                {currentTabData.items && currentTabData.items.length > 0 ? (
                  currentTabData.items.map((item, idx) => (
                    <li 
                      key={idx} 
                      className="bg-white border border-slate-200 border-l-4 border-l-blue-500 p-3 rounded text-sm sm:text-base text-slate-700 leading-snug hover:shadow-md transition-shadow"
                      dangerouslySetInnerHTML={{ __html: item }} 
                    />
                  ))
                ) : (
                  <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                    <p className="italic text-sm text-slate-500">No rules defined for this section yet.</p>
                  </div>
                )}
              </ul>
            )}
          </div>
        )}

      </div>
    </div>
  );
}