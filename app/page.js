import Link from "next/link";
import styles from "./page.module.css";

// Le menu d'accueil : une tuile par jeu.
const JEUX = [
  { href: "/coureur", emoji: "🏃", titre: "Le coureur", sousTitre: "Saute par-dessus les cactus" },
  { href: "/gommettes", emoji: "⭐", titre: "Les gommettes d'Hector", sousTitre: "Gagne ta récompense de la semaine" },
];

export default function Home() {
  return (
    <main className={styles.main}>
      {/* Décoration : le héros dépasse du coin haut gauche */}
      {/* eslint-disable-next-line @next/next/no-img-element -- image décorative simple */}
      <img src="/hector-hero.png" alt="" className={styles.decor} draggable={false} />

      <h1 className={styles.title}>SUPER HECTOR</h1>
      <p className={styles.hint}>Choisis ton jeu</p>

      <nav className={styles.tiles}>
        {JEUX.map((jeu) => (
          <Link key={jeu.href} href={jeu.href} className={styles.tile}>
            <span className={styles.tileEmoji}>{jeu.emoji}</span>
            <span className={styles.tileTitle}>{jeu.titre}</span>
            <span className={styles.tileSub}>{jeu.sousTitre}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
