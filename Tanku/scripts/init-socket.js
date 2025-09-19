#!/usr/bin/env node

const http = require('http');

const initializeSocket = async () => {
  try {
    console.log('🔌 Initializing Socket.IO server...');
    
    const options = {
      hostname: 'localhost',
      port: 9000,
      path: '/socket/initialize',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success) {
            console.log('✅ Socket.IO server initialized successfully!');
            console.log(`📡 Socket URL: ${response.data?.socketUrl || 'http://localhost:9000'}`);
          } else {
            console.error('❌ Failed to initialize Socket.IO:', response.error);
          }
        } catch (error) {
          console.error('❌ Error parsing response:', error.message);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error initializing Socket.IO:', error.message);
      console.log('💡 Make sure the Medusa server is running on port 9000');
    });

    req.end();
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
};

// Ejecutar la inicialización
initializeSocket();
