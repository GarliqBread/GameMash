import { createContext, type ReactNode, useCallback, useContext, useState } from "react";

const ACCENTS: Record<string, string> = {
  a: "áá",
  e: "éé",
  i: "í",
  o: "óó",
  u: "ú",
  A: "Á",
  E: "É",
  I: "Í",
  O: "Ó",
  U: "Ú",
  y: "ý",
  n: "ñ",
  c: "ç",
};

const EXPANSION = 0.4;

const pseudoLocalize = (text: string) => {
  const accented = [...text].map((char) => ACCENTS[char] ?? char).join("");
  const padding = "-".repeat(Math.max(2, Math.ceil(text.length * EXPANSION)));
  return `[${accented} ${padding}]`;
};

type PseudoState = {
  isPseudo: boolean;
  toggle: () => void;
};

const PseudoContext = createContext<PseudoState>({
  isPseudo: false,
  toggle: () => {},
});

export const PseudoProvider = ({ children }: { children: ReactNode }) => {
  const [isPseudo, setIsPseudo] = useState(false);
  const toggle = useCallback(() => setIsPseudo((current) => !current), []);
  return <PseudoContext.Provider value={{ isPseudo, toggle }}>{children}</PseudoContext.Provider>;
};

export const usePseudo = () => useContext(PseudoContext);

export const useCopy = () => {
  const { isPseudo } = usePseudo();
  return (text: string) => (isPseudo ? pseudoLocalize(text) : text);
};
