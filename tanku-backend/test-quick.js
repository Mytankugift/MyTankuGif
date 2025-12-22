/**
 * Script rápido para probar el servidor
 * Ejecutar: node test-quick.js
 */

const BASE_URL = 'http://localhost:9000';

async function test() {
  console.log('🧪 Iniciando pruebas rápidas...\n');

  try {
    // 1. Health Check
    console.log('1️⃣ Probando Health Check...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    console.log('✅ Health Check:', health);
    console.log('');

    // 2. API Info
    console.log('2️⃣ Probando API Info...');
    const apiRes = await fetch(`${BASE_URL}/api/v1`);
    const api = await apiRes.json();
    console.log('✅ API Info:', api);
    console.log('');

    // 3. Registrar Usuario
    console.log('3️⃣ Probando Registro...');
    const registerRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test${Date.now()}@example.com`,
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      }),
    });
    
    if (registerRes.ok) {
      const registerData = await registerRes.json();
      console.log('✅ Registro exitoso!');
      console.log('   User ID:', registerData.data.user.id);
      console.log('   Email:', registerData.data.user.email);
      console.log('   Token generado:', registerData.data.accessToken ? '✅' : '❌');
      console.log('');
      
      // 4. Login con el usuario creado
      console.log('4️⃣ Probando Login...');
      const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerData.data.user.email,
          password: 'password123',
        }),
      });
      
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        console.log('✅ Login exitoso!');
        console.log('   Token generado:', loginData.data.accessToken ? '✅' : '❌');
        console.log('');
        
        // 5. Probar Refresh Token
        if (loginData.data.refreshToken) {
          console.log('5️⃣ Probando Refresh Token...');
          const refreshRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              refreshToken: loginData.data.refreshToken,
            }),
          });
          
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            console.log('✅ Refresh Token exitoso!');
            console.log('   Nuevo token generado:', refreshData.data.accessToken ? '✅' : '❌');
            console.log('');
          } else {
            const error = await refreshRes.text();
            console.log('❌ Error en Refresh Token:', error);
          }
        }
      } else {
        const error = await loginRes.text();
        console.log('❌ Error en Login:', error);
      }
    } else {
      const error = await registerRes.text();
      console.log('❌ Error en Registro:', error);
    }

    console.log('\n✅ Pruebas completadas!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Asegúrate de que:');
    console.error('   1. El servidor esté corriendo (npm run dev)');
    console.error('   2. Las bases de datos estén configuradas');
    console.error('   3. El archivo .env esté completo');
  }
}

test();
