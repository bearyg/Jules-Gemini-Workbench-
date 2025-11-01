import React, { useEffect } from 'react';
import { CheckIcon } from './icons/CheckIcon.js';

export const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';

  const bgColor = isSuccess ? 'bg-green-800/90' : 'bg-red-800/90';
  const borderColor = isSuccess ? 'border-green-600' : 'border-red-600';
  const textColor = isSuccess ? 'text-green-200' : 'text-red-200';
  const iconColor = isSuccess ? 'text-green-400' : 'text-red-400';

  return React.createElement('div', { className: "fixed bottom-5 right-5 z-50" },
    React.createElement('div', {
        className: `flex items-center p-4 rounded-lg shadow-lg backdrop-blur-sm border ${bgColor} ${borderColor} ${textColor}`,
        role: "alert"
      },
      isSuccess && React.createElement('div', { className: `inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg ${iconColor}` },
        React.createElement(CheckIcon, { className: "w-6 h-6" })
      ),
      React.createElement('div', { className: "ml-3 text-sm font-normal" }, message),
      React.createElement('button', {
          type: "button",
          className: "ml-auto -mx-1.5 -my-1.5 bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg focus:ring-2 focus:ring-slate-500 p-1.5 inline-flex items-center justify-center h-8 w-8",
          onClick: onClose,
          "aria-label": "Close"
        },
        React.createElement('span', { className: "sr-only" }, "Close"),
        React.createElement('svg', { className: "w-3 h-3", "aria-hidden": "true", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 14 14" },
          React.createElement('path', { stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" })
        )
      )
    )
  );
};
