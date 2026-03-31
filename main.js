const canvas = document.querySelector('#game-canvas');
const c = canvas.getContext('2d');

canvas.width = 1024;
canvas.height = 576;

const gravity = 0.7;

const background = new Image();
background.src = './assets/backgrounds/rio.png';

// Character Specifications
const CHARACTERS = {
    CANARINHO: {
        name: 'CANARINHO PISTOLA',
        color: '#FEDD00',
        hue: 0,
        speed: 6,
        jump: -20,
        damage: 12,
        specialName: 'VOADORA NERVOSA',
        specialDamage: 25,
        attackBox: { offset: { x: 50, y: 50 }, width: 100, height: 50 }
    },
    CAPIVARA: {
        name: 'EDILSON CAPIVARA',
        color: '#8B4513',
        hue: 120,
        speed: 8, // Conforme imagem (SPD: 8)
        jump: -17,
        damage: 20, // Conforme imagem (ATK: MAX)
        specialName: 'CARINHO DE CAPIVARA',
        specialDamage: 35,
        attackBox: { offset: { x: 50, y: 20 }, width: 150, height: 80 }
    },
    GALO: {
        name: 'GALO CEGO',
        color: '#FF4500',
        hue: 240,
        speed: 10, // Conforme imagem (SPD: MAX)
        jump: -23,
        damage: 10, // Conforme imagem (ATK: 6)
        specialName: 'ATAQUE VISUAL',
        specialDamage: 18,
        attackBox: { offset: { x: 80, y: 50 }, width: 120, height: 40 }
    },
    NEGOBAM: {
        name: 'NEGO BAM',
        color: '#333',
        hue: 300,
        speed: 8, // Conforme imagem (SPD: 8)
        jump: -20,
        damage: 20, // Conforme imagem (ATK: MAX)
        specialName: 'O NOOOVO',
        specialDamage: 30,
        attackBox: { offset: { x: 60, y: 50 }, width: 130, height: 60 }
    }
};

class Sprite {
    constructor({ position, imageSrc, scale = 1, framesMax = 1, offset = { x: 0, y: 0 } }) {
        this.position = position;
        this.width = 50;
        this.height = 150;
        this.image = new Image();
        this.image.src = imageSrc;
        this.scale = scale;
        this.framesMax = framesMax;
        this.framesCurrent = 0;
        this.framesElapsed = 0;
        this.framesHold = 5;
        this.offset = offset;
    }

    draw() {
        c.drawImage(
            this.image,
            this.framesCurrent * (this.image.width / this.framesMax),
            0,
            this.image.width / this.framesMax,
            this.image.height,
            this.position.x - this.offset.x,
            this.position.y - this.offset.y,
            (this.image.width / this.framesMax) * this.scale * 200/this.image.width,
            200 // Fixed height for consistency
        );
    }

