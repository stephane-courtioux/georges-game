import styles from "./Decor.module.css";

// Le décor de fond, commun à toutes les pages : le dégradé bleu marine et, en filigrane,
// des ballons, des étoiles, des lignes de terrain, un filet et des fanions.
// Tout est dessiné en SVG/CSS (aucune image), aux couleurs du thème (voir globals.css).
// Il est fixé derrière le contenu (z-index négatif), ne réagit pas au doigt et ne déborde jamais.

// Un ballon : un cercle blanc et six taches sombres (pentagones), en une seule forme réutilisable.
function BallonSymbole() {
  return (
    <symbol id="decor-ballon" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="var(--fond-blanc)" />
      <polygon points="50,36 63,46 58,61 42,61 37,46" fill="var(--fond-nuit)" />
      <polygon points="50,2 58,12 50,20 42,12" fill="var(--fond-nuit)" />
      <polygon points="92,32 96,46 84,52 78,40" fill="var(--fond-nuit)" />
      <polygon points="8,32 22,40 16,52 4,46" fill="var(--fond-nuit)" />
      <polygon points="76,82 68,94 56,88 62,76" fill="var(--fond-nuit)" />
      <polygon points="24,82 38,76 44,88 32,94" fill="var(--fond-nuit)" />
    </symbol>
  );
}

// Une étoile à cinq branches.
function EtoileSymbole() {
  return (
    <symbol id="decor-etoile" viewBox="0 0 100 100">
      <polygon points="50,4 62,36 96,36 68,56 78,90 50,70 22,90 32,56 4,36 38,36" />
    </symbol>
  );
}

export default function Decor() {
  return (
    <div className={styles.decor} aria-hidden="true">
      {/* Les formes réutilisables (invisibles : elles servent de modèle aux <use>) */}
      <svg width="0" height="0" className={styles.defs}>
        <BallonSymbole />
        <EtoileSymbole />
      </svg>

      {/* Les lueurs rouges dans deux coins */}
      <div className={`${styles.lueur} ${styles.lueurHaut}`} />
      <div className={`${styles.lueur} ${styles.lueurBas}`} />

      {/* Les lignes du terrain : le rond central à gauche, la surface de réparation en bas à droite */}
      <div className={styles.rondCentral} />
      <div className={styles.surface}>
        <div className={styles.surfaceBut} />
        <div className={styles.pointPenalty} />
      </div>

      {/* Un filet de but stylisé, en haut à droite */}
      <div className={styles.filet} />

      {/* Des fanions sur une corde, en bas à gauche */}
      <svg className={styles.fanions} viewBox="0 0 300 60" preserveAspectRatio="xMinYMax meet">
        <path d="M0,10 Q150,40 300,10" fill="none" stroke="var(--fond-blanc)" strokeWidth="2" />
        {[15, 60, 105, 150, 195, 240, 285].map((x, i) => {
          // la corde descend au milieu : on suit sa courbe pour accrocher chaque fanion
          const t = x / 300;
          const y = 10 + 30 * 4 * t * (1 - t) * 0.5;
          const couleur = i % 2 === 0 ? "var(--fond-rouge)" : "var(--fond-blanc)";
          return <polygon key={x} points={`${x - 10},${y} ${x + 10},${y} ${x},${y + 30}`} fill={couleur} />;
        })}
      </svg>

      {/* Les ballons, éparpillés */}
      <svg className={`${styles.ballon} ${styles.ballon1}`}><use href="#decor-ballon" /></svg>
      <svg className={`${styles.ballon} ${styles.ballon2}`}><use href="#decor-ballon" /></svg>
      <svg className={`${styles.ballon} ${styles.ballon3}`}><use href="#decor-ballon" /></svg>
      <svg className={`${styles.ballon} ${styles.ballon4}`}><use href="#decor-ballon" /></svg>

      {/* Les étoiles */}
      <svg className={`${styles.etoile} ${styles.etoile1}`}><use href="#decor-etoile" /></svg>
      <svg className={`${styles.etoile} ${styles.etoile2}`}><use href="#decor-etoile" /></svg>
      <svg className={`${styles.etoile} ${styles.etoile3}`}><use href="#decor-etoile" /></svg>
      <svg className={`${styles.etoile} ${styles.etoile4}`}><use href="#decor-etoile" /></svg>
      <svg className={`${styles.etoile} ${styles.etoile5}`}><use href="#decor-etoile" /></svg>
    </div>
  );
}
