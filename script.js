//Noa Obringer
//IIM B3

// Récupération du canvas et de son contexte 2D
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Variables globales pour les dimensions et l'état de l'animation
let width, height;
let time = 0;
let mouse = { x: 0, y: 0 };
let mouseActive = false;

// Paramètres de tramage (dithering)
const ditherSize = 3;
const patternSize = 4;

// Matrice de Bayer 4x4 pour le tramage ordonné
// Utilisée pour convertir les niveaux de gris en motifs binaires
const bayerMatrix = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
];

// Initialise les dimensions du canvas selon la taille de la fenêtre
function init() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

// Applique le tramage de Bayer pour convertir une intensité en valeur binaire (0 ou 1)
// x, y: coordonnées du pixel
// intensity: intensité entre 0 et 1
// Retourne 1 si le pixel doit être blanc, 0 s'il doit être noir
function ditherValue(x, y, intensity) {
    const bx = Math.floor(x / ditherSize) % 4;
    const by = Math.floor(y / ditherSize) % 4;
    const threshold = bayerMatrix[by][bx] / 16;
    return intensity > threshold ? 1 : 0;
}

// Dessine un cercle avec tramage, avec dégradé radial
// cx, cy: centre du cercle
// radius: rayon du cercle
// intensity: intensité maximale au centre (0-1)
function drawDitherCircle(cx, cy, radius, intensity) {
    const size = Math.ceil(radius * 2);
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    const offsetX = Math.floor(cx - radius);
    const offsetY = Math.floor(cy - radius);

    // Parcourt tous les pixels dans la zone du cercle
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x - radius;
            const dy = y - radius;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Si le pixel est dans le cercle
            if (dist < radius) {
                // Calcul du dégradé radial (plus intense au centre)
                const fade = 1 - (dist / radius);
                const localIntensity = intensity * fade;
                // Application du tramage
                const dithered = ditherValue(offsetX + x, offsetY + y, localIntensity) * 255;

                // Écriture du pixel dans ImageData (RGBA)
                const idx = (y * size + x) * 4;
                data[idx] = dithered;
                data[idx + 1] = dithered;
                data[idx + 2] = dithered;
                data[idx + 3] = 255;
            }
        }
    }

    ctx.putImageData(imageData, offsetX, offsetY);
}

// Dessine une forme géométrique hexagonale avec morphing et tramage
// x, y: position de la forme
// size: taille de base
// rotation: angle de rotation
// t: temps pour l'animation
// index: index pour varier l'animation entre les formes
function drawGeometricShape(x, y, size, rotation, t, index) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Création d'un hexagone (6 côtés)
    const sides = 6;
    const points = [];

    // Calcul des points avec morphing animé
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        // Morphing: variation du rayon selon le temps et l'angle
        const morph = Math.sin(t * 0.5 + index + angle * 2) * 0.15;
        const radius = size * (1 + morph);
        points.push({
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        });
    }

    // Construction du chemin de la forme
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();

    // Calcul de l'intensité selon la distance du centre
    const centerDist = Math.sqrt(x * x + y * y);
    const maxDist = Math.sqrt(width * width + height * height) / 2;
    const intensity = 0.4 + (1 - centerDist / maxDist) * 0.4;

    // Calcul des limites de la forme pour optimiser le rendu
    const pathBounds = {
        minX: Math.min(...points.map(p => p.x)),
        maxX: Math.max(...points.map(p => p.x)),
        minY: Math.min(...points.map(p => p.y)),
        maxY: Math.max(...points.map(p => p.y))
    };

    // Rendu pixel par pixel avec tramage
    const w = Math.ceil(pathBounds.maxX - pathBounds.minX);
    const h = Math.ceil(pathBounds.maxY - pathBounds.minY);
    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;

    for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
            const worldX = px + pathBounds.minX;
            const worldY = py + pathBounds.minY;

            // Vérifie si le pixel est dans la forme
            if (ctx.isPointInPath(worldX, worldY)) {
                const dithered = ditherValue(worldX + x, worldY + y, intensity) * 255;
                const idx = (py * w + px) * 4;
                data[idx] = dithered;
                data[idx + 1] = dithered;
                data[idx + 2] = dithered;
                data[idx + 3] = 255;
            }
        }
    }

    ctx.putImageData(imageData, x + pathBounds.minX, y + pathBounds.minY);

    ctx.restore();
}

// Dessine un motif de vagues horizontales animées avec tramage
// t: temps pour l'animation
function drawWavePattern(t) {
    const waveCount = 8;
    const waveHeight = 35;

    // Dessine plusieurs vagues horizontales
    for (let i = 0; i < waveCount; i++) {
        const yBase = (i / waveCount) * height;
        const offset = t * 15 + i * 25; // Décalage animé pour chaque vague
        const intensity = 0.08 + (i / waveCount) * 0.15; // Intensité croissante

        const imageData = ctx.createImageData(width, Math.ceil(waveHeight * 2));
        const data = imageData.data;

        for (let py = 0; py < waveHeight * 2; py++) {
            const y = yBase + py - waveHeight;
            if (y < 0 || y >= height) continue;

            // Parcourt la largeur avec un pas de 2 pour optimiser
            for (let px = 0; px < width; px += 2) {
                // Calcul de la position de la vague sinusoïdale
                const wave = Math.sin((px + offset) * 0.02) * waveHeight * (1 - i / waveCount);
                const distFromWave = Math.abs(py - waveHeight - wave);

                // Dessine uniquement près de la ligne de vague
                if (distFromWave < 3) {
                    const localIntensity = intensity * (1 - distFromWave / 3);
                    const dithered = ditherValue(px, y, localIntensity) * 255;
                    const idx = (py * width + px) * 4;
                    data[idx] = dithered;
                    data[idx + 1] = dithered;
                    data[idx + 2] = dithered;
                    data[idx + 3] = 255;
                }
            }
        }

        ctx.putImageData(imageData, 0, yBase - waveHeight);
    }
}

