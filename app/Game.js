"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Game.module.css";

// --- Réglages faciles à changer ---
const HERO = "🦸"; // l'emoji du héros (utilisé si l'image ne charge pas)
const HERO_IMG = "/georges-hero.png"; // l'image du héros (dans le dossier public/)
const GAME_TITLE = "Super Georges"; // le titre affiché sur l'écran de départ
const HERO_SIZE = 64; // taille du héros (px), pour l'image comme pour l'emoji
const HERO_X = 80; // position du héros depuis la gauche (px)
const OBSTACLE = "🌵"; // l'emoji des obstacles
const OBSTACLE_SIZE = 48; // taille des obstacles (px)
const STAR = "⭐"; // l'emoji des étoiles à ramasser
const STAR_SIZE = 40; // taille des étoiles (px)
const STAR_MIN_Y = 60; // hauteur minimale d'une étoile au-dessus du sol (px)
const GAME_WIDTH = 800; // largeur de la zone de jeu (px)
const GAME_HEIGHT = 400; // hauteur de la zone de jeu (px)
const GROUND_HEIGHT = 40; // hauteur du sol (px)
const GROUND_STRIPE = 40; // largeur d'une bande d'herbe (px), pour voir le sol défiler
const JUMP_SPEED = 11; // force du saut : plus c'est grand, plus il saute haut (≈ 116 px)
const GRAVITY = 0.5; // gravité : plus c'est grand, plus il retombe vite
// Hauteur maximale du héros au-dessus du sol : le haut de l'écran (on peut rebondir en l'air).
const MAX_HERO_Y = GAME_HEIGHT - GROUND_HEIGHT - HERO_SIZE;
const MAX_AIR_JUMPS = 2; // rebonds autorisés en l'air (donc 3 impulsions au total avant de retoucher le sol)
const STAR_INTERVAL = 130; // une étoile toutes les 130 images (≈ 2 s)
const HITBOX_MARGIN = 10; // on rétrécit un peu les boîtes de collision pour être gentil
const BEST_SCORE_KEY = "hector-game-best-score"; // clé du meilleur score dans le localStorage

// Les niveaux de difficulté. Chaque niveau règle :
// - startSpeed / maxSpeed / speedGain : la vitesse des obstacles (px par image) et l'accélération
// - spawnInterval : le nombre d'images entre deux cactus (moins = plus souvent)
// - starMaxY : la hauteur maximale des étoiles (plus bas = plus faciles à attraper)
const DIFFICULTIES = {
  facile: { label: "Facile", startSpeed: 3, maxSpeed: 7, speedGain: 0.001, spawnInterval: 120, starMaxY: 85 },
  normal: { label: "Normal", startSpeed: 4, maxSpeed: 12, speedGain: 0.002, spawnInterval: 90, starMaxY: 110 },
  rapide: { label: "Rapide", startSpeed: 6, maxSpeed: 15, speedGain: 0.003, spawnInterval: 70, starMaxY: 110 },
};

// Les couleurs du jeu, toutes au même endroit : change-les pour changer l'ambiance !
const THEME = {
  skyTop: "#7fd3ff", // ciel, en haut
  skyBottom: "#d9f2ff", // ciel, en bas
  grassLight: "#6ccf5f", // bande d'herbe claire
  grassDark: "#58b84d", // bande d'herbe foncée
  groundEdge: "#2e6b26", // bord du sol
  frame: "#ffffff", // cadre autour de la zone de jeu
  hudText: "#1d3b6e", // texte du score
  hudShadow: "#ffffff", // ombre du texte du score
  overlay: "rgba(0, 0, 0, 0.45)", // voile de l'écran de fin
  startVeil: "rgba(0, 0, 0, 0.55)", // voile sur la photo de l'écran de départ (texte lisible)
  overlayText: "#ffffff", // texte sur le voile
  button: "#ffd23c", // fond des boutons
  buttonShadow: "#c9a000", // ombre des boutons
  buttonText: "#3a2a00", // texte des boutons
  buttonSelected: "#ffffff", // contour du niveau choisi
};

