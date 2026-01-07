const pg = require('pg');
const { Client } = pg;

const CONNECTION_STRING = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

const categories = [
    {
        name: 'Life Essentials',
        icon: 'Home',
        color: '#3B82F6',
        subs: ['Groceries', 'Water Bill', 'Electricity Bill', 'Main Rent', 'Home Maintenance', 'Cooking Gas', 'Waste Disposal', 'Cleaning Supplies']
    },
    {
        name: 'Daily Transit',
        icon: 'Car',
        color: '#10B981',
        subs: ['Public Transport', 'Fuel Expense', 'Parking Fee', 'Car Wash', 'Vehicle Service', 'Taxi Rides', 'Toll Charges', 'Driver Salary']
    },
    {
        name: 'Wellness Health',
        icon: 'Stethoscope',
        color: '#EF4444',
        subs: ['Doctor Consultation', 'Pharmacy Bills', 'Dental Care', 'Eye Test', 'Lab Diagnostic', 'Hospital Charges', 'Health Supplement', 'Skin Rituals']
    },
    {
        name: 'Culinary Joy',
        icon: 'Utensils',
        color: '#F59E0B',
        subs: ['Fine Dining', 'Quick Lunch', 'Morning Coffee', 'Evening Snacks', 'Home Delivery', 'Street Food', 'Bakery Items', 'Special Dessert']
    },
    {
        name: 'Digital Lifestyle',
        icon: 'Smartphone',
        color: '#8B5CF6',
        subs: ['Internet Connection', 'Mobile Recharge', 'Cloud Platform', 'Streaming Service', 'Software Purchase', 'Gaming Credits', 'App Purchase', 'Social Promotion']
    },
    {
        name: 'Personal Care',
        icon: 'Scissors',
        color: '#EC4899',
        subs: ['Men Salon', 'Women Beauty', 'Gym Fee', 'Yoga Class', 'Spa Session', 'Perfume Fragrance', 'Shaving Kit', 'Hair Treatment']
    },
    {
        name: 'Fashion Apparel',
        icon: 'Shirt',
        color: '#F43F5E',
        subs: ['Formal Wear', 'Casual Dress', 'Sports Gear', 'Winter Coat', 'Watch Collection', 'Leather Goods', 'Shoe Purchase', 'Jewelry Item']
    },
    {
        name: 'Education Learning',
        icon: 'BookOpen',
        color: '#6366F1',
        subs: ['Tuition Payment', 'Course Material', 'Academic Book', 'Online Webinar', 'Skill Workshop', 'Exam Fee', 'Library Subscription', 'Career Coaching']
    },
    {
        name: 'Home Atmosphere',
        icon: 'Sun',
        color: '#D946EF',
        subs: ['Indoor Plant', 'Room Decor', 'Aroma Candle', 'Art Piece', 'Kitchen Utensil', 'Bedding Linen', 'Smart Hardware', 'Sound System']
    },
    {
        name: 'Family Support',
        icon: 'Heart',
        color: '#F97316',
        subs: ['Parent Allowance', 'Child Schooling', 'Baby Products', 'Family Gift', 'Shared Meal', 'Home Assistant', 'Sister Gift', 'Brother Help']
    },
    {
        name: 'Social Gathering',
        icon: 'Ticket',
        color: '#06B6D4',
        subs: ['Event Ticket', 'Party Expense', 'Friend Treat', 'Wedding Gift', 'Club Fee', 'Community Meet', 'Picnic Trip', 'Social Drink']
    },
    {
        name: 'Future Growth',
        icon: 'TrendingUp',
        color: '#14B8A6',
        subs: ['Stock Market', 'Saving Deposit', 'Crypto Asset', 'Mutual Fund', 'Retirement Plan', 'Real Estate', 'Gold Purchase', 'Cash Reserve']
    },
    {
        name: 'Venture Business',
        icon: 'Briefcase',
        color: '#475569',
        subs: ['Office Rent', 'Staff Payment', 'Product Stock', 'Marketing Ads', 'Legal Advice', 'Tech Hardware', 'Domain Name', 'Project Fee']
    },
    {
        name: 'Pet Companion',
        icon: 'Dog',
        color: '#854D0E',
        subs: ['Pet Food', 'Vet Visit', 'Pet Grooming', 'Toy Item', 'Pet Medicine', 'Cage Shelter', 'Pet Training', 'Boarding Service']
    },
    {
        name: 'Hobby Passion',
        icon: 'Palette',
        color: '#A855F7',
        subs: ['Photography Gear', 'Music Lesson', 'Painting Supply', 'Reading Book', 'Cycling Mod', 'Garden Tool', 'Craft Kit', 'Collectibles Item']
    },
    {
        name: 'Travel Escape',
        icon: 'Plane',
        color: '#22C55E',
        subs: ['Flight Ticket', 'Hotel Booking', 'Visa Cost', 'Vacation Tour', 'Luggage Bag', 'Local Tour', 'Passport Service', 'Holiday Shopping']
    },
    {
        name: 'Debt Recovery',
        icon: 'CreditCard',
        color: '#B91C1C',
        subs: ['Credit Installment', 'Personal Repay', 'Loan Interest', 'Bank Charge', 'Card Fee', 'EMI Payment', 'Debt Settlement', 'Penalty Fee']
    },
    {
        name: 'Insurance Safety',
        icon: 'ShieldCheck',
        color: '#1D4ED8',
        subs: ['Life Coverage', 'Medical Policy', 'Car Protection', 'Accident Plan', 'Travel Guard', 'Home Secure', 'Term Insurance', 'Critical Care']
    },
    {
        name: 'Gift Kindness',
        icon: 'HeartHandshake',
        color: '#DB2777',
        subs: ['Charity Hand', 'Poor Feed', 'School Fund', 'Blood Donor', 'Old Age', 'Religious Way', 'Animal Welfare', 'Orphan Care']
    },
    {
        name: 'Office Utility',
        icon: 'Laptop',
        color: '#334155',
        subs: ['Stationery Item', 'Laptop Repair', 'Desk Tools', 'Printer Ink', 'File Folder', 'Chair Comfort', 'Table Light', 'Coffee Machine']
    },
    {
        name: 'Security Guard',
        icon: 'ShieldPlus',
        color: '#0F172A',
        subs: ['Locker Rent', 'Gate Guard', 'CCTV Camera', 'Anti Virus', 'VPN Secure', 'Legal Paper', 'Cyber Defense', 'Smart Lock']
    },
    {
        name: 'Automotive Care',
        icon: 'Hammer',
        color: '#4B5563',
        subs: ['Tire Change', 'Oil Filter', 'Engine Spark', 'Brake Pad', 'Battery Charge', 'Wiper Blade', 'Body Polish', 'AC Service']
    },
    {
        name: 'Seasonal Ritual',
        icon: 'Sparkles',
        color: '#FDE047',
        subs: ['Eid Shopping', 'Puja Fashion', 'New Year', 'Birthday Party', 'Anniversary Gift', 'Summer Camp', 'Winter Wear', 'Rainy Gear']
    },
    {
        name: 'Cultural Heritage',
        icon: 'Landmark',
        color: '#92400E',
        subs: ['History Book', 'Museum Visit', 'Art Gallery', 'Handicraft Item', 'Music Fest', 'Village Trip', 'Traditional Food', 'Folk Event']
    },
    {
        name: 'Sports Kinetic',
        icon: 'Activity',
        color: '#16A34A',
        subs: ['Cricket Gear', 'Football Boot', 'Tennis Racket', 'Swimmer Goggle', 'Jersey Print', 'Court Rent', 'Coach Fee', 'Tournament Entry']
    },
    {
        name: 'Emergency Backup',
        icon: 'Zap',
        color: '#EAB308',
        subs: ['Sudden Repair', 'Medical Urge', 'Legal Crisis', 'Cash Loss', 'Phone Fix', 'Accident Cost', 'Backup Power', 'Towing Charge']
    },
    {
        name: 'Investment Goal',
        icon: 'Gem',
        color: '#0284C7',
        subs: ['Dream Home', 'New Car', 'World Tour', 'Higher Study', 'Grand Wedding', 'Business Launch', 'Luxury Watch', 'Island Trip']
    },
    {
        name: 'Subscription Box',
        icon: 'Layers',
        color: '#BE185D',
        subs: ['Book Club', 'Beauty Box', 'Coffee Pack', 'Socks Club', 'Meal Plan', 'Health Pack', 'Tech News', 'Niche Mag']
    },
    {
        name: 'Maintenance Task',
        icon: 'Settings',
        color: '#64748B',
        subs: ['Plumber Service', 'Worker Wage', 'Pipe Fix', 'Wall Paint', 'Roof Seal', 'Switch Board', 'Fan Repair', 'Fridge Gas']
    },
    {
        name: 'Legacy Trust',
        icon: 'Church',
        color: '#4338CA',
        subs: ['Will Drafting', 'Family Tree', 'Archive Digit', 'Heritage Save', 'Trust Fund', 'Estate Lawyer', 'Grandchild Bag', 'Philanthropy Fund']
    }
];

