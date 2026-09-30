import { Bricolage_Grotesque, Figtree } from "next/font/google";

/** Tipografías del diseño "Galpón": títulos/números y texto. */
export const galponDisplay = Bricolage_Grotesque({
  // Fuente variable: sin pesos fijos (con pesos fijos falla el build de producción).
  subsets: ["latin"],
  variable: "--gp-font-display",
});

export const galponBody = Figtree({
  subsets: ["latin"],
  variable: "--gp-font-body",
});

export const galponFontVars = `${galponDisplay.variable} ${galponBody.variable}`;
