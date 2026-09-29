export const DRAW_IT_MAX_TO_RATE = 5;
export const DRAW_IT_RATE_MS_PER_DRAWING = 12_000;
export const DRAW_IT_RESULTS_MS = 8000;
export const DRAW_IT_RATING_MIN = 1;
export const DRAW_IT_RATING_MAX = 10;
export const DRAW_IT_POINTS_PER_RATING_POINT = 100;

export const ratingsPerPlayer = (drawingCount: number) => Math.min(DRAW_IT_MAX_TO_RATE, drawingCount - 1);

const wrapped = <T>(items: T[], start: number, count: number) =>
  Array.from({ length: count }, (_, offset) => items[(start + offset) % items.length]).filter(
    (item): item is T => item !== undefined,
  );

export const assignRatings = (drawings: { id: string; playerId: string }[], raters: string[]) => {
  const count = ratingsPerPlayer(drawings.length);
  const artists = new Map(drawings.map((drawing, index) => [drawing.playerId, index]));
  const ids = drawings.map((drawing) => drawing.id);
  const others = raters.filter((playerId) => !artists.has(playerId));
  const forArtists = [...artists].map(([playerId, index]): [string, string[]] => [
    playerId,
    wrapped(ids, index + 1, count),
  ]);
  const forOthers = others.map((playerId, index): [string, string[]] => [
    playerId,
    wrapped(ids, (index * count) % ids.length, count),
  ]);
  return Object.fromEntries([...forArtists.filter(([playerId]) => raters.includes(playerId)), ...forOthers]);
};

export const isRating = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= DRAW_IT_RATING_MIN && Number(value) <= DRAW_IT_RATING_MAX;

export const averageOf = (ratings: number[]) =>
  ratings.length === 0
    ? null
    : Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10;

export const drawingPoints = (average: number | null) =>
  average === null ? 0 : Math.round(average * DRAW_IT_POINTS_PER_RATING_POINT);
