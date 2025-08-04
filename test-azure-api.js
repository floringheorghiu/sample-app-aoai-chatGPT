// Simple test script to verify Azure OpenAI backend connectivity
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAzureAPI() {
  console.log('🚀 Testing Azure OpenAI backend connectivity...\n');
  
  const testMessage = {
    messages: [
      {
        id: 'test-' + Date.now(),
        role: 'user',
        content: 'Cum pot să-mi fac prieteni noi la școală?',
        date: new Date().toISOString()
      }
    ]
  };

  try {
    console.log('📤 Sending request to /conversation endpoint...');
    console.log('Question:', testMessage.messages[0].content);
    console.log('');

    const response = await fetch('http://localhost:3000/conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMessage)
    });

    console.log('📊 Response Status:', response.status, response.statusText);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('');

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error Response Body:', errorText);
      return;
    }

    // Check if it's a streaming response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/plain')) {
      console.log('📡 Streaming response detected, reading chunks...\n');
      
      const reader = response.body.getReader();
      let fullResponse = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        fullResponse += chunk;
        
        // Try to parse each line as JSON
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.choices && parsed.choices[0] && parsed.choices[0].messages) {
                for (const msg of parsed.choices[0].messages) {
                  if (msg.role === 'assistant' && msg.content) {
                    console.log('🤖 AI Response chunk:', msg.content);
                  }
                }
              }
            } catch (e) {
              // Not JSON, might be partial chunk
              console.log('📝 Raw chunk:', line);
            }
          }
        }
      }
      
      console.log('\n✅ Full streaming response received');
      console.log('📄 Complete response length:', fullResponse.length, 'characters');
      
    } else {
      // Regular JSON response
      const responseData = await response.json();
      console.log('✅ JSON Response received:');
      console.log(JSON.stringify(responseData, null, 2));
    }

  } catch (error) {
    console.log('❌ Request failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Backend server might not be running on localhost:3000');
      console.log('💡 Make sure to start the backend server first');
    }
  }
}

// Run the test
testAzureAPI().then(() => {
  console.log('\n🏁 Test completed');
}).catch(error => {
  console.log('\n💥 Test failed:', error.message);
});