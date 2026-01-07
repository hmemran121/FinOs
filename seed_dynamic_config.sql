
-- Seed Currencies
INSERT INTO public.currencies (code, name, symbol) VALUES
('USD', 'US Dollar', '$'),
('EUR', 'Euro', '€'),
('GBP', 'British Pound', '£'),
('JPY', 'Japanese Yen', '¥'),
('CNY', 'Chinese Yuan', '¥'),
('INR', 'Indian Rupee', '₹'),
('BDT', 'Bangladeshi Taka', '৳'),
('CAD', 'Canadian Dollar', 'C$'),
('AUD', 'Australian Dollar', 'A$'),
('BRL', 'Brazilian Real', 'R$'),
('AED', 'UAE Dirham', 'د.إ'),
('SAR', 'Saudi Riyal', '﷼'),
('KRW', 'South Korean Won', '₩'),
('SGD', 'Singapore Dollar', 'S$'),
('CHF', 'Swiss Franc', 'Fr'),
('RUB', 'Russian Ruble', '₽'),
('TRY', 'Turkish Lira', '₺'),
('IDR', 'Indonesian Rupiah', 'Rp'),
('THB', 'Thai Baht', '฿'),
('MXN', 'Mexican Peso', '$')
ON CONFLICT (code) DO NOTHING;

-- Seed Channel Types
INSERT INTO public.channel_types (id, name, icon_name, color, is_default) VALUES
('CASH', 'CASH', 'Coins', '#3B82F6', true),
('BANK', 'BANK', 'Landmark', '#10B981', true),
('CARD', 'CARD', 'CreditCard', '#F59E0B', true),
('MOBILE', 'MOBILE', 'Smartphone', '#A855F7', true)
ON CONFLICT (id) DO NOTHING;
