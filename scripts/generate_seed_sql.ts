
import { createClient } from '@supabase/supabase-js';
// Hardcoded Global Categories Recostruction (since imports were cleared)
const GLOBAL_CATEGORIES = [
    // Income
    { id: 'g_inc', name: 'Income', icon: 'Wallet', color: '#10B981', type: 'INCOME', isGlobal: true, order: 1, isDisabled: false },
    { id: 'g_inc_sal', name: 'Salary', icon: 'Banknote', color: '#10B981', type: 'INCOME', isGlobal: true, parentId: 'g_inc', order: 1, isDisabled: false },
    { id: 'g_inc_bus', name: 'Business', icon: 'Briefcase', color: '#10B981', type: 'INCOME', isGlobal: true, parentId: 'g_inc', order: 2, isDisabled: false },
    { id: 'g_inc_inv', name: 'Investments', icon: 'TrendingUp', color: '#10B981', type: 'INCOME', isGlobal: true, parentId: 'g_inc', order: 3, isDisabled: false },

    // Expenses
    { id: 'g_exp', name: 'Expenses', icon: 'CreditCard', color: '#EF4444', type: 'EXPENSE', isGlobal: true, order: 2, isDisabled: false },
    { id: 'g_exp_food', name: 'Food & Dining', icon: 'Utensils', color: '#EF4444', type: 'EXPENSE', isGlobal: true, parentId: 'g_exp', order: 1, isDisabled: false },
    { id: 'g_exp_trans', name: 'Transportation', icon: 'Car', color: '#EF4444', type: 'EXPENSE', isGlobal: true, parentId: 'g_exp', order: 2, isDisabled: false },
    { id: 'g_exp_home', name: 'Housing', icon: 'Home', color: '#EF4444', type: 'EXPENSE', isGlobal: true, parentId: 'g_exp', order: 3, isDisabled: false },
    { id: 'g_exp_util', name: 'Utilities', icon: 'Zap', color: '#EF4444', type: 'EXPENSE', isGlobal: true, parentId: 'g_exp', order: 4, isDisabled: false },
    { id: 'g_exp_hlth', name: 'Health', icon: 'Stethoscope', color: '#EF4444', type: 'EXPENSE', isGlobal: true, parentId: 'g_exp', order: 5, isDisabled: false },
    { id: 'g_exp_ent', name: 'Entertainment', icon: 'Film', color: '#EF4444', type: 'EXPENSE', isGlobal: true, parentId: 'g_exp', order: 6, isDisabled: false },
    { id: 'g_exp_shop', name: 'Shopping', icon: 'ShoppingBag', color: '#EF4444', type: 'EXPENSE', isGlobal: true, parentId: 'g_exp', order: 7, isDisabled: false },

    // Savings
    { id: 'g_sav', name: 'Savings', icon: 'PiggyBank', color: '#A855F7', type: 'SAVING', isGlobal: true, order: 3, isDisabled: false },
    { id: 'g_sav_emg', name: 'Emergency Fund', icon: 'ShieldCheck', color: '#A855F7', type: 'SAVING', isGlobal: true, parentId: 'g_sav', order: 1, isDisabled: false },
    { id: 'g_sav_goal', name: 'Goals', icon: 'Flag', color: '#A855F7', type: 'SAVING', isGlobal: true, parentId: 'g_sav', order: 2, isDisabled: false },

    // Investments
    { id: 'g_inv', name: 'Investments', icon: 'PieChart', color: '#3B82F6', type: 'INVESTMENT', isGlobal: true, order: 4, isDisabled: false },
    { id: 'g_inv_stk', name: 'Stocks', icon: 'TrendingUp', color: '#3B82F6', type: 'INVESTMENT', isGlobal: true, parentId: 'g_inv', order: 1, isDisabled: false },
    { id: 'g_inv_cry', name: 'Crypto', icon: 'Bitcoin', color: '#3B82F6', type: 'INVESTMENT', isGlobal: true, parentId: 'g_inv', order: 2, isDisabled: false }
];

console.log(`Generating SQL for ${GLOBAL_CATEGORIES.length} categories...`);


// Load env vars if needed, or just use hardcoded for this script since it's local
const SUPABASE_URL = 'https://liwnjbvintygnvhgbguw.supabase.co';
// NOTE: To seed GLOBAL categories, you typically need the SERVICE_ROLE_KEY or be logged in as an admin.
// For this user-facing app, we might want to insert them as "system" user or just let the user own them for now if they are "global" in concept but local in DB.
// HOWEVER, the requirement is "fully dynamic... global category".
// If I use the ANON key, I can only create for the currently logged in user (if I authenticated).
// But this is a seed script.
// FOR NOW, I will assume we are inserting them for a specific user OR we need the service role key.
// Since I don't have the service role key, I will simulate "Global" by just inserting them with a specific system flag if possible, 
// BUT RLS prevents inserting "is_global=true" usually unless admin.
// Let's rely on the user running the SQL to setup the table.
// ACTUALLY, checking the `supabase.ts`, we only have ANON key.
// The user might need to insert these via the SQL Editor using a CSV or similar if they want true "Global" (system-wide) categories.
// OR, I can generate a SQL seed file instead of a TS one.
// Let's generate a SQL seed file which is much safer and can be run in the dashboard.

import fs from 'fs';
import path from 'path';

console.log("Generating SQL seed file...");
const sql = GLOBAL_CATEGORIES.map(c => {
    // Escape single quotes in names
    const name = c.name.replace(/'/g, "''");
    const parentId = c.parentId ? `'${c.parentId}'` : 'NULL';
    // Use NULL for system/global categories
    return `INSERT INTO public.categories (id, user_id, name, icon, color, type, is_global, parent_id, is_disabled, "order") VALUES ('${c.id}', NULL, '${name}', '${c.icon}', '${c.color}', '${c.type}', true, ${parentId}, ${c.isDisabled}, ${c.order}) ON CONFLICT (id) DO NOTHING;`;
}).join('\n');

const outputPath = path.resolve(process.cwd(), 'seed.sql');
fs.writeFileSync(outputPath, sql, 'utf8');
console.log(`✅ Generated seed.sql at ${outputPath}`);