// Le thème passe au CSS sous forme de variables (--sky-top, etc.) posées sur la zone de jeu.
const themeVars = {
  "--sky-top": THEME.skyTop,
  "--sky-bottom": THEME.skyBottom,
  "--grass-light": THEME.grassLight,
  "--grass-dark": THEME.grassDark,
  "--ground-edge": THEME.groundEdge,
  "--frame": THEME.frame,
  "--hud-text": THEME.hudText,
  "--hud-shadow": THEME.hudShadow,
  "--overlay": THEME.overlay,
  "--start-veil": THEME.startVeil,
  "--overlay-text": THEME.overlayText,
  "--button": THEME.button,
  "--button-shadow": THEME.buttonShadow,
  "--button-text": THEME.buttonText,
  "--button-selected": THEME.buttonSelected,
};

// Le monde tout neuf, au début d'une partie, réglé selon le niveau choisi.
function createWorld(level) {
  return {
    level, // les réglages du niveau (voir DIFFICULTIES)
    heroY: 0, // hauteur du héros au-dessus du sol (0 = les pieds sur le sol)
    velocity: 0, // vitesse verticale du héros
    isJumping: false, // vrai quand le héros est en l'air (la gravité s'applique)
    airJumps: 0, // rebonds déjà faits en l'air depuis le dernier décollage (max MAX_AIR_JUMPS)
    speed: level.startSpeed, // vitesse à laquelle le sol et les obstacles défilent
    groundOffset: 0, // décalage du motif du sol, pour l'effet de défilement
    obstacles: [], // liste des obstacles : { id, x }
    stars: [], // liste des étoiles : { id, x, y }
    framesSinceSpawn: 0, // images écoulées depuis le dernier obstacle
    framesSinceStar: 0, // images écoulées depuis la dernière étoile
    nextId: 0, // pour donner un numéro unique à chaque objet
    score: 0, // nombre d'étoiles ramassées
  };
}

// Le meilleur score est gardé séparément pour chaque niveau.
function bestScoreKey(levelName) {
  return `${BEST_SCORE_KEY}-${levelName}`;
}

// Lit le meilleur score sauvegardé dans le navigateur (0 s'il n'y en a pas).
function readBestScore(levelName) {
  return Number(localStorage.getItem(bestScoreKey(levelName))) || 0;
}

// Deux rectangles se touchent-ils ? (x, y = coin bas-gauche ; y mesuré depuis le sol)
// On enlève une petite marge sur chaque bord : les emojis ne remplissent pas toute leur case.
function overlaps(a, b) {
  const m = HITBOX_MARGIN;
  return (
    a.x + m < b.x + b.w - m &&
    a.x + a.w - m > b.x + m &&
    a.y + m < b.y + b.h - m &&
    a.y + a.h - m > b.y + m
  );
}

// Joue un petit "bip" de saut avec l'API Web Audio : une note qui monte, très courte.
function playJumpSound(audio) {
  const oscillator = audio.createOscillator(); // fabrique le son
  const volume = audio.createGain(); // règle le volume
  const now = audio.currentTime;
  oscillator.type = "square"; // un son un peu "jeu vidéo"
  oscillator.frequency.setValueAtTime(500, now); // note de départ (Hz)
  oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.1); // qui monte vite
  volume.gain.setValueAtTime(0.15, now); // pas trop fort
  volume.gain.exponentialRampToValueAtTime(0.001, now + 0.15); // et qui s'éteint
  oscillator.connect(volume).connect(audio.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.15);
}

