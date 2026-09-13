import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "Super Hector",
  description: "Un petit jeu où Hector est le héros",
  // Une fois ajouté à l'écran d'accueil d'un iPhone, le jeu s'ouvre en plein écran.
  appleWebApp: {
    capable: true,
    title: "Super Hector",
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
  themeColor: "#ff3c8e", // couleur de la barre du navigateur
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={geistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
