# Tipflow Jarvis

Il gestionale ad agenti di Tipflow. Gli agenti preparano il lavoro, fede approva o rifiuta da "I tuoi da fare". Niente parte senza il suo sì.

## Cosa c'è

| Pagina | Cosa mostra |
| --- | --- |
| Jarvis | Saluto, cose da decidere, agenti accesi, spesa di Claude oggi, filtri in magazzino |
| I tuoi da fare | Le bozze degli agenti, con Approva / Rifiuta e una nota per l'agente |
| La squadra | Tutti gli agenti per reparto, il loro stato, l'ultimo giro e il pulsante "Fai girare ora" |
| Magazzino | Filtri in casa, pacchi possibili e incasso massimo per formato |

Agenti:

- **Negozio** (acceso): scrive la scheda prodotto per Shopify, i testi, la SEO e una proposta di prezzi e pacchi. Se rifiuti una bozza, al giro dopo legge la tua nota.
- Contenuti, Vendite ai negozi, Direttore: in costruzione.
- Assistenza e ordini, Magazzino e acquisti, Contabilità: spenti fino ai primi ordini.

Ogni giro finisce nel registro attività con modello, token usati e costo stimato.

## Provarlo sul computer

Serve Node.js 20 o più recente.

```bash
npm install
npm run db:setup      # crea il database locale in .data/
npm run dev           # apre il pannello su http://localhost:3000
```

Senza `DATABASE_URL` il database è un file locale (PGlite): va bene per provare, ma regge un solo programma alla volta. Per far girare un agente da terminale chiudi prima il pannello:

```bash
npm run agent -- negozio
```

Per far lavorare gli agenti serve una chiave dell'API di Claude in `ANTHROPIC_API_KEY` (vedi `.env.example`). Si paga a consumo, a parte rispetto all'abbonamento Claude. Una bozza dell'agente Negozio costa pochi centesimi.

## Metterlo online (prossimo passo)

1. Database su [Neon](https://neon.tech) (piano gratuito): copia l'indirizzo in `DATABASE_URL`.
2. Pannello su [Vercel](https://vercel.com) (piano gratuito), collegato a questo repository, con le variabili di `.env.example`.
3. Per i giri programmati, Vercel Cron chiama `/api/agenti/<nome>` con l'intestazione `Authorization: Bearer <CRON_SECRET>`.

Le chiavi vanno solo nelle impostazioni di Vercel o nel file `.env` locale, mai nel codice.

## Modello di Claude

Gli agenti usano `claude-opus-5-5`. Per spendere meno si può scegliere un altro modello con `JARVIS_MODEL` (per esempio `claude-haiku-5-5`). Le richieste usano il fallback lato server (`fallbacks: "default"`): se il modello rifiuta, l'API riprova su un altro modello consigliato.

## Comandi

| Comando | Cosa fa |
| --- | --- |
| `npm run dev` | Pannello in locale |
| `npm run build` | Controlla e prepara la versione da pubblicare |
| `npm test` | Prove automatiche (con un database in memoria e un finto Claude) |
| `npm run typecheck` | Controllo dei tipi TypeScript |
| `npm run db:setup` | Crea tabelle e dati di partenza |
| `npm run agent -- <nome>` | Fa fare un giro a un agente |