export default function Game() {
  // Tout ce qui bouge dans le jeu est rangé dans une "ref" : on peut le
  // modifier 60 fois par seconde sans que React redessine à chaque petit calcul.
  const worldRef = useRef(createWorld(DIFFICULTIES.normal));

  // Le "haut-parleur" (AudioContext). Créé au premier geste du joueur :
  // les navigateurs refusent de jouer un son avant ça.
  const audioRef = useRef(null);

  // La "scène" : une photo du monde, prise une fois par image, que React dessine.
  const [scene, setScene] = useState({
    heroY: 0,
    groundOffset: 0,
    obstacles: [],
    stars: [],
    score: 0,
  });

  // "ready" sur l'écran de départ, "playing" pendant la partie, "over" après une collision.
  const [status, setStatus] = useState("ready");
  // Le niveau choisi sur l'écran de départ ("facile", "normal" ou "rapide").
  const [levelName, setLevelName] = useState("normal");
  // Le meilleur score du niveau choisi (lu dans le localStorage).
  const [best, setBest] = useState(0);

  // Devient vrai si l'image du héros ne charge pas : on affiche alors l'emoji.
  const [imgFailed, setImgFailed] = useState(false);

  // Donne le haut-parleur, en le créant (ou le réveillant) si besoin.
  function getAudio() {
    if (!audioRef.current) audioRef.current = new AudioContext();
    if (audioRef.current.state === "suspended") audioRef.current.resume();
    return audioRef.current;
  }

  // Fait sauter le héros. Ça marche aussi en plein vol : chaque appui redonne
  // la même impulsion vers le haut (rebond), même s'il était en train de tomber,
  // mais seulement MAX_AIR_JUMPS fois avant de devoir retoucher le sol.
  function jump() {
    const world = worldRef.current;
    if (world.isJumping) {
      if (world.airJumps >= MAX_AIR_JUMPS) return; // plus de rebond disponible
      world.airJumps += 1;
    }
    world.isJumping = true;
    world.velocity = JUMP_SPEED; // on le pousse vers le haut (sa chute est effacée)
    playJumpSound(getAudio());
  }

  // Lance une partie : monde tout neuf avec le niveau choisi, score à zéro.
  function start() {
    worldRef.current = createWorld(DIFFICULTIES[levelName]);
    getAudio(); // on profite du geste du joueur pour préparer le son
    setStatus("playing");
  }

  // Ce qui se passe quand on appuie (Espace, clic ou tap) : ça dépend de l'écran.
  function handlePress() {
    if (status === "ready") start();
    else if (status === "playing") jump();
    // Sur l'écran "over", on utilise les boutons.
  }

  // Retour à l'écran de départ (pour changer de niveau).
  function backToMenu() {
    setStatus("ready");
  }

  // Quand on change de niveau : on affiche le meilleur score de ce niveau.
  function chooseLevel(name) {
    setLevelName(name);
    setBest(readBestScore(name));
  }

  // Juste après le premier affichage, on lit le meilleur score sauvegardé.
  // (Dans une image d'animation, pour ne pas changer l'état pendant le rendu.)
  useEffect(() => {
    const id = requestAnimationFrame(() => setBest(readBestScore(levelName)));
    return () => cancelAnimationFrame(id);
  }, [levelName]);

  // Boucle de jeu : à chaque image, on fait avancer le monde d'un petit pas.
  // Elle tourne seulement pendant la partie (status === "playing").
  useEffect(() => {
    if (status !== "playing") return;
    let frameId;

    function tick() {
      const world = worldRef.current;
      const level = world.level;

      // 1) Le héros : gravité et saut.
      if (world.isJumping) {
        world.velocity -= GRAVITY; // la gravité freine la montée puis accélère la descente
        world.heroY += world.velocity;
        if (world.heroY <= 0) {
          // Le héros touche le sol : on l'arrête pile sur le sol, et il récupère ses rebonds.
          world.heroY = 0;
          world.velocity = 0;
          world.isJumping = false;
          world.airJumps = 0;
        } else if (world.heroY > MAX_HERO_Y) {
          // Plafond : à force de rebondir, il ne doit pas sortir de l'écran.
          world.heroY = MAX_HERO_Y;
          world.velocity = 0;
        }
      }

      // 2) Le jeu accélère petit à petit, jusqu'à la vitesse maximale du niveau.
      world.speed = Math.min(world.speed + level.speedGain, level.maxSpeed);

      // 3) Le sol défile vers la gauche (le motif se répète toutes les 2 bandes).
      world.groundOffset = (world.groundOffset + world.speed) % (GROUND_STRIPE * 2);

      // 4) Les obstacles et les étoiles avancent vers la gauche ; on jette ceux qui sont sortis.
      for (const obstacle of world.obstacles) obstacle.x -= world.speed;
      for (const star of world.stars) star.x -= world.speed;
      world.obstacles = world.obstacles.filter((o) => o.x > -OBSTACLE_SIZE);
      world.stars = world.stars.filter((s) => s.x > -STAR_SIZE);

      // 5) Un nouvel obstacle apparaît à droite à intervalles réguliers.
      world.framesSinceSpawn += 1;
      if (world.framesSinceSpawn >= level.spawnInterval) {
        world.framesSinceSpawn = 0;
        world.obstacles.push({ id: world.nextId++, x: GAME_WIDTH });
      }

      // 6) Une étoile apparaît aussi, à une hauteur au hasard, mais jamais
      //    juste au-dessus d'un cactus qui vient d'apparaître (sinon on attend un peu).
      world.framesSinceStar += 1;
      const cactusTooClose = world.obstacles.some((o) => o.x > GAME_WIDTH - 150);
      if (world.framesSinceStar >= STAR_INTERVAL && !cactusTooClose) {
        world.framesSinceStar = 0;
        const y = STAR_MIN_Y + Math.random() * (level.starMaxY - STAR_MIN_Y);
        world.stars.push({ id: world.nextId++, x: GAME_WIDTH, y });
      }

      // 7) Collisions. La boîte du héros...
      const heroBox = { x: HERO_X, y: world.heroY, w: HERO_SIZE, h: HERO_SIZE };

      //    ... contre les étoiles : on les ramasse (+1 chacune).
      const remaining = world.stars.filter(
        (s) => !overlaps(heroBox, { x: s.x, y: s.y, w: STAR_SIZE, h: STAR_SIZE })
      );
      world.score += world.stars.length - remaining.length;
      world.stars = remaining;

      //    ... contre les cactus : Game Over.
      const hit = world.obstacles.some((o) =>
        overlaps(heroBox, { x: o.x, y: 0, w: OBSTACLE_SIZE, h: OBSTACLE_SIZE })
      );

      // 8) On prend la "photo" du monde pour que React la dessine.
      setScene({
        heroY: world.heroY,
        groundOffset: world.groundOffset,
        obstacles: world.obstacles.map((o) => ({ ...o })),
        stars: world.stars.map((s) => ({ ...s })),
        score: world.score,
      });

      if (hit) {
        // Fin de partie : on garde le meilleur score de ce niveau dans le navigateur.
        if (world.score > readBestScore(levelName)) {
          localStorage.setItem(bestScoreKey(levelName), String(world.score));
          setBest(world.score);
        }
        setStatus("over");
        return; // pas de prochaine image : le jeu est figé
      }
      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId); // nettoyage quand la partie s'arrête
  }, [status, levelName]);

  // La touche Espace = appuyer. (Pas de tableau de dépendances : on rebranche
  // l'écouteur à chaque rendu pour qu'il voie toujours le bon "status".)
  useEffect(() => {
    function onKeyDown(event) {
      if (event.code === "Space") {
        event.preventDefault(); // évite que la page défile
        handlePress();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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

  // Sur iPhone/Android : un tap dans le jeu ne doit ni faire défiler la page, ni zoomer.
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

  // Les boutons des écrans de début/fin ne doivent pas compter comme un "appui" sur le jeu.
  const stopPress = (event) => event.stopPropagation();

  return (
    // Le cadre : largeur disponible (max 800 px), même ratio que le jeu.
    // onPointerDown : un clic (souris) ou un tap (doigt) sur la zone de jeu = appuyer.
    <div
      ref={frameRef}
      className={styles.frame}
      style={{ maxWidth: GAME_WIDTH, aspectRatio: `${GAME_WIDTH} / ${GAME_HEIGHT}`, ...themeVars }}
      onPointerDown={handlePress}
      role="button"
      tabIndex={0}
      aria-label="Zone de jeu : appuie sur Espace ou tape l'écran pour sauter"
    >
    {/* La zone de jeu, toujours en 800×400, mise à l'échelle pour remplir le cadre */}
    <div
      className={styles.game}
      style={{ width: GAME_WIDTH, height: GAME_HEIGHT, transform: `scale(${scale})` }}
    >
      {/* Le score, en haut */}
      <div className={styles.hud}>
        <span>
          {STAR} Score : {scene.score}
        </span>
        <span>🏆 Meilleur : {best}</span>
      </div>

      {/* Le sol : des bandes d'herbe qu'on décale pour donner l'impression qu'il défile */}
      <div
        className={styles.ground}
        style={{
          height: GROUND_HEIGHT,
          backgroundSize: `${GROUND_STRIPE * 2}px 100%`,
          backgroundPositionX: -scene.groundOffset,
        }}
      />

      {/* Les étoiles, en l'air */}
      {scene.stars.map((star) => (
        <div
          key={star.id}
          className={styles.star}
          style={{ left: star.x, bottom: GROUND_HEIGHT + star.y, fontSize: STAR_SIZE }}
        >
          {STAR}
        </div>
      ))}

      {/* Les obstacles, posés sur le sol */}
      {scene.obstacles.map((obstacle) => (
        <div
          key={obstacle.id}
          className={styles.obstacle}
          style={{ left: obstacle.x, bottom: GROUND_HEIGHT, fontSize: OBSTACLE_SIZE }}
        >
          {OBSTACLE}
        </div>
      ))}

      {/* Le héros */}
      <div
        className={styles.hero}
        // bottom = hauteur du sol + hauteur du saut
        style={{ left: HERO_X, bottom: GROUND_HEIGHT + scene.heroY, fontSize: HERO_SIZE }}
      >
        {imgFailed ? (
          HERO
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- balise <img> simple, pas besoin de next/image ici
          <img
            src={HERO_IMG}
            alt="Georges"
            width={HERO_SIZE}
            height={HERO_SIZE}
            draggable={false}
            onError={() => setImgFailed(true)} // repli sur l'emoji
          />
        )}
      </div>

      {/* L'écran de départ : la photo du héros en fond, un voile sombre, puis le texte */}
      {status === "ready" && (
        <div className={styles.startScreen}>
          {!imgFailed && (
            // eslint-disable-next-line @next/next/no-img-element -- image de fond simple
            <img src={HERO_IMG} alt="" className={styles.startBackground} draggable={false} />
          )}
          <div className={`${styles.overlay} ${styles.startVeil}`}>
            <p className={styles.gameTitle}>{GAME_TITLE}</p>
            <p className={styles.bigTitle}>Appuie pour jouer</p>
            <div className={styles.levels} onPointerDown={stopPress}>
            {Object.entries(DIFFICULTIES).map(([name, level]) => (
              <button
                key={name}
                type="button"
                className={`${styles.button} ${name === levelName ? styles.selected : ""}`}
                onClick={() => chooseLevel(name)}
              >
                {level.label}
              </button>
            ))}
            </div>
            <p className={styles.hint}>Espace ou tape l&apos;écran pour sauter</p>
          </div>
        </div>
      )}

      {/* L'écran de fin */}
      {status === "over" && (
        <div className={styles.overlay}>
          <p className={styles.bigTitle}>Game Over</p>
          <p className={styles.finalScore}>
            {STAR} {scene.score}
            {scene.score > 0 && scene.score >= best ? " — nouveau record !" : ""}
          </p>
          <div className={styles.levels} onPointerDown={stopPress}>
            <button type="button" className={styles.button} onClick={start}>
              Rejouer
            </button>
            <button type="button" className={styles.button} onClick={backToMenu}>
              Niveau
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
