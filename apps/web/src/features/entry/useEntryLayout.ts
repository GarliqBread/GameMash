import type { ComponentType, FormEvent, ReactNode } from "react";
import { DESKTOP_QUERY, useMediaQuery } from "../../lib/useMediaQuery";

export type EntryLayoutProps = {
  formId: string;
  steps: ReactNode[];
  fields: ReactNode;
  submit: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

type EntryLayouts = {
  desktop: ComponentType<EntryLayoutProps>;
  phone: ComponentType<EntryLayoutProps>;
};

export const useEntryLayout = ({ desktop, phone }: EntryLayouts) => {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  return { isDesktop, Layout: isDesktop ? desktop : phone };
};