    update() {
        this.draw();
        this.animateFrames();
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
    constructor({
        position,
        velocity,
        characterData,
        imageSrc,
        isFlipped = false
    }) {
        super({
            position,
            imageSrc,
            scale: 1,
            offset: { x: 70, y: 50 }
        });

        this.charData = characterData;
        this.velocity = velocity;
        this.width = 60;
        this.height = 150;
        this.lastKey;
        this.attackBox = {
            position: { x: this.position.x, y: this.position.y },
            offset: this.charData.attackBox.offset,
            width: this.charData.attackBox.width,
            height: this.charData.attackBox.height
        };
        this.isAttacking;
        this.isSpecialAttacking;
        this.health = 100;
        this.isFlipped = isFlipped;
        this.dead = false;
        this.specialCooldown = 0;
    }

    draw() {
        c.save();
        
        // Character specific effects
        c.filter = `hue-rotate(${this.charData.hue}deg)`;

        if (this.isFlipped) {
            c.translate(this.position.x + this.width / 2, 0);
            c.scale(-1, 1);
            c.translate(-(this.position.x + this.width / 2), 0);
        }

        if (this.image.complete) {
            c.drawImage(
                this.image,
                this.position.x - this.offset.x, 
                this.position.y - this.offset.y,
                200, 200
            );
        } else {
            c.fillStyle = this.charData.color;
            c.fillRect(this.position.x, this.position.y, this.width, this.height);
        }

        // Special Attack visual feedback
        if (this.isSpecialAttacking) {
            c.fillStyle = 'rgba(255, 255, 255, 0.5)';
            c.fillRect(this.position.x, this.position.y, this.width, this.height);
        }

        c.restore();
    }

    update() {
        this.draw();
        if (this.dead) return;

        if (this.specialCooldown > 0) this.specialCooldown--;

        this.attackBox.position.x = this.position.x + this.attackBox.offset.x;
        this.attackBox.position.y = this.position.y + this.attackBox.offset.y;

        if (this.isFlipped) {
            this.attackBox.position.x = this.position.x - this.attackBox.width + this.width - this.attackBox.offset.x;
        }

        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        if (this.position.y + this.height + this.velocity.y >= canvas.height - 96) {
            this.velocity.y = 0;
            this.position.y = 330;
        } else {
            this.velocity.y += gravity;
        }
    }

    attack() {
        this.isAttacking = true;
        setTimeout(() => { this.isAttacking = false; }, 100);
    }

    specialAttack() {
        if (this.specialCooldown > 0) return;
        
        this.isSpecialAttacking = true;
        this.specialCooldown = 200; // Frames

        // Execute behavior based on character
        if (this.charData.name === 'CANARINHO PISTOLA') {
            const dir = this.isFlipped ? -1 : 1;
            this.velocity.x = 25 * dir;
        } else if (this.charData.name === 'EDILSON CAPIVARA') {
            this.attackBox.width *= 2;
            this.attackBox.height *= 2;
        } else if (this.charData.name === 'GALO CEGO') {
             const dir = this.isFlipped ? -1 : 1;
             this.position.x += 150 * dir;
        } else if (this.charData.name === 'NEGO BAM') {
             // Sonic wave logic (visual scaling or direct dmg)
             this.attackBox.width = 300; 
        }

        setTimeout(() => {
            this.isSpecialAttacking = false;
            // Reset modifications
            if (this.charData.name === 'EDILSON CAPIVARA') {
                this.attackBox.width = this.charData.attackBox.width;
                this.attackBox.height = this.charData.attackBox.height;
            }
            if (this.charData.name === 'NEGO BAM') {
                this.attackBox.width = this.charData.attackBox.width;
            }
        }, 300);
    }

    takeHit(dmg) {
        this.health -= dmg;
        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
        }
    }
}

const backgroundSprite = {
    draw() {
        c.drawImage(background, 0, 0, canvas.width, canvas.height);
    }
};

const player = new Fighter({
    position: { x: 100, y: 0 },
    velocity: { x: 0, y: 0 },
    characterData: CHARACTERS.CANARINHO,
    imageSrc: './assets/characters/canarinho.png'
});

const enemy = new Fighter({
    position: { x: 800, y: 100 },
    velocity: { x: 0, y: 0 },
    characterData: CHARACTERS.CAPIVARA,
    imageSrc: './assets/characters/canarinho.png',
    isFlipped: true
});

// Update UI Names
document.querySelectorAll('.character-name')[0].innerText = player.charData.name;
document.querySelectorAll('.character-name')[1].innerText = enemy.charData.name;

const keys = {
    a: { pressed: false },
    d: { pressed: false },
    ArrowRight: { pressed: false },
    ArrowLeft: { pressed: false }
};

function rectangularCollision({ rectangle1, rectangle2 }) {
    const r1Box = rectangle1.attackBox;
    const r1Pos = rectangle1.isSpecialAttacking ? rectangle1.position : r1Box.position; 
    
    return (
        r1Box.position.x + r1Box.width >= rectangle2.position.x &&
        r1Box.position.x <= rectangle2.position.x + rectangle2.width &&
        r1Box.position.y + r1Box.height >= rectangle2.position.y &&
        r1Box.position.y <= rectangle2.position.y + rectangle2.height
    );
}

