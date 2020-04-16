function removeItemFromArray(item, array) {
    let index = array.indexOf(item);
    if (index > -1) {
        array.splice(index, 1);
    }
}
function objectSome(obj, func) {
    for (var key in obj) {
        if (func(obj[key])) {
            return true;
        }
    }
    return false;
}
function randomOrderForEach(seed, arr, func) {
    for (var i = 0; i < arr.length; i++) {
        seed = (seed + PHI) % 1;
        var index = Math.floor(seed * arr.length);
        func(arr[index]);
    }
    return seed;
}
const STUD_GRID_START_X = 125;
const STUD_GRID_START_Y = 125;
const CELL_DEFAULT_EMF = 12;
const CIRCUIT_UPDATES_PER_FRAME = 10;
const DEFAULT_CAPACITANCE = 0.5;
const DEFAULT_CONDUCTANCE = 0.001;
const CELL_CURRENT_LIMIT_FOR_FIRE = 100;
const ELECTRON_SPEED = 5;
const PHI = 0.61803398875;
const SPAWN_VERTICAL_SPACING = 50;
const CURRENT_MAGNIFYING_FACTOR = 1;
const STUD_VOLTAGE_MEAN_SAMPLE_SIZE = 10;
class DraggableComponent extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        this.capacitanceBoost = 0;
        this.electrons = [];
        this.prevCurrent = 0;
        scene.add.existing(this);
        this.notYetInCircuit = true;
        scene.input.setDraggable(this.setInteractive());
        this.on('dragstart', this.dragStart);
        this.on('drag', this.onDrag);
        this.on('dragend', this.dragEnd);
        this.on("destroy", this.onDestroy);
        this.on('pointerdown', this.onClick);
    }
    dragStart(pointer) {
        if (this.notYetInCircuit) {
            this.notYetInCircuit = false;
            this.scene.add.existing(this.clone());
        }
        removeItemFromArray(this, this.scene.components);
        if (this.studA) {
            this.studA.removeComponent(this);
        }
        ;
        if (this.studB) {
            this.studB.removeComponent(this);
        }
    }
    onDrag(pointer, dragX, dragY) {
        let modX = dragX % 125;
        let modY = dragY % 125;
        this.isHor = ((modX > modY) == (modX + modY < 125));
        if (this.isHor) {
            this.angle = 0;
            this.x = Phaser.Math.Snap.To(dragX, 125, STUD_GRID_START_X - 62.5);
            this.y = Phaser.Math.Snap.To(dragY, 125, STUD_GRID_START_Y);
        }
        else {
            this.angle = 90;
            this.x = Phaser.Math.Snap.To(dragX, 125, STUD_GRID_START_X);
            this.y = Phaser.Math.Snap.To(dragY, 125, STUD_GRID_START_Y - 62.5);
        }
        this.electrons.forEach(e => { e.visible = false; });
    }
    dragEnd(pointer) {
        let coordsA = this.getStudA();
        this.studA = this.scene.studGrid[coordsA[0]][coordsA[1]];
        let coordsB = this.getStudB();
        this.studB = this.scene.studGrid[coordsB[0]][coordsB[1]];
        var alreadyThere = this.scene.components.filter(c => {
            return c.studA == this.studA && c.studB == this.studB;
        });
        for (var item of alreadyThere) {
            removeItemFromArray(item, this.scene.components);
            item.destroy();
        }
        if (this.electrons.length < 1) {
            this.electrons.push(new Electron(this.scene, this.x, this.y, this, -50));
            this.electrons.push(new Electron(this.scene, this.x, this.y, this, -25));
            this.electrons.push(new Electron(this.scene, this.x, this.y, this, 25));
            this.electrons.push(new Electron(this.scene, this.x, this.y, this, 50));
        }
        else {
            this.updateElectrons();
            this.electrons.forEach(e => { e.visible = true; });
        }
        if (this.studA != undefined && this.studB != undefined) {
            this.scene.components.push(this);
            this.studA.addComponent(this);
            this.studB.addComponent(this);
        }
        else {
            this.destroy();
        }
    }
    onDestroy(item) {
        item.electrons.forEach(e => e.destroy());
    }
    onClick(pointer) {
    }
    getStudA() {
        return [Math.floor((this.x - STUD_GRID_START_X) / 125),
            Math.floor((this.y - STUD_GRID_START_Y) / 125)];
    }
    getStudB() {
        if (this.isHor) {
            return [Math.floor((this.x - STUD_GRID_START_X) / 125) + 1,
                Math.floor((this.y - STUD_GRID_START_Y) / 125)];
        }
        else {
            return [Math.floor((this.x - STUD_GRID_START_X) / 125),
                Math.floor((this.y - STUD_GRID_START_Y) / 125) + 1];
        }
    }
    updateElectrons() {
        this.electrons.forEach(e => e.updatePosition(this.x, this.y, this.isHor));
    }
}
class DraggableComponentWithText extends DraggableComponent {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        this.text = this.scene.add.text(this.x, this.y, "", {
            fill: "#000",
            fontSize: "12px",
            fontFamily: "Arial Black"
        }).setVisible(false);
    }
    dragStart(pointer) {
        super.dragStart(pointer);
        this.text.setVisible(false);
    }
    dragEnd(pointer) {
        super.dragEnd(pointer);
        this.setTextPosition();
        this.text.setVisible(true);
    }
    updateElectrons() {
        super.updateElectrons();
        this.text.setText(this.getText());
    }
    onDestroy(item) {
        this.text.destroy();
        super.onDestroy(item);
    }
}
class Resistor extends DraggableComponentWithText {
    constructor(scene, x, y) {
        super(scene, x, y, "resistor");
        this.conductance = DEFAULT_CONDUCTANCE;
    }
    clone() {
        return new Resistor(this.scene, this.x, this.y);
    }
    updateStuds() {
        let current = (this.studA.charge + this.prevCurrent - this.studB.charge) * this.conductance;
        this.studA.charge -= current;
        this.studB.charge += current;
        this.prevCurrent = current;
        this.electrons.forEach(e => e.updateOffset(current));
    }
    getText() {
        return (1 / this.conductance).toFixed(0) + "Ω";
    }
    setTextPosition() {
        if (this.isHor) {
            this.text.setPosition(this.x - 18, this.y - 9).setAngle(0);
        }
        else {
            this.text.setPosition(this.x + 9, this.y - 15).setAngle(90);
        }
    }
}
class Bulb extends DraggableComponent {
    constructor(scene, x, y) {
        super(scene, x, y, "bulb");
        this.conductance = DEFAULT_CONDUCTANCE;
    }
    clone() {
        return new Bulb(this.scene, this.x, this.y);
    }
    updateStuds() {
        let current = (this.studA.charge + this.prevCurrent - this.studB.charge) * this.conductance;
        this.studA.charge -= current;
        this.studB.charge += current;
        this.prevCurrent = current;
        this.electrons.forEach(e => e.updateOffset(current));
    }
}
class Wire extends DraggableComponent {
    constructor(scene, x, y) {
        super(scene, x, y, "wire");
        this.prevPrevCurrent = -10;
        this.charge = 0;
    }
    clone() {
        return new Wire(this.scene, this.x, this.y);
    }
    updateStuds() {
        var secondChange = Math.abs(this.prevCurrent - this.prevPrevCurrent);
        if (secondChange < 0.01) {
            secondChange = 1;
        }
        if (secondChange > 0.01) {
            secondChange *= 100;
        }
        let current = (this.studA.charge + this.prevCurrent - this.studB.charge) / 2 / secondChange;
        this.studA.charge -= current;
        this.studB.charge += current;
        this.charge += current;
        this.prevPrevCurrent = this.prevCurrent;
        this.prevCurrent = current;
        this.electrons.forEach(e => e.updateOffset(current));
    }
}
class Switch extends DraggableComponent {
    constructor(scene, x, y) {
        super(scene, x, y, "switch-open");
        this._isOpen = true;
    }
    onClick(pointer) {
        this._isOpen = !this._isOpen;
        this.setTexture(this._isOpen ? "switch-open" : "switch-closed");
    }
    clone() {
        return new Switch(this.scene, this.x, this.y);
    }
    updateStuds() {
        if (!this._isOpen) {
            let current = (this.studA.charge + this.prevCurrent - this.studB.charge) / 2;
            this.studA.charge -= current;
            this.studB.charge += current;
            this.prevCurrent = current;
            this.electrons.forEach(e => e.updateOffset(current));
        }
    }
}
class Capacitor extends DraggableComponentWithText {
    constructor(scene, x, y) {
        super(scene, x, y, "capacitor");
        this.charge = 0;
        this.capacitance = DEFAULT_CAPACITANCE;
    }
    clone() {
        return new Capacitor(this.scene, this.x, this.y);
    }
    updateStuds() {
        let current = (this.studA.charge + this.prevCurrent - this.studB.charge - this.charge) * this.capacitance;
        this.studA.charge -= current;
        this.studB.charge += current;
        this.charge += current;
        this.prevCurrent = current;
        this.electrons.forEach(e => e.updateOffset(current));
    }
    getText() {
        return (1000 * this.capacitance).toFixed(0) + "mF";
    }
    setTextPosition() {
        if (this.isHor) {
            this.text.setPosition(this.x - 5, this.y - 25).setAngle(0);
        }
        else {
            this.text.setPosition(this.x + 15, this.y).setAngle(90);
        }
    }
}
class Cell extends DraggableComponentWithText {
    constructor(scene, x, y) {
        super(scene, x, y, "cell");
        this.EMF = CELL_DEFAULT_EMF;
        this.fire = null;
        this._isReversed = false;
        this.prevPrevCurrent = -10;
    }
    onClick(pointer) {
        this._isReversed = !this._isReversed;
        this.setFlipX(this._isReversed);
        this.EMF *= -1;
    }
    clone() {
        return new Cell(this.scene, this.x, this.y);
    }
    updateStuds() {
        if (!this.fire) {
            let current = (this.studA.charge + this.prevCurrent - this.studB.charge - this.EMF) / 2;
            this.studA.charge -= current;
            this.studB.charge += current;
            this.prevPrevCurrent = this.prevCurrent;
            this.prevCurrent = current;
            this.electrons.forEach(e => e.updateOffset(current));
            if (Math.abs(current) > CELL_CURRENT_LIMIT_FOR_FIRE) {
                this.catchFire();
            }
            ;
        }
    }
    catchFire() {
        this.fire = new Fire(this.scene, this.x, this.y - 10);
        this.on("destroy", () => { this.fire.destroy(); });
    }
    getText() {
        return Math.abs(this.EMF).toFixed(0) + "V";
    }
    setTextPosition() {
        if (this.isHor) {
            this.text.setPosition(this.x - 5, this.y - 25).setAngle(0);
        }
        else {
            this.text.setPosition(this.x + 15, this.y).setAngle(90);
        }
    }
}
class Ammeter extends DraggableComponentWithText {
    constructor(scene, x, y) {
        super(scene, x, y, "ammeter");
        this.averagedCurrent = 0;
    }
    clone() {
        return new Ammeter(this.scene, this.x, this.y);
    }
    updateStuds() {
        let current = (this.studA.charge + this.prevCurrent - this.studB.charge) / 2;
        this.studA.charge -= current;
        this.studB.charge += current;
        this.prevCurrent = current;
        this.electrons.forEach(e => e.updateOffset(current));
        this.averagedCurrent = (199 * this.averagedCurrent + current) / 200;
    }
    setTextPosition() {
        if (this.isHor) {
            this.text.setPosition(this.x - 5, this.y - 25);
        }
        else {
            this.text.setPosition(this.x + 20, this.y);
        }
    }
    getText() { return Math.abs(this.averagedCurrent * CURRENT_MAGNIFYING_FACTOR * 1000).toFixed(0) + "mA"; }
    ;
}
class Voltmeter extends DraggableComponentWithText {
    constructor(scene, x, y) {
        super(scene, x, y, "voltmeter");
    }
    clone() {
        return new Voltmeter(this.scene, this.x, this.y);
    }
    updateStuds() {
        let current = 0;
    }
    setTextPosition() {
        if (this.isHor) {
            this.text.setPosition(this.x - 5, this.y - 25);
        }
        else {
            this.text.setPosition(this.x + 20, this.y);
        }
    }
    getText() {
        var pd = this.studA.charge - this.studB.charge;
        return Math.abs(pd).toFixed(2) + "V";
    }
}
class Electron extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, paramComponent, paramOffset) {
        super(scene, x, y, "electron");
        this.offset = 0;
        this.component = null;
        scene.add.existing(this);
        this.depth = -1;
        this.component = paramComponent;
        this.offset = paramOffset;
    }
    updatePosition(componentX, componentY, isHor) {
        if (isHor) {
            this.y = componentY;
            this.x = componentX + this.offset;
        }
        else {
            this.x = componentX;
            this.y = componentY + this.offset;
        }
    }
    updateOffset(current) {
        this.offset += current * ELECTRON_SPEED;
        var possibleComponents = [];
        var stud = null;
        var extraOffset = null;
        if (this.offset > 62.5) {
            stud = this.component.studB;
            extraOffset = this.offset - 62.5;
        }
        else if (this.offset < -62.5) {
            stud = this.component.studA;
            extraOffset = -62.5 - this.offset;
        }
        else {
            return;
        }
        var nextChosen;
        [nextChosen, this.offset] = stud.nextComponentForElectron(extraOffset);
        if (nextChosen == null) {
            removeItemFromArray(this, this.component.electrons);
            this.destroy();
            console.log("none found");
            return;
        }
        removeItemFromArray(this, this.component.electrons);
        this.component = nextChosen;
        nextChosen.electrons.push(this);
    }
}
class Fire extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, "fire");
        this.setScale(2);
        this.play("allFire");
        scene.add.existing(this);
    }
}
class myGame extends Phaser.Game {
    constructor() {
        let config = {
            type: Phaser.AUTO,
            width: 1000,
            height: 750,
            autoFocus: true,
            backgroundColor: '#ffffff',
            parent: 'gameDiv',
            url: 'http//url.to.game',
            title: 'Title Goes Here',
            version: '0.0.1',
            scene: [new Scene1()]
        };
        super(config);
    }
}
class Scene1 extends Phaser.Scene {
    constructor() {
        super({
            key: 'sceneA',
            active: true,
            physics: {
                default: 'arcade',
                arcade: {
                    debug: false,
                }
            },
        });
        this.components = [];
        this.seed = 0;
    }
    preload() {
        this.load.image("resistor", "assets/resistor.png");
        this.load.image("stud", "assets/stud.png");
        this.load.image("cell", "assets/cell.png");
        this.load.image("wire", "assets/wire.png");
        this.load.image("capacitor", "assets/capacitor.png");
        this.load.image("switch-open", "assets/switch-open.png");
        this.load.image("switch-closed", "assets/switch-closed.png");
        this.load.image("bulb", "assets/bulb.png");
        this.load.image("ammeter", "assets/ammeter.png");
        this.load.image("voltmeter", "assets/voltmeter.png");
        this.load.image("electron", "assets/electron.png");
        this.load.atlas("fire", "assets/FireSprites.png", "assets/FireSprites.json");
    }
    create() {
        this.cameras.main.setBackgroundColor('#ffffff');
        this.anims.create({ key: 'allFire',
            frames: this.anims.generateFrameNames('fire'),
            repeat: -1,
            frameRate: 10
        });
        this.studGrid = [[], [], [], [], [], []];
        for (var i = 0; i < 6; i++) {
            for (var j = 0; j < 6; j++) {
                this.studGrid[i][j] = new Stud(this, STUD_GRID_START_X + i * 125, STUD_GRID_START_Y + j * 125);
            }
        }
        var spawnY = 150;
        new Resistor(this, 850, spawnY);
        new Wire(this, 850, spawnY += SPAWN_VERTICAL_SPACING);
        new Cell(this, 850, spawnY += SPAWN_VERTICAL_SPACING);
        new Capacitor(this, 850, spawnY += SPAWN_VERTICAL_SPACING);
        new Switch(this, 850, spawnY += SPAWN_VERTICAL_SPACING);
        new Bulb(this, 850, spawnY += SPAWN_VERTICAL_SPACING);
        new Voltmeter(this, 850, spawnY += SPAWN_VERTICAL_SPACING);
        new Ammeter(this, 850, spawnY += SPAWN_VERTICAL_SPACING);
    }
    update() {
        if (this.components.length > 0) {
            for (var i = 0; i < CIRCUIT_UPDATES_PER_FRAME; i++) {
                this.seed = randomOrderForEach(this.seed, this.components, c => c.updateStuds());
            }
        }
        this.components.forEach(c => {
            c.updateElectrons();
        });
        var minStud = this.studGrid[0][0];
        for (var i = 0; i < 6; i++) {
            for (var j = 0; j < 6; j++) {
                if (this.studGrid[i][j].voltageText.visible && this.studGrid[i][j].charge < minStud.charge) {
                    minStud = this.studGrid[i][j];
                }
            }
        }
        this.addToAllStuds(-1 * minStud.charge);
    }
    setAllStudsToZero() {
        this.studGrid.forEach(row => {
            row.forEach(stud => {
                stud.charge = 0;
            });
        });
    }
    addToAllStuds(value) {
        this.studGrid.forEach(row => {
            row.forEach(stud => {
                stud.charge += value;
            });
        });
    }
}
class Stud extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, "stud");
        this._charge = 0;
        this.random = PHI;
        this.connectedComponents = {
            "top": null, "bottom": null, "right": null, "left": null
        };
        scene.add.existing(this);
        this.voltageText = this.scene.add.text(this.x, this.y, "", {
            fill: "#000",
            fontSize: "12px",
            fontFamily: "Arial Black"
        }).setVisible(false);
        Phaser.Display.Bounds.CenterOn(this.voltageText, this.x - 20, this.y - 20);
    }
    get charge() { return this._charge; }
    set charge(value) {
        this._charge = ((STUD_VOLTAGE_MEAN_SAMPLE_SIZE - 1) * this._charge + value) / STUD_VOLTAGE_MEAN_SAMPLE_SIZE;
        this.voltageText.setText(this._charge < 0.05 ? "0V" : this._charge.toFixed(1) + "V");
    }
    getComponentDirection(c) {
        if (c.x == this.x) {
            return c.y > this.y ? "bottom" : "top";
        }
        else {
            return c.x > this.x ? "right" : "left";
        }
    }
    addComponent(c) {
        var dir = this.getComponentDirection(c);
        if (!c[dir]) {
            this.connectedComponents[dir] = c;
        }
        this.voltageText.setVisible(true);
    }
    removeComponent(c) {
        var dir = this.getComponentDirection(c);
        this.connectedComponents[dir] = null;
        if (!objectSome(this.connectedComponents, item => item != null)) {
            this.voltageText.setVisible(false);
        }
    }
    nextComponentForElectron(extraOffset) {
        var ret = [];
        var currents = [];
        if (this.connectedComponents["top"] && this.connectedComponents["top"].prevCurrent < 0) {
            ret.push([this.connectedComponents["top"], 62.5 - extraOffset]);
            currents.push(Math.abs(this.connectedComponents["top"].prevCurrent));
        }
        ;
        if (this.connectedComponents["right"] && this.connectedComponents["right"].prevCurrent > 0) {
            ret.push([this.connectedComponents["right"], -62.5 + extraOffset]);
            currents.push(Math.abs(this.connectedComponents["right"].prevCurrent));
        }
        ;
        if (this.connectedComponents["bottom"] && this.connectedComponents["bottom"].prevCurrent > 0) {
            ret.push([this.connectedComponents["bottom"], -62.5 + extraOffset]);
            currents.push(Math.abs(this.connectedComponents["bottom"].prevCurrent));
        }
        ;
        if (this.connectedComponents["left"] && this.connectedComponents["left"].prevCurrent < 0) {
            ret.push([this.connectedComponents["left"], 62.5 - extraOffset]);
            currents.push(Math.abs(this.connectedComponents["left"].prevCurrent));
        }
        ;
        if (ret.length == 0) {
            return [null, 0];
        }
        var sumOfCurrents = currents.reduce((a, b) => a + b, 0);
        var picked = sumOfCurrents * this.random;
        this.random = (this.random + PHI) % 1;
        if (picked < currents[0]) {
            return ret[0];
        }
        ;
        if (picked < currents[0] + currents[1]) {
            return ret[1];
        }
        ;
        if (picked < currents[0] + currents[1] + currents[2]) {
            return ret[2];
        }
        ;
        return ret[3];
    }
}
//# sourceMappingURL=game.js.map