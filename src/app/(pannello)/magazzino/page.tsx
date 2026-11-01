import { getDb } from "@/lib/db";
import { dollars, euro, number, when } from "@/lib/format";
import { listProducts, listStock } from "@/lib/repo";

export default async function Magazzino() {
  const db = await getDb();
  const [stock, products] = await Promise.all([listStock(db), listProducts(db)]);
  const filters = stock.find((s) => s.item === "filtro");

  return (
    <>
      <h1>Magazzino</h1>
      <p className="lead">Quanti filtri ci sono, quanti pacchi ci escono e quanto valgono.</p>

      <div className="scroll card">
        <table>
          <thead>
            <tr><th>Articolo</th><th className="num">Pezzi</th><th className="num">Costo al pezzo</th><th>Dove</th><th>Aggiornato</th></tr>
          </thead>
          <tbody>
            {stock.map((s) => (
              <tr key={s.item}>
                <td>{s.description}</td>
                <td className="num">{number(s.quantity)}</td>
                <td className="num">{dollars(s.unit_cost_usd, 3)}</td>
                <td>{s.location}</td>
                <td>{when(s.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filters && (
        <>
          <h2>Se vendessi tutto in un solo formato</h2>
          <div className="scroll card">
            <table>
              <thead>
                <tr><th>Confezione</th><th className="num">Prezzo</th><th className="num">Pacchi possibili</th><th className="num">Incasso massimo</th><th className="num">Costo filtri a pacco</th></tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const packs = Math.floor(filters.quantity / p.pack_size);
                  return (
                    <tr key={p.sku}>
                      <td>{p.name}</td>
                      <td className="num">{euro(p.price_cents)}</td>
                      <td className="num">{number(packs)}</td>
                      <td className="num">{euro(packs * p.price_cents)}</td>
                      <td className="num">{dollars(p.pack_size * filters.unit_cost_usd)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="meta">Incasso prima di spedizioni, commissioni e tasse. Il riordino minimo in Cina è di 50.000 filtri.</p>
        </>
      )}
    </>
  );
}
