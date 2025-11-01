import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Tabs, Tab, CircularProgress, Alert, Link, List, ListItem, Card, CardContent, Grid, Divider } from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import LinkIcon from '@mui/icons-material/Link';

export const ResponseViewer = ({ response, sources, isLoading, error, statusMessage, logs, imageUrl }) => {
  const [activeTab, setActiveTab] = useState('response');
  const [inventoryItems, setInventoryItems] = useState(null);
  const [highlightedItemIndex, setHighlightedItemIndex] = useState(null);

  useEffect(() => {
    if (response || error || isLoading) {
      setActiveTab('response');
    }
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

    return React.createElement(Box, { sx: { mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' } },
      React.createElement(Typography, { variant: "subtitle2", color: "text.secondary", gutterBottom: true }, "Sources"),
      React.createElement(List, { dense: true },
        sources.map((chunk, index) => {
          const source = chunk.web || chunk.maps;
          if (!source || !source.uri) return null;
          return React.createElement(ListItem, { key: index, disableGutters: true },
            React.createElement(Link, {
                href: source.uri,
                target: "_blank",
                rel: "noopener noreferrer",
                variant: "body2",
                sx: { display: 'flex', alignItems: 'center', gap: 1 }
              },
              React.createElement(LinkIcon, { sx: { fontSize: '1rem' } }),
              React.createElement(Typography, { variant: "caption", sx: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                source.title || source.uri
              )
            )
          );
        })
      )
    );
  };

  const renderResponseContent = () => {
    if (isLoading) {
      return React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' } },
        React.createElement(CircularProgress, { color: "primary", sx: { mb: 2 } }),
        React.createElement(Typography, { variant: "h6" }, "Executing..."),
        React.createElement(Typography, { variant: "body2", color: "text.secondary" }, statusMessage || 'Please wait...')
      );
    }
    if (error) {
      return React.createElement(Alert, { severity: "error", sx: { height: '100%', '.MuiAlert-message': { width: '100%' } } },
        React.createElement(Typography, { variant: "h6", component: "div", gutterBottom: true }, "An Error Occurred"),
        React.createElement(Box, { component: "pre", sx: { whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8rem', overflow: 'auto' } },
          error
        )
      );
    }
    if (imageUrl && inventoryItems) {
      return React.createElement(Grid, { container: true, spacing: 2, sx: { height: '100%', maxHeight: 'calc(100vh - 250px)' } },
        React.createElement(Grid, { item: true, xs: 12, md: 6, sx: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1, p: 1 } },
          React.createElement(Box, { component: "img", src: imageUrl, alt: "Analysis subject", sx: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' } }),
          inventoryItems.map((item, index) =>
            item.boundingBox && React.createElement(Box, {
                key: index,
                sx: {
                  position: 'absolute',
                  border: 2,
                  borderColor: 'primary.main',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  bgcolor: highlightedItemIndex === index ? 'rgba(34, 211, 238, 0.4)' : 'rgba(34, 211, 238, 0.2)',
                  transition: (theme) => theme.transitions.create(['background-color', 'border-color']),
                  left: `${item.boundingBox.x}%`,
                  top: `${item.boundingBox.y}%`,
                  width: `${item.boundingBox.width}%`,
                  height: `${item.boundingBox.height}%`,
                },
                onMouseEnter: () => setHighlightedItemIndex(index),
                onMouseLeave: () => setHighlightedItemIndex(null)
              },
              React.createElement(Typography, {
                  sx: {
                    position: 'absolute',
                    top: '-24px',
                    left: 0,
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    color: 'white',
                    bgcolor: 'primary.main',
                    px: 1,
                    py: 0.2,
                    borderRadius: '4px 4px 0 0',
                    transition: (theme) => theme.transitions.create('opacity'),
                    opacity: highlightedItemIndex === index ? 1 : 0,
                    pointerEvents: 'none',
                  }
                },
                item.name
              )
            )
          )
        ),
        React.createElement(Grid, { item: true, xs: 12, md: 6, sx: { overflow: 'auto' } },
          React.createElement(Typography, { variant: "h6", gutterBottom: true }, "Identified Items"),
          React.createElement(List, { sx: { display: 'flex', flexDirection: 'column', gap: 2 } },
            inventoryItems.map((item, index) => React.createElement(Card, {
                key: index,
                onMouseEnter: () => setHighlightedItemIndex(index),
                onMouseLeave: () => setHighlightedItemIndex(null),
                variant: "outlined",
                sx: {
                  bgcolor: highlightedItemIndex === index ? 'rgba(34, 211, 238, 0.1)' : 'transparent',
                  borderColor: highlightedItemIndex === index ? 'primary.main' : 'divider',
                  transition: (theme) => theme.transitions.create(['background-color', 'border-color']),
                }
              },
              React.createElement(CardContent, null,
                React.createElement(Typography, { variant: "body1", fontWeight: "bold" }, item.name),
                React.createElement(Typography, { variant: "body2", color: "text.secondary" }, item.category),
                React.createElement(Typography, { variant: "h5", color: "primary.main", sx: { mt: 1 } }, `$${(item.estimatedValue || 0).toFixed(2)}`),
                item.sourceUrl && React.createElement(Link, { href: item.sourceUrl, target: "_blank", rel: "noopener noreferrer", variant: "caption", sx: { display: 'block', mt: 1, overflow: 'hidden', textOverflow: 'ellipsis' } },
                  item.sourceUrl
                )
              )
            ))
          ),
          renderSources()
        )
      );
    }
    if (response) {
      return React.createElement(Box, null,
        React.createElement(Box, { component: "pre", sx: { whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.875rem' } },
          response
        ),
        renderSources()
      );
    }
    return React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' } },
      React.createElement(Typography, { color: "text.secondary" }, "Your generated response will appear here.")
    );
  };

  return React.createElement(Paper, { elevation: 2, sx: { display: 'flex', flexDirection: 'column', height: '100%' } },
    React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: 1, borderColor: 'divider' } },
      React.createElement(ScienceIcon, { color: "primary" }),
      React.createElement(Typography, { variant: "h6" }, "Gemini Response")
    ),
    React.createElement(Box, { sx: { borderBottom: 1, borderColor: 'divider' } },
      React.createElement(Tabs, { value: activeTab, onChange: (e, newValue) => setActiveTab(newValue), "aria-label": "response tabs" },
        React.createElement(Tab, { label: "Response", value: "response" }),
        React.createElement(Tab, { label: `Execution Logs ${logs.length > 0 ? `(${logs.length})` : ''}`, value: "logs" })
      )
    ),
    React.createElement(Box, { sx: { flexGrow: 1, p: 2, overflow: 'auto', bgcolor: 'rgba(0,0,0,0.15)' } },
      activeTab === 'response' && renderResponseContent(),
      activeTab === 'logs' && (
        logs.length > 0 ? (
          React.createElement(Box, { component: "pre", sx: { bgcolor: 'rgba(0,0,0,0.2)', p: 2, borderRadius: 1, fontSize: '0.8rem', color: 'text.secondary', fontFamily: 'monospace', whiteSpace: 'pre-wrap', height: '100%' } },
            logs.join('\n')
          )
        ) : (
          React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' } },
            React.createElement(Typography, { color: "text.secondary" }, "Any output from `console.log` will appear here.")
          )
        )
      )
    )
  );
};
