import React, { useState, useEffect } from 'react';
import { TabData } from '../../types/qa';
import QARulesContent from './QARulesContent';

export default function QARulesViewer(): React.ReactElement {
  const [tabsData, setTabsData] = useState<TabData[]>([]);
  const [activeMainTab, setActiveMainTab] = useState<string | null>(null);
  const [activeSubTabs, setActiveSubTabs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    const filesToLoad: string[] = [
      `${base}json/sp.json`,
      `${base}json/dp.json`,
      `${base}json/datascan.json`,
    ];

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
          } else if (result.status === 'rejected' && import.meta.env.DEV) {
            console.warn("Non-critical failed fetch:", result.reason);
          }
        });

        if (successfulTabs.length === 0) {
          setError("Unable to load any survey rules. Please check your network or JSON files.");
        } else {
          setTabsData(successfulTabs);
          setActiveMainTab(successfulTabs[0].id);
          
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

  const handleMainTabClick = (tabId: string): void => setActiveMainTab(tabId);
  
  const handleSubTabClick = (mainTabId: string, subId: string): void => {
    setActiveSubTabs((prev) => ({ ...prev, [mainTabId]: subId }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full bg-slate-50 text-blue-600 font-bold text-lg">
        Loading Survey Rules...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-slate-50 p-6 flex justify-center items-start">
        <div className="max-w-3xl w-full p-3 bg-red-50 text-red-700 border border-red-300 rounded-md text-center shadow-sm">
          <p className="font-semibold text-sm">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const currentTabData = tabsData.find((tab) => tab.id === activeMainTab);

  return (
    // Outer container respects parent height
    <div className="h-full w-full bg-slate-50 p-4 font-sans text-slate-800 flex flex-col">
      {/* Inner card strictly bounds the content and uses flex-col to push scrolling down */}
      <div className="max-w-5xl w-full mx-auto bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col h-full min-h-0">
        
        {/* Fixed Header Area */}
        <div className="p-4 sm:p-6 pb-0 flex-shrink-0">
          <h1 className="text-2xl font-bold text-center text-slate-900 mb-4 tracking-tight">
            QA Survey Checking Rules
          </h1>

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
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-hidden px-4 sm:px-6 pb-2 min-h-0">
          {currentTabData && (
            <QARulesContent 
              currentTabData={currentTabData} 
              activeSubTabs={activeSubTabs} 
              onSubTabClick={handleSubTabClick} 
            />
          )}
        </div>

      </div>
    </div>
  );
}