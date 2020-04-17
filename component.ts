function removeItemFromArray(item, array) {   
    let index = array.indexOf(item);
    if (index > -1) {
        array.splice(index, 1);
    }
}

function objectSome(obj,func) {
    for (var key in obj) {
        if (func(obj[key])) {return true; }
    }
    return false;
} 

function randomOrderForEach(seed, arr, func) {
    for (var i = 0; i < arr.length; i++) {
        //choose next random
        seed = (seed + PHI) % 1;
        var index = Math.floor(seed * arr.length);

        //pseudo random thing using golden ratio
        func(arr[index]);
    }
    return seed;
}

const STUD_GRID_START_X = 62.5;
const STUD_GRID_START_Y = 62.5;
const GRID_NUM_ROWS = 5;
const GRID_NUM_COLS = 7;
const SPAWN_VERTICAL_SPACING = 50;


const CELL_DEFAULT_EMF = 12;
const CIRCUIT_UPDATES_PER_FRAME = 20; //100 lags. BIGGER means less bounce (good)
const DEFAULT_CAPACITANCE = 0.5; //bigger means takes longer to charge. above 1 is unstable.
                                //should be 100x resistance
const DEFAULT_STUD_CAPACITANCE = 0.1; //0.01 starts fires! but lower means less bounce (good)
const DEFAULT_RESISTANCE = 1000; //0.01 leads to voltage drop across wires (bad)
const DEFAULT_BULB_RESISTANCE = 100;

const CELL_CURRENT_LIMIT_FOR_FIRE = 20; //100 does not trigger when short circuited
const ELECTRON_SPEED = 5;
const NUMBER_OF_ELECTRONS = 5; //up to 5 per wire

const PHI = 0.61803398875;
const CURRENT_MAGNIFYING_FACTOR = 1; //pointless
const STUD_VOLTAGE_MEAN_SAMPLE_SIZE = 10; //10 is enough
const ELECTRON_COLOR = "#0277bd";
const FONT = "Verdana";


abstract class DraggableComponent extends Phaser.GameObjects.Sprite {
    isHor: boolean = true;
    studA: Stud;
    studB: Stud;
    notYetInCircuit: boolean;
    capacitanceBoost: number = 0;
    electrons: Electron[] = [];
    prevCurrent = 0;
    abstract causesElectronVoltageGain: boolean;
    hoverRect;

    constructor(scene:Scene1,x,y,texture) {
        super(scene,x,y,texture); 
        scene.add.existing(this);
        this.notYetInCircuit = true;


        scene.input.setDraggable(this.setInteractive());

        this.on('dragstart',this.dragStart);
        this.on('drag', this.onDrag);
        this.on('dragend',this.dragEnd);
        this.on("destroy", this.onDestroy);
        this.on('pointerdown',this.onClick);
        this.on("pointerover",(pointer) => {
            if (!this.hoverRect) {
                this.hoverRect = scene.add.rectangle(this.x,this.y,this.width,this.height).
                    setRotation(this.rotation).
                    setStrokeStyle(1, Phaser.Display.Color.GetColor(255,0,0));
            }
        });
        this.on("pointerout", (pointer) => {
            if (this.hoverRect) {this.hoverRect.destroy(); this.hoverRect = undefined; }
        })
    }

    dragStart(pointer) {
        if (this.notYetInCircuit) {
            this.notYetInCircuit = false;
            this.scene.add.existing(this.clone()); 
        }

        //remove from components that update  
        removeItemFromArray(this,this.scene.components);
        //destroy electrons
        this.electrons.forEach(e => { e.destroy(); });
        this.electrons = [];

        if (this.studA) { this.studA.removeComponent(this); };
        if (this.studB) { this.studB.removeComponent(this); }
    }

    onDrag(pointer, dragX, dragY) {
        let modX = (dragX - STUD_GRID_START_X) % 125;
        let modY = (dragY - STUD_GRID_START_Y) % 125;
        this.isHor =  ((modX > modY) == (modX + modY < 125));
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
        let coordsA = this.getStudACoords();
        let coordsB = this.getStudBCoords();
        if (coordsA == null || coordsB == null) { 
            this.destroy();
            return;
        }
        this.studA = this.scene.studGrid[coordsA[0]][coordsA[1]];
        this.studB = this.scene.studGrid[coordsB[0]][coordsB[1]];

        //if a component is already in that place then replace it
        var alreadyThere = this.scene.components.filter(c => {
            return c.studA == this.studA && c.studB == this.studB;
        });
        for (var item of alreadyThere) {
            item.destroy(); 
        }

        //renew electrons 
        for (var i = 1; i < NUMBER_OF_ELECTRONS + 1; i++) {
            var offset = - 62.5 + i * 125 / (NUMBER_OF_ELECTRONS+1)
            this.electrons.push(new Electron(this.scene, this.x, this.y, this, offset));
        }

        //add to update components
        this.scene.components.push(this);
        this.studA.addComponent(this);
        this.studB.addComponent(this);
    }

