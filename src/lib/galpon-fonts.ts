import { Bricolage_Grotesque, Figtree } from "next/font/google";

/** Tipografías del diseño "Galpón": títulos/números y texto. */
export const galponDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--gp-font-display",
});

export const galponBody = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--gp-font-body",
});

export const galponFontVars = `${galponDisplay.variable} ${galponBody.variable}`;
