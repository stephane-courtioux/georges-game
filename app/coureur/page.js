import FullscreenButton from "../FullscreenButton";
import Game from "../Game";
import HomeLink from "../HomeLink";
import styles from "./page.module.css";

export const metadata = {
  title: "Le coureur – Super Hector",
};

export default function CoureurPage() {
  return (
    <main className={styles.main}>
      {/* Décoration : le héros dépasse du coin haut gauche et glisse sous la carte du jeu */}
      {/* eslint-disable-next-line @next/next/no-img-element -- image décorative simple */}
      <img src="/hector-hero.png" alt="" className={styles.decor} draggable={false} />

      <HomeLink />

      <h1 className={styles.title}>SUPER HECTOR</h1>
      <p className={styles.hint}>Appuie sur Espace ou tape l&apos;écran pour sauter</p>

      {/* La carte du jeu passe au-dessus de la décoration */}
      <div className={styles.gameCard}>
        <Game />
      </div>

      {/* Plein écran (ou l'astuce iPhone quand l'API n'existe pas) */}
      <FullscreenButton />
    </main>
  );
}
