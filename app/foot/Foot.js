"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Foot.module.css";

// --- Réglages faciles à changer ---
const GEORGES_IMG = "/georges-hero.png"; // l'image de Georges (dans le dossier public/)
const GAME_TITLE = "Georges buteur"; // le titre affiché sur l'écran de départ
const GAME_WIDTH = 800; // largeur de la zone de jeu (px)
const GAME_HEIGHT = 400; // hauteur de la zone de jeu (px)
const GEORGES_SIZE = 96; // taille de Georges (px), pour l'image comme pour le cercle de repli
const GEORGES_X = 240; // position du centre de Georges depuis la gauche (px)
const VITESSE_GEORGES = 5; // vitesse à laquelle Georges monte ou descend (px par image)
const TIR_INTERVAL = 1500; // temps entre deux tirs automatiques (ms)
const VITESSE_BALLON = 9; // vitesse du ballon vers le but (px par image)
const BALLON_TAILLE = 26; // diamètre du ballon (px)
const VITESSE_GARDIEN = 3; // vitesse du gardien de haut en bas (px par image)
const GARDIEN_ACCEL = 0.15; // le gardien accélère un peu à chaque but marqué
const GARDIEN_HAUTEUR = 78; // hauteur du gardien (px) : plus c'est grand, plus il arrête de ballons
const GARDIEN_LARGEUR = 34; // largeur du gardien (px)
const BUT_HAUTEUR = 250; // hauteur de la cage (px)
const BUT_PROFONDEUR = 56; // profondeur du filet (px)
const BUT_X = GAME_WIDTH - BUT_PROFONDEUR - 24; // le poteau (l'entrée de la cage) depuis la gauche
const BUT_HAUT = (GAME_HEIGHT - BUT_HAUTEUR) / 2; // le haut de la cage (la cage est centrée)
const DUREE_MATCH_S = 60; // durée d'un match (secondes)
const MESSAGE_DUREE_MS = 700; // temps d'affichage de « BUT ! » ou « Arrêt ! » (ms)
const BEST_SCORE_KEY = "georges-foot-best-score"; // clé du meilleur score dans le localStorage

// Les couleurs du jeu, toutes au même endroit : change-les pour changer l'ambiance !
// Les équipes n'ont que des couleurs : aucun logo, écusson, sponsor ni nom réel.
const THEME = {
  herbeClaire: "#5fbf4f", // bande de pelouse claire
  herbeFoncee: "#54ad46", // bande de pelouse foncée
  lignes: "rgba(255, 255, 255, 0.85)", // lignes du terrain
  frame: "#ffffff", // cadre autour de la zone de jeu
  poteaux: "#ffffff", // poteaux et barre transversale
  filet: "rgba(255, 255, 255, 0.55)", // mailles du filet
  ballon: "#ffffff", // le ballon
  ballonMotif: "#222222", // les taches du ballon
  // L'équipe de Georges : bleu marine, bande rouge, blanc (utilisé par le cercle de repli)
  georgesMaillot: "#0b2a5b",
  georgesBande: "#e0202e",
  georgesBlanc: "#ffffff",
  // Le gardien adverse : rouge à manches blanches
  gardienMaillot: "#d81e2b",
  gardienManches: "#ffffff",
  gardienShort: "#ffffff",
  gardienPeau: "#f1c27d",
  gardienCheveux: "#3b2a1a",
  hudText: "#ffffff", // texte du score
  hudShadow: "rgba(0, 0, 0, 0.5)", // ombre du texte du score
  messageBut: "#ffd23c", // couleur de « BUT ! »
  messageArret: "#ff7b7b", // couleur de « Arrêt ! »
  overlay: "rgba(0, 0, 0, 0.45)", // voile de l'écran de fin
  startVeil: "rgba(0, 0, 0, 0.55)", // voile sur la photo de l'écran de départ (texte lisible)
  overlayText: "#ffffff", // texte sur le voile
  button: "#ffd23c", // fond des boutons
  buttonShadow: "#c9a000", // ombre des boutons
  buttonText: "#3a2a00", // texte des boutons
};

