import { describe, expect, it } from "vitest";
import { bagPrice, currencyFor, formatPrice } from "@/lib/valuta";

const h = (country?: string) => new Headers(country ? { "x-vercel-ip-country": country } : {});

describe("valuta", () => {
  it("franchi per Svizzera e Liechtenstein, euro altrimenti", () => {
    expect(currencyFor(h("CH"))).toBe("CHF");
    expect(currencyFor(h("LI"))).toBe("CHF");
    expect(currencyFor(h("IT"))).toBe("EUR");
    expect(currencyFor(h())).toBe("EUR");
    expect(currencyFor(h("IT"), "ch")).toBe("CHF");
  });

  it("prezzo della busta e formato", () => {
    expect(bagPrice({ prezzo: "20", prezzo_chf: "" }, "CHF")).toBe(20);
    expect(bagPrice({ prezzo: "20", prezzo_chf: "19,90" }, "CHF")).toBe(19.9);
    expect(bagPrice({ prezzo: "", prezzo_chf: "" }, "EUR")).toBe(20);
    expect(formatPrice(20, "CHF", "it")).toBe("CHF 20.00");
    expect(formatPrice(0.2, "CHF", "en")).toBe("CHF 0.20");
    expect(formatPrice(20, "EUR", "it")).toBe("20,00 €");
    expect(formatPrice(20, "EUR", "en")).toBe("€20.00");
    expect(formatPrice(20, "CHF", "it", false)).toBe("CHF 20");
  });
});
