import { Button } from '@medusajs/ui'
import Link from 'next/link'

export default function AuthLinks() {
    return (
        <div className="flex gap-4">
            <Link href="/api/auth/login">
                <Button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full">
                    Iniciar Sesión
                </Button>
            </Link>
            <Link href="/api/auth/logout">
                <Button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full">
                    Cerrar Sesión
                </Button>
            </Link>
        </div>
    )
}