// Dessine des cercles en orbite autour du centre
// t: temps pour l'animation
function drawOrbitalCircles(t) {
    const circleCount = 5;

    for (let i = 0; i < circleCount; i++) {
        // Calcul de la position orbitale
        const angle = (i / circleCount) * Math.PI * 2 + t * 0.25;
        const radius = Math.min(width, height) * (0.12 + (i % 3) * 0.08);
        const x = width / 2 + Math.cos(angle) * radius;
        const y = height / 2 + Math.sin(angle) * radius;

        // Taille et intensité pulsantes
        const size = 25 + Math.sin(t * 1.8 + i) * 12;
        const intensity = 0.35 + Math.sin(t + i) * 0.25;

        drawDitherCircle(x, y, size, intensity);
    }
}

// Dessine un motif de grille avec intensité radiale et pulsation
// t: temps pour l'animation
function drawGridPattern(t) {
    const gridSize = 50;
    const cols = Math.ceil(width / gridSize);
    const rows = Math.ceil(height / gridSize);

    // Parcourt la grille en sautant une case sur deux
    for (let i = 0; i < cols; i += 2) {
        for (let j = 0; j < rows; j += 2) {
            const x = i * gridSize;
            const y = j * gridSize;
            const centerX = width / 2;
            const centerY = height / 2;

            // Calcul de la distance du centre pour l'intensité radiale
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = Math.sqrt(width * width + height * height) / 2;

            // Intensité plus forte près du centre, avec pulsation
            const intensity = (1 - distance / maxDistance) * 0.12;
            const pulse = Math.sin(t + distance * 0.008) * 0.04;

            // Ne dessine que si l'intensité est suffisante
            if (intensity > 0.02) {
                const size = gridSize;
                const imageData = ctx.createImageData(size, size);
                const data = imageData.data;

                // Remplit chaque cellule de la grille avec tramage
                for (let py = 0; py < size; py++) {
                    for (let px = 0; px < size; px++) {
                        const dithered = ditherValue(x + px, y + py, intensity + pulse) * 255;
                        const idx = (py * size + px) * 4;
                        data[idx] = dithered;
                        data[idx + 1] = dithered;
                        data[idx + 2] = dithered;
                        data[idx + 3] = 255;
                    }
                }

                ctx.putImageData(imageData, x, y);
            }
        }
    }
}

// Dessine la forme centrale avec des hexagones orbitaux et un cercle principal
// t: temps pour l'animation
function drawCentralForm(t) {
    const centerX = width / 2;
    const centerY = height / 2;
    const baseSize = Math.min(width, height) * 0.12;

    const shapeCount = 6;

    // Dessine des hexagones en orbite autour du centre
    for (let i = 0; i < shapeCount; i++) {
        const angle = (i / shapeCount) * Math.PI * 2 + t * 0.18;
        const distance = baseSize * (1 + Math.sin(t * 0.4 + i) * 0.25);
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;

        // Taille et rotation animées
        const size = 20 + Math.sin(t * 1.3 + i) * 8;
        const rotation = t * 0.25 + i;

        drawGeometricShape(x, y, size, rotation, t, i);
    }

    // Cercle principal au centre avec pulsation
    const mainSize = baseSize * (1 + Math.sin(t * 0.35) * 0.15);
    const mainIntensity = 0.55 + Math.sin(t) * 0.2;
    drawDitherCircle(centerX, centerY, mainSize, mainIntensity);
}

// Remplit le fond en noir
function drawBackground() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
}

// Dessine l'influence de la souris (cercle à la position du curseur)
function drawMouseInfluence() {
    if (!mouseActive) return;

    // Calcul de l'intensité selon la distance du centre
    const dx = mouse.x - width / 2;
    const dy = mouse.y - height / 2;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = Math.sqrt(width * width + height * height) / 2;
    const intensity = (1 - distance / maxDistance) * 0.35;

    drawDitherCircle(mouse.x, mouse.y, 50, intensity);
}

// Boucle d'animation principale
function animate() {
    time += 0.016; // Incrémente le temps (environ 60 FPS)

    // Dessine tous les éléments dans l'ordre
    drawBackground();
    drawGridPattern(time);
    drawWavePattern(time);
    drawOrbitalCircles(time);
    drawCentralForm(time);
    drawMouseInfluence();

    requestAnimationFrame(animate);
}

// Gestion des événements de la souris
canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouseActive = true;
});

canvas.addEventListener('mouseleave', () => {
    mouseActive = false;
});

// Réinitialise le canvas lors du redimensionnement de la fenêtre
window.addEventListener('resize', () => {
    init();
});

// Initialisation et démarrage de l'animation
init();
animate();
