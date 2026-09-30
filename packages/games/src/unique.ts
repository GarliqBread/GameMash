export const hasUniqueIds = (items: { id: string }[]) => new Set(items.map((item) => item.id)).size === items.length;
