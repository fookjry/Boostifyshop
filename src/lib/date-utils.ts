export const parseSafeDate = (d: any) => {
  if (!d) return new Date(0);
  const num = Number(d);
  if (!isNaN(num)) return new Date(num);
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? new Date(0) : parsed;
};
