import type { FormEvent, ReactNode } from "react";

export type EntryLayoutProps = {
  fields: ReactNode;
  submit: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};