    onDestroy(item) {
        if (this.hoverRect) { this.hoverRect.destroy(); }
        removeItemFromArray(this,this.scene.components);
        item.electrons.forEach(e => e.destroy());
    }

    onClick(pointer) {
    }

    //0-indexed
    getStudACoords() {
        var ret = [Math.floor((this.x - STUD_GRID_START_X) / 125),
            Math.floor((this.y - STUD_GRID_START_Y) / 125)];
        if (ret[0] < 0 || ret[0] > GRID_NUM_COLS-1 || ret[1] < 0 || ret[1] > GRID_NUM_ROWS-1) {
            return null;
        }
        return ret;
    }

    //0-indexed
    getStudBCoords() {
        var ACoords = this.getStudACoords();
        if (ACoords == null) { return null; }
        if (this.isHor) {
            if (ACoords[0] + 1 > GRID_NUM_COLS-1) { return null; }
            return [ ACoords[0] + 1, ACoords[1]];
        }
        else {
            if (ACoords[1] + 1 > GRID_NUM_ROWS-1) { return null; }
            return [ ACoords[0], ACoords[1] + 1];
        }
    }

    updateElectrons()  {
        this.electrons.forEach(e => e.updatePosition(this.x,this.y,this.isHor))
    }
 
    abstract clone(); 
    abstract updateStuds();
}

abstract class DraggableComponentWithText extends DraggableComponent {
    text: Phaser.GameObjects.Text;
    value: number;
    hoverRectText: any;
    abstract unit;

