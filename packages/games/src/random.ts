export const shuffled = <T>(items: T[], random: () => number) =>
  items
    .map((item) => ({ item, key: random() }))
    .toSorted((a, b) => a.key - b.key)
    .map(({ item }) => item);
