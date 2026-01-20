// Quick fix script to bypass the broken window.confirm() dialog
// Run this in the browser console BEFORE clicking the Global Data Repair button

console.log('🔧 [FIX] Overriding window.confirm to always return true...');

// Store the original confirm function
const originalConfirm = window.confirm;

// Override window.confirm to always return true
window.confirm = function (message) {
    console.log('⚡ [OVERRIDE] window.confirm called with message:', message);
    console.log('✅ [OVERRIDE] Auto-returning true (bypassing broken dialog)');
    return true;
};

console.log('✅ [FIX] window.confirm override installed!');
console.log('📝 [FIX] Now click the "Global Data Repair" button');
console.log('🔄 [FIX] To restore original behavior, run: window.confirm = originalConfirm');

// Make originalConfirm available globally for restoration
window._originalConfirm = originalConfirm;
