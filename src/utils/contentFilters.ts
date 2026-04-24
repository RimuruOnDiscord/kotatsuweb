export const isNovelType = (type?: string | null) => (type || '').toLowerCase().includes('novel');

export const isAllowedSeriesType = (type?: string | null) => !isNovelType(type);

export const containsNovelToken = (value?: string | null) => (value || '').toLowerCase().includes('novel');
