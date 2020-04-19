function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}
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
const STUD_GRID_START_X = 62.5;
const STUD_GRID_START_Y = 62.5;
const GRID_NUM_ROWS = 5;
const GRID_NUM_COLS = 5;
const SPAWN_VERTICAL_SPACING = 62.5;
const SPAWN_X = 750;
var SPAWN_Y = 62.5;
const CELL_DEFAULT_EMF = 12;
const CIRCUIT_UPDATES_PER_FRAME = 20;
const DEFAULT_CAPACITANCE = 0.5;
const DEFAULT_STUD_CAPACITANCE = 0.1;
const DEFAULT_RESISTANCE = 1000;
const DEFAULT_BULB_RESISTANCE = 100;
const CELL_CURRENT_LIMIT_FOR_FIRE = 20;
const BULB_CIRCLE_SIZE = 0.05;
const PHI = 0.61803398875;
const STUD_VOLTAGE_MEAN_SAMPLE_SIZE = 10;
const AMMETER_MEAN_SAMPLE_SIZE = 500;
const ELECTRON_COLOR = "#0277bd";
const FONT = "Verdana";
class DraggableComponent extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        this.isHor = true;
        this.isDragging = false;
        this.capacitanceBoost = 0;
        this.electrons = [];
        this.prevCurrent = 0;
        this.scene = scene;
        scene.add.existing(this);
        this.notYetInCircuit = true;
        scene.input.setDraggable(this.setInteractive());
        this.on('drag', this.onDrag);
        this.on('dragend', this.dragEnd);
        this.on("destroy", this.onDestroy);
        this.on('pointerdown', this.onClick);
        this.on("pointerover", (pointer) => {
            if (!this.hoverRect) {
                this.hoverRect = scene.add.rectangle(this.x, this.y, this.width, this.height).
                    setRotation(this.rotation).
                    setStrokeStyle(1, Phaser.Display.Color.GetColor(255, 0, 0));
            }
        });
        this.on("pointerout", (pointer) => {
            if (this.hoverRect) {
                this.hoverRect.destroy();
                this.hoverRect = undefined;
            }
        });
    }
    onDrag(pointer, dragX, dragY) {
        if (!this.isDragging) {
            this.isDragging = true;
            if (this.notYetInCircuit) {
                this.notYetInCircuit = false;
                this.scene.add.existing(this.clone());
            }
            removeItemFromArray(this, this.scene.activeComponents);
            this.electrons.forEach(e => { e.destroy(); });
            this.electrons = [];
            if (this.studA) {
                this.studA.removeComponent(this);
            }
            ;
            if (this.studB) {
                this.studB.removeComponent(this);
            }
        }
        let modX = (dragX - STUD_GRID_START_X) % 125;
        let modY = (dragY - STUD_GRID_START_Y) % 125;
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
    }
    dragEnd(pointer) {
        if (!this.isDragging) {
            return;
        }
        let coordsA = this.getStudACoords();
        let coordsB = this.getStudBCoords();
        if (coordsA == null || coordsB == null) {
            this.destroy();
            return;
        }
        this.studA = this.scene.studGrid[coordsA[0]][coordsA[1]];
        this.studB = this.scene.studGrid[coordsB[0]][coordsB[1]];
        var alreadyThere = this.scene.activeComponents.filter(c => {
            return c.studA == this.studA && c.studB == this.studB;
        });
        for (var item of alreadyThere) {
            item.destroy();
        }
        this.createNewElectrons();
        this.scene.activeComponents.push(this);
        this.studA.addComponent(this);
        this.studB.addComponent(this);
        this.isDragging = false;
    }
    createNewElectrons() {
        console.log(this.scene.NUMBER_OF_ELECTRONS);
        for (var i = 0; i < this.scene.NUMBER_OF_ELECTRONS; i++) {
            var offset = -62.5 + (i + 0.5) * 125 / this.scene.NUMBER_OF_ELECTRONS;
            this.electrons.push(new Electron(this.scene, this.x, this.y, this, offset));
        }
    }
    onDestroy(item) {
        if (this.hoverRect) {
            this.hoverRect.destroy();
        }
        removeItemFromArray(this, this.scene.activeComponents);
        item.electrons.forEach(e => e.destroy());
    }
    onClick(pointer) {
    }
    getStudACoords() {
        var ret = [Math.floor((this.x - STUD_GRID_START_X) / 125),
            Math.floor((this.y - STUD_GRID_START_Y) / 125)];
        if (ret[0] < 0 || ret[0] > GRID_NUM_COLS - 1 || ret[1] < 0 || ret[1] > GRID_NUM_ROWS - 1) {
            return null;
        }
        return ret;
    }
    getStudBCoords() {
        var ACoords = this.getStudACoords();
        if (ACoords == null) {
            return null;
        }
        if (this.isHor) {
            if (ACoords[0] + 1 > GRID_NUM_COLS - 1) {
                return null;
            }
            return [ACoords[0] + 1, ACoords[1]];
        }
        else {
            if (ACoords[1] + 1 > GRID_NUM_ROWS - 1) {
                return null;
            }
            return [ACoords[0], ACoords[1] + 1];
        }
    }
    updateElectrons() {
        this.electrons.forEach(e => e.updatePosition(this.x, this.y, this.isHor));
    }
}
class DraggableComponentWithText extends DraggableComponent {
    constructor(scene, x, y, texture, value) {
        super(scene, x, y, texture);
        this.value = value;
        this.text = new HoverText(this.scene, this.x, this.y, "", {
            fill: "#000",
            fontSize: this.scene.FONT_SIZE.toString() + "px",
            fontFamily: FONT
        }, this);
        this.text.setText(this.getText());
        this.setTextPosition();
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
    onDestroy(item) {
        this.text.destroy();
        super.onDestroy(item);
    }
    setValue(value) {
        this.value = value;
        this.text.setText(this.getText());
    }
}
class Resistor extends DraggableComponentWithText {
    constructor(scene, x, y, value = DEFAULT_RESISTANCE) {
        super(scene, x, y, "resistor", value);
        this.causesElectronVoltageGain = true;
        this.unit = "Ω";
    }
    clone() {
        return new Resistor(this.scene, this.x, this.y, this.value);
    }
    updateStuds() {
        let current = (this.studA.voltage + this.prevCurrent - this.studB.voltage) / this.value;
        this.studA.charge -= current;
        this.studB.charge += current;
        this.prevCurrent = current;
        this.electrons.forEach(e => e.updateOffset(current));
    }
    getText() {
        return (this.value / 1000).toFixed(1) + "kΩ";
    }
    setTextPosition() {
        if (this.isHor) {
            this.text.setPosition(this.x - 16, this.y - 25).setAngle(0);
        }
        else {
            this.text.setPosition(this.x + 25, this.y - 15).setAngle(90);
        }
    }
}
class Bulb extends Resistor {
    constructor(scene, x, y, value = DEFAULT_BULB_RESISTANCE) {
        super(scene, x, y, value);
        this.unit = "Ω";
        this.averagedCurrent = 0;
        this.setTexture("bulb");
        this.circle = this.scene.add.circle(this.x, this.y, 100, Phaser.Display.Color.GetColor(255, 255, 0), 1).
            setDepth(-1).setVisible(false).setAlpha(0.5);
    }
    clone() {
        return new Bulb(this.scene, this.x, this.y, this.value);
    }
    dragStart(pointer) {
        super.dragStart(pointer);
        this.circle.setVisible(false);
    }
    dragEnd(pointer) {
        super.dragEnd(pointer);
        this.circle.setPosition(this.x, this.y);
        this.circle.setScale(0, 0);
        this.circle.setVisible(true);
    }
    onDestroy(item) {
        this.circle.destroy();
        super.onDestroy(item);
    }
    updateStuds() {
        let current = (this.studA.voltage + this.prevCurrent - this.studB.voltage) / this.value;
        this.studA.charge -= current;
        this.studB.charge += current;
        this.prevCurrent = current;
        this.electrons.forEach(e => e.updateOffset(current));
        this.averagedCurrent = ((AMMETER_MEAN_SAMPLE_SIZE - 1) * this.averagedCurrent + current) / AMMETER_MEAN_SAMPLE_SIZE;
    }
    updateElectrons() {
        super.updateElectrons();
        var size = Math.abs(this.averagedCurrent * this.value * BULB_CIRCLE_SIZE);
        this.circle.setScale(size, size);
    }
}
class Wire extends DraggableComponent {
    constructor(scene, x, y) {
        super(scene, x, y, "wire");
        this.causesElectronVoltageGain = false;
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
        let current = (this.studA.voltage + this.prevCurrent - this.studB.voltage) / 2;
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
        this.causesElectronVoltageGain = false;
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
            let current = (this.studA.voltage + this.prevCurrent - this.studB.voltage) / 2;
            this.studA.charge -= current;
            this.studB.charge += current;
            this.prevCurrent = current;
            this.electrons.forEach(e => e.updateOffset(current));
        }
    }
}
class Capacitor extends DraggableComponentWithText {
    constructor(scene, x, y, value = DEFAULT_CAPACITANCE) {
        super(scene, x, y, "capacitor", value);
        this.unit = "F";
        this.causesElectronVoltageGain = false;
        this.charge = 0;
    }
    clone() {
        return new Capacitor(this.scene, this.x, this.y, this.value);
    }
    updateStuds() {
        let current = (this.studA.voltage + this.prevCurrent - this.studB.voltage - this.charge) * this.value;
        this.studA.charge -= current;
        this.studB.charge += current;
        this.charge += current;
        this.prevCurrent = current;
        this.electrons.forEach(e => e.updateOffset(current));
    }
    getText() {
        return (1000 * this.value).toFixed(0) + "mF";
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
    constructor(scene, x, y, value = CELL_DEFAULT_EMF) {
        super(scene, x, y, "cell", value);
        this.unit = "V";
        this.causesElectronVoltageGain = true;
        this.fire = null;
        this._isReversed = false;
        this.prevPrevCurrent = -10;
    }
    onClick(pointer) {
        this._isReversed = !this._isReversed;
        this.setFlipX(this._isReversed);
        this.value *= -1;
    }
    clone() {
        return new Cell(this.scene, this.x, this.y, this.value);
    }
    updateStuds() {
        if (!this.fire) {
            let current = (this.studA.voltage + this.prevCurrent - this.studB.voltage - this.value) / 2;
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
        return Math.abs(this.value).toFixed(0) + "V";
    }
    setTextPosition() {
        if (this.isHor) {
            this.text.setPosition(this.x - 5, this.y - 25).setAngle(0);
        }
        else {
            this.text.setPosition(this.x + 25, this.y - 10).setAngle(90);
        }
    }
    setValue(value) {
        this.value = value * (this._isReversed ? -1 : 1);
        this.text.setText(this.getText());
    }
}
class Ammeter extends DraggableComponentWithText {
    constructor(scene, x, y) {
        super(scene, x, y, "ammeter", 0);
        this.unit = "";
        this.causesElectronVoltageGain = false;
        this.averagedCurrent = 0;
        this.text.removeInteractive();
    }
    clone() {
        return new Ammeter(this.scene, this.x, this.y);
    }
    updateStuds() {
        let current = (this.studA.voltage + this.prevCurrent - this.studB.voltage) / 2;
        this.studA.charge -= current;
        this.studB.charge += current;
        this.prevCurrent = current;
        this.electrons.forEach(e => e.updateOffset(current));
        this.averagedCurrent = ((AMMETER_MEAN_SAMPLE_SIZE - 1) * this.averagedCurrent + current) / AMMETER_MEAN_SAMPLE_SIZE;
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
        if (this.studA && this.studB) {
            return Math.abs(this.averagedCurrent * 1000).toFixed(0) + "mA";
        }
    }
    ;
    updateElectrons() {
        super.updateElectrons();
        this.text.setText(this.getText());
    }
}
class Voltmeter extends DraggableComponentWithText {
    constructor(scene, x, y) {
        super(scene, x, y, "voltmeter", 0);
        this.unit = "";
        this.causesElectronVoltageGain = false;
        this.text.removeInteractive();
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
        if (this.studA && this.studB) {
            var pd = this.studA.voltage - this.studB.voltage;
            return Math.abs(pd).toFixed(2) + "V";
        }
        return "";
    }
    updateElectrons() {
        super.updateElectrons();
        this.text.setText(this.getText());
    }
}
class Electron extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, paramComponent, paramOffset) {
        super(scene, x, y, "electron");
        this.offset = 0;
        this.component = null;
        this.prevOffset = 0;
        this.scene = scene;
        scene.add.existing(this);
        this.setDepth(-2);
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
        this.prevOffset = this.offset;
        this.offset += current * this.scene.ELECTRON_SPEED * (this.scene.ELECTRONS_ARE_POSITIVE ? 1 : -1);
        if ((this.offset < 0) != (this.prevOffset < 0) && this.component.causesElectronVoltageGain) {
            this.gainVoltage(current > 0);
        }
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
    gainVoltage(currentIsPositive) {
        var diff = (currentIsPositive ? -1 : 1) * (this.component.studA.voltage - this.component.studB.voltage);
        var text = ((diff > 0) ? "+" : "") + diff.toFixed(1) + "V";
        var tb = this.scene.add.text(this.x - 5, this.y - 5, text, {
            fill: ELECTRON_COLOR,
            fontSize: this.scene.FONT_SIZE.toString() + "px",
            fontFamily: FONT
        });
        var tween = this.scene.tweens.add({
            targets: tb,
            x: this.x - 50,
            y: this.y - 50,
            ease: 'Cubic.easeOut',
            duration: 2000,
            yoyo: false,
            repeat: 0,
            onComplete: () => {
                tb.destroy();
            }
        });
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
            type: Phaser.CANVAS,
            width: 850,
            height: 750,
            autoFocus: true,
            backgroundColor: '#ffffff',
            parent: 'gameDiv',
            url: 'http//www.teachometer.co.uk/blue-circuit-simulator.html',
            title: 'Blue Circuit simulator',
            version: '0.0.1',
            scene: [new Scene1()],
            canvas: document.getElementById("game")
        };
        super(config);
    }
}
function addHoverEvent(sprite, scene) {
}
class HoverText extends Phaser.GameObjects.Text {
    constructor(scene, x, y, text, textStyle, component) {
        super(scene, x, y, text, textStyle);
        this.scene.add.existing(this);
        this.scene = scene;
        this.setInteractive();
        this.setDepth(100);
        this.component = component;
        this.scene.textObjects.push(this);
        this.on("pointerover", (pointer) => {
            if (!this.hoverRect) {
                var bounds = this.getBounds();
                this.hoverRect = this.scene.add.rectangle(bounds.centerX, bounds.centerY, bounds.width, bounds.height).
                    setStrokeStyle(1, Phaser.Display.Color.GetColor(255, 0, 0)).
                    setRotation(this.rotation);
            }
        });
        this.on("pointerout", (pointer) => {
            if (this.hoverRect) {
                this.hoverRect.destroy();
                this.hoverRect = undefined;
            }
        });
        this.on("pointerdown", (pointer) => { this.onClick(); });
        this.on("destroy", () => {
            if (this.hoverRect) {
                this.hoverRect.destroy();
            }
            removeItemFromArray(this, this.scene.textObjects);
        });
    }
    onClick() {
        var value = window.prompt("set value for component in " + this.component.unit, Math.abs(this.component.value).toString());
        if (isNumeric(value)) {
            this.component.setValue(value);
        }
        ;
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
        this.activeComponents = [];
        this.dummyComponents = [];
        this.textObjects = [];
        this.electrons = [];
        this.seed = 0;
        this.ELECTRONS_ARE_POSITIVE = false;
        this.ELECTRON_SPEED = 5;
        this.NUMBER_OF_ELECTRONS = 5;
        this.FONT_SIZE = 12;
        this.SHOW_STUD_VOLTAGES = false;
        this.SHOW_STUDS = true;
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
        this.studGrid = [];
        for (var i = 0; i < GRID_NUM_COLS; i++) {
            this.studGrid.push([]);
            for (var j = 0; j < GRID_NUM_ROWS; j++) {
                this.studGrid[i][j] = new Stud(this, STUD_GRID_START_X + i * 125, STUD_GRID_START_Y + j * 125);
            }
        }
        new Resistor(this, SPAWN_X, SPAWN_Y);
        new Wire(this, SPAWN_X, SPAWN_Y += SPAWN_VERTICAL_SPACING);
        new Cell(this, SPAWN_X, SPAWN_Y += SPAWN_VERTICAL_SPACING);
        new Capacitor(this, SPAWN_X, SPAWN_Y += SPAWN_VERTICAL_SPACING);
        new Switch(this, SPAWN_X, SPAWN_Y += SPAWN_VERTICAL_SPACING);
        new Bulb(this, SPAWN_X, SPAWN_Y += SPAWN_VERTICAL_SPACING);
        new Voltmeter(this, SPAWN_X, SPAWN_Y += SPAWN_VERTICAL_SPACING);
        new Ammeter(this, SPAWN_X, SPAWN_Y += SPAWN_VERTICAL_SPACING);
    }
    update() {
        if (this.activeComponents.length > 0) {
            for (var i = 0; i < CIRCUIT_UPDATES_PER_FRAME; i++) {
                this.seed = randomOrderForEach(this.seed, this.activeComponents, c => c.updateStuds());
            }
        }
        this.activeComponents.forEach(c => {
            c.updateElectrons();
        });
        var minStud = this.studGrid[0][0];
        for (var i = 0; i < GRID_NUM_COLS; i++) {
            for (var j = 0; j < GRID_NUM_ROWS; j++) {
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
    setNumberOfElectrons(value) {
        this.NUMBER_OF_ELECTRONS = value;
        for (var c of this.activeComponents) {
            c.electrons.forEach(e => { e.destroy(); });
            c.electrons = [];
            c.createNewElectrons();
        }
    }
    setFontSize(value) {
        this.FONT_SIZE = value;
        for (var t of this.textObjects) {
            t.setFontSize(this.FONT_SIZE);
        }
    }
    setStudVoltageVisible(value) {
        this.SHOW_STUD_VOLTAGES = value;
        for (var i = 0; i < GRID_NUM_COLS; i++) {
            for (var j = 0; j < GRID_NUM_ROWS; j++) {
                if (this.SHOW_STUD_VOLTAGES) {
                    this.studGrid[i][j].voltageText.setVisible(this.studGrid[i][j].hasAnyComponents());
                }
                else {
                    this.studGrid[i][j].voltageText.setVisible(false);
                }
            }
        }
    }
    setStudVisible(value) {
        this.SHOW_STUDS = value;
        for (var i = 0; i < GRID_NUM_COLS; i++) {
            for (var j = 0; j < GRID_NUM_ROWS; j++) {
                this.studGrid[i][j].setVisible(this.SHOW_STUDS);
            }
        }
    }
}
class Stud extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, "stud");
        this._charge = 0;
        this.random = PHI;
        this.capacitance = DEFAULT_STUD_CAPACITANCE;
        this.connectedComponents = {
            "top": null, "bottom": null, "right": null, "left": null
        };
        scene.add.existing(this);
        this.scene = scene;
        this.voltageText = this.scene.add.text(this.x - 25, this.y - 20, "", {
            fill: "#000",
            fontSize: this.scene.FONT_SIZE.toString() + "px",
            fontFamily: FONT
        }).setVisible(false);
        this.scene.textObjects.push(this.voltageText);
    }
    get voltage() { return this._charge / this.capacitance; }
    get charge() { return this._charge; }
    set charge(value) {
        this._charge = ((STUD_VOLTAGE_MEAN_SAMPLE_SIZE - 1) * this._charge + value) / STUD_VOLTAGE_MEAN_SAMPLE_SIZE;
        this.voltageText.setText(this.voltage < 0.05 ? "0V" : this.voltage.toFixed(1) + "V");
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
        if (this.scene.SHOW_STUD_VOLTAGES) {
            this.voltageText.setVisible(true);
        }
    }
    removeComponent(c) {
        var dir = this.getComponentDirection(c);
        this.connectedComponents[dir] = null;
        if (!this.hasAnyComponents()) {
            this.voltageText.setVisible(false);
        }
    }
    hasAnyComponents() {
        return objectSome(this.connectedComponents, item => item != null);
    }
    nextComponentForElectron(extraOffset) {
        var ret = [];
        var currents = [];
        if (this.connectedComponents["top"] &&
            (this.scene.ELECTRONS_ARE_POSITIVE ? this.connectedComponents["top"].prevCurrent < 0 : this.connectedComponents["top"].prevCurrent > 0)) {
            ret.push([this.connectedComponents["top"], 62.5 - extraOffset]);
            currents.push(Math.abs(this.connectedComponents["top"].prevCurrent));
        }
        ;
        if (this.connectedComponents["right"] &&
            (this.scene.ELECTRONS_ARE_POSITIVE ? this.connectedComponents["right"].prevCurrent > 0 : this.connectedComponents["right"].prevCurrent < 0)) {
            ret.push([this.connectedComponents["right"], -62.5 + extraOffset]);
            currents.push(Math.abs(this.connectedComponents["right"].prevCurrent));
        }
        ;
        if (this.connectedComponents["bottom"] &&
            (this.scene.ELECTRONS_ARE_POSITIVE ? this.connectedComponents["bottom"].prevCurrent > 0 : this.connectedComponents["bottom"].prevCurrent < 0)) {
            ret.push([this.connectedComponents["bottom"], -62.5 + extraOffset]);
            currents.push(Math.abs(this.connectedComponents["bottom"].prevCurrent));
        }
        ;
        if (this.connectedComponents["left"] &&
            (this.scene.ELECTRONS_ARE_POSITIVE ? this.connectedComponents["left"].prevCurrent < 0 : this.connectedComponents["left"].prevCurrent > 0)) {
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