import './globals.css'

export const metadata = {
  title: 'CryxTeam',
  description: 'La mejor web de Streaming',
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
