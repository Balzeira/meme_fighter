const canvas = document.querySelector('#game-canvas');
const c = canvas.getContext('2d');

canvas.width = 1024;
canvas.height = 576;

const gravity = 0.7;
let gameStarted = false;
let selectingPhase = 'P1';

const background = new Image();
background.src = './assets/backgrounds/rio.png';

const CHARACTERS = {
    CANARINHO: {
        name: 'CANARINHO PISTOLA',
        speed: 6, jump: -20, damage: 12, specialDamage: 25,
        sheet: './assets/characters/canarinho_sheet.png',
        frames: { idle: 3, punch: 3, kick: 4, special: 2 },
        attackBox: { offset: { x: 50, y: 50 }, width: 100, height: 50 }
    },
    CAPIVARA: {
        name: 'EDILSON CAPIVARA',
        speed: 8, jump: -17, damage: 20, specialDamage: 35,
        sheet: './assets/characters/capivara_sheet.png',
        frames: { idle: 3, punch: 3, kick: 3, special: 2 },
        attackBox: { offset: { x: 50, y: 20 }, width: 150, height: 80 }
    },
    GALO: {
        name: 'GALO CEGO',
        speed: 10, jump: -23, damage: 10, specialDamage: 18,
        sheet: './assets/characters/galo_sheet.png',
        frames: { idle: 4, punch: 5, kick: 5, special: 4 },
        attackBox: { offset: { x: 80, y: 50 }, width: 120, height: 40 }
    },
    NEGOBAM: {
        name: 'NEGO BAM',
        speed: 8, jump: -20, damage: 20, specialDamage: 30,
        sheet: './assets/characters/negobam_sheet.png',
        frames: { idle: 4, punch: 5, kick: 5, special: 5 },
        attackBox: { offset: { x: 60, y: 50 }, width: 130, height: 60 }
    }
};

class Sprite {
    constructor({ position, imageSrc, framesMax = 1, offset = { x: 0, y: 0 } }) {
        this.position = position;
        this.image = new Image();
        this.image.src = imageSrc;
        this.framesMax = framesMax;
        this.framesCurrent = 0;
        this.framesElapsed = 0;
        this.framesHold = 8;
        this.offset = offset;
        this.currentRow = 0;
    }

    draw() {
        if (!this.image.complete) return;
        
        // Calculando o tamanho de cada quadro na sheet (baseado em grades de 500px por exemplo)
        const frameWidth = this.image.width / 5; // Assumindo max 5 colunas
        const frameHeight = this.image.height / 4; // 4 Linhas: Idle, Punch, Kick, Special

        c.drawImage(
            this.image,
            this.framesCurrent * (this.image.width / 5),
            this.currentRow * (this.image.height / 4),
            this.image.width / 5,
            this.image.height / 4,
            this.position.x - this.offset.x,
            this.position.y - this.offset.y,
            300, 300 // Tamanho no jogo
        );
    }

    animateFrames() {
        this.framesElapsed++;
        if (this.framesElapsed % this.framesHold === 0) {
            if (this.framesCurrent < this.framesMax - 1) {
                this.framesCurrent++;
            } else {
                this.framesCurrent = 0;
            }
        }
    }
}

class Fighter extends Sprite {
    constructor({ position, velocity, characterData, isFlipped = false }) {
        super({ position, imageSrc: characterData.sheet, framesMax: characterData.frames.idle, offset: { x: 120, y: 120 } });
        this.charData = characterData;
        this.velocity = velocity;
        this.width = 60; this.height = 150;
        this.health = 100; this.isFlipped = isFlipped;
        this.attackBox = { position: { x: 0, y: 0 }, ...this.charData.attackBox };
        this.dead = false; this.specialCooldown = 0;
        this.state = 'idle';
    }

    switchSprite(state) {
        if (this.state === state) return;
        this.state = state;
        switch (state) {
            case 'idle': this.currentRow = 0; this.framesMax = this.charData.frames.idle; break;
            case 'punch': this.currentRow = 1; this.framesMax = this.charData.frames.punch; break;
            case 'kick': this.currentRow = 2; this.framesMax = this.charData.frames.kick; break;
            case 'special': this.currentRow = 3; this.framesMax = this.charData.frames.special; break;
        }
        this.framesCurrent = 0;
    }

    update() {
        c.save();
        if (this.isFlipped) {
            c.translate(this.position.x + this.width / 2, 0);
            c.scale(-1, 1);
            c.translate(-(this.position.x + this.width / 2), 0);
        }
        this.draw();
        this.animateFrames();
        c.restore();

        if (this.dead) return;
        
        // Reset state to idle if animation finishes and it's an action
        if (this.state !== 'idle' && this.framesCurrent === this.framesMax - 1) {
            this.switchSprite('idle');
        }

        this.attackBox.position.x = this.position.x + this.attackBox.offset.x;
        this.attackBox.position.y = this.position.y + this.attackBox.offset.y;
        if (this.isFlipped) this.attackBox.position.x = this.position.x - this.attackBox.width + this.width - this.attackBox.offset.x;

        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        if (this.position.y + this.height + this.velocity.y >= canvas.height - 96) {
            this.velocity.y = 0; this.position.y = 330;
        } else this.velocity.y += gravity;
    }

    attack(type = 'punch') {
        this.isAttacking = true;
        this.switchSprite(type);
        setTimeout(() => this.isAttacking = false, 300);
    }

    specialAttack() {
        if (this.specialCooldown > 0) return;
        this.isSpecialAttacking = true;
        this.specialCooldown = 150;
        this.switchSprite('special');
        if (this.charData.name === 'CANARINHO PISTOLA' || this.charData.name === 'NEGO BAM') {
            this.velocity.x = (this.isFlipped ? -25 : 25);
        }
        setTimeout(() => this.isSpecialAttacking = false, 500);
    }

    takeHit(dmg) {
        this.health -= dmg;
        if (this.health <= 0) { this.health = 0; this.dead = true; }
    }
}

let player, enemy;
let selectedIndex = 0;
const charKeys = Object.keys(CHARACTERS);
const cards = document.querySelectorAll('.char-card');

function updateSelectionUI() {
    cards.forEach((card, i) => card.classList.toggle('active', i === selectedIndex));
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
    c.fillStyle = 'rgba(0,0,0,0.3)';
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
                    document.querySelector('#selection-title').innerText = 'SELECIONE P2';
                    cards[selectedIndex].classList.add('p1-selected');
                    selectingPhase = 'P2';
                } else {
                    enemy = new Fighter({ position: { x: 800, y: 0 }, velocity: { x: 0, y: 0 }, characterData: char, isFlipped: true });
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
        case 'f': player.attack('punch'); break;
        case 'r': player.attack('kick'); break;
        case 'g': player.specialAttack(); break;
        case 'ArrowRight': keys.ArrowRight.pressed = true; break;
        case 'ArrowLeft': keys.ArrowLeft.pressed = true; break;
        case 'ArrowUp': if (enemy.velocity.y === 0) enemy.velocity.y = enemy.charData.jump; break;
        case 'j': enemy.attack('punch'); break;
        case 'i': enemy.attack('kick'); break;
        case 'k': enemy.specialAttack(); break;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys[e.key]) keys[e.key].pressed = false;
    if (e.key === 'a' || e.key === 'd') keys[e.key].pressed = false;
});

animate();