function determineWinner({ player, enemy, timerId }) {
    clearTimeout(timerId);
    const display = document.querySelector('#status-display');
    display.classList.add('ko-text');
    if (player.health === enemy.health) {
        display.innerHTML = 'EMPATE';
    } else if (player.health > enemy.health) {
        display.innerHTML = 'P1 VENCEU!';
    } else if (player.health < enemy.health) {
        display.innerHTML = 'P2 VENCEU!';
    }
}

let timer = 99;
let timerId;
function decreaseTimer() {
    if (timer > 0) {
        timerId = setTimeout(decreaseTimer, 1000);
        timer--;
        document.querySelector('#timer').innerHTML = timer;
    }
    if (timer === 0) determineWinner({ player, enemy, timerId });
}

function animate() {
    window.requestAnimationFrame(animate);
    c.fillStyle = 'black';
    c.fillRect(0, 0, canvas.width, canvas.height);
    backgroundSprite.draw();
    c.fillStyle = 'rgba(255, 255, 255, 0.1)';
    c.fillRect(0, 0, canvas.width, canvas.height);

    player.update();
    enemy.update();

    if (!player.isSpecialAttacking) player.velocity.x = 0;
    if (!enemy.isSpecialAttacking) enemy.velocity.x = 0;

    // Player 1 movement
    if (keys.a.pressed && player.lastKey === 'a') {
        player.velocity.x = -player.charData.speed;
    } else if (keys.d.pressed && player.lastKey === 'd') {
        player.velocity.x = player.charData.speed;
    }

    // Enemy movement
    if (keys.ArrowLeft.pressed && enemy.lastKey === 'ArrowLeft') {
        enemy.velocity.x = -enemy.charData.speed;
    } else if (keys.ArrowRight.pressed && enemy.lastKey === 'ArrowRight') {
        enemy.velocity.x = enemy.charData.speed;
    }

    // P1 Attack
    if (rectangularCollision({ rectangle1: player, rectangle2: enemy }) && (player.isAttacking || player.isSpecialAttacking)) {
        const dmg = player.isSpecialAttacking ? player.charData.specialDamage : player.charData.damage;
        enemy.takeHit(dmg);
        player.isAttacking = false;
        if (!player.isSpecialAttacking) player.isSpecialAttacking = false;
        document.querySelector('#p2-health').style.width = enemy.health + '%';
    }

    // P2 Attack
    if (rectangularCollision({ rectangle1: enemy, rectangle2: player }) && (enemy.isAttacking || enemy.isSpecialAttacking)) {
        const dmg = enemy.isSpecialAttacking ? enemy.charData.specialDamage : enemy.charData.damage;
        player.takeHit(dmg);
        enemy.isAttacking = false;
        document.querySelector('#p1-health').style.width = player.health + '%';
    }

    if (enemy.health <= 0 || player.health <= 0) {
        determineWinner({ player, enemy, timerId });
    }
}

window.addEventListener('keydown', (event) => {
    if (!player.dead) {
        switch (event.key) {
            case 'd': keys.d.pressed = true; player.lastKey = 'd'; break;
            case 'a': keys.a.pressed = true; player.lastKey = 'a'; break;
            case 'w': if (player.velocity.y === 0) player.velocity.y = player.charData.jump; break;
            case 'f': player.attack(); break;
            case 'g': player.specialAttack(); break;
        }
    }

    if (!enemy.dead) {
        switch (event.key) {
            case 'ArrowRight': keys.ArrowRight.pressed = true; enemy.lastKey = 'ArrowRight'; break;
            case 'ArrowLeft': keys.ArrowLeft.pressed = true; enemy.lastKey = 'ArrowLeft'; break;
            case 'ArrowUp': if (enemy.velocity.y === 0) enemy.velocity.y = enemy.charData.jump; break;
            case 'j': enemy.attack(); break;
            case 'k': enemy.specialAttack(); break;
        }
    }

    if (event.code === 'Space') {
        document.querySelector('#start-screen').style.display = 'none';
        if (!timerId) decreaseTimer();
    }
});

window.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'd': keys.d.pressed = false; break;
        case 'a': keys.a.pressed = false; break;
        case 'ArrowRight': keys.ArrowRight.pressed = false; break;
        case 'ArrowLeft': keys.ArrowLeft.pressed = false; break;
    }
});

animate();
