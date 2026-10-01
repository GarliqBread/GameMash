import { Row, ThemeMatrix } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { Avatar } from "./Avatar";

export default { title: "Primitives / Avatar" } satisfies StoryDefault;

const NAMES = ["Anouk", "Bram", "Sophie", "Daan", "Priya", "Lars", "Fatima", "Jeroen", "Mei"];

const PHOTO =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><rect width='10' height='10' fill='%235cc8ee'/><circle cx='5' cy='4' r='2' fill='%23fbf6ec'/><rect x='2' y='7' width='6' height='3' rx='1.5' fill='%23fbf6ec'/></svg>";

export const Sizes: Story = () => (
  <ThemeMatrix>
    {() => (
      <>
        <Row label="36 / 60 / 80 / 112 / 140">
          <Avatar name="Anouk" size={36} />
          <Avatar name="Anouk" size={60} />
          <Avatar name="Anouk" size={80} />
          <Avatar name="Anouk" size={112} />
          <Avatar name="Anouk" size={140} />
        </Row>
        <Row label="Colour by name, initial, photo">
          {NAMES.map((name) => (
            <Avatar key={name} name={name} size={60} />
          ))}
          <Avatar name="Jan de Vries" size={60} />
          <Avatar name="Mei" src={PHOTO} size={60} />
        </Row>
        <Row label="Podium rings">
          <Avatar name="Sophie" size={112} ring="silver" />
          <Avatar name="Priya" size={140} ring="gold" />
          <Avatar name="Bram" size={112} ring="bronze" />
        </Row>
      </>
    )}
  </ThemeMatrix>
);
