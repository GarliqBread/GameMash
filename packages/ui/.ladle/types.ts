import type { ReactNode } from "react";

export type Story = {
  (): ReactNode;
  storyName?: string;
};

export type StoryDefault = {
  title?: string;
};

export type GlobalProvider = (props: {
  children: ReactNode;
  globalState: { theme: "light" | "dark" | "auto" };
}) => ReactNode;
