"use client";

import { useSyncExternalStore } from "react";
import styles from "./FullscreenButton.module.css";

// Ce que le navigateur sait faire. Lu côté client seulement (sur le serveur : "unknown").
// - "api"        : l'API Fullscreen existe (Chrome, Firefox, Safari Mac/iPad...)
// - "standalone" : le jeu est déjà ouvert depuis l'écran d'accueil, donc déjà en plein écran
// - "none"       : pas d'API (Safari sur iPhone) → on affiche l'astuce
function readSupport() {
  const standalone =
    window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  if (standalone) return "standalone";
  const element = document.documentElement;
  if (element.requestFullscreen || element.webkitRequestFullscreen) return "api";
  return "none";
}

// Sommes-nous en plein écran en ce moment ?
function readIsFullscreen() {
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

// On est prévenu quand le plein écran change (nom standard + nom Safari).
function subscribe(callback) {
  document.addEventListener("fullscreenchange", callback);
  document.addEventListener("webkitfullscreenchange", callback);
  return () => {
    document.removeEventListener("fullscreenchange", callback);
    document.removeEventListener("webkitfullscreenchange", callback);
  };
}

const noSubscribe = () => () => {};

export default function FullscreenButton() {
  const support = useSyncExternalStore(noSubscribe, readSupport, () => "unknown");
  const isFullscreen = useSyncExternalStore(subscribe, readIsFullscreen, () => false);

  function toggle() {
    const element = document.documentElement;
    if (isFullscreen) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      // Safari (Mac) utilise encore le nom avec le préfixe webkit.
      (element.requestFullscreen || element.webkitRequestFullscreen).call(element);
    }
  }

  // Avant l'hydratation, ou déjà en plein écran depuis l'écran d'accueil : rien à afficher.
  if (support === "unknown" || support === "standalone") return null;

  if (support === "none") {
    return (
      <p className={styles.tip}>
        📱 Sur iPhone, tourne le téléphone en mode paysage pour jouer plus grand.
        <br />
        Pour le plein écran : ajoute le jeu à l&apos;écran d&apos;accueil via{" "}
        <strong>Partager → Sur l&apos;écran d&apos;accueil</strong>.
      </p>
    );
  }

  return (
    <button type="button" className={styles.button} onClick={toggle}>
      {isFullscreen ? "Quitter le plein écran" : "⛶ Plein écran"}
    </button>
  );
}
