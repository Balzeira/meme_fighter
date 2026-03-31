const canvas = document.querySelector('#game-canvas');
const c = canvas.getContext('2d');

canvas.width = 1024;
canvas.height = 576;

const gravity = 0.7;
let gameStarted = false;
let selectingPhase = 'P1'; // 'P1', 'P2', 'STARTED'

const background = new Image();
background.src = './assets/backgrounds/rio.png';

const CHARACTERS = {
    CANARINHO: {
        name: 'CANARINHO PISTOLA',
        color: '#FEDD00', hue: 0, speed: 6, jump: -20, damage: 12,
        specialDamage: 25, img: './assets/characters/canarinho.png',
        attackBox: { offset: { x: 50, y: 50 }, width: 100, height: 50 }
    },
    CAPIVARA: {
        name: 'EDILSON CAPIVARA',
        color: '#8B4513', hue: 120, speed: 8, jump: -17, damage: 20,
        specialDamage: 35, img: './assets/characters/capivara.png',
        attackBox: { offset: { x: 50, y: 20 }, width: 150, height: 80 }
    },
    GALO: {
        name: 'GALO CEGO',
        color: '#FF4500', hue: 240, speed: 10, jump: -23, damage: 10,
        specialDamage: 18, img: './assets/characters/galo.png',
        attackBox: { offset: { x: 80, y: 50 }, width: 120, height: 40 }
    },
    NEGOBAM: {
        name: 'NEGO BAM',
        color: '#333', hue: 300, speed: 8, jump: -20, damage: 20,
        specialDamage: 30, img: './assets/characters/negobam.png',
        attackBox: { offset: { x: 60, y: 50 }, width: 130, height: 60 }
    }
};

class Sprite {
    constructor({ position, imageSrc, scale = 1, offset = { x: 0, y: 0 } }) {
        this.position = position;
        this.image = new Image();
        this.image.src = imageSrc;
        this.scale = scale;
        this.offset = offset;
    }
    draw() {
        if (!this.image.complete) return;
        c.drawImage(this.image, this.position.x - this.offset.x, this.position.y - this.offset.y, 200, 200);
    }
}

class Fighter extends Sprite {
    constructor({ position, velocity, characterData, isFlipped = false }) {
        super({ position, imageSrc: characterData.img, offset: { x: 70, y: 50 } });
        this.charData = characterData;
        this.velocity = velocity;
        this.width = 60; this.height = 150;
        this.health = 100; this.isFlipped = isFlipped;
        this.attackBox = { position: { x: 0, y: 0 }, ...this.charData.attackBox };
        this.dead = false; this.specialCooldown = 0;
    }

    update() {
        c.save();
        if (this.isFlipped) {
            c.translate(this.position.x + this.width / 2, 0);
            c.scale(-1, 1);
            c.translate(-(this.position.x + this.width / 2), 0);
        }
        this.draw();
        c.restore();

        if (this.dead) return;
        this.attackBox.position.x = this.position.x + this.attackBox.offset.x;
        this.attackBox.position.y = this.position.y + this.attackBox.offset.y;

        if (this.isFlipped) this.attackBox.position.x = this.position.x - this.attackBox.width + this.width - this.attackBox.offset.x;

        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        if (this.position.y + this.height + this.velocity.y >= canvas.height - 96) {
            this.velocity.y = 0; this.position.y = 330;
        } else this.velocity.y += gravity;
    }

    attack() {
        this.isAttacking = true;
        setTimeout(() => this.isAttacking = false, 100);
    }

    specialAttack() {
        if (this.specialCooldown > 0) return;
        this.isSpecialAttacking = true;
        this.specialCooldown = 150;
        if (this.charData.name === 'CANARINHO PISTOLA' || this.charData.name === 'NEGO BAM') {
            this.velocity.x = (this.isFlipped ? -20 : 20);
        }
        setTimeout(() => this.isSpecialAttacking = false, 300);
    }

    takeHit(dmg) {
        this.health -= dmg;
        if (this.health <= 0) { this.health = 0; this.dead = true; }
    }
}

let player, enemy;

// Selection Logic
let selectedIndex = 0;
const charKeys = Object.keys(CHARACTERS);
const cards = document.querySelectorAll('.char-card');

function updateSelectionUI() {
    cards.forEach((card, i) => {
        card.classList.toggle('active', i === selectedIndex);
    });
}

