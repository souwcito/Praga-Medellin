import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import CartDrawer from './CartDrawer'
import FavoritesDrawer from './FavoritesDrawer'
import SocialFloat from './SocialFloat'

// Estructura común de la tienda: header + contenido + footer + paneles laterales.
export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <FavoritesDrawer />
      <SocialFloat />
    </div>
  )
}