-- Deplasări: a 4th explicit cost rubric "Mâncare" (food), alongside transport,
-- cazare (accommodation_cost) and costuri materiale suplimentare (other_costs).
-- Per-diem (diurnă) stays a separate allowance line.
ALTER TABLE deplasari ADD COLUMN food_cost REAL DEFAULT 0;
