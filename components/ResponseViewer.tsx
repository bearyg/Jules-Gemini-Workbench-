
import React, { useState, useEffect } from 'react';
// FIX: Import 'Grid' component from '@mui/material'
import { Box, Paper, Typography, Tabs, Tab, CircularProgress, Alert, Link, List, ListItem, Card, CardContent, Divider, Grid } from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import LinkIcon from '@mui/icons-material/Link';

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

type TabValue = 'response' | 'logs';

export const ResponseViewer: React.FC<ResponseViewerProps> = ({ response, sources, isLoading, error, statusMessage, logs, imageUrl }) => {
  const [activeTab, setActiveTab] = useState<TabValue>('response');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[] | null>(null);
  const [highlightedItemIndex, setHighlightedItemIndex] = useState<number | null>(null);

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

    return (
      <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>Sources</Typography>
        <List dense>
          {sources.map((chunk, index) => {
            const source = chunk.web || chunk.maps;
            if (!source || !source.uri) return null;
            return (
              <ListItem key={index} disableGutters>
                <Link 
                  href={source.uri} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  variant="body2"
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <LinkIcon sx={{ fontSize: '1rem' }} />
                  <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {source.title || source.uri}
                  </Typography>
                </Link>
              </ListItem>
            );
          })}
        </List>
      </Box>
    );
  };

  const renderResponseContent = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
          <CircularProgress color="primary" sx={{ mb: 2 }} />
          <Typography variant="h6">Executing...</Typography>
          <Typography variant="body2" color="text.secondary">{statusMessage || 'Please wait...'}</Typography>
        </Box>
      );
    }
    if (error) {
      return (
        <Alert severity="error" sx={{ height: '100%', '.MuiAlert-message': { width: '100%' } }}>
          <Typography variant="h6" component="div" gutterBottom>An Error Occurred</Typography>
          <Box component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8rem', overflow: 'auto' }}>
            {error}
          </Box>
        </Alert>
      );
    }
    if (imageUrl && inventoryItems) {
      return (
        <Grid container spacing={2} sx={{ height: '100%', maxHeight: 'calc(100vh - 250px)' }}>
          <Grid item xs={12} md={6} sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1, p: 1 }}>
            <Box component="img" src={imageUrl} alt="Analysis subject" sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            {inventoryItems.map((item, index) =>
              item.boundingBox && (
                <Box
                  key={index}
                  sx={{
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
                  }}
                  onMouseEnter={() => setHighlightedItemIndex(index)}
                  onMouseLeave={() => setHighlightedItemIndex(null)}
                >
                  <Typography
                    sx={{
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
                    }}
                  >
                    {item.name}
                  </Typography>
                </Box>
              )
            )}
          </Grid>
          <Grid item xs={12} md={6} sx={{ overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>Identified Items</Typography>
            <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {inventoryItems.map((item, index) => (
                <Card
                  key={index}
                  onMouseEnter={() => setHighlightedItemIndex(index)}
                  onMouseLeave={() => setHighlightedItemIndex(null)}
                  variant="outlined"
                  sx={{
                    bgcolor: highlightedItemIndex === index ? 'rgba(34, 211, 238, 0.1)' : 'transparent',
                    borderColor: highlightedItemIndex === index ? 'primary.main' : 'divider',
                    transition: (theme) => theme.transitions.create(['background-color', 'border-color']),
                  }}
                >
                  <CardContent>
                    <Typography variant="body1" fontWeight="bold">{item.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{item.category}</Typography>
                    <Typography variant="h5" color="primary.main" sx={{ mt: 1 }}>${(item.estimatedValue || 0).toFixed(2)}</Typography>
                    {item.sourceUrl && (
                      <Link href={item.sourceUrl} target="_blank" rel="noopener noreferrer" variant="caption" sx={{ display: 'block', mt: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.sourceUrl}
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))}
            </List>
            {renderSources()}
          </Grid>
        </Grid>
      );
    }
    if (response) {
      return (
        <Box>
            <Box component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                {response}
            </Box>
            {renderSources()}
        </Box>
      );
    }
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography color="text.secondary">Your generated response will appear here.</Typography>
      </Box>
    );
  };

  return (
    <Paper elevation={2} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <ScienceIcon color="primary" />
        <Typography variant="h6">Gemini Response</Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} aria-label="response tabs">
          <Tab label="Response" value="response" />
          <Tab label={`Execution Logs ${logs.length > 0 ? `(${logs.length})` : ''}`} value="logs" />
        </Tabs>
      </Box>
      
      <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto', bgcolor: 'rgba(0,0,0,0.15)' }}>
        {activeTab === 'response' && renderResponseContent()}
        {activeTab === 'logs' && (
          logs.length > 0 ? (
            <Box component="pre" sx={{ bgcolor: 'rgba(0,0,0,0.2)', p: 2, borderRadius: 1, fontSize: '0.8rem', color: 'text.secondary', fontFamily: 'monospace', whiteSpace: 'pre-wrap', height: '100%' }}>
              {logs.join('\n')}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography color="text.secondary">Any output from `console.log` will appear here.</Typography>
            </Box>
          )
        )}
      </Box>
    </Paper>
  );
};
