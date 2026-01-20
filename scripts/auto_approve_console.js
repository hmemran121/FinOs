// BOOKMARK THIS SCRIPT
// Run this in browser console ONCE after each page load
// It will auto-approve all confirm dialogs

console.log('🔧 Installing Auto-Approve for Confirm Dialogs...');

// Override window.confirm to always return true
window.confirm = function (message) {
    console.log('⚡ [AUTO-APPROVE] Confirm dialog intercepted:', message);
    console.log('✅ [AUTO-APPROVE] Automatically approved');
    return true;
};

console.log('✅ Auto-Approve installed!');
console.log('💡 All confirm() dialogs will now auto-approve');
console.log('🔄 This will reset on page refresh - run this script again if needed');