function startGame() {
    gameStarted = true;
    document.querySelector('#selection-screen').style.display = 'none';
    decreaseTimer();
    animate();
}

let timer = 99;
let timerId;
function decreaseTimer() {
    if (timer > 0) {
        timerId = setTimeout(decreaseTimer, 1000);
        timer--;
        document.querySelector('#timer').innerText = timer;
    }
}

function animate() {
    if (!gameStarted) return;
    window.requestAnimationFrame(animate);
    c.drawImage(background, 0, 0, canvas.width, canvas.height);
    c.fillStyle = 'rgba(0,0,0,0.2)';
    c.fillRect(0,0,canvas.width, canvas.height);

    player.update();
    enemy.update();

    player.velocity.x = 0;
    enemy.velocity.x = 0;

    if (keys.a.pressed) player.velocity.x = -player.charData.speed;
    if (keys.d.pressed) player.velocity.x = player.charData.speed;
    if (keys.ArrowLeft.pressed) enemy.velocity.x = -enemy.charData.speed;
    if (keys.ArrowRight.pressed) enemy.velocity.x = enemy.charData.speed;

    // Collisions
    if (player.isAttacking && rectangularCollision(player, enemy)) {
        enemy.takeHit(player.charData.damage);
        document.querySelector('#p2-health').style.width = enemy.health + '%';
        player.isAttacking = false;
    }
    if (enemy.isAttacking && rectangularCollision(enemy, player)) {
        player.takeHit(enemy.charData.damage);
        document.querySelector('#p1-health').style.width = player.health + '%';
        enemy.isAttacking = false;
    }
}

function rectangularCollision(f1, f2) {
    return (
        f1.attackBox.position.x + f1.attackBox.width >= f2.position.x &&
        f1.attackBox.position.x <= f2.position.x + f2.width &&
        f1.attackBox.position.y + f1.attackBox.height >= f2.position.y &&
        f1.attackBox.position.y <= f2.position.y + f2.height
    );
}

const keys = { a: {pressed: false}, d: {pressed: false}, ArrowLeft: {pressed: false}, ArrowRight: {pressed: false} };

window.addEventListener('keydown', (e) => {
    if (!gameStarted) {
        if (e.code === 'Space' && document.querySelector('#start-screen').style.display !== 'none') {
            document.querySelector('#start-screen').style.display = 'none';
            document.querySelector('#selection-screen').style.display = 'flex';
            return;
        }

        if (selectingPhase !== 'STARTED') {
            if (e.key === 'ArrowRight') { selectedIndex = (selectedIndex + 1) % charKeys.length; updateSelectionUI(); }
            if (e.key === 'ArrowLeft') { selectedIndex = (selectedIndex - 1 + charKeys.length) % charKeys.length; updateSelectionUI(); }
            if (e.code === 'Space') {
                const char = CHARACTERS[charKeys[selectedIndex]];
                if (selectingPhase === 'P1') {
                    player = new Fighter({ position: { x: 100, y: 0 }, velocity: { x: 0, y: 0 }, characterData: char });
                    document.querySelector('#selection-title').innerText = 'SELECIONE SEU LUTADOR (P2)';
                    document.querySelector('.character-name:nth-child(1)').innerText = char.name;
                    cards[selectedIndex].classList.add('p1-selected');
                    selectingPhase = 'P2';
                } else {
                    enemy = new Fighter({ position: { x: 800, y: 0 }, velocity: { x: 0, y: 0 }, characterData: char, isFlipped: true });
                    document.querySelector('.character-name:last-child').innerText = char.name;
                    cards[selectedIndex].classList.add('p2-selected');
                    selectingPhase = 'STARTED';
                    setTimeout(startGame, 500);
                }
            }
        }
        return;
    }

    switch (e.key) {
        case 'd': keys.d.pressed = true; break;
        case 'a': keys.a.pressed = true; break;
        case 'w': if (player.velocity.y === 0) player.velocity.y = player.charData.jump; break;
        case 'f': player.attack(); break;
        case 'g': player.specialAttack(); break;
        case 'ArrowRight': keys.ArrowRight.pressed = true; break;
        case 'ArrowLeft': keys.ArrowLeft.pressed = true; break;
        case 'ArrowUp': if (enemy.velocity.y === 0) enemy.velocity.y = enemy.charData.jump; break;
        case 'j': enemy.attack(); break;
        case 'k': enemy.specialAttack(); break;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys[e.key]) keys[e.key].pressed = false;
});
