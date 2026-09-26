import { prisma } from "@/lib/db";
import { parseHours, type HoursMap } from "@/lib/availability";

export type ShopSettings = {
  id: number;
  shopName: string;
  tagline: string;
  whatsappNumber: string;
  whatsappMessage: string;
  qrImageUrl: string | null;
  loyaltyEveryN: number;
  slotMinutes: number;
  timezone: string;
  hoursJson: string;
  hours: HoursMap;
};

export async function getSettings(): Promise<ShopSettings | null> {
  const row = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!row) return null;
  return { ...row, hours: parseHours(row.hoursJson) };
}
