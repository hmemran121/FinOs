-- HYPER-UNIQUE MODERN TAXONOMY
-- This script adds cutting-edge daily life needs while maintaining professional standards.

-- 1. DIGITAL INFRASTRUCTURE & AI (Modern Essentials)
INSERT INTO public.categories (id, name, icon, color, type, is_global, parent_id, "order") VALUES 
('cat_digi', 'Digital Infra & AI', 'Laptop', '#8B5CF6', 'EXPENSE', true, NULL, 10) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.categories (id, name, icon, color, type, is_global, parent_id, "order") VALUES 
('sub_digi_ai', 'AI Agents & LLM Subs', 'Zap', '#8B5CF6', 'EXPENSE', true, 'cat_digi', 1),
('sub_digi_cloud', 'Cloud Storage & Backup', 'Layers', '#8B5CF6', 'EXPENSE', true, 'cat_digi', 2),
('sub_digi_virt', 'Virtual Goods & Assets', 'Gem', '#8B5CF6', 'EXPENSE', true, 'cat_digi', 3),
('sub_digi_web', 'Domains & Web Presence', 'Globe', '#8B5CF6', 'EXPENSE', true, 'cat_digi', 4)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. BIO-HACKING & LONGEVITY
INSERT INTO public.categories (id, name, icon, color, type, is_global, parent_id, "order") VALUES 
('cat_bio', 'Bio-Optimization', 'Activity', '#10B981', 'EXPENSE', true, NULL, 11) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.categories (id, name, icon, color, type, is_global, parent_id, "order") VALUES 
('sub_bio_wear', 'Health Wearable Subs', 'Watch', '#10B981', 'EXPENSE', true, 'cat_bio', 1),
('sub_bio_supp', 'Nootropics & Longevity', 'Stethoscope', '#10B981', 'EXPENSE', true, 'cat_bio', 2),
('sub_bio_sleep', 'Sleep & Recovery Tools', 'Moon', '#10B981', 'EXPENSE', true, 'cat_bio', 3)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 3. REGENERATIVE & ECO-LIVING
INSERT INTO public.categories (id, name, icon, color, type, is_global, parent_id, "order") VALUES 
('cat_eco', 'Regenerative Living', 'Trees', '#22C55E', 'EXPENSE', true, NULL, 12) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.categories (id, name, icon, color, type, is_global, parent_id, "order") VALUES 
('sub_eco_refill', 'Zero-Waste & Refills', 'Droplet', '#22C55E', 'EXPENSE', true, 'cat_eco', 1),
('sub_eco_offset', 'ESG & Carbon Offsets', 'Globe', '#22C55E', 'EXPENSE', true, 'cat_eco', 2),
('sub_eco_gard', 'Urban Gardening/Compost', 'Trees', '#22C55E', 'EXPENSE', true, 'cat_eco', 3)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 4. HOME ATMOSPHERE & LUXURY
INSERT INTO public.categories (id, name, icon, color, type, is_global, parent_id, "order") VALUES 
('cat_lux', 'Home Curation', 'Sun', '#F59E0B', 'EXPENSE', true, NULL, 13) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.categories (id, name, icon, color, type, is_global, parent_id, "order") VALUES 
('sub_lux_flow', 'Floral & Indoor Plants', 'Trees', '#F59E0B', 'EXPENSE', true, 'cat_lux', 1),
('sub_lux_scent', 'Aromatherapy & Scent', 'Flame', '#F59E0B', 'EXPENSE', true, 'cat_lux', 2),
('sub_lux_art', 'Digital/Physical Art', 'Palette', '#F59E0B', 'EXPENSE', true, 'cat_lux', 3)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 5. NICHE HOBBIES & COLLECTIBLES
INSERT INTO public.categories (id, name, icon, color, type, is_global, parent_id, "order") VALUES 
('cat_niche', 'Niche Collectibles', 'Gem', '#EC4899', 'EXPENSE', true, NULL, 14) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.categories (id, name, icon, color, type, is_global, parent_id, "order") VALUES 
('sub_niche_vinyl', 'Hi-Fi Audio & Vinyl', 'Music', '#EC4899', 'EXPENSE', true, 'cat_niche', 1),
('sub_niche_stat', 'Stationery & Pens', 'Scissors', '#EC4899', 'EXPENSE', true, 'cat_niche', 2),
('sub_niche_mod', 'Custom Keyboards/PC', 'Laptop', '#EC4899', 'EXPENSE', true, 'cat_niche', 3)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 6. PERSONAL LEGACY & ANCESTRY
INSERT INTO public.categories (id, name, icon, color, type, is_global, parent_id, "order") VALUES 
('cat_leg', 'Personal Legacy', 'Heart', '#6366F1', 'EXPENSE', true, NULL, 15) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.categories (id, name, icon, color, type, is_global, parent_id, "order") VALUES 
('sub_leg_anc', 'Ancestry & Genealogy', 'Users', '#6366F1', 'EXPENSE', true, 'cat_leg', 1),
('sub_leg_arch', 'Heritage Archiving', 'BookOpen', '#6366F1', 'EXPENSE', true, 'cat_leg', 2)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- RE-ASSERT EXISTING DAILY NECESSITIES (To ensure they stay unique and present)
INSERT INTO public.categories (id, name, icon, color, type, is_global, parent_id, "order") VALUES 
('cat_food', 'Consumption/Dining', 'Utensils', '#F59E0B', 'EXPENSE', true, NULL, 2) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, name, icon, color, type, is_global, parent_id, "order") VALUES 
('sub_food_gro', 'Main Groceries', 'ShoppingBag', '#F59E0B', 'EXPENSE', true, 'cat_food', 1) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, name, icon, color, type, is_global, parent_id, "order") VALUES 
('gro_veg', 'Vegetables & Fresh Produce', 'Trees', '#F59E0B', 'EXPENSE', true, 'sub_food_gro', 1),
('gro_fru', 'Fruits & Berries', 'Apple', '#F59E0B', 'EXPENSE', true, 'sub_food_gro', 2),
('gro_ric', 'Rice, Grains & Pulses', 'Coins', '#F59E0B', 'EXPENSE', true, 'sub_food_gro', 3),
('gro_pro', 'Meat, Poultry & Fish', 'Utensils', '#F59E0B', 'EXPENSE', true, 'sub_food_gro', 4),
('gro_dai', 'Dairy, Eggs & Milk', 'Droplet', '#F59E0B', 'EXPENSE', true, 'sub_food_gro', 5),
('gro_spi', 'Spices, Oils & Condiments', 'Flame', '#F59E0B', 'EXPENSE', true, 'sub_food_gro', 6),
('gro_bak', 'Bakery & Bread', 'Coffee', '#F59E0B', 'EXPENSE', true, 'sub_food_gro', 7)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;