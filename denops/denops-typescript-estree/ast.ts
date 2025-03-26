export const findAstPath = (
  ast: any,
  position: number,
  path: string[] = [],
): string[] | null => {
  if (!ast || typeof ast !== "object") return null;
};