// Le thème passe au CSS sous forme de variables (--herbe-claire, etc.) posées sur le cadre.
const themeVars = {
  "--herbe-claire": THEME.herbeClaire,
  "--herbe-foncee": THEME.herbeFoncee,
  "--lignes": THEME.lignes,
  "--frame": THEME.frame,
  "--poteaux": THEME.poteaux,
  "--filet": THEME.filet,
  "--ballon": THEME.ballon,
  "--ballon-motif": THEME.ballonMotif,
  "--georges-maillot": THEME.georgesMaillot,
  "--georges-bande": THEME.georgesBande,
  "--georges-blanc": THEME.georgesBlanc,
  "--gardien-maillot": THEME.gardienMaillot,
  "--gardien-manches": THEME.gardienManches,
  "--gardien-short": THEME.gardienShort,
  "--gardien-peau": THEME.gardienPeau,
  "--gardien-cheveux": THEME.gardienCheveux,
  "--hud-text": THEME.hudText,
  "--hud-shadow": THEME.hudShadow,
  "--message-but": THEME.messageBut,
  "--message-arret": THEME.messageArret,
  "--overlay": THEME.overlay,
  "--start-veil": THEME.startVeil,
  "--overlay-text": THEME.overlayText,
  "--button": THEME.button,
  "--button-shadow": THEME.buttonShadow,
  "--button-text": THEME.buttonText,
};

// Les hauteurs (y = distance depuis le haut de la zone de jeu) entre lesquelles chacun peut aller.
// Georges reste en face de la cage : chaque tir est cadré, c'est le gardien qui décide.
const GEORGES_MIN_Y = BUT_HAUT;
const GEORGES_MAX_Y = BUT_HAUT + BUT_HAUTEUR;
const GARDIEN_MIN_Y = BUT_HAUT + GARDIEN_HAUTEUR / 2;
const GARDIEN_MAX_Y = BUT_HAUT + BUT_HAUTEUR - GARDIEN_HAUTEUR / 2;
const GARDIEN_X = BUT_X - GARDIEN_LARGEUR / 2 - 6; // le gardien se tient juste devant sa ligne

// Le monde tout neuf, au début d'un match.
function createWorld(now) {
  return {
    georgesY: GAME_HEIGHT / 2, // hauteur du centre de Georges (y depuis le haut)
    cibleY: null, // hauteur visée par le doigt (null = pas de doigt sur l'écran)
    gardienY: GAME_HEIGHT / 2, // hauteur du centre du gardien
    gardienSens: 1, // 1 = le gardien descend, -1 = il monte
    ballons: [], // les ballons en vol : { id, x, y, vx, etat } ; etat : "vol", "but" ou "arret"
    prochainTir: now + TIR_INTERVAL, // l'heure (ms) du prochain tir automatique
    finDuMatch: now + DUREE_MATCH_S * 1000, // l'heure (ms) où le match s'arrête
    message: null, // le message affiché au milieu : { texte, type, jusqua } ou null
    derniereImage: now, // l'heure (ms) de la dernière image calculée, pour repérer une pause
    nextId: 0, // pour donner un numéro unique à chaque ballon
    score: 0, // le nombre de buts marqués
  };
}

// Lit le meilleur score sauvegardé dans le navigateur (0 s'il n'y en a pas).
function readBestScore() {
  return Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
}

// Garde une valeur entre un minimum et un maximum.
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Un petit son avec l'API Web Audio : une note qui glisse de "depart" à "arrivee" (Hz).
function playNote(audio, depart, arrivee, duree) {
  const oscillator = audio.createOscillator(); // fabrique le son
  const volume = audio.createGain(); // règle le volume
  const now = audio.currentTime;
  oscillator.type = "square"; // un son un peu "jeu vidéo"
  oscillator.frequency.setValueAtTime(depart, now);
  oscillator.frequency.exponentialRampToValueAtTime(arrivee, now + duree * 0.7);
  volume.gain.setValueAtTime(0.15, now); // pas trop fort
  volume.gain.exponentialRampToValueAtTime(0.001, now + duree); // et qui s'éteint
  oscillator.connect(volume).connect(audio.destination);
  oscillator.start(now);
  oscillator.stop(now + duree);
}

