export interface ModelDef {
  id: string;
  name: string;
  desc: string;
}

export const MODEL_CATALOG: ModelDef[] = [
  { id: "crystal", name: "Cristallo", desc: "Icosaedro low-poly" },
  { id: "knot", name: "Nodo", desc: "Torus knot metallico" },
  { id: "gem", name: "Gemma", desc: "Ottaedro sfaccettato" },
  { id: "cube", name: "Cubo", desc: "Box smussato" },
  { id: "pyramid", name: "Piramide", desc: "Cono a 4 facce" },
  { id: "sphere", name: "Sfera Disco", desc: "Sfera classica" },
  { id: "torus", name: "Anello", desc: "Torus spesso" },
  { id: "dodeca", name: "Dodecaedro", desc: "Dodici facce" },
];

export const getModel = (id: string) => MODEL_CATALOG.find((m) => m.id === id) ?? MODEL_CATALOG[0];
