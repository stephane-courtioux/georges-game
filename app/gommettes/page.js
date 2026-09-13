"use client";

import dynamic from "next/dynamic";
import styles from "./Gommettes.module.css";

// Le tableau lit et écrit dans le localStorage du navigateur : il n'existe pas sur le
// serveur, donc on ne le dessine que côté navigateur (ssr: false).
const Gommettes = dynamic(() => import("./Gommettes"), {
  ssr: false,
  loading: () => <p className={styles.chargement}>Chargement…</p>,
});

export default function GommettesPage() {
  return <Gommettes />;
}