async function seed() {
    console.log('🚀 Starting Category Reconstruction with Conflict Handling...');

    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // 1. Create Legacy Category
        const legacyId = 'cat_legacy_uncategorized';
        await client.query(`
            INSERT INTO public.categories 
            (id, name, icon, color, type, is_global, updated_at, version, is_deleted, is_disabled, device_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id) DO NOTHING
        `, [legacyId, 'Legacy Uncategorized', 'Tag', '#71717A', 'EXPENSE', true, Date.now(), 1, false, false, 'seeder']);

        // 2. Prepare new categories
        const timestamp = Date.now();
        const finalItems = [];
        const newCatIds = new Set();
        newCatIds.add(legacyId);

        let parentOrder = 1;
        for (const cat of categories) {
            const parentId = `cat_${cat.name.toLowerCase().replace(/\s+/g, '_')}`;
            newCatIds.add(parentId);
            finalItems.push({
                id: parentId,
                name: cat.name,
                icon: cat.icon,
                color: cat.color,
                type: 'EXPENSE',
                is_global: true,
                parent_id: null,
                order: parentOrder++,
                updated_at: timestamp,
                version: 1,
                is_deleted: false,
                is_disabled: false,
                device_id: 'seeder'
            });

            cat.subs.forEach((sub, subIdx) => {
                const subId = `sub_${parentId.split('_')[1]}_${sub.toLowerCase().replace(/\s+/g, '_')}`;
                newCatIds.add(subId);
                finalItems.push({
                    id: subId,
                    name: sub,
                    icon: cat.icon,
                    color: cat.color,
                    type: 'EXPENSE',
                    is_global: true,
                    parent_id: parentId,
                    order: subIdx + 1,
                    updated_at: timestamp,
                    version: 1,
                    is_deleted: false,
                    is_disabled: false,
                    device_id: 'seeder'
                });
            });
        }

        // Add Income categories
        const incomeParentId = 'cat_income_sources';
        newCatIds.add(incomeParentId);
        finalItems.push({
            id: incomeParentId,
            name: 'Income Sources',
            icon: 'TrendingUp',
            color: '#10B981',
            type: 'INCOME',
            is_global: true,
            parent_id: null,
            order: parentOrder++,
            updated_at: timestamp,
            version: 1,
            is_deleted: false,
            is_disabled: false,
            device_id: 'seeder'
        });

        const incomeSubs = ['Salary', 'Freelance', 'Investment Return', 'Gift Received', 'Rental Income', 'Bonus', 'Tax Refund', 'Commission'];
        incomeSubs.forEach((sub, idx) => {
            const subId = `sub_income_${sub.toLowerCase().replace(/\s+/g, '_')}`;
            newCatIds.add(subId);
            finalItems.push({
                id: subId,
                name: sub,
                icon: 'TrendingUp',
                color: '#10B981',
                type: 'INCOME',
                is_global: true,
                parent_id: incomeParentId,
                order: idx + 1,
                updated_at: timestamp,
                version: 1,
                is_deleted: false,
                is_disabled: false,
                device_id: 'seeder'
            });
        });

        // 3. Insert new categories first (to avoid missing FK during update)
        console.log('📥 Inserting new categories...');
        const itemsPerBatch = 50;
        for (let i = 0; i < finalItems.length; i += itemsPerBatch) {
            const batch = finalItems.slice(i, i + itemsPerBatch);
            const batchQuery = `
                INSERT INTO public.categories 
                (id, name, icon, color, type, is_global, parent_id, "order", updated_at, version, is_deleted, is_disabled, device_id)
                VALUES ${batch.map((_, bi) => `($${bi * 13 + 1}, $${bi * 13 + 2}, $${bi * 13 + 3}, $${bi * 13 + 4}, $${bi * 13 + 5}, $${bi * 13 + 6}, $${bi * 13 + 7}, $${bi * 13 + 8}, $${bi * 13 + 9}, $${bi * 13 + 10}, $${bi * 13 + 11}, $${bi * 13 + 12}, $${bi * 13 + 13})`).join(',')}
                ON CONFLICT (id) DO UPDATE SET 
                    name = EXCLUDED.name,
                    icon = EXCLUDED.icon,
                    color = EXCLUDED.color,
                    parent_id = EXCLUDED.parent_id,
                    "order" = EXCLUDED.order,
                    updated_at = EXCLUDED.updated_at,
                    version = categories.version + 1
            `;
            const flat = batch.map(it => [it.id, it.name, it.icon, it.color, it.type, it.is_global, it.parent_id, it.order, it.updated_at, it.version, it.is_deleted, it.is_disabled, it.device_id]).flat();
            await client.query(batchQuery, flat);
        }

        // 4. Identify messy categories and reassign transactions
        console.log('🔄 Reassigning transactions from messy categories...');
        const newCatIdList = Array.from(newCatIds);
        await client.query(`
            UPDATE public.transactions 
            SET category_id = $1 
            WHERE category_id NOT IN (${newCatIdList.map((_, i) => `$${i + 2}`).join(',')})
        `, [legacyId, ...newCatIdList]);

        // 5. Delete old categories
        console.log('🗑️ Removing messy categories...');
        await client.query(`
            DELETE FROM public.categories 
            WHERE id NOT IN (${newCatIdList.map((_, i) => `$${i + 1}`).join(',')})
        `, newCatIdList);

        console.log('🎉 Reconstruction complete!');
    } catch (err) {
        console.error('❌ Error during reconstruction:', err);
    } finally {
        await client.end();
    }
}

seed();
