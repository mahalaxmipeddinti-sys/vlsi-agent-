export interface HistoryItem {
  id: string;
  query: string;
  componentName: string;
  componentType: string;
  icId?: string;
  timestamp: string;
  dateStr: string;
  sourceStage?: string;
}

const STORAGE_KEY = 'vlsi_usage_history';

export const INITIAL_SEED_HISTORY: HistoryItem[] = [
  {
    id: 'seed-1',
    query: 'Design 74LS138 3-to-8 line decoder with active-low chip enables and glitch-free outputs',
    componentName: 'SN74138 3-to-8 Decoder',
    componentType: 'Decoder',
    icId: '74138',
    timestamp: '03:15:20 PM',
    dateStr: 'Sep 25, 2026',
    sourceStage: 'Front End (RTL)'
  },
  {
    id: 'seed-2',
    query: 'Synthesize 8-Bit Carry Lookahead Adder (CLA) with generate and propagate logic',
    componentName: '8-Bit CLA Adder',
    componentType: 'Arithmetic / Adder',
    icId: '74283',
    timestamp: '02:40:10 PM',
    dateStr: 'Sep 25, 2026',
    sourceStage: 'Synthesis'
  },
  {
    id: 'seed-3',
    query: 'Implement Dual JK Flip-Flop with asynchronous clear and preset (SN7476)',
    componentName: 'SN7476 Dual JK Flip-Flop',
    componentType: 'Sequential Logic',
    icId: '7476',
    timestamp: '01:22:45 PM',
    dateStr: 'Sep 25, 2026',
    sourceStage: 'Waveform & Timing'
  },
  {
    id: 'seed-4',
    query: 'Generate 74LS00 Quad 2-Input NAND gate CMOS schematic with transistor W/L ratios',
    componentName: 'SN7400 Quad NAND',
    componentType: 'Logic Gate',
    icId: '7400',
    timestamp: '11:05:30 AM',
    dateStr: 'Sep 25, 2026',
    sourceStage: 'IC Explorer'
  }
];

export const getHistoryItems = (): HistoryItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data === null) {
      // First time initialization: seed initial sample items so UI is rich and functional
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SEED_HISTORY));
      return INITIAL_SEED_HISTORY;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load history items from localStorage:', err);
    return INITIAL_SEED_HISTORY;
  }
};

export const saveHistoryItem = (item: Omit<HistoryItem, 'id' | 'timestamp' | 'dateStr'>): HistoryItem => {
  const items = getHistoryItems();
  const now = new Date();
  const newItem: HistoryItem = {
    ...item,
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    dateStr: now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
  };

  // Avoid consecutive exact duplicate queries
  if (items.length > 0 && items[0].query.trim().toLowerCase() === newItem.query.trim().toLowerCase()) {
    return items[0];
  }

  const updated = [newItem, ...items].slice(0, 100); // keep up to 100 items
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save history item:', err);
  }
  return newItem;
};

export const removeHistoryItem = (id: string): HistoryItem[] => {
  const items = getHistoryItems().filter(i => i.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to remove history item:', err);
  }
  return items;
};

export const clearAllHistory = (): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  } catch (err) {
    console.error('Failed to clear history:', err);
  }
};

export const restoreSeedHistory = (): HistoryItem[] => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SEED_HISTORY));
    return INITIAL_SEED_HISTORY;
  } catch (err) {
    console.error('Failed to restore sample history:', err);
    return INITIAL_SEED_HISTORY;
  }
};

export const exportHistoryAsJson = (): void => {
  try {
    const items = getHistoryItems();
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vlsi_studio_history_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export history as JSON:', err);
  }
};

export const groupHistoryByDate = (items: HistoryItem[]) => {
  const groups: { label: string; items: HistoryItem[] }[] = [];
  const map = new Map<string, HistoryItem[]>();
  items.forEach(item => {
    if (!map.has(item.dateStr)) map.set(item.dateStr, []);
    map.get(item.dateStr)!.push(item);
  });
  map.forEach((value, key) => {
    groups.push({ label: key, items: value });
  });
  return groups;
};
