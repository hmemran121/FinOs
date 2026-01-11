
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.VITE_GEMINI_API_KEY || "AIzaSyBnr0wOZMNJv8ymth_Fsi-BB07ZPkYfB5I";

async function check(version) {
    const url = `https://generativelanguage.googleapis.com/${version}/models?key=${key}`;
    console.log(`Fetching ${version}...`);
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.log(`Status: ${res.status}`);
            const txt = await res.text();
            console.log(txt);
            return;
        }
        const data = await res.json();
        const names = (data.models || []).map(m => m.name.replace(`models/`, ''));
        console.log(`Found ${names.length} models:`);
        console.log(names.filter(n => n.includes('embedding')).join(', '));
    } catch (e) {
        console.error(e);
    }
}

async function run() {
    await check('v1beta');
    console.log("---");
    await check('v1');
}

run();
