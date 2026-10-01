import { PseudoProvider, usePseudo } from "./pseudo";
import type { GlobalProvider } from "./types";
import "./ladle.css";

const toggleClassName = "focus-ring rounded-full bg-ink-950 px-4 py-2 text-caption font-bold text-cream shadow-knob";

const PseudoToggle = () => {
  const { isPseudo, toggle } = usePseudo();
  return (
    <button type="button" onClick={toggle} aria-pressed={isPseudo} className={toggleClassName}>
      Pseudo-locale: {isPseudo ? "on" : "off"}
    </button>
  );
};

export const Provider: GlobalProvider = ({ children, globalState }) => {
  const theme = globalState.theme === "dark" ? "stage" : "paper";
  return (
    <PseudoProvider>
      <div data-theme={theme} className="min-h-dvh bg-bg text-fg">
        {children}
      </div>
      <div className="fixed right-4 bottom-4 z-50 flex gap-2">
        <PseudoToggle />
      </div>
    </PseudoProvider>
  );
};
