#!/bin/bash

# Script para iniciar desarrollo con túnel ngrok para ePayco
# Uso: ./scripts/start-dev-with-tunnel.sh

echo "🚀 Iniciando desarrollo con túnel para ePayco..."
echo ""
echo "⚠️  IMPORTANTE: Asegúrate de que tu backend esté corriendo en el puerto 9000"
echo ""

# Verificar si ngrok está instalado
if ! command -v ngrok &> /dev/null; then
    echo "❌ Error: ngrok no está instalado"
    echo ""
    echo "Instala ngrok desde: https://ngrok.com/download"
    echo "O con brew: brew install ngrok"
    echo "O con npm: npm install -g ngrok"
    exit 1
fi

# Verificar si el puerto 9000 está en uso
if ! lsof -Pi :9000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Advertencia: No se detectó actividad en el puerto 9000"
    echo "   Asegúrate de que tu backend esté corriendo antes de continuar"
    echo ""
    read -p "¿Deseas continuar de todos modos? (s/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 0
    fi
fi

# Iniciar ngrok en background
echo "📡 Iniciando ngrok en el puerto 9000..."
ngrok http 9000 > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

# Esperar a que ngrok se inicie
echo "⏳ Esperando a que ngrok se inicie..."
sleep 4

# Obtener la URL pública
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$NGROK_URL" ]; then
    echo "❌ Error: No se pudo obtener la URL de ngrok"
    echo ""
    echo "Verifica que:"
    echo "1. Ngrok se haya iniciado correctamente"
    echo "2. Puedas acceder a http://localhost:4040"
    kill $NGROK_PID 2>/dev/null
    exit 1
fi

echo ""
echo "✅ URL pública obtenida: $NGROK_URL"
echo ""
echo "📝 Actualiza tu .env.local con:"
echo "NEXT_PUBLIC_EPAYCO_WEBHOOK_URL=$NGROK_URL"
echo ""
echo "💡 También puedes ejecutar:"
echo "echo 'NEXT_PUBLIC_EPAYCO_WEBHOOK_URL=$NGROK_URL' >> .env.local"
echo ""
echo "⚠️  Recuerda reiniciar tu servidor de Next.js después de actualizar .env.local"
echo ""
echo "Presiona Ctrl+C para detener ngrok"
echo ""

# Función para limpiar al salir
cleanup() {
    echo ""
    echo "Deteniendo ngrok..."
    kill $NGROK_PID 2>/dev/null
    echo "✅ Ngrok detenido"
    exit 0
}

trap cleanup INT TERM

# Mantener el script corriendo
wait $NGROK_PID