export default function Foot() {
  // Tout ce qui bouge dans le jeu est rangé dans une "ref" : on peut le
  // modifier 60 fois par seconde sans que React redessine à chaque petit calcul.
  const worldRef = useRef(createWorld(0));

  // Les touches enfoncées en ce moment (flèches haut/bas).
  const keysRef = useRef({ up: false, down: false });

  // Le "haut-parleur" (AudioContext). Créé au premier geste du joueur :
  // les navigateurs refusent de jouer un son avant ça.
  const audioRef = useRef(null);

  // La "scène" : une photo du monde, prise une fois par image, que React dessine.
  const [scene, setScene] = useState({
    georgesY: GAME_HEIGHT / 2,
    gardienY: GAME_HEIGHT / 2,
    ballons: [],
    message: null,
    score: 0,
    tempsRestant: DUREE_MATCH_S,
  });

  // "ready" sur l'écran de départ, "playing" pendant le match, "over" à la fin du temps.
  const [status, setStatus] = useState("ready");
  // Le meilleur score (lu dans le localStorage).
  const [best, setBest] = useState(0);
  // Devient vrai si l'image de Georges ne charge pas : on affiche alors un cercle.
  const [imgFailed, setImgFailed] = useState(false);

  // Donne le haut-parleur, en le créant (ou le réveillant) si besoin.
  function getAudio() {
    if (!audioRef.current) audioRef.current = new AudioContext();
    if (audioRef.current.state === "suspended") audioRef.current.resume();
    return audioRef.current;
  }

  // Lance un match : monde tout neuf, score à zéro.
  function start() {
    worldRef.current = createWorld(performance.now());
    getAudio(); // on profite du geste du joueur pour préparer le son
    setStatus("playing");
  }

  // Juste après le premier affichage, on lit le meilleur score sauvegardé.
  // (Dans une image d'animation, pour ne pas changer l'état pendant le rendu.)
  useEffect(() => {
    const id = requestAnimationFrame(() => setBest(readBestScore()));
    return () => cancelAnimationFrame(id);
  }, []);

  // Boucle de jeu : à chaque image, on fait avancer le monde d'un petit pas.
  // Elle tourne seulement pendant le match (status === "playing").
  useEffect(() => {
    if (status !== "playing") return;
    let frameId;

    function tick(now) {
      const world = worldRef.current;
      const keys = keysRef.current;

      // 0) Si le jeu a été mis en pause (onglet caché, téléphone verrouillé...), le navigateur
      // a arrêté d'appeler tick : on décale le chrono et le prochain tir du temps perdu.
      const pause = now - world.derniereImage;
      if (pause > 500) {
        world.finDuMatch += pause;
        world.prochainTir += pause;
      }
      world.derniereImage = now;

      // 1) Georges monte ou descend : avec les flèches, ou vers la hauteur montrée par le doigt.
      if (keys.up) world.georgesY -= VITESSE_GEORGES;
      if (keys.down) world.georgesY += VITESSE_GEORGES;
      if (world.cibleY !== null) {
        const ecart = world.cibleY - world.georgesY;
        world.georgesY += clamp(ecart, -VITESSE_GEORGES, VITESSE_GEORGES);
      }
      world.georgesY = clamp(world.georgesY, GEORGES_MIN_Y, GEORGES_MAX_Y);

      // 2) Le gardien fait les cent pas devant sa cage, un peu plus vite à chaque but.
      const vitesseGardien = VITESSE_GARDIEN + world.score * GARDIEN_ACCEL;
      world.gardienY += vitesseGardien * world.gardienSens;
      if (world.gardienY >= GARDIEN_MAX_Y) {
        world.gardienY = GARDIEN_MAX_Y;
        world.gardienSens = -1;
      } else if (world.gardienY <= GARDIEN_MIN_Y) {
        world.gardienY = GARDIEN_MIN_Y;
        world.gardienSens = 1;
      }

      // 3) Le tir automatique : le ballon part du pied de Georges, à sa hauteur.
      if (now >= world.prochainTir) {
        world.prochainTir = now + TIR_INTERVAL;
        world.ballons.push({
          id: world.nextId++,
          x: GEORGES_X + GEORGES_SIZE / 2,
          y: world.georgesY, // à la hauteur de Georges
          vx: VITESSE_BALLON,
          etat: "vol",
        });
        playNote(getAudio(), 300, 500, 0.08); // petit "toc" de frappe
      }

      // 4) Les ballons avancent ; en arrivant sur le gardien : arrêt ou but.
      for (const ballon of world.ballons) {
        ballon.x += ballon.vx;
        if (ballon.etat !== "vol") continue;
        if (ballon.x + BALLON_TAILLE / 2 >= GARDIEN_X - GARDIEN_LARGEUR / 2) {
          const dansLesMains = Math.abs(ballon.y - world.gardienY) < GARDIEN_HAUTEUR / 2 + BALLON_TAILLE / 2;
          if (dansLesMains) {
            // Arrêt : le ballon repart mollement vers Georges.
            ballon.etat = "arret";
            ballon.vx = -VITESSE_BALLON / 2;
            world.message = { texte: "Arrêt !", type: "arret", jusqua: now + MESSAGE_DUREE_MS };
            playNote(getAudio(), 200, 90, 0.25); // un son qui descend
          } else {
            // But ! Le ballon continue dans le filet, et le score monte.
            ballon.etat = "but";
            world.score += 1;
            world.message = { texte: "BUT !", type: "but", jusqua: now + MESSAGE_DUREE_MS };
            playNote(getAudio(), 500, 1000, 0.3); // une note qui monte
          }
        }
      }
      // Dans le filet, le ballon s'arrête au fond ; les ballons sortis de l'écran sont jetés.
      for (const ballon of world.ballons) {
        if (ballon.etat === "but" && ballon.x >= GAME_WIDTH - 24 - BALLON_TAILLE / 2) ballon.vx = 0;
      }
      world.ballons = world.ballons.filter((b) => b.x > -BALLON_TAILLE);
      // On ne garde que les 3 derniers ballons arrêtés dans le filet, pour ne pas l'encombrer.
      const dansLeFilet = world.ballons.filter((b) => b.etat === "but" && b.vx === 0);
      if (dansLeFilet.length > 3) world.ballons = world.ballons.filter((b) => b !== dansLeFilet[0]);

      // 5) Le message s'efface tout seul au bout d'un moment.
      if (world.message && now >= world.message.jusqua) world.message = null;

      // 6) La photo du monde pour React.
      const tempsRestant = Math.max(0, Math.ceil((world.finDuMatch - now) / 1000));
      setScene({
        georgesY: world.georgesY,
        gardienY: world.gardienY,
        ballons: world.ballons.map((b) => ({ id: b.id, x: b.x, y: b.y, etat: b.etat })),
        message: world.message,
        score: world.score,
        tempsRestant,
      });

      // 7) Fin du match : on garde le meilleur score et on affiche l'écran de fin.
      if (now >= world.finDuMatch) {
        if (world.score > readBestScore()) localStorage.setItem(BEST_SCORE_KEY, String(world.score));
        setBest(readBestScore());
        setStatus("over");
        return; // la boucle s'arrête
      }
      frameId = requestAnimationFrame(tick);
    }
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [status]);

  // Le clavier : flèches haut/bas pour bouger, Espace ou Entrée pour lancer le match.
  // (Pas de tableau de dépendances : on rebranche l'écouteur à chaque rendu pour
  // qu'il voie toujours le bon "status".)
  useEffect(() => {
    function onKeyDown(event) {
      if (event.code === "ArrowUp") keysRef.current.up = true;
      else if (event.code === "ArrowDown") keysRef.current.down = true;
      else if (event.code === "Space" || event.code === "Enter") {
        if (status !== "playing") start();
      } else return;
      event.preventDefault(); // évite que la page défile
    }
    function onKeyUp(event) {
      if (event.code === "ArrowUp") keysRef.current.up = false;
      if (event.code === "ArrowDown") keysRef.current.down = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  });

  // --- Responsive : le jeu est toujours calculé en 800×400 (GAME_WIDTH × GAME_HEIGHT),
  // on le dessine dans un cadre qui prend la largeur disponible, et on le réduit
  // ou l'agrandit visuellement avec transform: scale(). La physique ne change pas.
  const frameRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const frame = frameRef.current;
    // Dès que le cadre change de taille (rotation du téléphone, fenêtre redimensionnée...)
    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / GAME_WIDTH);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // Sur iPhone/Android : un doigt sur le jeu ne doit ni faire défiler la page, ni zoomer.
  // React déclare ses écouteurs touchstart en "passif" (preventDefault ignoré),
  // donc on en branche un nous-mêmes. Les boutons gardent leur comportement normal.
  useEffect(() => {
    const frame = frameRef.current;
    function onTouchStart(event) {
      if (!event.target.closest("button")) event.preventDefault();
    }
    frame.addEventListener("touchstart", onTouchStart, { passive: false });
    return () => frame.removeEventListener("touchstart", onTouchStart);
  }, []);

  // Le doigt (ou la souris) : la hauteur touchée devient la hauteur visée par Georges.
  // Un tap en haut le fait monter, un tap en bas le fait descendre, et en glissant
  // le doigt, Georges suit. On convertit la position de l'écran en coordonnées du jeu.
  function viser(event) {
    const rect = frameRef.current.getBoundingClientRect();
    worldRef.current.cibleY = (event.clientY - rect.top) / scale;
  }

  function onPointerDown(event) {
    if (status !== "playing") {
      start();
      return;
    }
    viser(event);
    // On suit le doigt même s'il sort du cadre (si le navigateur refuse, on suit quand même le doigt dans le cadre).
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* rien à faire */
    }
  }

  function onPointerMove(event) {
    if (status === "playing" && event.buttons > 0) viser(event);
  }

  function onPointerUp() {
    worldRef.current.cibleY = null; // le doigt se lève : Georges reste où il est
  }

  // Les boutons de l'écran de fin ne doivent pas compter comme un "appui" sur le jeu.
  const stopPress = (event) => event.stopPropagation();

  return (
    // Le cadre : largeur disponible (max 800 px), même ratio que le jeu.
    <div
      ref={frameRef}
      className={styles.frame}
      style={{ maxWidth: GAME_WIDTH, aspectRatio: `${GAME_WIDTH} / ${GAME_HEIGHT}`, ...themeVars }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="button"
      tabIndex={0}
      aria-label="Zone de jeu : flèches haut et bas, ou glisse ton doigt, pour choisir la hauteur du tir"
    >
      {/* La zone de jeu, toujours en 800×400, mise à l'échelle pour remplir le cadre */}
      <div
        className={styles.game}
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT, transform: `scale(${scale})` }}
      >
        {/* Le terrain : des lignes simples (ligne de but, surface, rond central à gauche) */}
        <div className={styles.ligneTouche} style={{ top: 12 }} />
        <div className={styles.ligneTouche} style={{ bottom: 12 }} />
        <div className={styles.rondCentral} />
        <div
          className={styles.surface}
          style={{ left: BUT_X - 170, top: BUT_HAUT - 50, width: 170, height: BUT_HAUTEUR + 100 }}
        />
        <div className={styles.pointPenalty} style={{ left: BUT_X - 110, top: GAME_HEIGHT / 2 }} />

        {/* Le but : poteaux, barre et filet */}
        <div
          className={styles.but}
          style={{ left: BUT_X, top: BUT_HAUT, width: BUT_PROFONDEUR, height: BUT_HAUTEUR }}
        />

        {/* Le gardien adverse : rouge à manches blanches */}
        <div
          className={styles.gardien}
          style={{
            left: GARDIEN_X - GARDIEN_LARGEUR / 2,
            top: scene.gardienY - GARDIEN_HAUTEUR / 2,
            width: GARDIEN_LARGEUR,
            height: GARDIEN_HAUTEUR,
          }}
        >
          <div className={styles.gardienTete} />
          <div className={styles.gardienCorps} />
          <div className={styles.gardienShort} />
          <div className={styles.gardienJambes} />
        </div>

        {/* Les ballons */}
        {scene.ballons.map((ballon) => (
          <div
            key={ballon.id}
            className={styles.ballon}
            style={{
              left: ballon.x - BALLON_TAILLE / 2,
              top: ballon.y - BALLON_TAILLE / 2,
              width: BALLON_TAILLE,
              height: BALLON_TAILLE,
              // le ballon tourne en avançant
              transform: `rotate(${ballon.x * 2}deg)`,
              opacity: ballon.etat === "arret" ? 0.6 : 1,
            }}
          />
        ))}

        {/* Georges, à la hauteur choisie */}
        <div
          className={styles.georges}
          style={{
            left: GEORGES_X - GEORGES_SIZE / 2,
            top: scene.georgesY - GEORGES_SIZE / 2,
            width: GEORGES_SIZE,
            height: GEORGES_SIZE,
          }}
        >
          {imgFailed ? (
            // Repli : un simple cercle aux couleurs de Georges (bleu marine, bande rouge, blanc)
            <div className={styles.georgesRepli} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- balise <img> simple, pas besoin de next/image ici
            <img
              src={GEORGES_IMG}
              alt="Georges"
              width={GEORGES_SIZE}
              height={GEORGES_SIZE}
              draggable={false}
              onError={() => setImgFailed(true)} // repli sur le cercle
            />
          )}
        </div>

        {/* Le score et le temps, en haut */}
        <div className={styles.hud}>
          <span>⚽ Buts : {scene.score}</span>
          <span>⏱ {scene.tempsRestant} s</span>
          <span>🏆 Meilleur : {best}</span>
        </div>

        {/* « BUT ! » ou « Arrêt ! », au milieu, un court instant */}
        {scene.message && status === "playing" && (
          <p className={`${styles.message} ${scene.message.type === "but" ? styles.messageBut : styles.messageArret}`}>
            {scene.message.texte}
          </p>
        )}

        {/* L'écran de départ : la photo de Georges en fond, un voile sombre, puis le texte */}
        {status === "ready" && (
          <div className={styles.startScreen}>
            {!imgFailed && (
              // eslint-disable-next-line @next/next/no-img-element -- image de fond simple
              <img src={GEORGES_IMG} alt="" className={styles.startBackground} draggable={false} />
            )}
            <div className={`${styles.overlay} ${styles.startVeil}`}>
              <p className={styles.gameTitle}>{GAME_TITLE}</p>
              <p className={styles.bigTitle}>Appuie pour jouer</p>
              <p className={styles.hint}>
                Flèches ↑ ↓ ou glisse ton doigt pour viser — le tir part tout seul !
              </p>
            </div>
          </div>
        )}

        {/* L'écran de fin */}
        {status === "over" && (
          <div className={styles.overlay}>
            <p className={styles.bigTitle}>Fin du match !</p>
            <p className={styles.finalScore}>
              ⚽ {scene.score} but{scene.score > 1 ? "s" : ""}
              {scene.score > 0 && scene.score >= best ? " — nouveau record !" : ""}
            </p>
            <div className={styles.levels} onPointerDown={stopPress}>
              <button type="button" className={styles.button} onClick={start}>
                Rejouer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
