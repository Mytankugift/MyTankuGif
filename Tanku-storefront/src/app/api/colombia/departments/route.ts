import { NextRequest, NextResponse } from "next/server"

// API pública gratuita - Geonames (requiere registro gratuito en geonames.org)
// O usar datos públicos de Colombia desde una fuente confiable
const GEONAMES_USERNAME = process.env.GEONAMES_USERNAME || "demo"

export async function GET(request: NextRequest) {
  try {
    // Intentar obtener datos desde Geonames API
    // Colombia geonameId = 3686110
    const departmentsResponse = await fetch(
      `https://secure.geonames.org/childrenJSON?geonameId=3686110&username=${GEONAMES_USERNAME}`,
      { 
        cache: "force-cache", 
        next: { revalidate: 86400 }, // Cachear por 24 horas
        headers: {
          'Accept': 'application/json',
        }
      }
    )

    if (!departmentsResponse.ok) {
      throw new Error(`Geonames API error: ${departmentsResponse.status}`)
    }

    const departmentsData = await departmentsResponse.json()
    
    if (!departmentsData.geonames || departmentsData.geonames.length === 0) {
      // Geonames puede retornar vacío con username=demo, usar fallback silenciosamente
      console.warn("Geonames API retornó datos vacíos, usando datos estáticos")
      return NextResponse.json(getStaticColombiaData())
    }

    // Obtener ciudades para cada departamento
    const departmentsWithCities = await Promise.all(
      departmentsData.geonames.slice(0, 33).map(async (dept: any) => { // Limitar a 33 departamentos
        try {
          const citiesResponse = await fetch(
            `https://secure.geonames.org/childrenJSON?geonameId=${dept.geonameId}&username=${GEONAMES_USERNAME}&maxRows=100`,
            { 
              cache: "force-cache", 
              next: { revalidate: 86400 },
              headers: {
                'Accept': 'application/json',
              }
            }
          )
          
          if (citiesResponse.ok) {
            const citiesData = await citiesResponse.json()
            return {
              id: dept.geonameId,
              name: dept.name,
              cities: (citiesData.geonames || []).map((city: any) => ({
                id: city.geonameId,
                name: city.name,
              })),
              hasError: false,
            }
          } else {
            console.warn(`Error HTTP ${citiesResponse.status} obteniendo ciudades para ${dept.name}`)
          }
        } catch (error) {
          console.error(`Error obteniendo ciudades para ${dept.name}:`, error)
        }
        
        // Retornar departamento con indicador de error en lugar de filtrarlo
        return {
          id: dept.geonameId,
          name: dept.name,
          cities: [],
          hasError: true,
        }
      })
    )

    // No filtrar departamentos - mantener todos, incluso los que fallaron
    return NextResponse.json(departmentsWithCities)
  } catch (error: any) {
    console.error("Error obteniendo datos de Geonames:", error)
    // Fallback a datos estáticos completos si la API falla
    return NextResponse.json(getStaticColombiaData())
  }
}

