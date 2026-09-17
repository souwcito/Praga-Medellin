import { InstagramIcon, TikTokIcon, WhatsAppIcon } from './icons'

// Botones flotantes de redes sociales (esquina inferior derecha).
// Responsive: tamaño menor en móvil y mayor en pantallas grandes.
const SOCIALS = [
  {
    href: 'https://wa.me/573216573427',
    label: 'WhatsApp',
    icon: WhatsAppIcon,
    cls: 'bg-[#25D366] hover:bg-[#1fbd5a]',
  },
  {
    href: 'https://www.instagram.com/praga_medellin_/',
    label: 'Instagram',
    icon: InstagramIcon,
    cls: 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]',
  },
  {
    href: 'https://www.tiktok.com/@praga_medellin_?_r=1&_t=zs-95pibhlpv9s',
    label: 'TikTok',
    icon: TikTokIcon,
    cls: 'bg-black',
  },
]

export default function SocialFloat() {
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2.5 sm:bottom-5 sm:right-5">
      {SOCIALS.map((s) => {
        const Icon = s.icon
        return (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noreferrer"
            aria-label={s.label}
            title={s.label}
            className={`flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg shadow-black/25 transition-all duration-200 hover:scale-110 active:scale-95 sm:h-12 sm:w-12 ${s.cls}`}
          >
            <Icon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
          </a>
        )
      })}
    </div>
  )
}