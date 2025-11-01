import React, { useState, useEffect } from 'react';
import { BotIcon } from './icons/BotIcon';

interface ResponseViewerProps {
  response: string;
  sources?: any[];
  isLoading: boolean;
  error: string | null;
  statusMessage?: string;
  logs: string[];
  imageUrl: string | null;
}

interface InventoryItem {
  name: string;
  category: string;
  estimatedValue: number;
  sourceUrl: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}


type Tab = 'response' | 'logs';

export const ResponseViewer: React.FC<ResponseViewerProps> = ({ response, sources, isLoading, error, statusMessage, logs, imageUrl }) => {
  const [activeTab, setActiveTab] = useState<Tab>('response');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[] | null>(null);
  const [highlightedItemIndex, setHighlightedItemIndex] = useState<number | null>(null);

  
  useEffect(() => {
    // When a new execution starts or finishes, switch to the response tab.
    if (response || error || isLoading) {
      setActiveTab('response');
    }
    // Try to parse the response as inventory items
    if (response && imageUrl) {
      try {
        const parsed = JSON.parse(response);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.some(item => item.boundingBox)) {
          setInventoryItems(parsed);
        } else {
          setInventoryItems(null);
        }
      } catch (e) {
        setInventoryItems(null);
      }
    } else {
      setInventoryItems(null);
    }
  }, [response, error, imageUrl, isLoading]);

  const renderSources = () => {
    if (!sources || sources.length === 0) return null;

    return (
      <div className="mt-6 border-t border-slate-700 pt-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">Sources</h3>
        <ul className="space-y-2">
          {sources.map((chunk, index) => {
            const source = chunk.web || chunk.maps;
            if (!source || !source.uri) return null;
            return (
              <li key={index} className="text-xs">
                <a 
                  href={source.uri} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                  aria-label={`Source: ${source.title || source.uri}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                  </svg>
                  <span className="truncate">{source.title || source.uri}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };
  
  const hasLogs = logs && logs.length > 0;

  const getTabClassName = (tab: Tab) => {
    const isActive = activeTab === tab;
    return `relative py-2 px-4 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 rounded-t-md
      ${isActive ? 'text-slate-100' : 'text-slate-400 hover:text-slate-200'}`;
  };

  const ActiveTabIndicator = () => <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" />;
  
  const renderResponseTab = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
          <svg className="animate-spin h-8 w-8 text-cyan-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-medium">Executing...</p>
          <p className="text-sm mt-2 font-mono bg-slate-900/50 px-2 py-1 rounded">{statusMessage || 'Please wait...'}</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-md h-full">
          <h3 className="font-bold mb-2">An Error Occurred</h3>
          <pre className="text-sm whitespace-pre-wrap font-mono">{error}</pre>
        </div>
      );
    }
    if (imageUrl && inventoryItems) {
      return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full max-h-[calc(100vh-250px)]">
              <div className="relative w-full h-full flex items-center justify-center bg-slate-950/50 rounded-lg overflow-hidden p-2">
                  <img src={imageUrl} alt="Analysis subject" className="max-w-full max-h-full object-contain" />
                  {inventoryItems.map((item, index) =>
                      item.boundingBox && (
                          <div
                              key={index}
                              className={`absolute border-2 rounded-sm cursor-pointer transition-all duration-200 ${highlightedItemIndex === index ? 'bg-cyan-400/40 border-cyan-300 shadow-lg' : 'bg-cyan-400/20 border-cyan-400'}`}
                              style={{
                                  left: `${item.boundingBox.x}%`,
                                  top: `${item.boundingBox.y}%`,
                                  width: `${item.boundingBox.width}%`,
                                  height: `${item.boundingBox.height}%`,
                              }}
                              onMouseEnter={() => setHighlightedItemIndex(index)}
                              onMouseLeave={() => setHighlightedItemIndex(null)}
                          >
                              <span className={`absolute -top-6 left-0 text-xs font-bold text-white bg-cyan-600 px-2 py-0.5 rounded-t-md transition-opacity duration-200 pointer-events-none ${highlightedItemIndex === index ? 'opacity-100' : 'opacity-0'}`}>
                                  {item.name}
                              </span>
                          </div>
                      )
                  )}
              </div>
              <div className="overflow-y-auto pr-2">
                  <h3 className="text-base font-semibold text-slate-300 mb-3 sticky top-0 bg-slate-900/80 backdrop-blur-sm pb-2 z-10">Identified Items</h3>
                  <ul className="space-y-3">
                      {inventoryItems.map((item, index) => (
                          <li
                              key={index}
                              className={`p-3 rounded-lg border transition-all duration-200 ${highlightedItemIndex === index ? 'bg-slate-700/80 border-cyan-500 scale-[1.02]' : 'bg-slate-800/80 border-slate-700'}`}
                              onMouseEnter={() => setHighlightedItemIndex(index)}
                              onMouseLeave={() => setHighlightedItemIndex(null)}
                          >
                              <p className="font-bold text-slate-100">{item.name}</p>
                              <p className="text-sm text-slate-400">{item.category}</p>
                              <p className="text-lg font-semibold text-cyan-400 mt-1">${(item.estimatedValue || 0).toFixed(2)}</p>
                              {item.sourceUrl && (
                                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-cyan-400 truncate block mt-1">
                                      {item.sourceUrl}
                                  </a>
                              )}
                          </li>
                      ))}
                  </ul>
                  {renderSources()}
              </div>
          </div>
      );
    }
    if (response) {
      return (
        <div className="prose prose-invert prose-sm max-w-none">
          <pre className="bg-transparent p-0 whitespace-pre-wrap font-mono">{response}</pre>
          {renderSources()}
        </div>
      );
    }
    return (
        <div className="flex items-center justify-center h-full text-slate-500">
            <p>Your generated response will appear here.</p>
        </div>
    );
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b border-slate-700">
          <BotIcon className="w-6 h-6 text-cyan-400" />
          <h2 className="text-lg font-semibold text-slate-200">Gemini Response</h2>
      </div>

      <div className="px-6 border-b border-slate-700">
        <div className="flex items-center -mb-px">
          <button className={getTabClassName('response')} onClick={() => setActiveTab('response')}>
            Response
            {activeTab === 'response' && <ActiveTabIndicator />}
          </button>
          <button className={getTabClassName('logs')} onClick={() => setActiveTab('logs')}>
            Execution Logs
            {hasLogs && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-cyan-100 bg-cyan-600/50 rounded-full">
                {logs.length}
              </span>
            )}
            {activeTab === 'logs' && <ActiveTabIndicator />}
          </button>
        </div>
      </div>
      
      <div className="flex-grow bg-slate-900/50 p-4 overflow-auto rounded-b-lg">
        {activeTab === 'response' && renderResponseTab()}

        {activeTab === 'logs' && (
          <div>
            {hasLogs ? (
                 <pre className="bg-slate-950/70 p-3 rounded-md text-xs text-slate-300 font-mono whitespace-pre-wrap h-full">
                    {logs.join('\n')}
                </pre>
            ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                    <p>Any output from `console.log` will appear here.</p>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};