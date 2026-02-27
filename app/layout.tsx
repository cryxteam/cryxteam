import './globals.css'

export const metadata = {
  title: 'CryxTeam',
  description: 'Administra plataformas de streaming',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
