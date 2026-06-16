-- Etape flux proiect — model din caiet (contract → proiectare → materiale → achiziții →
-- producție → vopsire/zincare → montaj site / PIF → livrare → finalizat).
-- Păstrăm id-urile etapelor existente (FK pe projects); adăugăm etape noi între order_index-uri.

-- === Actualizare descrieri etape existente (fără schimbare id) ===
UPDATE project_stages SET description = 'Titular contract, produs livrat, preț de vânzare, termen de execuție / PIF.'
WHERE name = 'ofertă aprobată';

UPDATE project_stages SET description = 'Proiectare: elemente deja proiectate (existente) și ce urmează de proiectat + termene.'
WHERE name = 'proiectare';

UPDATE project_stages SET description = 'Producție — debitare: laser/plasma, ferăstrău; conform documentației.'
WHERE name = 'debitare';

UPDATE project_stages SET description = 'Sudură și îmbinări structurale conform procedurilor.'
WHERE name = 'sudură';

UPDATE project_stages SET description = 'Ansamblare subansamble; detaliu: etape dedicate „Ansamblare primară / definitivă” în flux.'
WHERE name = 'asamblare';

UPDATE project_stages SET description = 'Finisaje, grund, protecții; poate include pregătire înainte de vopsire externă.'
WHERE name = 'finisare';

UPDATE project_stages SET description = 'Teste funcționale, calitate, verificări înainte de livrare/montaj site.'
WHERE name = 'testare';

UPDATE project_stages SET description = 'Livrare către client / șantier (avize), pregătire montaj.'
WHERE name = 'livrare';

UPDATE project_stages SET description = 'Proiect închis, facturat, predat.'
WHERE name = 'finalizat';

-- === Etape noi (UNIQUE pe name) — ordinea în tablă de bord = order_index ===
INSERT INTO project_stages (name, order_index, description)
SELECT 'necesar materiale - stoc hală', 25, 'Necesar materiale: ce există deja în hală / stoc intern.'
WHERE NOT EXISTS (SELECT 1 FROM project_stages WHERE name = 'necesar materiale - stoc hală');

INSERT INTO project_stages (name, order_index, description)
SELECT 'necesar materiale - de comandat', 27, 'Necesar materiale: de comandat (cantități, termene).'
WHERE NOT EXISTS (SELECT 1 FROM project_stages WHERE name = 'necesar materiale - de comandat');

INSERT INTO project_stages (name, order_index, description)
SELECT 'achizitii materiale si repere', 29, 'Comenzi furnizori: furnizor, termen livrare (comandă lansată), dată livrare, verificare (check).'
WHERE NOT EXISTS (SELECT 1 FROM project_stages WHERE name = 'achizitii materiale si repere');

INSERT INTO project_stages (name, order_index, description)
SELECT 'ansamblare primara', 32, 'Ansamblare primară (subansamble, etapă intermediară).'
WHERE NOT EXISTS (SELECT 1 FROM project_stages WHERE name = 'ansamblare primara');

INSERT INTO project_stages (name, order_index, description)
SELECT 'ansamblare definitiva', 34, 'Ansamblare definitivă înainte de finisaje / tratamente externe.'
WHERE NOT EXISTS (SELECT 1 FROM project_stages WHERE name = 'ansamblare definitiva');

INSERT INTO project_stages (name, order_index, description)
SELECT 'productie - alte operatii', 36, 'Alte operații de producție necuprinse în debitare sau ansamblare.'
WHERE NOT EXISTS (SELECT 1 FROM project_stages WHERE name = 'productie - alte operatii');

INSERT INTO project_stages (name, order_index, description)
SELECT 'vopsire', 52, 'Vopsire: cantități, specificații tehnice, comandă, verificare achiziție, livrare (aviz client, dată).'
WHERE NOT EXISTS (SELECT 1 FROM project_stages WHERE name = 'vopsire');

INSERT INTO project_stages (name, order_index, description)
SELECT 'zincare', 54, 'Zincare: expediere la zincare (aviz), retur marfă zincată (aviz, CMR etc.), livrare directă client dacă e cazul.'
WHERE NOT EXISTS (SELECT 1 FROM project_stages WHERE name = 'zincare');

INSERT INTO project_stages (name, order_index, description)
SELECT 'montaj site - mecanic', 63, 'Montaj la client — mecanic: muncitori / echipe, termen.'
WHERE NOT EXISTS (SELECT 1 FROM project_stages WHERE name = 'montaj site - mecanic');

INSERT INTO project_stages (name, order_index, description)
SELECT 'montaj site - electric si PIF', 66, 'Montaj electric + punere în funcțiune (PIF): personal, termen.'
WHERE NOT EXISTS (SELECT 1 FROM project_stages WHERE name = 'montaj site - electric si PIF');

-- === Proiecte fără etape custom (piese): șablon complet din caiet (o singură dată per proiect) ===
INSERT INTO project_custom_stages (project_id, name, order_index, description, status)
SELECT p.id, v.name, v.order_index, v.description, 'planificat'
FROM projects p
CROSS JOIN (
    SELECT 'Contract și produs' AS name, 10 AS order_index, 'Titular contract, produs livrat, preț vânzare, termen execuție / PIF.' AS description
    UNION ALL SELECT 'Proiectare', 20, 'Elemente proiectate existente; ce urmează proiectat + termene.'
    UNION ALL SELECT 'Necesar materiale — stoc hală', 30, 'Materiale deja în hală / stoc.'
    UNION ALL SELECT 'Necesar materiale — de comandat', 40, 'Materiale de achiziționat.'
    UNION ALL SELECT 'Achiziții materiale și repere', 50, 'Furnizor, termen livrare (comandă lansată), dată livrare, verificare.'
    UNION ALL SELECT 'Debitare', 60, 'Laser/plasma, ferăstrău.'
    UNION ALL SELECT 'Ansamblare primară', 70, 'Ansamblare intermediară.'
    UNION ALL SELECT 'Ansamblare definitivă', 80, 'Înainte de finisaje / tratamente externe.'
    UNION ALL SELECT 'Alte operații producție', 90, 'Alte faze pe șopron.'
    UNION ALL SELECT 'Vopsire', 100, 'Cantități, specificații, comandă, livrare (aviz), dată.'
    UNION ALL SELECT 'Zincare', 110, 'Expediere aviz, retur zincat (CMR etc.), livrare directă client dacă e cazul.'
    UNION ALL SELECT 'Montaj site — mecanic', 120, 'Muncitori / echipe, termen.'
    UNION ALL SELECT 'Montaj site — electric și PIF', 130, 'Personal electric, punere în funcțiune.'
    UNION ALL SELECT 'Livrare / testare', 140, 'Livrare client, verificări finale.'
    UNION ALL SELECT 'Finalizat', 150, 'Închis, facturat.'
) AS v
WHERE NOT EXISTS (SELECT 1 FROM project_custom_stages s WHERE s.project_id = p.id);