// Datos estáticos de Colombia como fallback
function getStaticColombiaData() {
  const staticData = [
    {
      id: 1,
      name: "Antioquia",
      cities: [
        { id: 101, name: "Medellín" },
        { id: 102, name: "Bello" },
        { id: 103, name: "Itagüí" },
        { id: 104, name: "Envigado" },
        { id: 105, name: "Apartadó" },
        { id: 106, name: "Turbo" },
        { id: 107, name: "Rionegro" },
        { id: 108, name: "La Ceja" },
        { id: 109, name: "Copacabana" },
        { id: 110, name: "Girardota" },
      ],
    },
    {
      id: 2,
      name: "Atlántico",
      cities: [
        { id: 201, name: "Barranquilla" },
        { id: 202, name: "Soledad" },
        { id: 203, name: "Malambo" },
        { id: 204, name: "Sabanagrande" },
        { id: 205, name: "Puerto Colombia" },
        { id: 206, name: "Galapa" },
        { id: 207, name: "Sabanalarga" },
      ],
    },
    {
      id: 3,
      name: "Bogotá D.C.",
      cities: [
        { id: 301, name: "Bogotá" },
      ],
    },
    {
      id: 4,
      name: "Bolívar",
      cities: [
        { id: 401, name: "Cartagena" },
        { id: 402, name: "Magangué" },
        { id: 403, name: "Turbaco" },
        { id: 404, name: "Arjona" },
        { id: 405, name: "San Pablo" },
        { id: 406, name: "Santa Rosa" },
      ],
    },
    {
      id: 5,
      name: "Boyacá",
      cities: [
        { id: 501, name: "Tunja" },
        { id: 502, name: "Duitama" },
        { id: 503, name: "Sogamoso" },
        { id: 504, name: "Chiquinquirá" },
        { id: 505, name: "Villa de Leyva" },
        { id: 506, name: "Paipa" },
      ],
    },
    {
      id: 6,
      name: "Caldas",
      cities: [
        { id: 601, name: "Manizales" },
        { id: 602, name: "La Dorada" },
        { id: 603, name: "Riosucio" },
        { id: 604, name: "Chinchiná" },
        { id: 605, name: "Villamaría" },
      ],
    },
    {
      id: 7,
      name: "Caquetá",
      cities: [
        { id: 701, name: "Florencia" },
        { id: 702, name: "San Vicente del Caguán" },
        { id: 703, name: "El Doncello" },
      ],
    },
    {
      id: 8,
      name: "Cauca",
      cities: [
        { id: 801, name: "Popayán" },
        { id: 802, name: "Santander de Quilichao" },
        { id: 803, name: "Puerto Tejada" },
      ],
    },
    {
      id: 9,
      name: "Cesar",
      cities: [
        { id: 901, name: "Valledupar" },
        { id: 902, name: "Aguachica" },
        { id: 903, name: "Codazzi" },
        { id: 904, name: "La Paz" },
      ],
    },
    {
      id: 10,
      name: "Córdoba",
      cities: [
        { id: 1001, name: "Montería" },
        { id: 1002, name: "Sincelejo" },
        { id: 1003, name: "Cereté" },
        { id: 1004, name: "Lorica" },
        { id: 1005, name: "Sahagún" },
      ],
    },
    {
      id: 11,
      name: "Cundinamarca",
      cities: [
        { id: 1101, name: "Soacha" },
        { id: 1102, name: "Facatativá" },
        { id: 1103, name: "Chía" },
        { id: 1104, name: "Zipaquirá" },
        { id: 1105, name: "Girardot" },
        { id: 1106, name: "Fusagasugá" },
      ],
    },
    {
      id: 12,
      name: "Chocó",
      cities: [
        { id: 1201, name: "Quibdó" },
        { id: 1202, name: "Istmina" },
        { id: 1203, name: "Condoto" },
      ],
    },
    {
      id: 13,
      name: "Huila",
      cities: [
        { id: 1301, name: "Neiva" },
        { id: 1302, name: "Pitalito" },
        { id: 1303, name: "Garzón" },
        { id: 1304, name: "La Plata" },
      ],
    },
    {
      id: 14,
      name: "La Guajira",
      cities: [
        { id: 1401, name: "Riohacha" },
        { id: 1402, name: "Maicao" },
        { id: 1403, name: "Uribia" },
        { id: 1404, name: "Manaure" },
      ],
    },
    {
      id: 15,
      name: "Magdalena",
      cities: [
        { id: 1501, name: "Santa Marta" },
        { id: 1502, name: "Ciénaga" },
        { id: 1503, name: "Fundación" },
        { id: 1504, name: "Aracataca" },
      ],
    },
    {
      id: 16,
      name: "Meta",
      cities: [
        { id: 1601, name: "Villavicencio" },
        { id: 1602, name: "Acacías" },
        { id: 1603, name: "Granada" },
        { id: 1604, name: "San Martín" },
      ],
    },
    {
      id: 17,
      name: "Nariño",
      cities: [
        { id: 1701, name: "Pasto" },
        { id: 1702, name: "Tumaco" },
        { id: 1703, name: "Ipiales" },
        { id: 1704, name: "Túquerres" },
      ],
    },
    {
      id: 18,
      name: "Norte de Santander",
      cities: [
        { id: 1801, name: "Cúcuta" },
        { id: 1802, name: "Ocaña" },
        { id: 1803, name: "Pamplona" },
        { id: 1804, name: "Villa del Rosario" },
      ],
    },
    {
      id: 19,
      name: "Quindío",
      cities: [
        { id: 1901, name: "Armenia" },
        { id: 1902, name: "Calarcá" },
        { id: 1903, name: "La Tebaida" },
        { id: 1904, name: "Montenegro" },
      ],
    },
    {
      id: 20,
      name: "Risaralda",
      cities: [
        { id: 2001, name: "Pereira" },
        { id: 2002, name: "Dosquebradas" },
        { id: 2003, name: "Santa Rosa de Cabal" },
        { id: 2004, name: "La Virginia" },
      ],
    },
    {
      id: 21,
      name: "Santander",
      cities: [
        { id: 2101, name: "Bucaramanga" },
        { id: 2102, name: "Floridablanca" },
        { id: 2103, name: "Girón" },
        { id: 2104, name: "Piedecuesta" },
        { id: 2105, name: "Barrancabermeja" },
      ],
    },
    {
      id: 22,
      name: "Sucre",
      cities: [
        { id: 2201, name: "Sincelejo" },
        { id: 2202, name: "Corozal" },
        { id: 2203, name: "Sampués" },
        { id: 2204, name: "San Onofre" },
      ],
    },
    {
      id: 23,
      name: "Tolima",
      cities: [
        { id: 2301, name: "Ibagué" },
        { id: 2302, name: "Espinal" },
        { id: 2303, name: "Girardot" },
        { id: 2304, name: "Melgar" },
      ],
    },
    {
      id: 24,
      name: "Valle del Cauca",
      cities: [
        { id: 2401, name: "Cali" },
        { id: 2402, name: "Palmira" },
        { id: 2403, name: "Buenaventura" },
        { id: 2404, name: "Tuluá" },
        { id: 2405, name: "Cartago" },
        { id: 2406, name: "Buga" },
        { id: 2407, name: "Yumbo" },
      ],
    },
  ]
  
  // Agregar hasError: false a todos los departamentos estáticos
  return staticData.map(dept => ({ ...dept, hasError: false }))
}

