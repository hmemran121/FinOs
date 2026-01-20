import React from 'react';
import { useFeedback } from '../store/FeedbackContext';

const TestButton: React.FC = () => {
    const { showFeedback } = useFeedback();
    const handleClick = () => {
        console.log('🔥 TEST BUTTON CLICKED!');
        showFeedback('Test button works!', 'success');

        if (confirm('Do you want to proceed?')) {
            console.log('✅ User confirmed');
            showFeedback('Confirmed!', 'success');
        } else {
            console.log('❌ User cancelled');
        }
    };

    return (
        <div style={{ padding: '20px', background: '#1a1a1a', minHeight: '100vh' }}>
            <h1 style={{ color: 'white', marginBottom: '20px' }}>Button Test Page</h1>

            {/* Test 1: Simple button */}
            <button
                onClick={handleClick}
                style={{
                    padding: '15px 30px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    marginBottom: '20px',
                    display: 'block'
                }}
            >
                Test Button (Simple)
            </button>

            {/* Test 2: Async button */}
            <button
                onClick={async () => {
                    console.log('🔥 ASYNC BUTTON CLICKED!');
                    showFeedback('Async test button works!', 'info');

                    if (confirm('Async confirm test?')) {
                        console.log('✅ Async confirmed');
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        showFeedback('Async operation complete!', 'success');
                    }
                }}
                style={{
                    padding: '15px 30px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    marginBottom: '20px',
                    display: 'block'
                }}
            >
                Test Button (Async)
            </button>

            {/* Test 3: Button with confirm first */}
            <button
                onClick={() => {
                    if (confirm('Test confirm dialog?')) {
                        console.log('✅ Confirmed in test 3');
                        showFeedback('Test 3 confirmed!', 'success');
                    } else {
                        console.log('❌ Cancelled in test 3');
                    }
                }}
                style={{
                    padding: '15px 30px',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'block'
                }}
            >
                Test Button (Confirm First)
            </button>

            <div style={{ marginTop: '30px', padding: '15px', background: '#333', borderRadius: '8px' }}>
                <p style={{ color: '#10b981', fontFamily: 'monospace', fontSize: '12px' }}>
                    ✅ If you can see this page and click these buttons, React event handling works fine.
                </p>
                <p style={{ color: '#f59e0b', fontFamily: 'monospace', fontSize: '12px', marginTop: '10px' }}>
                    ⚠️ If these buttons work but Admin Panel button doesn't, the issue is specific to that component.
                </p>
            </div>
        </div>
    );
};

export default TestButton;
