import { Geist } from "next/font/google";
import Decor from "./Decor";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "Super Georges",
  description: "Un petit jeu où Georges est le héros",
  // Une fois ajouté à l'écran d'accueil d'un iPhone, le jeu s'ouvre en plein écran.
  appleWebApp: {
    capable: true,
    title: "Super Georges",
    statusBarStyle: "black-translucent",
  },
  // Next écrit la balise moderne (mobile-web-app-capable) ; on ajoute l'ancienne pour les iPhone plus vieux.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // pas de zoom involontaire en tapant vite
  userScalable: false,
  viewportFit: "cover", // la page passe sous l'encoche (voir safe-area-inset dans le CSS)
  themeColor: "#0a1f4d", // couleur de la barre du navigateur (le bleu marine du thème, voir globals.css)
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={geistSans.variable}>
      <body>
        {/* Le décor de fond (dégradé + filigrane foot), derrière toutes les pages */}
        <Decor />
        {children}
      </body>
    </html>
  );
}
