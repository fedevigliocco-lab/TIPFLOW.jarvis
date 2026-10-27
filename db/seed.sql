-- Dati di partenza (ottobre 2026). Si può rieseguire: non sovrascrive quello che hai cambiato.

insert into agents (id, name, department, kind, status, description, schedule, sort_order) values
  ('negozio', 'Negozio', 'Lancio', 'agente', 'acceso',
   'Prepara il negozio online: scheda prodotto, testi, prezzi e pacchi. Lavora solo in bozza: ogni proposta aspetta il tuo sì.', 'a mano', 10),
  ('contenuti', 'Contenuti', 'Lancio', 'agente', 'in costruzione',
   'Apre e cura Instagram e TikTok: idee e copioni per i video, calendario dei post, numeri della settimana.', null, 20),
  ('vendite-negozi', 'Vendite ai negozi', 'Lancio', 'agente', 'in costruzione',
   'Trova tabaccherie, smoke shop e grow shop, prepara i messaggi di presentazione e il listino all''ingrosso.', null, 30),
  ('assistenza-ordini', 'Assistenza e ordini', 'Gestione', 'agente', 'spento',
   'Risponde ai clienti, ogni mattina dice cosa spedire, crea le etichette e manda il tracking. Si accende col primo ordine.', null, 40),
  ('magazzino-acquisti', 'Magazzino e acquisti', 'Gestione', 'agente', 'spento',
   'Scala le scorte a ogni vendita, stima quando finiranno e prepara il riordino in Cina con mesi di anticipo.', null, 50),
  ('contabilita', 'Contabilità e report', 'Gestione', 'automazione', 'spento',
   'Incassi, costi, margine per canale e il rapporto delle 8 e delle 19 su WhatsApp.', null, 60),
  ('direttore', 'Direttore', 'Coordinamento', 'agente', 'in costruzione',
   'Coordina gli altri agenti e tiene in ordine la lista "I tuoi da fare".', null, 70)
on conflict (id) do nothing;

insert into products (sku, name, pack_size, price_cents) values
  ('TIP-10', 'Tipflow, pacco da 10 filtri', 10, 280),
  ('TIP-50', 'Tipflow, pacco da 50 filtri', 50, 1000)
on conflict (sku) do nothing;

insert into inventory (item, description, quantity, unit_cost_usd, location) values
  ('filtro', 'Filtro a carbone attivo con beccuccio integrato, logo Tipflow stampato', 8500, 0.0590, 'Milano, casa di fede')
on conflict (item) do nothing;
