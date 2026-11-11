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

insert into settings (key, value) values
  ('titolo', 'Ti è piaciuto il filtro?'),
  ('testo', 'Carbone attivo e beccuccio integrato: fumo più pulito e più fresco. Scrivici su WhatsApp per averne altri.'),
  ('whatsapp', ''),
  ('messaggio_whatsapp', 'Ciao! Ho provato i filtri Tipflow e vorrei ordinarne altri.'),
  ('instagram', ''),
  ('sito', ''),
  ('prezzo', '20'),
  ('pezzi', '100')
on conflict (key) do nothing;

insert into qr_codes (code, label) values
  ('p1', 'Primi pacchi (giro dell''amico)')
on conflict (code) do nothing;

-- Novembre 2026: l'agente Assistenza risponde da solo ai clienti su WhatsApp.
update agents set status = 'acceso', schedule = 'a ogni messaggio',
  description = 'Risponde da solo ai clienti su WhatsApp, a qualsiasi messaggio: domande, ordini, problemi. Prende gli ordini, scala il magazzino e ti chiama solo quando serve davvero.'
where id = 'assistenza-ordini' and schedule is distinct from 'a ogni messaggio';

insert into settings (key, value) values
  ('spedizione', ''),
  ('pagamento', ''),
  ('istruzioni_assistenza', '')
on conflict (key) do nothing;

-- 11 novembre 2026, risposte di fede: consegna a mano in tutta Milano, spedizioni ovunque ma costo da fissare.
-- Si scrive solo se il campo è ancora vuoto: quello che fede cambia da Clienti non viene toccato.
update settings set value = 'Consegna a mano gratis in tutta Milano: chiedi al cliente zona e quando gli va bene, mettilo nell''indirizzo e nelle note dell''ordine, e digli che gli scrivi per fissare luogo e orario.
Spedizione in Italia e all''estero: si fa, ma il costo esatto non è ancora fissato (in Italia indicativamente intorno ai 7 €, spedizione tracciata). Prendi comunque l''ordine senza costo di spedizione e di'' che il costo esatto glielo confermi prima del pagamento.
Non promettere tempi di consegna precisi: di'' che di solito parte in pochi giorni.'
where key = 'spedizione' and value = '';

update settings set value = 'PayPal: dopo l''ordine di'' al cliente che a breve gli mandi il link PayPal per pagare il totale (se qui sotto c''è un link paypal.me, mandalo tu con l''importo). La merce parte dopo il pagamento.
Consegna a mano a Milano: si può pagare anche in contanti alla consegna.'
where key = 'pagamento' and value = '';
