const TZ = "Europe/Rome";

export function euro(cents: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", useGrouping: "always" }).format(cents / 100);
}

export function dollars(value: number, digits = 2): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

export function number(value: number): string {
  return new Intl.NumberFormat("it-IT", { useGrouping: "always" }).format(value);
}

export function when(value: string | Date | null): string {
  if (!value) return "mai";
  return new Intl.DateTimeFormat("it-IT", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function greeting(now = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("it-IT", { timeZone: TZ, hour: "numeric", hour12: false }).format(now));
  if (hour < 5 || hour >= 18) return "Buonasera";
  if (hour < 13) return "Buongiorno";
  return "Buon pomeriggio";
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
