import FullscreenButton from "../FullscreenButton";
import HomeLink from "../HomeLink";
import Foot from "./Foot";
import styles from "./page.module.css";

export const metadata = {
  title: "Georges buteur – Super Georges",
};

export default function FootPage() {
  return (
    <main className={styles.main}>
      {/* Décoration : le héros dépasse du coin haut gauche et glisse sous la carte du jeu */}
      {/* eslint-disable-next-line @next/next/no-img-element -- image décorative simple */}
      <img src="/georges-hero.png" alt="" className={styles.decor} draggable={false} />

      <HomeLink />

      <h1 className={styles.title}>GEORGES BUTEUR</h1>
      <p className={styles.hint}>Flèches ↑ ↓ ou glisse ton doigt pour choisir la hauteur du tir</p>

      {/* La carte du jeu passe au-dessus de la décoration */}
      <div className={styles.gameCard}>
        <Foot />
      </div>

      {/* Plein écran (ou l'astuce iPhone quand l'API n'existe pas) */}
      <FullscreenButton />
    </main>
  );
}