    constructor(scene,x,y,texture, value) {
        super(scene,x,y,texture);
        this.value = value;
        this.text = new HoverText(this.scene, this.x, this.y, "", {
            fill:"#000",
            fontSize:"12px",
            fontFamily:FONT
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

    abstract updateStuds();
    abstract getText();
    abstract setTextPosition();
    abstract clone();
}


class Resistor extends DraggableComponentWithText {
    causesElectronVoltageGain = true;
    unit: "Ω";

    constructor(scene,x,y, value = DEFAULT_RESISTANCE) {
        super(scene,x,y,"resistor", value);
    }

    clone() {
        return new Resistor(this.scene,this.x,this.y, this.value);
    }

    updateStuds() {
        let current = (this.studA.voltage + this.prevCurrent - this.studB.voltage) / this.value;
        this.studA.charge -= current;
        this.studB.charge += current;
        this.prevCurrent = current;
        this.electrons.forEach(e => e.updateOffset(current));
    }

    getText() {
        // CURRENT_MAGNIFYING_FACTOR
        return (this.value/1000).toFixed(1)+"kΩ";
    }

    setTextPosition() {
        if (this.isHor) {
            this.text.setPosition(this.x-16,this.y-25).setAngle(0);
        }
        else {
            this.text.setPosition(this.x+25,this.y-15).setAngle(90);
        }
    }
}

class Bulb extends Resistor {
    unit: "Ω";
    constructor(scene,x,y,value = DEFAULT_BULB_RESISTANCE) {
        super(scene,x,y,value);
        this.setTexture("bulb");
    }

    //override
    clone() {
        return new Bulb(this.scene,this.x,this.y,this.value);
    }
}


class Wire extends DraggableComponent {
    causesElectronVoltageGain = false;
    prevPrevCurrent = -10;
    charge: number = 0;

    constructor(scene,x,y) {
        super(scene,x,y,"wire");
    }

    clone() {
        return new Wire(this.scene,this.x,this.y);
    }

    updateStuds() {
        
        var secondChange = Math.abs(this.prevCurrent - this.prevPrevCurrent);
        if (secondChange < 0.01) {secondChange = 1}
        if (secondChange > 0.01) {secondChange *= 100}

        let current = (this.studA.voltage + this.prevCurrent - this.studB.voltage) / 2 ;
        this.studA.charge -= current;
        this.studB.charge += current;
        this.charge += current;

        this.prevPrevCurrent= this.prevCurrent;
        this.prevCurrent = current;
        this.electrons.forEach(e => e.updateOffset(current));
    }
}


class Switch extends DraggableComponent {
    causesElectronVoltageGain = false;
    _isOpen = true;

    constructor(scene,x,y) {
        super(scene,x,y,"switch-open");
    }

    onClick(pointer) {
        this._isOpen = !this._isOpen;
        this.setTexture(this._isOpen ? "switch-open" : "switch-closed");
    }

    clone() {
        return new Switch(this.scene,this.x,this.y);
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
    unit: "F";
    causesElectronVoltageGain = false;
    charge = 0;

    constructor(scene,x,y,value = DEFAULT_CAPACITANCE) {
        super(scene,x,y,"capacitor",value);
    }

    clone() {
        return new Capacitor(this.scene,this.x,this.y,this.value);
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
        return (1000*this.value).toFixed(0) + "mF";
    }
    setTextPosition() {
        if (this.isHor) {
            this.text.setPosition(this.x-5,this.y-25).setAngle(0);
        }
        else {
            this.text.setPosition(this.x+15,this.y).setAngle(90);
        }
    }
}

class Cell extends DraggableComponentWithText {
    unit: "V";
    causesElectronVoltageGain = true;
    fire = null;
    _isReversed = false;
    prevPrevCurrent = -10;
    charge: number;

    constructor(scene,x,y, value = CELL_DEFAULT_EMF) {
        super(scene,x,y,"cell",value);
    }
    
    onClick(pointer) {
        this._isReversed = !this._isReversed;
        this.setFlipX(this._isReversed);
        this.value *= -1;
    }

    clone() {
        return new Cell(this.scene,this.x,this.y, this.value);
    }

    updateStuds() {
        if (!this.fire) {
            //var secondChange = this.prevCurrent - this.prevPrevCurrent;
            
            let current = (this.studA.voltage + this.prevCurrent - this.studB.voltage - this.value) / 2;
            this.studA.charge -= current;
            this.studB.charge += current;

            this.prevPrevCurrent = this.prevCurrent;
            this.prevCurrent = current;
            this.electrons.forEach(e => e.updateOffset(current));
            if (Math.abs(current) > CELL_CURRENT_LIMIT_FOR_FIRE) { this.catchFire(); };
        }
    }

    catchFire() {
        this.fire = new Fire(this.scene, this.x, this.y-10);
        this.on("destroy",() => {this.fire.destroy();})
    }

    getText() {
        return Math.abs(this.value).toFixed(0)+"V";
    }

    setTextPosition() {
        if (this.isHor) {
            this.text.setPosition(this.x-5,this.y-25).setAngle(0);
        }
        else {
            this.text.setPosition(this.x+25,this.y-10).setAngle(90);
        }
    }

    //overridden because value is negative when reversed  
    setValue(value) {
        this.value = value * (this._isReversed ? -1: 1);
        this.text.setText(this.getText());
    }
}



class Ammeter extends DraggableComponentWithText {
    unit: "";
    causesElectronVoltageGain = false;
    averagedCurrent = 0;

    constructor(scene,x,y) {
        super(scene,x,y,"ammeter",0);
        this.text.removeInteractive();
    }

    clone() {
        return new Ammeter(this.scene,this.x,this.y);
    }

    updateStuds() {
        let current = (this.studA.voltage + this.prevCurrent - this.studB.voltage) / 2;
        this.studA.charge -= current;
        this.studB.charge += current;
        this.prevCurrent = current;
        this.electrons.forEach(e => e.updateOffset(current));

        this.averagedCurrent = (199*this.averagedCurrent + current)/200;
    }

    setTextPosition() {
        if (this.isHor) {
            this.text.setPosition(this.x-5,this.y-25);
        }
        else {
            this.text.setPosition(this.x+20,this.y);
        }
    }

    getText() { 
        if (this.studA && this.studB) {
            return Math.abs(this.averagedCurrent*CURRENT_MAGNIFYING_FACTOR*1000).toFixed(0)+"mA" ;
        }
    };

    //overloaded by ammeter and voltmeter
    updateElectrons() {
        super.updateElectrons();
        this.text.setText(this.getText());
    }
}


class Voltmeter extends DraggableComponentWithText {
    unit: "";
    causesElectronVoltageGain = false;
    constructor(scene,x,y) {
        super(scene,x,y,"voltmeter",0);
        this.text.removeInteractive();
    }

    clone() {
        return new Voltmeter(this.scene,this.x,this.y);
    }

    updateStuds() {
        let current = 0;
    }

    setTextPosition() {
        if (this.isHor) {
            this.text.setPosition(this.x-5,this.y-25);
        }
        else {
            this.text.setPosition(this.x+20,this.y);
        }
    }

    getText() {
        if (this.studA && this.studB) {
            var pd = this.studA.voltage - this.studB.voltage;
            return Math.abs(pd).toFixed(2)+"V";
        }
        return "";
    }

    //overloaded by ammeter and voltmeter
    updateElectrons() {
        super.updateElectrons();
        this.text.setText(this.getText());
    }
}
