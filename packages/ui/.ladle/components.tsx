import { PseudoProvider, usePseudo } from "./pseudo";
import type { GlobalProvider } from "./types";
import "./ladle.css";

const PseudoToggle = () => {
  const { isPseudo, toggle } = usePseudo();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isPseudo}
      className="focus-ring fixed right-4 bottom-4 z-50 rounded-full bg-ink-950 px-4 py-2 text-caption font-bold text-cream shadow-knob"
    >
      Pseudo-locale: {isPseudo ? "on" : "off"}
    </button>
  );
};

export const Provider: GlobalProvider = ({ children, globalState }) => (
  <PseudoProvider>
    <div data-theme={globalState.theme === "dark" ? "stage" : "paper"} className="min-h-dvh bg-bg text-fg">
      {children}
    </div>
    <PseudoToggle />
  </PseudoProvider>
);
