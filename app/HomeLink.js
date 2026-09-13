import Link from "next/link";
import styles from "./HomeLink.module.css";

// Petit bouton « ← Accueil » affiché en haut à gauche de chaque jeu.
export default function HomeLink() {
  return (
    <Link href="/" className={styles.link}>
      ← Accueil
    </Link>
  );
}
